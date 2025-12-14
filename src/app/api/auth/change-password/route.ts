import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { sendSecurityNotificationEmail } from "@/lib/email/email-service";
import { prisma } from "@/lib/prisma";
import {
  passwordSchema,
  PASSWORD_HISTORY_COUNT,
  MAX_PASSWORD_ATTEMPTS,
  PASSWORD_LOCK_MINUTES,
} from "@/lib/validations/password";

export const runtime = "nodejs";

// Schema del body - SIN userId (se obtiene de sesión)
const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
  newPassword: passwordSchema,
});

export async function POST(request: Request) {
  try {
    // =========================================================================
    // 1. AUTENTICACIÓN - Obtener userId de sesión (NO del body)
    // =========================================================================
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id;

    // =========================================================================
    // 2. VALIDAR BODY
    // =========================================================================
    const body = await request.json();
    const parsed = changePasswordBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

    // =========================================================================
    // 3. CARGAR USUARIO CON CAMPOS DE SEGURIDAD
    // =========================================================================
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
        failedPasswordAttempts: true,
        passwordLockedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // =========================================================================
    // 4. RATE LIMITING - Verificar bloqueo
    // =========================================================================
    if (user.passwordLockedUntil && user.passwordLockedUntil > new Date()) {
      // No revelar cuánto tiempo falta
      return NextResponse.json({ error: "Cuenta bloqueada temporalmente. Inténtalo más tarde." }, { status: 429 });
    }

    // =========================================================================
    // 5. VERIFICAR CONTRASEÑA ACTUAL
    // =========================================================================
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      // Incrementar contador de intentos fallidos
      const attempts = (user.failedPasswordAttempts ?? 0) + 1;
      const shouldLock = attempts >= MAX_PASSWORD_ATTEMPTS;

      await prisma.user.update({
        where: { id: userId },
        data: {
          failedPasswordAttempts: attempts,
          passwordLockedUntil: shouldLock ? new Date(Date.now() + PASSWORD_LOCK_MINUTES * 60 * 1000) : null,
        },
      });

      // No revelar intentos restantes (seguridad)
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 401 });
    }

    // =========================================================================
    // 6. VERIFICAR NUEVA ≠ ACTUAL (antes del historial)
    // =========================================================================
    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrent) {
      return NextResponse.json({ error: "La nueva contraseña no puede ser igual a la actual" }, { status: 400 });
    }

    // =========================================================================
    // 7. VERIFICAR CONTRA HISTORIAL DE CONTRASEÑAS
    // =========================================================================
    const passwordHistory = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: PASSWORD_HISTORY_COUNT,
    });

    for (const entry of passwordHistory) {
      const matchesOld = await bcrypt.compare(newPassword, entry.password);
      if (matchesOld) {
        return NextResponse.json(
          { error: `No puedes reutilizar tus últimas ${PASSWORD_HISTORY_COUNT} contraseñas` },
          { status: 400 },
        );
      }
    }

    // =========================================================================
    // 8. HASH NUEVA CONTRASEÑA
    // =========================================================================
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // =========================================================================
    // 9. TRANSACCIÓN INTERACTIVA (todo o nada)
    // =========================================================================
    // Parsear IP correctamente (x-forwarded-for puede tener múltiples IPs)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

    await prisma.$transaction(async (tx) => {
      // 9.1 Guardar contraseña actual en historial
      await tx.passwordHistory.create({
        data: {
          userId,
          password: user.password, // Hash actual (antes de cambiar)
        },
      });

      // 9.2 Actualizar usuario con nueva contraseña
      await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          mustChangePassword: false,
          lastPasswordChangeAt: new Date(),
          failedPasswordAttempts: 0,
          passwordLockedUntil: null,
        },
      });

      // 9.3 Invalidar TODAS las sesiones del usuario (fuerza re-login)
      await tx.session.deleteMany({
        where: { userId },
      });

      // 9.4 Limpiar historial antiguo (mantener solo últimas N)
      const historyCount = await tx.passwordHistory.count({ where: { userId } });
      if (historyCount > PASSWORD_HISTORY_COUNT) {
        const oldEntries = await tx.passwordHistory.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          take: historyCount - PASSWORD_HISTORY_COUNT,
          select: { id: true },
        });
        if (oldEntries.length > 0) {
          await tx.passwordHistory.deleteMany({
            where: { id: { in: oldEntries.map((e) => e.id) } },
          });
        }
      }

      // 9.5 Registrar en AuditLog (dentro de la transacción para compliance)
      await tx.auditLog.create({
        data: {
          action: "PASSWORD_CHANGED",
          category: "SECURITY",
          entityId: userId,
          entityType: "User",
          description: "Usuario cambió su contraseña",
          performedById: userId,
          performedByEmail: user.email,
          performedByName: user.name,
          performedByRole: user.role,
          orgId: user.orgId,
          ipAddress,
          userAgent: request.headers.get("user-agent") ?? null,
        },
      });
    });

    console.log(`✅ Contraseña cambiada exitosamente para usuario: ${user.email}`);

    // =========================================================================
    // 10. ENVIAR NOTIFICACIÓN DE SEGURIDAD (fuera de transacción)
    // =========================================================================
    try {
      await sendSecurityNotificationEmail({
        to: {
          email: user.email,
          name: user.name,
        },
        orgId: user.orgId,
        userId: user.id,
      });
    } catch (emailError) {
      // No fallar el cambio de contraseña si falla el email
      console.error("⚠️ Error enviando email de notificación:", emailError);
    }

    return NextResponse.json({ message: "Contraseña cambiada correctamente" });
  } catch (error) {
    console.error("❌ Error al cambiar contraseña:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

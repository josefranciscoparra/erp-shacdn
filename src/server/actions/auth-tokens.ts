"use server";

import { randomBytes } from "crypto";

import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { sendResetPasswordEmail, sendSecurityNotificationEmail } from "@/lib/email/email-service";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validations/password";

// Constantes de configuración
const RESET_TOKEN_EXPIRATION_HOURS = 2;
const INVITE_TOKEN_EXPIRATION_HOURS = 72;
const INVITE_RESEND_DEFAULT_COOLDOWN_SECONDS = 60;

function resolveInviteResendCooldownMs(): number {
  const raw = process.env.INVITE_RESEND_COOLDOWN_SECONDS;
  if (!raw) {
    return INVITE_RESEND_DEFAULT_COOLDOWN_SECONDS * 1000;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return INVITE_RESEND_DEFAULT_COOLDOWN_SECONDS * 1000;
  }

  return parsed * 1000;
}

const INVITE_RESEND_COOLDOWN_MS = resolveInviteResendCooldownMs();

// Tipos de respuesta
type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };
type ResendInviteTokenResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; error: "IN_PROGRESS" | "COOLDOWN"; retryAt?: Date };

/**
 * Genera un token aleatorio seguro
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Obtiene la URL base de la aplicación
 */
export async function getAppUrl(): Promise<string> {
  return process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// ==================== REQUEST PASSWORD RESET ====================

/**
 * Solicita un reset de contraseña por email.
 * SIEMPRE devuelve success para no filtrar si el email existe.
 */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  try {
    // Normalizar email
    const normalizedEmail = email.trim().toLowerCase();
    console.log("[requestPasswordReset] Buscando usuario:", normalizedEmail);

    // Buscar usuario activo
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        active: true,
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    // Si no existe el usuario, devolvemos success igual (seguridad)
    if (!user) {
      console.log("[requestPasswordReset] Usuario no encontrado");
      return { success: true };
    }

    console.log("[requestPasswordReset] Usuario encontrado:", user.id, user.email);

    // Borrar tokens RESET_PASSWORD anteriores no usados del usuario
    await prisma.authToken.deleteMany({
      where: {
        userId: user.id,
        type: "RESET_PASSWORD",
        usedAt: null,
      },
    });

    // Crear nuevo token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);

    await prisma.authToken.create({
      data: {
        userId: user.id,
        type: "RESET_PASSWORD",
        token,
        expiresAt,
      },
    });

    // Enviar email con link de reset
    const resetLink = `${await getAppUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    console.log("[requestPasswordReset] Enviando email a:", user.email, "con link:", resetLink);

    const emailResult = await sendResetPasswordEmail({
      to: {
        email: user.email,
        name: user.name,
      },
      resetLink,
      orgId: user.orgId,
      userId: user.id,
      expiresAt,
    });

    console.log("[requestPasswordReset] Resultado email:", emailResult);

    return { success: true };
  } catch (error) {
    console.error("[requestPasswordReset] Error:", error);
    // Aún con error, devolvemos success para no filtrar información
    return { success: true };
  }
}

// ==================== CREATE RESET TOKEN (para uso interno/admin) ====================

/**
 * Crea un token de reset de contraseña para un usuario específico.
 * No envía email; solo crea el token.
 */
export async function createResetPasswordTokenForUser(
  userId: string,
): Promise<ActionResult<{ token: string; expiresAt: Date }>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true },
    });

    if (!user || !user.active) {
      return {
        success: false,
        error: "Usuario no encontrado o inactivo.",
      };
    }

    // Borrar tokens RESET_PASSWORD anteriores no usados del usuario
    await prisma.authToken.deleteMany({
      where: {
        userId,
        type: "RESET_PASSWORD",
        usedAt: null,
      },
    });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);

    await prisma.authToken.create({
      data: {
        userId,
        type: "RESET_PASSWORD",
        token,
        expiresAt,
      },
    });

    return { success: true, data: { token, expiresAt } };
  } catch (error) {
    console.error("[createResetPasswordTokenForUser] Error:", error);
    return {
      success: false,
      error: "Error al crear token de reset.",
    };
  }
}

// ==================== RESET PASSWORD WITH TOKEN ====================

/**
 * Completa el reset de contraseña usando un token válido.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<ActionResult> {
  try {
    // Validar contraseña
    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      return {
        success: false,
        error: passwordValidation.error.errors[0].message,
      };
    }

    // Buscar token válido
    const authToken = await prisma.authToken.findFirst({
      where: {
        token,
        type: "RESET_PASSWORD",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            active: true,
            orgId: true,
          },
        },
      },
    });

    if (!authToken?.user || !authToken.user.active) {
      return {
        success: false,
        error: "Enlace inválido o caducado. Solicita uno nuevo.",
      };
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Transacción: actualizar usuario + marcar token + invalidar sesiones
    await prisma.$transaction([
      // Actualizar usuario
      prisma.user.update({
        where: { id: authToken.userId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          lastPasswordChangeAt: new Date(),
          failedPasswordAttempts: 0,
          passwordLockedUntil: null,
        },
      }),
      // Marcar token como usado
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidar todas las sesiones del usuario
      prisma.session.deleteMany({
        where: { userId: authToken.userId },
      }),
    ]);

    // Enviar notificación de seguridad
    await sendSecurityNotificationEmail({
      to: {
        email: authToken.user.email,
        name: authToken.user.name,
      },
      orgId: authToken.user.orgId,
      userId: authToken.user.id,
    });

    return { success: true };
  } catch (error) {
    console.error("[resetPasswordWithToken] Error:", error);
    return {
      success: false,
      error: "Error al cambiar la contraseña. Inténtalo de nuevo.",
    };
  }
}

// ==================== GET INVITE TOKEN ====================

type InviteTokenData = {
  userId: string;
  email: string;
  name: string;
  orgName: string;
};

/**
 * Valida un token de invitación y devuelve datos del usuario.
 */
export async function getInviteToken(token: string): Promise<ActionResult<InviteTokenData>> {
  try {
    const authToken = await prisma.authToken.findFirst({
      where: {
        token,
        type: "INVITE",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            active: true,
            organization: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!authToken?.user || !authToken.user.active) {
      return {
        success: false,
        error: "Invitación inválida o caducada.",
      };
    }

    return {
      success: true,
      data: {
        userId: authToken.user.id,
        email: authToken.user.email,
        name: authToken.user.name,
        orgName: authToken.user.organization.name,
      },
    };
  } catch (error) {
    console.error("[getInviteToken] Error:", error);
    return {
      success: false,
      error: "Error al validar la invitación.",
    };
  }
}

// ==================== ACCEPT INVITE ====================

/**
 * Acepta una invitación y establece la contraseña del usuario.
 */
export async function acceptInvite(token: string, newPassword: string): Promise<ActionResult> {
  try {
    // Validar contraseña
    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      return {
        success: false,
        error: passwordValidation.error.errors[0].message,
      };
    }

    // Buscar token válido
    const authToken = await prisma.authToken.findFirst({
      where: {
        token,
        type: "INVITE",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            active: true,
          },
        },
      },
    });

    if (!authToken?.user || !authToken.user.active) {
      return {
        success: false,
        error: "Invitación inválida o caducada.",
      };
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Transacción: actualizar usuario + marcar token + desactivar contraseñas temporales
    await prisma.$transaction([
      // Actualizar usuario
      prisma.user.update({
        where: { id: authToken.userId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          lastPasswordChangeAt: new Date(),
          failedPasswordAttempts: 0,
          passwordLockedUntil: null,
        },
      }),
      // Marcar token como usado
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
      // Desactivar contraseñas temporales con nota de invalidación
      prisma.temporaryPassword.updateMany({
        where: {
          userId: authToken.userId,
          active: true,
        },
        data: {
          active: false,
          invalidatedAt: new Date(),
          invalidatedReason: "Usuario configuró su contraseña desde invitación",
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("[acceptInvite] Error:", error);
    return {
      success: false,
      error: "Error al aceptar la invitación. Inténtalo de nuevo.",
    };
  }
}

// ==================== RESEND INVITE EMAIL ====================

/**
 * Reenvía el email de invitación a un usuario.
 * Crea un nuevo token y envía el email.
 */
export async function resendInviteEmail(userId: string): Promise<ActionResult<{ queued: boolean }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado.",
      };
    }
    const inviterName = session.user.name ?? session.user.email ?? undefined;

    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        orgId: true,
        organization: {
          select: { name: true },
        },
      },
    });

    if (!user || !user.active) {
      return {
        success: false,
        error: "Usuario no encontrado o inactivo.",
      };
    }

    const tokenResult: ResendInviteTokenResult = await prisma.$transaction(async (tx) => {
      const lockKey = `invite:${userId}`;
      const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtext(${lockKey})) AS locked
      `;
      const locked = lockRows.length > 0 ? lockRows[0].locked : false;
      if (!locked) {
        return { ok: false, error: "IN_PROGRESS" };
      }

      const cutoff = new Date(Date.now() - INVITE_RESEND_COOLDOWN_MS);
      const recentToken = await tx.authToken.findFirst({
        where: {
          userId,
          type: "INVITE",
          usedAt: null,
          createdAt: { gt: cutoff },
        },
        select: { createdAt: true },
      });

      if (recentToken) {
        return {
          ok: false,
          error: "COOLDOWN",
          retryAt: new Date(recentToken.createdAt.getTime() + INVITE_RESEND_COOLDOWN_MS),
        };
      }

      await tx.authToken.deleteMany({
        where: {
          userId,
          type: "INVITE",
          usedAt: null,
        },
      });

      const token = generateToken();
      const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);

      await tx.authToken.create({
        data: {
          userId,
          type: "INVITE",
          token,
          expiresAt,
        },
      });

      return { ok: true, token, expiresAt };
    });

    if (!tokenResult.ok) {
      if (tokenResult.error === "COOLDOWN" && tokenResult.retryAt) {
        const secondsLeft = Math.max(1, Math.ceil((tokenResult.retryAt.getTime() - Date.now()) / 1000));
        return {
          success: false,
          error: `Espera ${secondsLeft} segundos para reenviar la invitación.`,
        };
      }
      if (tokenResult.error === "IN_PROGRESS") {
        return {
          success: false,
          error: "Invitación ya en proceso. Reintenta en unos segundos.",
        };
      }
      return {
        success: false,
        error: "No fue posible preparar la invitación.",
      };
    }

    // Importar dinámicamente para evitar dependencia circular
    const { sendAuthInviteEmail } = await import("@/lib/email/email-service");

    // Enviar email
    const inviteLink = `${await getAppUrl()}/auth/accept-invite?token=${tokenResult.token}`;

    const emailResult = await sendAuthInviteEmail({
      to: {
        email: user.email,
        name: user.name,
      },
      inviteLink,
      orgId: user.orgId,
      userId: user.id,
      companyName: user.organization?.name ?? undefined,
      inviterName,
      expiresAt: tokenResult.expiresAt,
    });

    if (!emailResult.success) {
      return {
        success: false,
        error: "Error al enviar el email de invitación.",
      };
    }

    return { success: true, data: { queued: emailResult.queued ?? false } };
  } catch (error) {
    console.error("[resendInviteEmail] Error:", error);
    return {
      success: false,
      error: "Error al reenviar la invitación.",
    };
  }
}

// ==================== CREATE INVITE TOKEN (para uso interno/RRHH) ====================

/**
 * Crea un token de invitación para un usuario.
 * Se usa cuando RRHH da de alta un nuevo usuario.
 */
export async function createInviteToken(userId: string): Promise<ActionResult<{ token: string; expiresAt: Date }>> {
  try {
    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true },
    });

    if (!user || !user.active) {
      return {
        success: false,
        error: "Usuario no encontrado.",
      };
    }

    // Borrar tokens INVITE anteriores no usados del usuario
    await prisma.authToken.deleteMany({
      where: {
        userId,
        type: "INVITE",
        usedAt: null,
      },
    });

    // Crear nuevo token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);

    await prisma.authToken.create({
      data: {
        userId,
        type: "INVITE",
        token,
        expiresAt,
      },
    });

    return { success: true, data: { token, expiresAt } };
  } catch (error) {
    console.error("[createInviteToken] Error:", error);
    return {
      success: false,
      error: "Error al crear la invitación.",
    };
  }
}

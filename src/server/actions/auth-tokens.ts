"use server";

import { randomBytes } from "crypto";

import bcrypt from "bcryptjs";

import { sendResetPasswordEmail, sendSecurityNotificationEmail } from "@/lib/email/email-service";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validations/password";

// Constantes de configuración
const RESET_TOKEN_EXPIRATION_HOURS = 2;
const INVITE_TOKEN_EXPIRATION_HOURS = 72;

// Tipos de respuesta
type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

/**
 * Genera un token aleatorio seguro
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Obtiene la URL base de la aplicación
 */
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
    const resetLink = `${getAppUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    console.log("[requestPasswordReset] Enviando email a:", user.email, "con link:", resetLink);

    const emailResult = await sendResetPasswordEmail({
      to: {
        email: user.email,
        name: user.name,
      },
      resetLink,
      orgId: user.orgId,
      userId: user.id,
    });

    console.log("[requestPasswordReset] Resultado email:", emailResult);

    return { success: true };
  } catch (error) {
    console.error("[requestPasswordReset] Error:", error);
    // Aún con error, devolvemos success para no filtrar información
    return { success: true };
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

    // Transacción: actualizar usuario + marcar token
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
export async function resendInviteEmail(userId: string): Promise<ActionResult> {
  try {
    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        orgId: true,
      },
    });

    if (!user || !user.active) {
      return {
        success: false,
        error: "Usuario no encontrado o inactivo.",
      };
    }

    // Importar dinámicamente para evitar dependencia circular
    const { sendAuthInviteEmail } = await import("@/lib/email/email-service");

    // Crear nuevo token (esto borra los anteriores automáticamente)
    const tokenResult = await createInviteToken(userId);

    if (!tokenResult.success || !tokenResult.data) {
      return {
        success: false,
        error: tokenResult.error ?? "Error al crear token de invitación.",
      };
    }

    // Enviar email
    const inviteLink = `${getAppUrl()}/auth/accept-invite?token=${tokenResult.data.token}`;

    const emailResult = await sendAuthInviteEmail({
      to: {
        email: user.email,
        name: user.name,
      },
      inviteLink,
      orgId: user.orgId,
      userId: user.id,
    });

    if (!emailResult.success) {
      return {
        success: false,
        error: "Error al enviar el email de invitación.",
      };
    }

    return { success: true };
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
export async function createInviteToken(userId: string): Promise<ActionResult<{ token: string }>> {
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

    return { success: true, data: { token } };
  } catch (error) {
    console.error("[createInviteToken] Error:", error);
    return {
      success: false,
      error: "Error al crear la invitación.",
    };
  }
}

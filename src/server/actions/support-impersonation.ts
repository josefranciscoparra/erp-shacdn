"use server";

import { createHash, randomBytes } from "crypto";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";

const SUPPORT_TOKEN_TTL_MINUTES = 15;
const SUPPORT_SESSION_MINUTES = 60;

const supportTokenSchema = z.object({
  email: z.string().email(),
  reason: z.string().min(3).max(500),
});

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function createSupportImpersonationToken(
  email: string,
  reason: string,
): Promise<
  ActionResult<{
    token: string;
    expiresAt: string;
    sessionMinutes: number;
    targetEmail: string;
  }>
> {
  try {
    const sessionUser = await getAuthenticatedUser();

    if (sessionUser.role !== "SUPER_ADMIN") {
      return { success: false, error: "No tienes permisos para esta accion" };
    }

    const validation = supportTokenSchema.safeParse({ email, reason });
    if (!validation.success) {
      return { success: false, error: "Datos de entrada invalidos" };
    }

    const normalizedEmail = validation.data.email.trim().toLowerCase();
    const normalizedReason = validation.data.reason.trim();

    if (normalizedReason.length < 3) {
      return { success: false, error: "El motivo es obligatorio" };
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        active: true,
      },
      include: {
        organization: {
          select: {
            active: true,
          },
        },
      },
    });

    if (!targetUser) {
      return { success: false, error: "Usuario no encontrado o inactivo" };
    }

    if (!targetUser.organization?.active) {
      return { success: false, error: "Usuario no encontrado o inactivo" };
    }

    if (targetUser.role === "SUPER_ADMIN") {
      return { success: false, error: "No puedes generar tokens para SUPER_ADMIN" };
    }

    if (targetUser.id === sessionUser.userId) {
      return { success: false, error: "No puedes generar tokens para ti mismo" };
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + SUPPORT_TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.supportImpersonationToken.create({
      data: {
        tokenHash,
        expiresAt,
        sessionMinutes: SUPPORT_SESSION_MINUTES,
        reason: normalizedReason,
        orgId: targetUser.orgId,
        userId: targetUser.id,
        createdById: sessionUser.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "SUPPORT_IMPERSONATION_TOKEN_CREATED",
        category: "SECURITY",
        entityId: targetUser.id,
        entityType: "User",
        entityData: {
          email: targetUser.email,
          reason: normalizedReason,
          expiresAt: expiresAt.toISOString(),
          sessionMinutes: SUPPORT_SESSION_MINUTES,
        },
        description: `Token de soporte generado para ${targetUser.email}`,
        performedById: sessionUser.userId,
        performedByEmail: sessionUser.email ?? "",
        performedByName: sessionUser.name ?? sessionUser.email ?? "Superadmin",
        performedByRole: sessionUser.role,
        orgId: targetUser.orgId,
      },
    });

    return {
      success: true,
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
        sessionMinutes: SUPPORT_SESSION_MINUTES,
        targetEmail: targetUser.email,
      },
    };
  } catch (error) {
    console.error("Error creando token de soporte:", error);
    return { success: false, error: "Error al generar el token de soporte" };
  }
}

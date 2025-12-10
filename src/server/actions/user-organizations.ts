"use server";

import { revalidatePath } from "next/cache";

import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Types
export interface UserOrganizationItem {
  id: string;
  orgId: string;
  orgName: string;
  role: Role;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface AvailableOrganization {
  id: string;
  name: string;
}

// Helper: Verificar que el usuario actual es SUPER_ADMIN
async function requireSuperAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN: Solo SUPER_ADMIN puede gestionar membresías multiempresa");
  }

  return session;
}

/**
 * Lista todas las membresías de un usuario
 */
export async function listUserOrganizations(userId: string): Promise<{
  success: boolean;
  memberships?: UserOrganizationItem[];
  error?: string;
}> {
  try {
    await requireSuperAdmin();

    const memberships = await prisma.userOrganization.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    return {
      success: true,
      memberships: memberships.map((m) => ({
        id: m.id,
        orgId: m.orgId,
        orgName: m.organization.name,
        role: m.role,
        isDefault: m.isDefault,
        isActive: m.isActive,
        createdAt: m.createdAt,
      })),
    };
  } catch (error) {
    console.error("Error listing user organizations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al listar organizaciones",
    };
  }
}

/**
 * Lista las organizaciones disponibles para añadir a un usuario
 * (activas y no asignadas todavía)
 */
export async function getAvailableOrganizations(userId: string): Promise<{
  success: boolean;
  organizations?: AvailableOrganization[];
  error?: string;
}> {
  try {
    await requireSuperAdmin();

    // Obtener orgIds ya asignados
    const existingMemberships = await prisma.userOrganization.findMany({
      where: { userId },
      select: { orgId: true },
    });

    const assignedOrgIds = existingMemberships.map((m) => m.orgId);

    // Obtener organizaciones activas no asignadas
    const organizations = await prisma.organization.findMany({
      where: {
        active: true,
        id: { notIn: assignedOrgIds },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      organizations,
    };
  } catch (error) {
    console.error("Error getting available organizations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener organizaciones disponibles",
    };
  }
}

/**
 * Añade una organización a un usuario
 */
export async function addUserOrganization(data: {
  userId: string;
  orgId: string;
  role: Role;
  isDefault?: boolean;
}): Promise<{
  success: boolean;
  membership?: UserOrganizationItem;
  error?: string;
}> {
  try {
    await requireSuperAdmin();

    const { userId, orgId, role, isDefault = false } = data;

    // Verificar que la organización existe y está activa
    const organization = await prisma.organization.findFirst({
      where: { id: orgId, active: true },
      select: { id: true, name: true },
    });

    if (!organization) {
      return {
        success: false,
        error: "La organización no existe o no está activa",
      };
    }

    // Verificar que no existe ya la membresía
    const existing = await prisma.userOrganization.findUnique({
      where: {
        userId_orgId: { userId, orgId },
      },
    });

    if (existing) {
      return {
        success: false,
        error: "El usuario ya tiene asignada esta organización",
      };
    }

    // Si es default, desmarcar los demás
    if (isDefault) {
      await prisma.userOrganization.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // Crear la membresía
    const membership = await prisma.userOrganization.create({
      data: {
        userId,
        orgId,
        role,
        isDefault,
        isActive: true,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    // Si es default, actualizar User.orgId también
    if (isDefault) {
      await prisma.user.update({
        where: { id: userId },
        data: { orgId },
      });
    }

    revalidatePath("/dashboard/admin/users");

    return {
      success: true,
      membership: {
        id: membership.id,
        orgId: membership.orgId,
        orgName: membership.organization.name,
        role: membership.role,
        isDefault: membership.isDefault,
        isActive: membership.isActive,
        createdAt: membership.createdAt,
      },
    };
  } catch (error) {
    console.error("Error adding user organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al añadir organización",
    };
  }
}

/**
 * Cambia la organización por defecto de un usuario
 */
export async function setDefaultOrganization(
  userId: string,
  orgId: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireSuperAdmin();

    // Verificar que la membresía existe y está activa
    const membership = await prisma.userOrganization.findFirst({
      where: {
        userId,
        orgId,
        isActive: true,
      },
    });

    if (!membership) {
      return {
        success: false,
        error: "La membresía no existe o no está activa",
      };
    }

    // Transacción: desmarcar todos, marcar el nuevo, actualizar User.orgId
    await prisma.$transaction([
      prisma.userOrganization.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      prisma.userOrganization.update({
        where: { id: membership.id },
        data: { isDefault: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { orgId },
      }),
    ]);

    revalidatePath("/dashboard/admin/users");

    return { success: true };
  } catch (error) {
    console.error("Error setting default organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cambiar organización por defecto",
    };
  }
}

/**
 * Activa o desactiva una membresía
 */
export async function toggleUserOrganization(
  userOrgId: string,
  isActive: boolean,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireSuperAdmin();

    const membership = await prisma.userOrganization.findUnique({
      where: { id: userOrgId },
      include: {
        user: {
          select: {
            id: true,
            userOrganizations: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!membership) {
      return {
        success: false,
        error: "Membresía no encontrada",
      };
    }

    // No permitir desactivar si es la única activa
    if (!isActive && membership.user.userOrganizations.length <= 1) {
      return {
        success: false,
        error: "No se puede desactivar la única membresía activa del usuario",
      };
    }

    // No permitir desactivar la default sin cambiar primero
    if (!isActive && membership.isDefault) {
      return {
        success: false,
        error: "No se puede desactivar la organización por defecto. Cambia primero la default.",
      };
    }

    await prisma.userOrganization.update({
      where: { id: userOrgId },
      data: { isActive },
    });

    revalidatePath("/dashboard/admin/users");

    return { success: true };
  } catch (error) {
    console.error("Error toggling user organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cambiar estado de membresía",
    };
  }
}

/**
 * Elimina una membresía (hard delete)
 */
export async function removeUserOrganization(userOrgId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireSuperAdmin();

    const membership = await prisma.userOrganization.findUnique({
      where: { id: userOrgId },
      include: {
        user: {
          select: {
            id: true,
            userOrganizations: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!membership) {
      return {
        success: false,
        error: "Membresía no encontrada",
      };
    }

    // No permitir eliminar si es la única
    if (membership.user.userOrganizations.length <= 1) {
      return {
        success: false,
        error: "No se puede eliminar la única membresía del usuario",
      };
    }

    // No permitir eliminar la default
    if (membership.isDefault) {
      return {
        success: false,
        error: "No se puede eliminar la organización por defecto. Cambia primero la default.",
      };
    }

    await prisma.userOrganization.delete({
      where: { id: userOrgId },
    });

    revalidatePath("/dashboard/admin/users");

    return { success: true };
  } catch (error) {
    console.error("Error removing user organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar membresía",
    };
  }
}

/**
 * Actualiza el rol de una membresía
 */
export async function updateUserOrganizationRole(
  userOrgId: string,
  role: Role,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireSuperAdmin();

    const membership = await prisma.userOrganization.findUnique({
      where: { id: userOrgId },
    });

    if (!membership) {
      return {
        success: false,
        error: "Membresía no encontrada",
      };
    }

    await prisma.userOrganization.update({
      where: { id: userOrgId },
      data: { role },
    });

    revalidatePath("/dashboard/admin/users");

    return { success: true };
  } catch (error) {
    console.error("Error updating user organization role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar rol",
    };
  }
}

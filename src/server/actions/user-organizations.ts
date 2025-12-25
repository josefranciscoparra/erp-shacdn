"use server";

import { revalidatePath } from "next/cache";

import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import {
  canManageGroupUsers,
  getGroupManagedOrganizationIds,
  getGroupOrganizationIds,
} from "@/lib/organization-groups";
import { prisma } from "@/lib/prisma";
import { canCreateRole, canEditRole, ROLE_DISPLAY_NAMES } from "@/services/permissions/role-hierarchy";

// Types
export interface UserOrganizationItem {
  id: string;
  orgId: string;
  orgName: string;
  role: Role;
  isDefault: boolean;
  isActive: boolean;
  canManageUserOrganizations: boolean;
  createdAt: Date;
}

export interface AvailableOrganization {
  id: string;
  name: string;
}

type OrgManagementScope = {
  role: Role;
  isSuperAdmin: boolean;
  manageableOrgIds: string[];
};

const MULTI_ORG_MANAGER_ROLE: Role = "HR_ADMIN";

// Helper: Obtener el scope de gestión de organizaciones del usuario actual
async function getOrgManagementScope(groupId?: string | null): Promise<OrgManagementScope> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  const role = session.user.role as Role;

  if (role === "SUPER_ADMIN") {
    if (groupId) {
      const groupOrgIds = await getGroupOrganizationIds(groupId);
      return { role, isSuperAdmin: false, manageableOrgIds: groupOrgIds };
    }

    return { role, isSuperAdmin: true, manageableOrgIds: [] };
  }

  const effectivePermissions = await computeEffectivePermissions({
    role,
    orgId: session.user.orgId,
    userId: session.user.id,
  });

  if (!effectivePermissions.has("manage_user_organizations")) {
    throw new Error("FORBIDDEN: No tienes permisos para gestionar organizaciones");
  }

  if (role !== "ORG_ADMIN" && role !== MULTI_ORG_MANAGER_ROLE) {
    throw new Error("FORBIDDEN: Solo HR Admin u Org Admin pueden gestionar organizaciones");
  }

  const manageableOrgIds = new Set<string>();

  if (session.user.orgId) {
    manageableOrgIds.add(session.user.orgId);
  }

  const memberships = await prisma.userOrganization.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      organization: { active: true },
    },
    select: {
      orgId: true,
      canManageUserOrganizations: true,
    },
  });

  memberships.forEach((membership) => {
    if (role === "ORG_ADMIN" || membership.canManageUserOrganizations) {
      manageableOrgIds.add(membership.orgId);
    }
  });

  const groupManagedOrgIds = await getGroupManagedOrganizationIds(session.user.id);
  groupManagedOrgIds.forEach((orgId) => manageableOrgIds.add(orgId));

  let finalOrgIds = Array.from(manageableOrgIds);

  if (groupId) {
    const hasAccessToGroup = await canManageGroupUsers(session.user.id, groupId);

    if (!hasAccessToGroup) {
      throw new Error("FORBIDDEN: Sin acceso al grupo seleccionado");
    }

    const groupOrgIds = await getGroupOrganizationIds(groupId);
    finalOrgIds = finalOrgIds.filter((orgId) => groupOrgIds.includes(orgId));
  }

  if (finalOrgIds.length === 0) {
    throw new Error("FORBIDDEN: No tienes permisos para gestionar organizaciones");
  }

  return { role, isSuperAdmin: false, manageableOrgIds: finalOrgIds };
}

/**
 * Lista todas las membresías de un usuario
 */
export async function listUserOrganizations(
  userId: string,
  groupId?: string,
): Promise<{
  success: boolean;
  memberships?: UserOrganizationItem[];
  employeeOrgId?: string | null;
  employeeOrgName?: string | null;
  error?: string;
}> {
  try {
    const scope = await getOrgManagementScope(groupId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        employee: {
          select: {
            orgId: true,
            organization: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const memberships = await prisma.userOrganization.findMany({
      where: scope.isSuperAdmin ? { userId } : { userId, orgId: { in: scope.manageableOrgIds } },
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
        canManageUserOrganizations: m.canManageUserOrganizations,
        createdAt: m.createdAt,
      })),
      employeeOrgId: user?.employee?.orgId ?? null,
      employeeOrgName: user?.employee?.organization?.name ?? null,
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
export async function getAvailableOrganizations(
  userId: string,
  groupId?: string,
): Promise<{
  success: boolean;
  organizations?: AvailableOrganization[];
  error?: string;
}> {
  try {
    const scope = await getOrgManagementScope(groupId);

    // Obtener orgIds ya asignados
    const existingMemberships = await prisma.userOrganization.findMany({
      where: scope.isSuperAdmin ? { userId } : { userId, orgId: { in: scope.manageableOrgIds } },
      select: { orgId: true },
    });

    const assignedOrgIds = existingMemberships.map((m) => m.orgId);

    // Obtener organizaciones activas no asignadas
    const organizations = await prisma.organization.findMany({
      where: {
        active: true,
        id: scope.isSuperAdmin ? { notIn: assignedOrgIds } : { in: scope.manageableOrgIds, notIn: assignedOrgIds },
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
  canManageUserOrganizations?: boolean;
  groupId?: string;
}): Promise<{
  success: boolean;
  membership?: UserOrganizationItem;
  error?: string;
}> {
  try {
    const scope = await getOrgManagementScope(data.groupId);

    const { userId, orgId, role, isDefault = false, canManageUserOrganizations = false } = data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        employee: {
          select: {
            orgId: true,
          },
        },
      },
    });

    const employeeOrgId = user?.employee?.orgId ?? null;

    if (isDefault && employeeOrgId && employeeOrgId !== orgId) {
      return {
        success: false,
        error: "La organización por defecto debe coincidir con la organización del empleado",
      };
    }

    if (!scope.isSuperAdmin && !scope.manageableOrgIds.includes(orgId)) {
      return {
        success: false,
        error: "No tienes permisos para añadir usuarios a esta organización",
      };
    }

    if (!canCreateRole(scope.role, role)) {
      return {
        success: false,
        error: `No tienes permisos para asignar el rol ${ROLE_DISPLAY_NAMES[role]}`,
      };
    }

    const canGrantManageFlag = scope.isSuperAdmin || scope.role === "ORG_ADMIN";
    const manageFlag = canGrantManageFlag && role === MULTI_ORG_MANAGER_ROLE ? canManageUserOrganizations : false;

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
        canManageUserOrganizations: manageFlag,
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
    if (data.groupId) {
      revalidatePath(`/g/${data.groupId}/dashboard/admin/users`);
    }

    return {
      success: true,
      membership: {
        id: membership.id,
        orgId: membership.orgId,
        orgName: membership.organization.name,
        role: membership.role,
        isDefault: membership.isDefault,
        isActive: membership.isActive,
        canManageUserOrganizations: membership.canManageUserOrganizations,
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
  groupId?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const scope = await getOrgManagementScope(groupId);

    if (!scope.isSuperAdmin && !scope.manageableOrgIds.includes(orgId)) {
      return {
        success: false,
        error: "No tienes permisos para gestionar esta organización",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        employee: {
          select: {
            orgId: true,
          },
        },
      },
    });

    const employeeOrgId = user?.employee?.orgId ?? null;

    if (employeeOrgId && employeeOrgId !== orgId) {
      return {
        success: false,
        error: "La organización por defecto debe coincidir con la organización del empleado",
      };
    }

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
    if (groupId) {
      revalidatePath(`/g/${groupId}/dashboard/admin/users`);
    }

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
  groupId?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const scope = await getOrgManagementScope(groupId);

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

    if (!scope.isSuperAdmin && !scope.manageableOrgIds.includes(membership.orgId)) {
      return {
        success: false,
        error: "No tienes permisos para gestionar esta organización",
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
    if (groupId) {
      revalidatePath(`/g/${groupId}/dashboard/admin/users`);
    }

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
export async function removeUserOrganization(
  userOrgId: string,
  groupId?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const scope = await getOrgManagementScope(groupId);

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

    if (!scope.isSuperAdmin && !scope.manageableOrgIds.includes(membership.orgId)) {
      return {
        success: false,
        error: "No tienes permisos para gestionar esta organización",
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
    if (groupId) {
      revalidatePath(`/g/${groupId}/dashboard/admin/users`);
    }

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
  groupId?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const scope = await getOrgManagementScope(groupId);

    const membership = await prisma.userOrganization.findUnique({
      where: { id: userOrgId },
    });

    if (!membership) {
      return {
        success: false,
        error: "Membresía no encontrada",
      };
    }

    if (!scope.isSuperAdmin && !scope.manageableOrgIds.includes(membership.orgId)) {
      return {
        success: false,
        error: "No tienes permisos para gestionar esta organización",
      };
    }

    if (!canEditRole(scope.role, membership.role, role)) {
      return {
        success: false,
        error: `No tienes permisos para asignar el rol ${ROLE_DISPLAY_NAMES[role]}`,
      };
    }

    await prisma.userOrganization.update({
      where: { id: userOrgId },
      data: {
        role,
        ...(role === MULTI_ORG_MANAGER_ROLE ? {} : { canManageUserOrganizations: false }),
      },
    });

    revalidatePath("/dashboard/admin/users");
    if (groupId) {
      revalidatePath(`/g/${groupId}/dashboard/admin/users`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user organization role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar rol",
    };
  }
}

/**
 * Actualiza el permiso de gestión multiempresa de una membresía
 */
export async function updateUserOrganizationManageFlag(
  userOrgId: string,
  canManageUserOrganizations: boolean,
  groupId?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const scope = await getOrgManagementScope(groupId);

    if (scope.role !== "SUPER_ADMIN" && scope.role !== "ORG_ADMIN") {
      return {
        success: false,
        error: "Solo Admin Org o Super Admin pueden asignar este permiso",
      };
    }

    const membership = await prisma.userOrganization.findUnique({
      where: { id: userOrgId },
    });

    if (!membership) {
      return {
        success: false,
        error: "Membresía no encontrada",
      };
    }

    if (membership.role !== MULTI_ORG_MANAGER_ROLE) {
      return {
        success: false,
        error: "Solo miembros HR Admin pueden tener este permiso",
      };
    }

    if (!scope.isSuperAdmin && !scope.manageableOrgIds.includes(membership.orgId)) {
      return {
        success: false,
        error: "No tienes permisos para gestionar esta organización",
      };
    }

    await prisma.userOrganization.update({
      where: { id: userOrgId },
      data: { canManageUserOrganizations },
    });

    revalidatePath("/dashboard/admin/users");
    if (groupId) {
      revalidatePath(`/g/${groupId}/dashboard/admin/users`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user organization manage flag:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar permiso",
    };
  }
}

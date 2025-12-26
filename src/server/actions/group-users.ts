"use server";

import { revalidatePath } from "next/cache";

import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateRole, canEditRole } from "@/services/permissions/role-hierarchy";

// ==========================================
// SEGURIDAD Y PERMISOS
// ==========================================

/**
 * Verifica si el usuario actual tiene permisos de administración sobre el grupo.
 * Roles permitidos: SUPER_ADMIN (global) o ORG_ADMIN/HR_ADMIN (dentro del grupo).
 */
async function getGroupContext(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");

  const userId = session.user.id;
  const userRole = session.user.role as Role;

  // 1. Super Admin siempre tiene acceso
  if (userRole === "SUPER_ADMIN") {
    return { userId, role: "SUPER_ADMIN" as Role, isSuperAdmin: true };
  }

  // 2. Verificar membresía en el grupo con rol adecuado
  const groupMembership = await prisma.organizationGroupUser.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    select: { role: true, isActive: true },
  });

  if (!groupMembership || !groupMembership.isActive) {
    throw new Error("FORBIDDEN: No eres miembro activo de este grupo");
  }

  // Solo ORG_ADMIN y HR_ADMIN pueden gestionar el grupo
  if (!["ORG_ADMIN", "HR_ADMIN"].includes(groupMembership.role)) {
    throw new Error("FORBIDDEN: Tu rol en el grupo no permite gestionar usuarios");
  }

  return { userId, role: groupMembership.role, isSuperAdmin: false };
}

// ==========================================
// TAB 1: ADMINISTRADORES DEL GRUPO
// ==========================================

export type GroupAdminRow = {
  id: string; // membership id
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

export async function getGroupAdmins(groupId: string): Promise<{
  success: boolean;
  admins?: GroupAdminRow[];
  viewerRole?: Role;
  error?: string;
}> {
  try {
    const context = await getGroupContext(groupId);

    const members = await prisma.organizationGroupUser.findMany({
      where: {
        groupId,
        user: {
          role: {
            not: "SUPER_ADMIN",
          },
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      admins: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        isActive: m.isActive,
        createdAt: m.createdAt.toISOString(),
      })),
      viewerRole: context.role,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al cargar administradores" };
  }
}

export async function addGroupAdmin(data: { groupId: string; email: string; role: Role }): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { role: currentUserRole } = await getGroupContext(data.groupId);

    // Validar permisos de asignación
    if (data.role === "SUPER_ADMIN") {
      return { success: false, error: "No se puede asignar SUPER_ADMIN a nivel de grupo" };
    }

    // HR_ADMIN solo puede crear HR_ADMIN o inferior (opcional, por ahora permitimos todo según specs)
    // "HR_ADMIN (scope=GROUP): puede gestionar miembros HR/ASSISTANT (no elevar a ORG_ADMIN)"
    if (currentUserRole === "HR_ADMIN" && data.role === "ORG_ADMIN") {
      return { success: false, error: "No tienes permisos para asignar administradores de organización" };
    }

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado con ese email" };
    }
    if (user.role === "SUPER_ADMIN") {
      return { success: false, error: "No puedes asignar un Super Admin a un grupo" };
    }

    // Verificar si ya existe
    const existing = await prisma.organizationGroupUser.findUnique({
      where: { groupId_userId: { groupId: data.groupId, userId: user.id } },
    });

    if (existing) {
      return { success: false, error: "El usuario ya es administrador de este grupo" };
    }

    await prisma.organizationGroupUser.create({
      data: {
        groupId: data.groupId,
        userId: user.id,
        role: data.role,
        isActive: true,
      },
    });

    revalidatePath(`/g/${data.groupId}/dashboard/admin/users`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al añadir administrador" };
  }
}

export async function updateGroupAdmin(data: { membershipId: string; role: Role }): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Primero obtener el groupId de la membresía para validar el contexto
    const membership = await prisma.organizationGroupUser.findUnique({
      where: { id: data.membershipId },
      select: { groupId: true, role: true },
    });

    if (!membership) return { success: false, error: "Membresía no encontrada" };

    const { role: currentUserRole } = await getGroupContext(membership.groupId);

    // Reglas de jerarquía
    if (data.role === "SUPER_ADMIN") {
      return { success: false, error: "No permitido" };
    }

    // Si soy HR_ADMIN, no puedo tocar a un ORG_ADMIN ni ascender a nadie a ORG_ADMIN
    if (currentUserRole === "HR_ADMIN") {
      if (membership.role === "ORG_ADMIN") {
        return { success: false, error: "No puedes modificar a un Administrador de Organización" };
      }
      if (data.role === "ORG_ADMIN") {
        return { success: false, error: "No puedes ascender a Administrador de Organización" };
      }
    }

    await prisma.organizationGroupUser.update({
      where: { id: data.membershipId },
      data: { role: data.role },
    });

    revalidatePath(`/g/${membership.groupId}/dashboard/admin/users`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar rol" };
  }
}

export async function removeGroupAdmin(membershipId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const membership = await prisma.organizationGroupUser.findUnique({
      where: { id: membershipId },
      select: { groupId: true, role: true },
    });

    if (!membership) return { success: false, error: "Membresía no encontrada" };

    const { role: currentUserRole } = await getGroupContext(membership.groupId);

    // Protección jerárquica
    if (currentUserRole === "HR_ADMIN" && membership.role === "ORG_ADMIN") {
      return { success: false, error: "No puedes eliminar a un Administrador de Organización" };
    }

    await prisma.organizationGroupUser.delete({
      where: { id: membershipId },
    });

    revalidatePath(`/g/${membership.groupId}/dashboard/admin/users`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al eliminar administrador" };
  }
}

// ==========================================
// TAB 2: DIRECTORIO GLOBAL
// ==========================================

export type DirectoryUserOrg = {
  orgId: string;
  orgName: string;
  role: Role;
  isActive: boolean;
};

export type DirectoryUserRow = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  baseStatus: boolean; // Estado base del usuario
  organizations: DirectoryUserOrg[]; // Badges
};

export async function getGroupDirectoryUsers(groupId: string): Promise<{
  success: boolean;
  users?: DirectoryUserRow[];
  organizations?: { id: string; name: string }[]; // Para filtros
  error?: string;
}> {
  try {
    await getGroupContext(groupId);

    // 1. Obtener todas las organizaciones del grupo
    const groupOrgs = await prisma.organizationGroupOrganization.findMany({
      where: { groupId, status: "ACTIVE" },
      select: { organization: { select: { id: true, name: true } } },
    });

    const orgIds = groupOrgs.map((groupOrg) => groupOrg.organization.id);
    const orgMap = new Map(groupOrgs.map((groupOrg) => [groupOrg.organization.id, groupOrg.organization.name]));

    if (orgIds.length === 0) {
      return {
        success: true,
        users: [],
        organizations: groupOrgs.map((groupOrg) => groupOrg.organization),
      };
    }

    // 2. Buscar usuarios que tengan AL MENOS una relación con estas organizaciones
    // Optimización: Buscamos en UserOrganization filtrando por orgIds
    const userOrgs = await prisma.userOrganization.findMany({
      where: {
        orgId: { in: orgIds },
        user: {
          role: {
            not: "SUPER_ADMIN",
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            active: true,
          },
        },
      },
    });

    // 3. Agrupar por Usuario
    // Un usuario puede aparecer varias veces en userOrgs (una por cada empresa)
    const usersMap = new Map<string, DirectoryUserRow>();

    for (const uo of userOrgs) {
      if (!usersMap.has(uo.userId)) {
        usersMap.set(uo.userId, {
          userId: uo.userId,
          name: uo.user.name,
          email: uo.user.email,
          image: uo.user.image,
          baseStatus: uo.user.active,
          organizations: [],
        });
      }

      const userEntry = usersMap.get(uo.userId)!;
      userEntry.organizations.push({
        orgId: uo.orgId,
        orgName: orgMap.get(uo.orgId) ?? "Desconocida",
        role: uo.role,
        isActive: uo.isActive,
      });
    }

    return {
      success: true,
      users: Array.from(usersMap.values()),
      organizations: groupOrgs.map((groupOrg) => groupOrg.organization),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al cargar directorio global" };
  }
}

export async function updateUserOrgAccessBulk(data: {
  userId: string;
  groupId: string;
  changes: { orgId: string; role?: Role; isActive?: boolean; remove?: boolean }[];
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getGroupContext(data.groupId);

    // Validamos que todas las orgs pertenezcan al grupo (seguridad)
    const groupOrgs = await prisma.organizationGroupOrganization.findMany({
      where: { groupId: data.groupId, status: "ACTIVE" },
      select: { organizationId: true },
    });
    const validOrgIds = new Set(groupOrgs.map((o) => o.organizationId));

    const [existingMemberships, user] = await Promise.all([
      prisma.userOrganization.findMany({
        where: {
          userId: data.userId,
          orgId: { in: Array.from(validOrgIds) },
        },
        select: {
          id: true,
          orgId: true,
          role: true,
          isDefault: true,
          isActive: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: data.userId },
        select: {
          employee: {
            select: {
              orgId: true,
            },
          },
        },
      }),
    ]);

    const membershipMap = new Map(existingMemberships.map((membership) => [membership.orgId, membership]));
    const employeeOrgId = user?.employee?.orgId ?? null;

    const transactions = [];

    for (const change of data.changes) {
      if (!validOrgIds.has(change.orgId)) continue; // Skip orgs fuera del grupo
      const existing = membershipMap.get(change.orgId);

      if (change.remove) {
        if (!existing) continue;
        if (existing.isDefault || (employeeOrgId && employeeOrgId === change.orgId)) {
          return { success: false, error: "No puedes eliminar la organización por defecto del empleado" };
        }
        if (!canEditRole(context.role, existing.role, existing.role)) {
          return { success: false, error: "No tienes permisos para eliminar este rol" };
        }
        transactions.push(
          prisma.userOrganization.deleteMany({
            where: { userId: data.userId, orgId: change.orgId },
          }),
        );
      } else {
        const targetRole = change.role ?? "EMPLOYEE";
        const hasEditPermission = !existing || !change.role || canEditRole(context.role, existing.role, change.role);
        const hasCreatePermission = existing ? true : canCreateRole(context.role, targetRole);

        if (!hasEditPermission || !hasCreatePermission) {
          return { success: false, error: "No tienes permisos para asignar ese rol" };
        }

        // Upsert: Crear si no existe, actualizar si existe
        transactions.push(
          prisma.userOrganization.upsert({
            where: { userId_orgId: { userId: data.userId, orgId: change.orgId } },
            create: {
              userId: data.userId,
              orgId: change.orgId,
              role: targetRole,
              isActive: change.isActive ?? true,
            },
            update: {
              ...(change.role ? { role: change.role } : {}),
              ...(change.isActive !== undefined ? { isActive: change.isActive } : {}),
            },
          }),
        );
      }
    }

    if (transactions.length === 0) {
      return { success: true };
    }

    await prisma.$transaction(transactions);

    revalidatePath(`/g/${data.groupId}/dashboard/admin/users`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar accesos" };
  }
}

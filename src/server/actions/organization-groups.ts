"use server";

import { revalidatePath } from "next/cache";

import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_DISPLAY_NAMES } from "@/services/permissions/role-hierarchy";

type GroupAdminContext = {
  userId: string;
  role: Role;
  orgId: string;
  email: string;
  name: string;
};

async function getGroupAdminContext(): Promise<GroupAdminContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  const role = session.user.role as Role;

  if (role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return {
    userId: session.user.id,
    role,
    orgId: session.user.orgId,
    email: session.user.email,
    name: session.user.name ?? session.user.email ?? "Superadmin",
  };
}

export type OrganizationGroupSummary = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  organizationsCount: number;
  membersCount: number;
  createdAt: string;
};

export async function listOrganizationGroups(): Promise<{
  success: boolean;
  groups?: OrganizationGroupSummary[];
  error?: string;
}> {
  try {
    await getGroupAdminContext();

    const groups = await prisma.organizationGroup.findMany({
      include: {
        _count: {
          select: {
            organizations: true,
            members: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        isActive: group.isActive,
        organizationsCount: group._count.organizations,
        membersCount: group._count.members,
        createdAt: group.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error listing organization groups:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar grupos",
    };
  }
}

export async function createOrganizationGroup(data: { name: string; description?: string | null }): Promise<{
  success: boolean;
  groupId?: string;
  error?: string;
}> {
  try {
    await getGroupAdminContext();

    const trimmedDescription = data.description?.trim();
    const normalizedDescription = trimmedDescription && trimmedDescription.length > 0 ? trimmedDescription : null;

    const group = await prisma.organizationGroup.create({
      data: {
        name: data.name.trim(),
        description: normalizedDescription,
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/admin/groups");

    return { success: true, groupId: group.id };
  } catch (error) {
    console.error("Error creating organization group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al crear el grupo",
    };
  }
}

export async function updateOrganizationGroup(data: {
  groupId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await getGroupAdminContext(data.groupId);

    const trimmedDescription = data.description?.trim();
    const normalizedDescription = trimmedDescription && trimmedDescription.length > 0 ? trimmedDescription : null;

    await prisma.organizationGroup.update({
      where: { id: data.groupId },
      data: {
        name: data.name.trim(),
        description: normalizedDescription,
        ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
      },
    });

    revalidatePath("/dashboard/admin/groups");

    return { success: true };
  } catch (error) {
    console.error("Error updating organization group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar el grupo",
    };
  }
}

export type GroupOrganizationItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  createdAt: string;
};

export async function listOrganizationGroupOrganizations(groupId: string): Promise<{
  success: boolean;
  organizations?: GroupOrganizationItem[];
  error?: string;
}> {
  try {
    await getGroupAdminContext(groupId);

    const organizations = await prisma.organizationGroupOrganization.findMany({
      where: { groupId },
      include: {
        organization: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      organizations: organizations.map((membership) => ({
        id: membership.id,
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        status: membership.status,
        createdAt: membership.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error listing group organizations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar organizaciones",
    };
  }
}

export type AvailableOrganizationItem = {
  id: string;
  name: string;
};

export async function listAvailableOrganizationsForGroup(groupId: string): Promise<{
  success: boolean;
  organizations?: AvailableOrganizationItem[];
  error?: string;
}> {
  try {
    await getGroupAdminContext(groupId);

    const existing = await prisma.organizationGroupOrganization.findMany({
      where: { groupId },
      select: { organizationId: true },
    });

    const existingIds = existing.map((item) => item.organizationId);

    const organizations = await prisma.organization.findMany({
      where: {
        active: true,
        id: { notIn: existingIds },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return { success: true, organizations };
  } catch (error) {
    console.error("Error listing available organizations for group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar organizaciones disponibles",
    };
  }
}

export async function addOrganizationToGroup(
  groupId: string,
  organizationId: string,
): Promise<{
  success: boolean;
  status?: "PENDING" | "ACTIVE";
  error?: string;
}> {
  try {
    const { userId } = await getGroupAdminContext(groupId);

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, active: true },
      select: { id: true },
    });

    if (!organization) {
      return { success: false, error: "La organización no existe o no está activa" };
    }

    const existing = await prisma.organizationGroupOrganization.findUnique({
      where: { groupId_organizationId: { groupId, organizationId } },
      select: { id: true },
    });

    if (existing) {
      return { success: false, error: "La organización ya está en el grupo" };
    }

    const status: "PENDING" | "ACTIVE" = "ACTIVE";
    const approvedById: string | null = userId;
    const approvedAt: Date | null = new Date();

    await prisma.organizationGroupOrganization.create({
      data: {
        groupId,
        organizationId,
        status,
        requestedById: userId,
        approvedById,
        approvedAt,
      },
    });

    revalidatePath("/dashboard/admin/groups");

    return { success: true, status };
  } catch (error) {
    console.error("Error adding organization to group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al añadir organización",
    };
  }
}

export async function approveOrganizationGroupOrganization(membershipId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await getGroupAdminContext();

    await prisma.organizationGroupOrganization.update({
      where: { id: membershipId },
      data: {
        status: "ACTIVE",
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/admin/groups");

    return { success: true };
  } catch (error) {
    console.error("Error approving organization group membership:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al aprobar organización",
    };
  }
}

export async function removeOrganizationFromGroup(membershipId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const membership = await prisma.organizationGroupOrganization.findUnique({
      where: { id: membershipId },
      select: { groupId: true, organizationId: true },
    });

    if (!membership) {
      return { success: false, error: "No se encontró la membresía" };
    }

    await getGroupAdminContext(membership.groupId);

    await prisma.$transaction(async (tx) => {
      await tx.organizationGroupOrganization.delete({
        where: { id: membershipId },
      });

      const groupMembers = await tx.organizationGroupUser.findMany({
        where: { groupId: membership.groupId },
        select: { userId: true },
      });

      const memberIds = groupMembers.map((member) => member.userId);
      if (memberIds.length === 0) {
        return;
      }

      const users = await tx.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, orgId: true },
      });

      const removableIds = users.filter((user) => user.orgId !== membership.organizationId).map((user) => user.id);
      if (removableIds.length === 0) {
        return;
      }

      await tx.userOrganization.deleteMany({
        where: {
          userId: { in: removableIds },
          orgId: membership.organizationId,
        },
      });
    });

    revalidatePath("/dashboard/admin/groups");

    return { success: true };
  } catch (error) {
    console.error("Error removing organization from group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar organización",
    };
  }
}

export type GroupMemberItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

export async function listOrganizationGroupMembers(groupId: string): Promise<{
  success: boolean;
  members?: GroupMemberItem[];
  error?: string;
}> {
  try {
    await getGroupAdminContext(groupId);

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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        isActive: member.isActive,
      })),
    };
  } catch (error) {
    console.error("Error listing group members:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar miembros",
    };
  }
}

export type AvailableGroupUserItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgId: string;
};

export async function listAvailableGroupUsers(groupId: string): Promise<{
  success: boolean;
  users?: AvailableGroupUserItem[];
  error?: string;
}> {
  try {
    await getGroupAdminContext(groupId);

    const existingMembers = await prisma.organizationGroupUser.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const existingIds = existingMembers.map((member) => member.userId);

    const users = await prisma.user.findMany({
      where: {
        active: true,
        id: { notIn: existingIds },
        role: {
          notIn: ["SUPER_ADMIN", "EMPLOYEE"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        orgId: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error listing available group users:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar usuarios disponibles",
    };
  }
}

export async function addOrganizationGroupMember(
  groupId: string,
  userId: string,
  role: Role,
  orgIds: string[],
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await getGroupAdminContext(groupId);

    if (role === "SUPER_ADMIN") {
      return {
        success: false,
        error: `No puedes asignar el rol ${ROLE_DISPLAY_NAMES[role]}`,
      };
    }

    if (orgIds.length === 0) {
      return { success: false, error: "Selecciona al menos una organización válida" };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        orgId: true,
      },
    });

    if (!targetUser) {
      return { success: false, error: "Usuario no encontrado" };
    }

    if (targetUser.role === "SUPER_ADMIN") {
      return { success: false, error: "No puedes asignar un SUPER_ADMIN a un grupo" };
    }

    if (targetUser.role === "EMPLOYEE") {
      return { success: false, error: "Este usuario ya es empleado de una organización y no puede unirse a grupos." };
    }

    if (role === "HR_ADMIN") {
      const existingHrAdmin = await prisma.organizationGroupUser.findFirst({
        where: {
          userId,
          role: "HR_ADMIN",
          isActive: true,
          groupId: { not: groupId },
        },
        select: { id: true },
      });

      if (existingHrAdmin) {
        return { success: false, error: "Este usuario ya es HR Admin global de otro grupo" };
      }
    }

    const groupOrgs = await prisma.organizationGroupOrganization.findMany({
      where: { groupId, status: "ACTIVE", organization: { active: true } },
      select: { organizationId: true },
    });
    const validOrgIds = new Set(groupOrgs.map((groupOrg) => groupOrg.organizationId));
    const cleanedOrgIds = orgIds.filter((orgId) => validOrgIds.has(orgId));

    if (cleanedOrgIds.length === 0) {
      return { success: false, error: "Selecciona al menos una organización activa del grupo" };
    }

    const baseOrgId = targetUser.orgId;

    for (const orgId of cleanedOrgIds) {
      if (targetUser.role === "SUPER_ADMIN") {
        return { success: false, error: "No puedes asignar SUPER_ADMIN en una empresa" };
      }
      if (targetUser.role === "EMPLOYEE" && orgId !== baseOrgId) {
        return {
          success: false,
          error: "No puedes asignar EMPLOYEE fuera de la organización principal del usuario",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationGroupUser.create({
        data: {
          groupId,
          userId,
          role,
          isActive: true,
        },
      });

      const assignments = cleanedOrgIds.map((orgId) => ({
        orgId,
        role: targetUser.role,
      }));

      const hasBaseAssignment = baseOrgId ? assignments.some((assignment) => assignment.orgId === baseOrgId) : false;
      const baseAssignment =
        baseOrgId && !hasBaseAssignment
          ? {
              orgId: baseOrgId,
              role: targetUser.role,
            }
          : null;

      for (const assignment of assignments) {
        await tx.userOrganization.upsert({
          where: { userId_orgId: { userId, orgId: assignment.orgId } },
          create: {
            userId,
            orgId: assignment.orgId,
            role: assignment.role,
            isActive: true,
          },
          update: {
            role: assignment.role,
            isActive: true,
          },
        });
      }

      if (baseAssignment) {
        await tx.userOrganization.upsert({
          where: { userId_orgId: { userId, orgId: baseAssignment.orgId } },
          create: {
            userId,
            orgId: baseAssignment.orgId,
            role: baseAssignment.role,
            isActive: true,
          },
          update: {
            role: baseAssignment.role,
            isActive: true,
          },
        });
      }
    });

    revalidatePath("/dashboard/admin/groups");

    return { success: true };
  } catch (error) {
    console.error("Error adding group member:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al añadir miembro",
    };
  }
}

export async function updateOrganizationGroupMember(data: {
  membershipId: string;
  role?: Role;
  isActive?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const membership = await prisma.organizationGroupUser.findUnique({
      where: { id: data.membershipId },
    });

    if (!membership) {
      return { success: false, error: "Membresía no encontrada" };
    }

    await getGroupAdminContext(membership.groupId);

    if (data.role === "SUPER_ADMIN") {
      return {
        success: false,
        error: `No puedes asignar el rol ${ROLE_DISPLAY_NAMES[data.role]}`,
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: membership.userId },
      select: { role: true },
    });

    if (targetUser?.role === "SUPER_ADMIN") {
      return { success: false, error: "No puedes gestionar miembros SUPER_ADMIN en grupos" };
    }

    if (data.role === "HR_ADMIN") {
      const existingHrAdmin = await prisma.organizationGroupUser.findFirst({
        where: {
          userId: membership.userId,
          role: "HR_ADMIN",
          isActive: true,
          groupId: { not: membership.groupId },
        },
        select: { id: true },
      });

      if (existingHrAdmin) {
        return { success: false, error: "Este usuario ya es HR Admin global de otro grupo" };
      }
    }

    await prisma.organizationGroupUser.update({
      where: { id: data.membershipId },
      data: {
        ...(data.role ? { role: data.role } : {}),
        ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
      },
    });

    revalidatePath("/dashboard/admin/groups");

    return { success: true };
  } catch (error) {
    console.error("Error updating group member:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar miembro",
    };
  }
}

export async function removeOrganizationGroupMember(membershipId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const membership = await prisma.organizationGroupUser.findUnique({
      where: { id: membershipId },
      select: { groupId: true, userId: true },
    });

    if (!membership) {
      return { success: false, error: "Membresía no encontrada" };
    }

    await getGroupAdminContext(membership.groupId);

    await prisma.$transaction(async (tx) => {
      await tx.organizationGroupUser.delete({
        where: { id: membershipId },
      });

      const groupOrgs = await tx.organizationGroupOrganization.findMany({
        where: { groupId: membership.groupId, status: "ACTIVE" },
        select: { organizationId: true },
      });
      const groupOrgIds = groupOrgs.map((groupOrg) => groupOrg.organizationId);
      if (groupOrgIds.length === 0) {
        return;
      }

      const user = await tx.user.findUnique({
        where: { id: membership.userId },
        select: {
          orgId: true,
          employee: {
            select: { orgId: true },
          },
        },
      });

      const protectedOrgIds = new Set<string>();
      if (user?.orgId) {
        protectedOrgIds.add(user.orgId);
      }
      if (user?.employee?.orgId) {
        protectedOrgIds.add(user.employee.orgId);
      }

      const removableOrgIds = groupOrgIds.filter((orgId) => !protectedOrgIds.has(orgId));
      if (removableOrgIds.length === 0) {
        return;
      }

      await tx.userOrganization.deleteMany({
        where: {
          userId: membership.userId,
          orgId: { in: removableOrgIds },
        },
      });
    });

    revalidatePath("/dashboard/admin/groups");

    return { success: true };
  } catch (error) {
    console.error("Error removing group member:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar miembro",
    };
  }
}

export async function deactivateOrganizationGroup(groupId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getGroupAdminContext();

    const group = await prisma.organizationGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            organizations: true,
            members: true,
          },
        },
      },
    });

    if (!group) {
      return { success: false, error: "Grupo no encontrado" };
    }

    if (!group.isActive) {
      return { success: false, error: "El grupo ya está inactivo" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          action: "DEACTIVATE_GROUP",
          category: "GROUP",
          entityId: group.id,
          entityType: "OrganizationGroup",
          entityData: {
            name: group.name,
            organizationsCount: group._count.organizations,
            membersCount: group._count.members,
          },
          description: `Baja del grupo ${group.name}.`,
          performedById: context.userId,
          performedByEmail: context.email,
          performedByName: context.name,
          performedByRole: context.role,
          orgId: context.orgId,
        },
      });

      await tx.organizationGroup.update({
        where: { id: group.id },
        data: { isActive: false },
      });
    });

    revalidatePath("/dashboard/admin/groups");
    revalidatePath("/dashboard/admin/organizations");

    return { success: true };
  } catch (error) {
    console.error("Error deactivating organization group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al dar de baja el grupo",
    };
  }
}

export async function reactivateOrganizationGroup(groupId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getGroupAdminContext();

    const group = await prisma.organizationGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            organizations: true,
            members: true,
          },
        },
      },
    });

    if (!group) {
      return { success: false, error: "Grupo no encontrado" };
    }

    if (group.isActive) {
      return { success: false, error: "El grupo ya está activo" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          action: "REACTIVATE_GROUP",
          category: "GROUP",
          entityId: group.id,
          entityType: "OrganizationGroup",
          entityData: {
            name: group.name,
            organizationsCount: group._count.organizations,
            membersCount: group._count.members,
          },
          description: `Reactivación del grupo ${group.name}.`,
          performedById: context.userId,
          performedByEmail: context.email,
          performedByName: context.name,
          performedByRole: context.role,
          orgId: context.orgId,
        },
      });

      await tx.organizationGroup.update({
        where: { id: group.id },
        data: { isActive: true },
      });
    });

    revalidatePath("/dashboard/admin/groups");
    revalidatePath("/dashboard/admin/organizations");

    return { success: true };
  } catch (error) {
    console.error("Error reactivating organization group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al reactivar el grupo",
    };
  }
}

export async function deleteOrganizationGroup(groupId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getGroupAdminContext();

    const group = await prisma.organizationGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            organizations: true,
            members: true,
          },
        },
      },
    });

    if (!group) {
      return { success: false, error: "Grupo no encontrado" };
    }

    if (group.isActive) {
      return { success: false, error: "Debes dar de baja el grupo antes de eliminarlo" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          action: "DELETE_GROUP",
          category: "GROUP",
          entityId: group.id,
          entityType: "OrganizationGroup",
          entityData: {
            name: group.name,
            organizationsCount: group._count.organizations,
            membersCount: group._count.members,
          },
          description: `Eliminación hard del grupo ${group.name}.`,
          performedById: context.userId,
          performedByEmail: context.email,
          performedByName: context.name,
          performedByRole: context.role,
          orgId: context.orgId,
        },
      });

      await tx.organizationGroup.delete({
        where: { id: group.id },
      });
    });

    revalidatePath("/dashboard/admin/groups");
    revalidatePath("/dashboard/admin/organizations");

    return { success: true };
  } catch (error) {
    console.error("Error deleting organization group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar el grupo",
    };
  }
}

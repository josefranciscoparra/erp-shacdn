"use server";

import { revalidatePath } from "next/cache";

import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_DISPLAY_NAMES } from "@/services/permissions/role-hierarchy";

type GroupAdminContext = {
  userId: string;
  role: Role;
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
  return { userId: session.user.id, role };
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
      select: { groupId: true },
    });

    if (!membership) {
      return { success: false, error: "No se encontró la membresía" };
    }

    await getGroupAdminContext(membership.groupId);

    await prisma.organizationGroupOrganization.delete({
      where: { id: membershipId },
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
      where: { groupId },
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
      },
      select: {
        id: true,
        name: true,
        email: true,
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

export async function addOrganizationGroupMember(data: { groupId: string; userId: string; role: Role }): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await getGroupAdminContext(data.groupId);

    if (data.role === "SUPER_ADMIN") {
      return {
        success: false,
        error: `No puedes asignar el rol ${ROLE_DISPLAY_NAMES[data.role]}`,
      };
    }

    await prisma.organizationGroupUser.create({
      data: {
        groupId: data.groupId,
        userId: data.userId,
        role: data.role,
        isActive: true,
      },
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
      select: { groupId: true },
    });

    if (!membership) {
      return { success: false, error: "Membresía no encontrada" };
    }

    await getGroupAdminContext(membership.groupId);

    await prisma.organizationGroupUser.delete({
      where: { id: membershipId },
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

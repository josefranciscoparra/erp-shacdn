"use server";

import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type GroupViewerContext = {
  userId: string;
  role: Role;
  isSuperAdmin: boolean;
};

const GROUP_MANAGE_ROLES: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

async function getGroupViewerContext(groupId: string): Promise<GroupViewerContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  const role = session.user.role as Role;

  if (role === "SUPER_ADMIN") {
    return { userId: session.user.id, role, isSuperAdmin: true };
  }

  const membership = await prisma.organizationGroupUser.findFirst({
    where: {
      groupId,
      userId: session.user.id,
      isActive: true,
      group: { isActive: true },
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  return { userId: session.user.id, role: membership.role, isSuperAdmin: false };
}

export type GroupOverview = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  viewerRole: Role | null;
};

export async function getOrganizationGroupOverview(groupId: string): Promise<{
  success: boolean;
  data?: GroupOverview;
  error?: string;
}> {
  try {
    const context = await getGroupViewerContext(groupId);

    const group = await prisma.organizationGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
    });

    if (!group) {
      return { success: false, error: "Grupo no encontrado" };
    }

    if (!group.isActive && !context.isSuperAdmin) {
      return { success: false, error: "Grupo inactivo" };
    }

    return {
      success: true,
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        isActive: group.isActive,
        viewerRole: context.isSuperAdmin ? null : context.role,
      },
    };
  } catch (error) {
    console.error("Error loading group overview:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar el grupo",
    };
  }
}

export type GroupOrganizationSummary = {
  id: string;
  name: string;
  status: "ACTIVE" | "PENDING" | "REJECTED";
};

export type ManageableGroupSummary = {
  id: string;
  name: string;
  role: Role;
};

export async function listManageableGroupsForUser(): Promise<{
  success: boolean;
  groups?: ManageableGroupSummary[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "UNAUTHENTICATED" };
    }

    if (session.user.role === "SUPER_ADMIN") {
      return { success: true, groups: [] };
    }

    const memberships = await prisma.organizationGroupUser.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        role: { in: GROUP_MANAGE_ROLES },
        group: { isActive: true },
      },
      select: {
        role: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const groups = memberships
      .map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        role: membership.role,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, groups };
  } catch (error) {
    console.error("Error listing manageable groups:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar grupos",
    };
  }
}

export async function listGroupOrganizationsForViewer(groupId: string): Promise<{
  success: boolean;
  organizations?: GroupOrganizationSummary[];
  error?: string;
}> {
  try {
    const context = await getGroupViewerContext(groupId);

    const organizations = await prisma.organizationGroupOrganization.findMany({
      where: {
        groupId,
        ...(context.isSuperAdmin ? {} : { status: "ACTIVE" }),
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.organization.name,
        status: org.status,
      })),
    };
  } catch (error) {
    console.error("Error loading group organizations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar organizaciones",
    };
  }
}

export type GroupMemberSummary = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

export async function listGroupMembersForViewer(groupId: string): Promise<{
  success: boolean;
  members?: GroupMemberSummary[];
  error?: string;
}> {
  try {
    const context = await getGroupViewerContext(groupId);

    const members = await prisma.organizationGroupUser.findMany({
      where: {
        groupId,
        user: {
          role: { not: "SUPER_ADMIN" },
        },
        ...(context.isSuperAdmin ? {} : { isActive: true }),
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
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        isActive: member.isActive,
      })),
    };
  } catch (error) {
    console.error("Error loading group members:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar miembros",
    };
  }
}

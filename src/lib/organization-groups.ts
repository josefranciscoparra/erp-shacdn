import { type Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AccessibleGroup = {
  id: string;
  name: string;
  role: Role | null;
};

const GROUP_ROLE_CAN_MANAGE_USERS: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

export async function listAccessibleGroupsForUser(userId: string, role: Role): Promise<AccessibleGroup[]> {
  if (role === "SUPER_ADMIN") {
    const groups = await prisma.organizationGroup.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      role: null,
    }));
  }

  const groupMemberships = await prisma.organizationGroupUser.findMany({
    where: {
      userId,
      isActive: true,
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

  const groupMap = new Map<string, AccessibleGroup>();

  groupMemberships.forEach((membership) => {
    groupMap.set(membership.group.id, {
      id: membership.group.id,
      name: membership.group.name,
      role: membership.role,
    });
  });

  return Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGroupOrganizationIds(groupId: string): Promise<string[]> {
  const memberships = await prisma.organizationGroupOrganization.findMany({
    where: {
      groupId,
      status: "ACTIVE",
      organization: { active: true },
    },
    select: {
      organizationId: true,
    },
  });

  return memberships.map((membership) => membership.organizationId);
}

export async function getGroupManagedOrganizationIds(userId: string): Promise<string[]> {
  const groupMemberships = await prisma.organizationGroupUser.findMany({
    where: {
      userId,
      isActive: true,
      group: { isActive: true },
      role: { in: GROUP_ROLE_CAN_MANAGE_USERS },
    },
    select: {
      groupId: true,
    },
  });

  const groupIds = groupMemberships.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    return [];
  }

  const organizations = await prisma.organizationGroupOrganization.findMany({
    where: {
      groupId: { in: groupIds },
      status: "ACTIVE",
      organization: { active: true },
    },
    select: {
      organizationId: true,
    },
  });

  const orgIds = organizations.map((membership) => membership.organizationId);
  return Array.from(new Set(orgIds));
}

export async function getOrganizationGroupScope(orgId: string): Promise<{
  groupId: string;
  organizationIds: string[];
} | null> {
  const membership = await prisma.organizationGroupOrganization.findFirst({
    where: {
      organizationId: orgId,
      status: "ACTIVE",
      group: { isActive: true },
    },
    select: {
      groupId: true,
    },
  });

  if (!membership) {
    return null;
  }

  const organizationIds = await getGroupOrganizationIds(membership.groupId);

  return {
    groupId: membership.groupId,
    organizationIds,
  };
}

export async function canManageGroupUsers(userId: string, groupId: string): Promise<boolean> {
  const membership = await prisma.organizationGroupUser.findFirst({
    where: {
      userId,
      groupId,
      isActive: true,
      role: { in: GROUP_ROLE_CAN_MANAGE_USERS },
      group: { isActive: true },
    },
    select: { id: true },
  });

  return !!membership;
}

import type { Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

type EnsureUserOrganizationParams = {
  db?: PrismaClientLike;
  userId: string;
  orgId: string;
  role: Role;
  isDefault?: boolean;
  canManageUserOrganizations?: boolean;
};

export async function ensureUserOrganization(params: EnsureUserOrganizationParams) {
  const { db = prisma, userId, orgId, role, isDefault: desiredDefault, canManageUserOrganizations = false } = params;

  if (role === "SUPER_ADMIN") {
    return null;
  }

  const existing = await db.userOrganization.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
    select: { id: true, role: true },
  });

  if (existing) {
    if (existing.role !== role) {
      return await db.userOrganization.update({
        where: { id: existing.id },
        data: { role },
        select: { id: true },
      });
    }

    return { id: existing.id };
  }

  const hasDefault = await db.userOrganization.findFirst({
    where: {
      userId,
      isDefault: true,
    },
    select: { id: true },
  });

  const isDefault = desiredDefault ?? !hasDefault;

  return await db.userOrganization.create({
    data: {
      userId,
      orgId,
      role,
      isDefault,
      isActive: true,
      canManageUserOrganizations,
    },
    select: { id: true },
  });
}

"use server";

import { revalidatePath } from "next/cache";

import { auth, updateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function switchActiveOrganization(orgId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  // SUPER_ADMIN puede acceder a cualquier organización activa
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let organization: { id: string; name: string | null } | null = null;

  if (isSuperAdmin) {
    // Para SUPER_ADMIN, verificar que la organización existe y está activa
    const org = await prisma.organization.findFirst({
      where: {
        id: orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
    });
    organization = org;
  } else {
    // Para otros roles, verificar membresía
    const membership = await prisma.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        orgId,
        isActive: true,
        organization: { active: true },
      },
      select: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    organization = membership?.organization ?? null;
  }

  if (!organization) {
    throw new Error("NO_ACCESS_TO_ORG");
  }

  await prisma.$transaction([
    prisma.userOrganization.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    }),
    prisma.userOrganization.updateMany({
      where: { userId: session.user.id, orgId },
      data: { isDefault: true },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { orgId },
    }),
    prisma.userActiveContext.upsert({
      where: { userId: session.user.id },
      update: { orgId },
      create: {
        userId: session.user.id,
        orgId,
      },
    }),
  ]);

  await updateSession({
    user: {
      orgId,
      activeOrgId: orgId,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/me");

  return {
    success: true,
    organization,
  };
}

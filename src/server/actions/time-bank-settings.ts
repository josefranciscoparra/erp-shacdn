"use server";

import { TimeBankApprovalFlow } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getTimeBankApprovalSettings(): Promise<{ approvalFlow: TimeBankApprovalFlow }> {
  const session = await auth();

  if (!session?.user?.orgId) {
    throw new Error("Usuario no autenticado o sin organización");
  }

  const settings = await prisma.timeBankSettings.findUnique({
    where: { orgId: session.user.orgId },
    select: {
      approvalFlow: true,
    },
  });

  return {
    approvalFlow: settings?.approvalFlow ?? "MIRROR_PTO",
  };
}

export async function updateTimeBankApprovalSettings(approvalFlow: TimeBankApprovalFlow) {
  const session = await auth();

  if (!session?.user?.orgId) {
    throw new Error("Usuario no autenticado o sin organización");
  }

  await prisma.timeBankSettings.upsert({
    where: { orgId: session.user.orgId },
    update: {
      approvalFlow,
    },
    create: {
      orgId: session.user.orgId,
      approvalFlow,
    },
  });

  return { success: true };
}

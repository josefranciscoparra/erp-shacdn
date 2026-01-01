"use server";

import { redirect, notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { getModuleAvailability, type ModuleAvailability, type ModuleKey } from "@/lib/organization-modules";
import { prisma } from "@/lib/prisma";

type OrganizationModuleState = {
  availability: ModuleAvailability;
  org: {
    chatEnabled: boolean;
    shiftsEnabled: boolean;
    whistleblowingEnabled: boolean;
  };
};

export async function getOrganizationModuleState(): Promise<OrganizationModuleState> {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const orgId = session.user.activeOrgId ?? session.user.orgId;

  if (!orgId) {
    redirect("/dashboard");
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      features: true,
      chatEnabled: true,
      shiftsEnabled: true,
      whistleblowingEnabled: true,
    },
  });

  if (!org) {
    notFound();
  }

  return {
    availability: getModuleAvailability(org.features),
    org: {
      chatEnabled: org.chatEnabled,
      shiftsEnabled: org.shiftsEnabled,
      whistleblowingEnabled: org.whistleblowingEnabled,
    },
  };
}

export async function isModuleAvailableForOrg(orgId: string, moduleKey: ModuleKey): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { features: true },
  });

  if (!org) {
    return false;
  }

  const availability = getModuleAvailability(org.features);
  return Boolean(availability[moduleKey]);
}

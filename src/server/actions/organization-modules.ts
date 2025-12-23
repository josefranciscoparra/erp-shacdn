"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  getModuleAvailability,
  mergeModuleAvailability,
  type ModuleAvailability,
  type ModuleKey,
} from "@/lib/organization-modules";
import { prisma } from "@/lib/prisma";

type ModuleEnabledState = {
  chatEnabled: boolean;
  shiftsEnabled: boolean;
  geolocationEnabled: boolean;
  whistleblowingEnabled: boolean;
};

type ModuleAvailabilityResult = {
  success: boolean;
  modules: ModuleAvailability;
  enabled: ModuleEnabledState;
};

export async function updateOrganizationModuleAvailability(
  moduleKey: ModuleKey,
  available: boolean,
): Promise<ModuleAvailabilityResult> {
  const session = await auth();

  if (!session?.user?.orgId) {
    throw new Error("NO_AUTH");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("NO_PERMISSION");
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { features: true },
  });

  if (!org) {
    throw new Error("ORG_NOT_FOUND");
  }

  const nextFeatures = mergeModuleAvailability(org.features, { [moduleKey]: available });
  const data: {
    features: Record<string, unknown>;
    chatEnabled?: boolean;
    shiftsEnabled?: boolean;
    geolocationEnabled?: boolean;
    whistleblowingEnabled?: boolean;
  } = { features: nextFeatures };

  if (!available) {
    if (moduleKey === "chat") data.chatEnabled = false;
    if (moduleKey === "shifts") data.shiftsEnabled = false;
    if (moduleKey === "geolocation") data.geolocationEnabled = false;
    if (moduleKey === "whistleblowing") data.whistleblowingEnabled = false;
  }

  const updated = await prisma.organization.update({
    where: { id: session.user.orgId },
    data,
    select: {
      features: true,
      chatEnabled: true,
      shiftsEnabled: true,
      geolocationEnabled: true,
      whistleblowingEnabled: true,
    },
  });

  const modules = getModuleAvailability(updated.features);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/superadmin");

  return {
    success: true,
    modules,
    enabled: {
      chatEnabled: updated.chatEnabled,
      shiftsEnabled: updated.shiftsEnabled,
      geolocationEnabled: updated.geolocationEnabled,
      whistleblowingEnabled: updated.whistleblowingEnabled,
    },
  };
}

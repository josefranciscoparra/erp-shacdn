"use server";

import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const DEFAULT_GLOBAL_TIME_TRACKING_SCHEDULER = {
  timeTrackingSweepEnabled: true,
  timeTrackingSweepHour: 4,
  timeTrackingSweepStartMinute: 0,
  timeTrackingSweepEndHour: 4,
  timeTrackingSweepEndMinute: 20,
  timeTrackingSweepWindowMinutes: 20,
  timeTrackingSweepLookbackDays: 1,
  timeTrackingDispatchIntervalMinutes: 10,
} as const;

type SuperAdminContext = {
  userId: string;
  role: Role;
  orgId: string;
  email: string;
  name: string;
};

async function requireSuperAdmin(): Promise<SuperAdminContext> {
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

export interface GlobalTimeTrackingSchedulerSettings {
  timeTrackingSweepEnabled: boolean;
  timeTrackingSweepHour: number;
  timeTrackingSweepStartMinute: number;
  timeTrackingSweepEndHour: number;
  timeTrackingSweepEndMinute: number;
  timeTrackingSweepLookbackDays: number;
  timeTrackingDispatchIntervalMinutes: number;
}

function normalizeGlobalSettings(
  settings: {
    timeTrackingSweepEnabled: boolean;
    timeTrackingSweepHour: number;
    timeTrackingSweepStartMinute: number;
    timeTrackingSweepEndHour: number;
    timeTrackingSweepEndMinute: number;
    timeTrackingSweepWindowMinutes: number;
    timeTrackingSweepLookbackDays: number;
    timeTrackingDispatchIntervalMinutes: number;
  } | null,
): GlobalTimeTrackingSchedulerSettings {
  const fallbackWindowMinutes =
    typeof settings?.timeTrackingSweepWindowMinutes === "number"
      ? settings.timeTrackingSweepWindowMinutes
      : DEFAULT_GLOBAL_TIME_TRACKING_SCHEDULER.timeTrackingSweepWindowMinutes;
  return {
    timeTrackingSweepEnabled:
      typeof settings?.timeTrackingSweepEnabled === "boolean"
        ? settings.timeTrackingSweepEnabled
        : DEFAULT_GLOBAL_TIME_TRACKING_SCHEDULER.timeTrackingSweepEnabled,
    timeTrackingSweepHour:
      typeof settings?.timeTrackingSweepHour === "number"
        ? settings.timeTrackingSweepHour
        : DEFAULT_GLOBAL_TIME_TRACKING_SCHEDULER.timeTrackingSweepHour,
    timeTrackingSweepStartMinute:
      typeof settings?.timeTrackingSweepStartMinute === "number"
        ? settings.timeTrackingSweepStartMinute
        : DEFAULT_GLOBAL_TIME_TRACKING_SCHEDULER.timeTrackingSweepStartMinute,
    timeTrackingSweepEndHour:
      typeof settings?.timeTrackingSweepEndHour === "number"
        ? settings.timeTrackingSweepEndHour
        : (DEFAULT_GLOBAL_TIME_TRACKING_SCHEDULER.timeTrackingSweepHour + Math.floor(fallbackWindowMinutes / 60)) % 24,
    timeTrackingSweepEndMinute:
      typeof settings?.timeTrackingSweepEndMinute === "number"
        ? settings.timeTrackingSweepEndMinute
        : fallbackWindowMinutes % 60,
    timeTrackingSweepLookbackDays:
      typeof settings?.timeTrackingSweepLookbackDays === "number"
        ? settings.timeTrackingSweepLookbackDays
        : DEFAULT_GLOBAL_TIME_TRACKING_SCHEDULER.timeTrackingSweepLookbackDays,
    timeTrackingDispatchIntervalMinutes:
      typeof settings?.timeTrackingDispatchIntervalMinutes === "number"
        ? settings.timeTrackingDispatchIntervalMinutes
        : DEFAULT_GLOBAL_TIME_TRACKING_SCHEDULER.timeTrackingDispatchIntervalMinutes,
  };
}

async function fetchGlobalSettings() {
  return prisma.globalSettings.findUnique({
    where: { id: "global" },
    select: {
      timeTrackingSweepEnabled: true,
      timeTrackingSweepHour: true,
      timeTrackingSweepStartMinute: true,
      timeTrackingSweepEndHour: true,
      timeTrackingSweepEndMinute: true,
      timeTrackingSweepWindowMinutes: true,
      timeTrackingSweepLookbackDays: true,
      timeTrackingDispatchIntervalMinutes: true,
    },
  });
}

export async function getGlobalTimeTrackingSchedulerSettings(): Promise<GlobalTimeTrackingSchedulerSettings> {
  await requireSuperAdmin();
  const settings = await fetchGlobalSettings();
  return normalizeGlobalSettings(settings);
}

export async function getGlobalTimeTrackingSchedulerSummary(): Promise<GlobalTimeTrackingSchedulerSettings> {
  const authz = await safePermission("manage_organization");
  if (!authz.ok) {
    throw new Error("No tienes permisos para ver la configuración global");
  }

  const settings = await fetchGlobalSettings();
  return normalizeGlobalSettings(settings);
}

export async function updateGlobalTimeTrackingSchedulerSettings(
  data: GlobalTimeTrackingSchedulerSettings,
): Promise<{ success: boolean }> {
  const context = await requireSuperAdmin();

  if (data.timeTrackingSweepHour < 0 || data.timeTrackingSweepHour > 23) {
    throw new Error("La hora del barrido debe estar entre 0 y 23");
  }
  if (data.timeTrackingSweepStartMinute < 0 || data.timeTrackingSweepStartMinute > 59) {
    throw new Error("Los minutos de inicio deben estar entre 0 y 59");
  }
  if (data.timeTrackingSweepEndHour < 0 || data.timeTrackingSweepEndHour > 23) {
    throw new Error("La hora fin del barrido debe estar entre 0 y 23");
  }
  if (data.timeTrackingSweepEndMinute < 0 || data.timeTrackingSweepEndMinute > 59) {
    throw new Error("Los minutos de fin deben estar entre 0 y 59");
  }
  const startMinutes = data.timeTrackingSweepHour * 60 + data.timeTrackingSweepStartMinute;
  const endMinutes = data.timeTrackingSweepEndHour * 60 + data.timeTrackingSweepEndMinute;
  const windowMinutes = (endMinutes - startMinutes + 24 * 60) % (24 * 60);
  if (windowMinutes === 0 || windowMinutes < 5) {
    throw new Error("La ventana del barrido debe ser de al menos 5 minutos");
  }
  if (data.timeTrackingSweepLookbackDays < 1 || data.timeTrackingSweepLookbackDays > 14) {
    throw new Error("El barrido solo puede mirar entre 1 y 14 días hacia atrás");
  }
  if (data.timeTrackingDispatchIntervalMinutes < 1 || data.timeTrackingDispatchIntervalMinutes > 60) {
    throw new Error("El intervalo debe estar entre 1 y 60 minutos");
  }

  const previous = await fetchGlobalSettings();

  await prisma.globalSettings.upsert({
    where: { id: "global" },
    update: {
      timeTrackingSweepEnabled: data.timeTrackingSweepEnabled,
      timeTrackingSweepHour: data.timeTrackingSweepHour,
      timeTrackingSweepStartMinute: data.timeTrackingSweepStartMinute,
      timeTrackingSweepEndHour: data.timeTrackingSweepEndHour,
      timeTrackingSweepEndMinute: data.timeTrackingSweepEndMinute,
      timeTrackingSweepWindowMinutes: windowMinutes,
      timeTrackingSweepLookbackDays: data.timeTrackingSweepLookbackDays,
      timeTrackingDispatchIntervalMinutes: data.timeTrackingDispatchIntervalMinutes,
    },
    create: {
      id: "global",
      timeTrackingSweepEnabled: data.timeTrackingSweepEnabled,
      timeTrackingSweepHour: data.timeTrackingSweepHour,
      timeTrackingSweepStartMinute: data.timeTrackingSweepStartMinute,
      timeTrackingSweepEndHour: data.timeTrackingSweepEndHour,
      timeTrackingSweepEndMinute: data.timeTrackingSweepEndMinute,
      timeTrackingSweepWindowMinutes: windowMinutes,
      timeTrackingSweepLookbackDays: data.timeTrackingSweepLookbackDays,
      timeTrackingDispatchIntervalMinutes: data.timeTrackingDispatchIntervalMinutes,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "GLOBAL_TIME_TRACKING_SCHEDULER_UPDATED",
      category: "SETTINGS",
      entityId: "global",
      entityType: "GlobalSettings",
      entityData: {
        previous: previous ?? DEFAULT_GLOBAL_TIME_TRACKING_SCHEDULER,
        next: {
          ...data,
          timeTrackingSweepWindowMinutes: windowMinutes,
        },
      },
      actorId: context.userId,
      orgId: context.orgId,
    },
  });

  return { success: true };
}

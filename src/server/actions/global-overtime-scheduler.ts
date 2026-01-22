"use server";

import type { Role, Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const DEFAULT_GLOBAL_OVERTIME_SCHEDULER = {
  overtimeReconciliationWeekday: 1,
  overtimeReconciliationHour: 4,
  overtimeReconciliationWindowMinutes: 20,
  overtimeReconciliationDispatchIntervalMinutes: 10,
  overtimeDailySweepHour: 4,
  overtimeDailySweepWindowMinutes: 20,
  overtimeDailySweepLookbackDays: 2,
  overtimeAuthorizationExpiryDays: 7,
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

export interface GlobalOvertimeSchedulerSettings {
  overtimeReconciliationWeekday: number;
  overtimeReconciliationHour: number;
  overtimeReconciliationWindowMinutes: number;
  overtimeReconciliationDispatchIntervalMinutes: number;
  overtimeDailySweepHour: number;
  overtimeDailySweepWindowMinutes: number;
  overtimeDailySweepLookbackDays: number;
  overtimeAuthorizationExpiryDays: number;
}

function normalizeGlobalSettings(
  settings: {
    overtimeReconciliationWeekday: number;
    overtimeReconciliationHour: number;
    overtimeReconciliationWindowMinutes: number;
    overtimeReconciliationDispatchIntervalMinutes: number;
    overtimeDailySweepHour: number;
    overtimeDailySweepWindowMinutes: number;
    overtimeDailySweepLookbackDays: number;
    overtimeAuthorizationExpiryDays: number;
  } | null,
): GlobalOvertimeSchedulerSettings {
  return {
    overtimeReconciliationWeekday:
      typeof settings?.overtimeReconciliationWeekday === "number"
        ? settings.overtimeReconciliationWeekday
        : DEFAULT_GLOBAL_OVERTIME_SCHEDULER.overtimeReconciliationWeekday,
    overtimeReconciliationHour:
      typeof settings?.overtimeReconciliationHour === "number"
        ? settings.overtimeReconciliationHour
        : DEFAULT_GLOBAL_OVERTIME_SCHEDULER.overtimeReconciliationHour,
    overtimeReconciliationWindowMinutes:
      typeof settings?.overtimeReconciliationWindowMinutes === "number"
        ? settings.overtimeReconciliationWindowMinutes
        : DEFAULT_GLOBAL_OVERTIME_SCHEDULER.overtimeReconciliationWindowMinutes,
    overtimeReconciliationDispatchIntervalMinutes:
      typeof settings?.overtimeReconciliationDispatchIntervalMinutes === "number"
        ? settings.overtimeReconciliationDispatchIntervalMinutes
        : DEFAULT_GLOBAL_OVERTIME_SCHEDULER.overtimeReconciliationDispatchIntervalMinutes,
    overtimeDailySweepHour:
      typeof settings?.overtimeDailySweepHour === "number"
        ? settings.overtimeDailySweepHour
        : DEFAULT_GLOBAL_OVERTIME_SCHEDULER.overtimeDailySweepHour,
    overtimeDailySweepWindowMinutes:
      typeof settings?.overtimeDailySweepWindowMinutes === "number"
        ? settings.overtimeDailySweepWindowMinutes
        : DEFAULT_GLOBAL_OVERTIME_SCHEDULER.overtimeDailySweepWindowMinutes,
    overtimeDailySweepLookbackDays:
      typeof settings?.overtimeDailySweepLookbackDays === "number"
        ? settings.overtimeDailySweepLookbackDays
        : DEFAULT_GLOBAL_OVERTIME_SCHEDULER.overtimeDailySweepLookbackDays,
    overtimeAuthorizationExpiryDays:
      typeof settings?.overtimeAuthorizationExpiryDays === "number"
        ? settings.overtimeAuthorizationExpiryDays
        : DEFAULT_GLOBAL_OVERTIME_SCHEDULER.overtimeAuthorizationExpiryDays,
  };
}

async function fetchGlobalSettings() {
  return prisma.globalSettings.findUnique({
    where: { id: "global" },
    select: {
      overtimeReconciliationWeekday: true,
      overtimeReconciliationHour: true,
      overtimeReconciliationWindowMinutes: true,
      overtimeReconciliationDispatchIntervalMinutes: true,
      overtimeDailySweepHour: true,
      overtimeDailySweepWindowMinutes: true,
      overtimeDailySweepLookbackDays: true,
      overtimeAuthorizationExpiryDays: true,
    },
  });
}

export async function getGlobalOvertimeSchedulerSettings(): Promise<GlobalOvertimeSchedulerSettings> {
  await requireSuperAdmin();

  const settings = await fetchGlobalSettings();
  return normalizeGlobalSettings(settings);
}

export async function getGlobalOvertimeSchedulerSummary(): Promise<GlobalOvertimeSchedulerSettings> {
  const authz = await safePermission("manage_organization");
  if (!authz.ok) {
    throw new Error("No tienes permisos para ver la configuración global");
  }

  const settings = await fetchGlobalSettings();
  return normalizeGlobalSettings(settings);
}

export async function updateGlobalOvertimeSchedulerSettings(
  data: GlobalOvertimeSchedulerSettings,
): Promise<{ success: boolean }> {
  const context = await requireSuperAdmin();

  if (data.overtimeReconciliationWeekday < 1 || data.overtimeReconciliationWeekday > 7) {
    throw new Error("El día de ejecución debe estar entre 1 (lunes) y 7 (domingo)");
  }
  if (data.overtimeReconciliationHour < 0 || data.overtimeReconciliationHour > 23) {
    throw new Error("La hora de ejecución debe estar entre 0 y 23");
  }
  if (data.overtimeReconciliationWindowMinutes < 1 || data.overtimeReconciliationWindowMinutes > 60) {
    throw new Error("La ventana debe estar entre 1 y 60 minutos");
  }
  if (
    data.overtimeReconciliationDispatchIntervalMinutes < 1 ||
    data.overtimeReconciliationDispatchIntervalMinutes > 60
  ) {
    throw new Error("El intervalo de comprobación debe estar entre 1 y 60 minutos");
  }
  if (data.overtimeDailySweepHour < 0 || data.overtimeDailySweepHour > 23) {
    throw new Error("La hora del barrido diario debe estar entre 0 y 23");
  }
  if (data.overtimeDailySweepWindowMinutes < 5 || data.overtimeDailySweepWindowMinutes > 120) {
    throw new Error("La ventana del barrido diario debe estar entre 5 y 120 minutos");
  }
  if (data.overtimeDailySweepLookbackDays < 1 || data.overtimeDailySweepLookbackDays > 14) {
    throw new Error("El barrido diario solo puede mirar entre 1 y 14 días hacia atrás");
  }
  if (data.overtimeAuthorizationExpiryDays < 1 || data.overtimeAuthorizationExpiryDays > 90) {
    throw new Error("La expiración de autorizaciones debe estar entre 1 y 90 días");
  }

  const previous = await prisma.globalSettings.findUnique({
    where: { id: "global" },
    select: {
      overtimeReconciliationWeekday: true,
      overtimeReconciliationHour: true,
      overtimeReconciliationWindowMinutes: true,
      overtimeReconciliationDispatchIntervalMinutes: true,
      overtimeDailySweepHour: true,
      overtimeDailySweepWindowMinutes: true,
      overtimeDailySweepLookbackDays: true,
      overtimeAuthorizationExpiryDays: true,
    },
  });

  await prisma.globalSettings.upsert({
    where: { id: "global" },
    update: {
      overtimeReconciliationWeekday: data.overtimeReconciliationWeekday,
      overtimeReconciliationHour: data.overtimeReconciliationHour,
      overtimeReconciliationWindowMinutes: data.overtimeReconciliationWindowMinutes,
      overtimeReconciliationDispatchIntervalMinutes: data.overtimeReconciliationDispatchIntervalMinutes,
      overtimeDailySweepHour: data.overtimeDailySweepHour,
      overtimeDailySweepWindowMinutes: data.overtimeDailySweepWindowMinutes,
      overtimeDailySweepLookbackDays: data.overtimeDailySweepLookbackDays,
      overtimeAuthorizationExpiryDays: data.overtimeAuthorizationExpiryDays,
    },
    create: {
      id: "global",
      overtimeReconciliationWeekday: data.overtimeReconciliationWeekday,
      overtimeReconciliationHour: data.overtimeReconciliationHour,
      overtimeReconciliationWindowMinutes: data.overtimeReconciliationWindowMinutes,
      overtimeReconciliationDispatchIntervalMinutes: data.overtimeReconciliationDispatchIntervalMinutes,
      overtimeDailySweepHour: data.overtimeDailySweepHour,
      overtimeDailySweepWindowMinutes: data.overtimeDailySweepWindowMinutes,
      overtimeDailySweepLookbackDays: data.overtimeDailySweepLookbackDays,
      overtimeAuthorizationExpiryDays: data.overtimeAuthorizationExpiryDays,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "GLOBAL_OVERTIME_SCHEDULER_UPDATED",
      category: "SETTINGS",
      entityId: "global",
      entityType: "GlobalSettings",
      entityData: {
        previous: previous ?? DEFAULT_GLOBAL_OVERTIME_SCHEDULER,
        new: data,
      } as unknown as Prisma.InputJsonValue,
      description: `Configuración global de reconciliación de horas extra actualizada por ${
        context.name ?? context.email
      }`,
      performedById: context.userId,
      performedByEmail: context.email,
      performedByName: context.name,
      performedByRole: context.role,
      orgId: context.orgId,
    },
  });

  return { success: true };
}

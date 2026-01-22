"use server";

import type {
  OvertimeApprovalMode,
  OvertimeCalculationMode,
  OvertimeCompensationType,
  OvertimeNonWorkingDayPolicy,
  Prisma,
} from "@prisma/client";

import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";

const DEFAULT_OVERTIME_SETTINGS = {
  overtimeCalculationMode: "DAILY" as OvertimeCalculationMode,
  overtimeApprovalMode: "POST" as OvertimeApprovalMode,
  overtimeCompensationType: "TIME" as OvertimeCompensationType,
  overtimeToleranceMinutes: 15,
  overtimeDailyLimitMinutes: 0,
  overtimeWeeklyLimitMinutes: 0,
  overtimeMonthlyLimitMinutes: 0,
  overtimeAnnualLimitMinutes: 0,
  overtimeFullTimeWeeklyHours: 40,
  overtimeNonWorkingDayPolicy: "REQUIRE_APPROVAL" as OvertimeNonWorkingDayPolicy,
  overtimeWeeklyReconciliationEnabled: true,
} as const;

async function assertManageOrganization(message: string) {
  const authz = await safePermission("manage_organization");
  if (!authz.ok) {
    throw new Error(message);
  }
}

export interface OvertimeSettingsData {
  overtimeCalculationMode: OvertimeCalculationMode;
  overtimeApprovalMode: OvertimeApprovalMode;
  overtimeCompensationType: OvertimeCompensationType;
  overtimeToleranceMinutes: number;
  overtimeDailyLimitMinutes: number;
  overtimeWeeklyLimitMinutes: number;
  overtimeMonthlyLimitMinutes: number;
  overtimeAnnualLimitMinutes: number;
  overtimeFullTimeWeeklyHours: number;
  overtimeNonWorkingDayPolicy: OvertimeNonWorkingDayPolicy;
  overtimeWeeklyReconciliationEnabled: boolean;
}

export async function getOvertimeSettings(): Promise<OvertimeSettingsData> {
  const user = await getAuthenticatedUser();
  await assertManageOrganization("No tienes permisos para ver la configuración de horas extra");

  const settings = await prisma.timeBankSettings.findUnique({
    where: { orgId: user.orgId },
    select: {
      overtimeCalculationMode: true,
      overtimeApprovalMode: true,
      overtimeCompensationType: true,
      overtimeToleranceMinutes: true,
      overtimeDailyLimitMinutes: true,
      overtimeWeeklyLimitMinutes: true,
      overtimeMonthlyLimitMinutes: true,
      overtimeAnnualLimitMinutes: true,
      overtimeFullTimeWeeklyHours: true,
      overtimeNonWorkingDayPolicy: true,
      overtimeWeeklyReconciliationEnabled: true,
    },
  });

  const calculationMode = settings ? settings.overtimeCalculationMode : null;
  const approvalMode = settings ? settings.overtimeApprovalMode : null;
  const compensationType = settings ? settings.overtimeCompensationType : null;
  const nonWorkingDayPolicy = settings ? settings.overtimeNonWorkingDayPolicy : null;
  const weeklyReconciliationEnabled = settings ? settings.overtimeWeeklyReconciliationEnabled : null;

  return {
    overtimeCalculationMode: calculationMode ?? DEFAULT_OVERTIME_SETTINGS.overtimeCalculationMode,
    overtimeApprovalMode: approvalMode ?? DEFAULT_OVERTIME_SETTINGS.overtimeApprovalMode,
    overtimeCompensationType: compensationType ?? DEFAULT_OVERTIME_SETTINGS.overtimeCompensationType,
    overtimeToleranceMinutes:
      typeof settings?.overtimeToleranceMinutes === "number"
        ? settings.overtimeToleranceMinutes
        : DEFAULT_OVERTIME_SETTINGS.overtimeToleranceMinutes,
    overtimeDailyLimitMinutes:
      typeof settings?.overtimeDailyLimitMinutes === "number"
        ? settings.overtimeDailyLimitMinutes
        : DEFAULT_OVERTIME_SETTINGS.overtimeDailyLimitMinutes,
    overtimeWeeklyLimitMinutes:
      typeof settings?.overtimeWeeklyLimitMinutes === "number"
        ? settings.overtimeWeeklyLimitMinutes
        : DEFAULT_OVERTIME_SETTINGS.overtimeWeeklyLimitMinutes,
    overtimeMonthlyLimitMinutes:
      typeof settings?.overtimeMonthlyLimitMinutes === "number"
        ? settings.overtimeMonthlyLimitMinutes
        : DEFAULT_OVERTIME_SETTINGS.overtimeMonthlyLimitMinutes,
    overtimeAnnualLimitMinutes:
      typeof settings?.overtimeAnnualLimitMinutes === "number"
        ? settings.overtimeAnnualLimitMinutes
        : DEFAULT_OVERTIME_SETTINGS.overtimeAnnualLimitMinutes,
    overtimeFullTimeWeeklyHours:
      typeof settings?.overtimeFullTimeWeeklyHours === "number"
        ? settings.overtimeFullTimeWeeklyHours
        : DEFAULT_OVERTIME_SETTINGS.overtimeFullTimeWeeklyHours,
    overtimeNonWorkingDayPolicy: nonWorkingDayPolicy ?? DEFAULT_OVERTIME_SETTINGS.overtimeNonWorkingDayPolicy,
    overtimeWeeklyReconciliationEnabled:
      typeof weeklyReconciliationEnabled === "boolean"
        ? weeklyReconciliationEnabled
        : DEFAULT_OVERTIME_SETTINGS.overtimeWeeklyReconciliationEnabled,
  };
}

export async function updateOvertimeSettings(data: OvertimeSettingsData): Promise<{ success: boolean }> {
  const user = await getAuthenticatedUser();
  await assertManageOrganization("No tienes permisos para modificar la configuración de horas extra");

  if (data.overtimeToleranceMinutes < 0 || data.overtimeToleranceMinutes > 120) {
    throw new Error("La tolerancia de horas extra debe estar entre 0 y 120 minutos");
  }
  if (data.overtimeDailyLimitMinutes < 0) {
    throw new Error("El límite diario no puede ser negativo");
  }
  if (data.overtimeWeeklyLimitMinutes < 0) {
    throw new Error("El límite semanal no puede ser negativo");
  }
  if (data.overtimeMonthlyLimitMinutes < 0) {
    throw new Error("El límite mensual no puede ser negativo");
  }
  if (data.overtimeAnnualLimitMinutes < 0) {
    throw new Error("El límite anual no puede ser negativo");
  }
  if (data.overtimeFullTimeWeeklyHours <= 0) {
    throw new Error("Las horas semanales de referencia deben ser mayores que 0");
  }

  const previousSettings = await prisma.timeBankSettings.findUnique({
    where: { orgId: user.orgId },
    select: {
      overtimeCalculationMode: true,
      overtimeApprovalMode: true,
      overtimeCompensationType: true,
      overtimeToleranceMinutes: true,
      overtimeDailyLimitMinutes: true,
      overtimeWeeklyLimitMinutes: true,
      overtimeMonthlyLimitMinutes: true,
      overtimeAnnualLimitMinutes: true,
      overtimeFullTimeWeeklyHours: true,
      overtimeNonWorkingDayPolicy: true,
      overtimeWeeklyReconciliationEnabled: true,
    },
  });

  await prisma.timeBankSettings.upsert({
    where: { orgId: user.orgId },
    update: {
      overtimeCalculationMode: data.overtimeCalculationMode,
      overtimeApprovalMode: data.overtimeApprovalMode,
      overtimeCompensationType: data.overtimeCompensationType,
      overtimeToleranceMinutes: data.overtimeToleranceMinutes,
      overtimeDailyLimitMinutes: data.overtimeDailyLimitMinutes,
      overtimeWeeklyLimitMinutes: data.overtimeWeeklyLimitMinutes,
      overtimeMonthlyLimitMinutes: data.overtimeMonthlyLimitMinutes,
      overtimeAnnualLimitMinutes: data.overtimeAnnualLimitMinutes,
      overtimeFullTimeWeeklyHours: data.overtimeFullTimeWeeklyHours,
      overtimeNonWorkingDayPolicy: data.overtimeNonWorkingDayPolicy,
      overtimeWeeklyReconciliationEnabled: data.overtimeWeeklyReconciliationEnabled,
    },
    create: {
      orgId: user.orgId,
      overtimeCalculationMode: data.overtimeCalculationMode,
      overtimeApprovalMode: data.overtimeApprovalMode,
      overtimeCompensationType: data.overtimeCompensationType,
      overtimeToleranceMinutes: data.overtimeToleranceMinutes,
      overtimeDailyLimitMinutes: data.overtimeDailyLimitMinutes,
      overtimeWeeklyLimitMinutes: data.overtimeWeeklyLimitMinutes,
      overtimeMonthlyLimitMinutes: data.overtimeMonthlyLimitMinutes,
      overtimeAnnualLimitMinutes: data.overtimeAnnualLimitMinutes,
      overtimeFullTimeWeeklyHours: data.overtimeFullTimeWeeklyHours,
      overtimeNonWorkingDayPolicy: data.overtimeNonWorkingDayPolicy,
      overtimeWeeklyReconciliationEnabled: data.overtimeWeeklyReconciliationEnabled,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "OVERTIME_SETTINGS_UPDATED",
      category: "SETTINGS",
      entityId: user.orgId,
      entityType: "TimeBankSettings",
      entityData: {
        previous: previousSettings ?? DEFAULT_OVERTIME_SETTINGS,
        new: data,
      } as unknown as Prisma.InputJsonValue,
      description: `Configuración de horas extra actualizada por ${user.name ?? user.email}`,
      performedById: user.userId,
      performedByEmail: user.email ?? "",
      performedByName: user.name ?? "",
      performedByRole: user.role,
      orgId: user.orgId,
    },
  });

  return { success: true };
}

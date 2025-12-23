"use server";

import { type Prisma, TimeBankApprovalFlow } from "@prisma/client";

import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";

/**
 * Valores por defecto para la configuración de bolsa de horas.
 * Estos valores están pensados para un uso "razonable generalista",
 * pero pueden adaptarse por organización desde Settings > Bolsa de Horas.
 */
const DEFAULT_TIME_BANK_SETTINGS = {
  maxPositiveMinutes: 4800, // 80h - Límite máximo de horas acumuladas
  maxNegativeMinutes: 480, // 8h - Límite máximo de déficit
  roundingIncrementMinutes: 5, // Redondea diferencias a múltiplos de 5 min
  deficitGraceMinutes: 10, // Margen de déficit: si trabajo ≤10 min menos, no penaliza
  excessGraceMinutes: 15, // Margen de exceso: si trabajo ≤15 min más, no acumula
  approvalFlow: "MIRROR_PTO" as TimeBankApprovalFlow,
} as const;

async function assertManageOrganization(message: string) {
  const authz = await safePermission("manage_organization");
  if (!authz.ok) {
    throw new Error(message);
  }
}

// ==================== TIPOS ====================

export interface TimeBankBasicSettingsData {
  excessGraceMinutes: number;
  deficitGraceMinutes: number;
  roundingIncrementMinutes: number;
  maxPositiveMinutes: number;
  maxNegativeMinutes: number;
}

export interface TimeBankFullSettings extends TimeBankBasicSettingsData {
  approvalFlow: TimeBankApprovalFlow;
}

// ==================== FUNCIONES DE LECTURA ====================

export async function getTimeBankApprovalSettings(): Promise<{ approvalFlow: TimeBankApprovalFlow }> {
  const user = await getAuthenticatedUser();

  await assertManageOrganization("No tienes permisos para ver la configuración de bolsa de horas");

  const settings = await prisma.timeBankSettings.findUnique({
    where: { orgId: user.orgId },
    select: {
      approvalFlow: true,
    },
  });

  return {
    approvalFlow: settings?.approvalFlow ?? DEFAULT_TIME_BANK_SETTINGS.approvalFlow,
  };
}

/**
 * Obtiene la configuración completa de bolsa de horas para la organización.
 * Devuelve valores por defecto si no existe configuración.
 */
export async function getTimeBankFullSettings(): Promise<TimeBankFullSettings> {
  const user = await getAuthenticatedUser();

  await assertManageOrganization("No tienes permisos para ver la configuración de bolsa de horas");

  const settings = await prisma.timeBankSettings.findUnique({
    where: { orgId: user.orgId },
    select: {
      excessGraceMinutes: true,
      deficitGraceMinutes: true,
      roundingIncrementMinutes: true,
      maxPositiveMinutes: true,
      maxNegativeMinutes: true,
      approvalFlow: true,
    },
  });

  return {
    excessGraceMinutes: settings?.excessGraceMinutes ?? DEFAULT_TIME_BANK_SETTINGS.excessGraceMinutes,
    deficitGraceMinutes: settings?.deficitGraceMinutes ?? DEFAULT_TIME_BANK_SETTINGS.deficitGraceMinutes,
    roundingIncrementMinutes: settings?.roundingIncrementMinutes ?? DEFAULT_TIME_BANK_SETTINGS.roundingIncrementMinutes,
    maxPositiveMinutes: settings?.maxPositiveMinutes ?? DEFAULT_TIME_BANK_SETTINGS.maxPositiveMinutes,
    maxNegativeMinutes: settings?.maxNegativeMinutes ?? DEFAULT_TIME_BANK_SETTINGS.maxNegativeMinutes,
    approvalFlow: settings?.approvalFlow ?? DEFAULT_TIME_BANK_SETTINGS.approvalFlow,
  };
}

// ==================== FUNCIONES DE ESCRITURA ====================

export async function updateTimeBankApprovalSettings(approvalFlow: TimeBankApprovalFlow) {
  const user = await getAuthenticatedUser();

  await assertManageOrganization("No tienes permisos para modificar la configuración de bolsa de horas");

  const previousSettings = await prisma.timeBankSettings.findUnique({
    where: { orgId: user.orgId },
    select: {
      approvalFlow: true,
    },
  });

  await prisma.timeBankSettings.upsert({
    where: { orgId: user.orgId },
    update: {
      approvalFlow,
    },
    create: {
      orgId: user.orgId,
      approvalFlow,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "TIME_BANK_APPROVAL_SETTINGS_UPDATED",
      category: "SETTINGS",
      entityId: user.orgId,
      entityType: "TimeBankSettings",
      entityData: {
        previous: previousSettings ?? {
          approvalFlow: DEFAULT_TIME_BANK_SETTINGS.approvalFlow,
        },
        new: { approvalFlow },
      } as unknown as Prisma.InputJsonValue,
      description: `Configuración de aprobación de bolsa de horas actualizada por ${user.name ?? user.email}`,
      performedById: user.userId,
      performedByEmail: user.email ?? "",
      performedByName: user.name ?? "",
      performedByRole: user.role,
      orgId: user.orgId,
    },
  });

  return { success: true };
}

/**
 * Actualiza la configuración básica de bolsa de horas.
 * Solo ADMIN/RRHH pueden modificar esta configuración.
 * Registra evento de auditoría TIME_BANK_SETTINGS_UPDATED.
 */
export async function updateTimeBankBasicSettings(data: TimeBankBasicSettingsData): Promise<{ success: boolean }> {
  // 1. Validar permisos (ADMIN o RRHH)
  const user = await getAuthenticatedUser();

  await assertManageOrganization("No tienes permisos para modificar la configuración de bolsa de horas");

  // 2. Validaciones de datos
  if (data.excessGraceMinutes < 0 || data.excessGraceMinutes > 60) {
    throw new Error("Margen de exceso debe estar entre 0 y 60 minutos");
  }
  if (data.deficitGraceMinutes < 0 || data.deficitGraceMinutes > 60) {
    throw new Error("Margen de déficit debe estar entre 0 y 60 minutos");
  }
  if (![1, 5, 10, 15].includes(data.roundingIncrementMinutes)) {
    throw new Error("Incremento de redondeo debe ser 1, 5, 10 o 15 minutos");
  }
  if (data.maxPositiveMinutes < 0) {
    throw new Error("Límite máximo positivo no puede ser negativo");
  }
  if (data.maxNegativeMinutes < 0) {
    throw new Error("Límite máximo negativo no puede ser negativo");
  }

  // 3. Obtener valores anteriores para auditoría
  const previousSettings = await prisma.timeBankSettings.findUnique({
    where: { orgId: user.orgId },
    select: {
      excessGraceMinutes: true,
      deficitGraceMinutes: true,
      roundingIncrementMinutes: true,
      maxPositiveMinutes: true,
      maxNegativeMinutes: true,
    },
  });

  // 4. Actualizar configuración
  await prisma.timeBankSettings.upsert({
    where: { orgId: user.orgId },
    update: {
      excessGraceMinutes: data.excessGraceMinutes,
      deficitGraceMinutes: data.deficitGraceMinutes,
      roundingIncrementMinutes: data.roundingIncrementMinutes,
      maxPositiveMinutes: data.maxPositiveMinutes,
      maxNegativeMinutes: data.maxNegativeMinutes,
    },
    create: {
      orgId: user.orgId,
      excessGraceMinutes: data.excessGraceMinutes,
      deficitGraceMinutes: data.deficitGraceMinutes,
      roundingIncrementMinutes: data.roundingIncrementMinutes,
      maxPositiveMinutes: data.maxPositiveMinutes,
      maxNegativeMinutes: data.maxNegativeMinutes,
    },
  });

  // 5. Registrar evento de auditoría
  await prisma.auditLog.create({
    data: {
      action: "TIME_BANK_SETTINGS_UPDATED",
      category: "SETTINGS",
      entityId: user.orgId,
      entityType: "TimeBankSettings",
      entityData: {
        previous: previousSettings ?? {
          excessGraceMinutes: DEFAULT_TIME_BANK_SETTINGS.excessGraceMinutes,
          deficitGraceMinutes: DEFAULT_TIME_BANK_SETTINGS.deficitGraceMinutes,
          roundingIncrementMinutes: DEFAULT_TIME_BANK_SETTINGS.roundingIncrementMinutes,
          maxPositiveMinutes: DEFAULT_TIME_BANK_SETTINGS.maxPositiveMinutes,
          maxNegativeMinutes: DEFAULT_TIME_BANK_SETTINGS.maxNegativeMinutes,
        },
        new: data,
      } as unknown as Prisma.InputJsonValue,
      description: `Configuración de bolsa de horas actualizada por ${user.name ?? user.email}`,
      performedById: user.userId,
      performedByEmail: user.email ?? "",
      performedByName: user.name ?? "",
      performedByRole: user.role,
      orgId: user.orgId,
    },
  });

  return { success: true };
}

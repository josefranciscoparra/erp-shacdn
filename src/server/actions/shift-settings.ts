/**
 * Server Actions para Configuración de Turnos
 * Sprint 7
 */

"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Obtener configuración de turnos de la organización
 */
/**
 * Serializar configuración convirtiendo Decimals a números
 */
function serializeShiftConfig(config: any) {
  return {
    id: config.id,
    orgId: config.orgId,
    planningGranularityMinutes: config.planningGranularityMinutes,
    weekStartDay: config.weekStartDay,
    maxDailyHours: Number(config.maxDailyHours),
    maxWeeklyHours: Number(config.maxWeeklyHours),
    minRestBetweenShiftsHours: Number(config.minRestBetweenShiftsHours),
    complementaryHoursEnabled: config.complementaryHoursEnabled,
    complementaryHoursLimitPercent: config.complementaryHoursLimitPercent
      ? Number(config.complementaryHoursLimitPercent)
      : null,
    complementaryHoursMonthlyCap: config.complementaryHoursMonthlyCap
      ? Number(config.complementaryHoursMonthlyCap)
      : null,
    publishRequiresApproval: config.publishRequiresApproval,
    minAdvancePublishDays: config.minAdvancePublishDays,
    allowEditAfterPublish: config.allowEditAfterPublish,
    enforceMinimumCoverage: config.enforceMinimumCoverage,
    blockPublishIfUncovered: config.blockPublishIfUncovered,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function getShiftSettings() {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  let config = await prisma.shiftConfiguration.findUnique({
    where: { orgId: session.user.orgId },
  });

  // Si no existe, crear configuración por defecto
  config ??= await prisma.shiftConfiguration.create({
    data: {
      orgId: session.user.orgId,
    },
  });

  // Convertir Decimals a números para serialización
  return serializeShiftConfig(config);
}

/**
 * Actualizar configuración de turnos
 */
export async function updateShiftSettings(data: {
  planningGranularityMinutes?: number;
  weekStartDay?: number;
  maxDailyHours?: number;
  maxWeeklyHours?: number;
  minRestBetweenShiftsHours?: number;
  complementaryHoursEnabled?: boolean;
  complementaryHoursLimitPercent?: number | null;
  complementaryHoursMonthlyCap?: number | null;
  publishRequiresApproval?: boolean;
  minAdvancePublishDays?: number;
  allowEditAfterPublish?: boolean;
  enforceMinimumCoverage?: boolean;
  blockPublishIfUncovered?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  // Verificar que el usuario tenga permisos de administrador
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(user.role)) {
    throw new Error("No tienes permisos para modificar la configuración");
  }

  // Verificar que existe configuración
  const config = await prisma.shiftConfiguration.findUnique({
    where: { orgId: session.user.orgId },
  });

  if (!config) {
    // Crear si no existe
    await prisma.shiftConfiguration.create({
      data: {
        orgId: session.user.orgId,
        ...data,
      },
    });
  } else {
    // Actualizar existente
    await prisma.shiftConfiguration.update({
      where: { orgId: session.user.orgId },
      data,
    });
  }

  revalidatePath("/dashboard/shifts/settings");

  return { success: true };
}

/**
 * Obtener estadísticas generales del sistema de turnos
 */
export async function getShiftSystemStats() {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  const orgId = session.user.orgId;

  const [totalShifts, totalAssignments, activePlanners, costCentersWithShifts] = await Promise.all([
    prisma.shift.count({ where: { orgId } }),
    prisma.shiftAssignment.count({
      where: { shift: { orgId } },
    }),
    prisma.shiftPlanner.count({
      where: { orgId },
    }),
    prisma.costCenter.count({
      where: {
        orgId,
        shifts: { some: {} },
      },
    }),
  ]);

  return {
    totalShifts,
    totalAssignments,
    activePlanners,
    costCentersWithShifts,
  };
}

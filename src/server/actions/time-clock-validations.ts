"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ValidationConfig {
  clockInToleranceMinutes: number;
  clockOutToleranceMinutes: number;
  earlyClockInToleranceMinutes: number;
  lateClockOutToleranceMinutes: number;
  nonWorkdayClockInAllowed: boolean;
  nonWorkdayClockInWarning: boolean;
  criticalLateArrivalMinutes: number;
  criticalEarlyDepartureMinutes: number;
  alertsEnabled: boolean;
  alertsRequireResolution: boolean;
  alertNotificationsEnabled: boolean;
  alertNotificationRoles: string[];
}

/**
 * Obtiene la configuración de validaciones de fichajes de la organización
 */
export async function getOrganizationValidationConfig(): Promise<ValidationConfig> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: {
        clockInToleranceMinutes: true,
        clockOutToleranceMinutes: true,
        earlyClockInToleranceMinutes: true,
        lateClockOutToleranceMinutes: true,
        nonWorkdayClockInAllowed: true,
        nonWorkdayClockInWarning: true,
        criticalLateArrivalMinutes: true,
        criticalEarlyDepartureMinutes: true,
        alertsEnabled: true,
        alertsRequireResolution: true,
        alertNotificationsEnabled: true,
        alertNotificationRoles: true,
      },
    });

    if (!org) {
      throw new Error("Organización no encontrada");
    }

    return org;
  } catch (error) {
    console.error("Error al obtener configuración de validaciones:", error);
    throw error;
  }
}

/**
 * Actualiza la configuración de validaciones de fichajes de la organización
 * Solo usuarios con permisos de administrador pueden ejecutar esta acción
 */
export async function updateOrganizationValidationConfig(config: ValidationConfig): Promise<{ success: boolean }> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    // Validar que los valores sean números positivos
    if (
      config.clockInToleranceMinutes < 0 ||
      config.clockOutToleranceMinutes < 0 ||
      config.earlyClockInToleranceMinutes < 0 ||
      config.lateClockOutToleranceMinutes < 0 ||
      config.criticalLateArrivalMinutes < 0 ||
      config.criticalEarlyDepartureMinutes < 0
    ) {
      throw new Error("Los valores de tolerancia deben ser números positivos");
    }

    // Validar que los umbrales críticos sean mayores que las tolerancias
    if (config.criticalLateArrivalMinutes < config.clockInToleranceMinutes) {
      throw new Error("El umbral crítico de entrada debe ser mayor o igual a la tolerancia de entrada");
    }

    if (config.criticalEarlyDepartureMinutes < config.clockOutToleranceMinutes) {
      throw new Error("El umbral crítico de salida debe ser mayor o igual a la tolerancia de salida");
    }

    await prisma.organization.update({
      where: { id: session.user.orgId },
      data: {
        clockInToleranceMinutes: config.clockInToleranceMinutes,
        clockOutToleranceMinutes: config.clockOutToleranceMinutes,
        earlyClockInToleranceMinutes: config.earlyClockInToleranceMinutes,
        lateClockOutToleranceMinutes: config.lateClockOutToleranceMinutes,
        nonWorkdayClockInAllowed: config.nonWorkdayClockInAllowed,
        nonWorkdayClockInWarning: config.nonWorkdayClockInWarning,
        criticalLateArrivalMinutes: config.criticalLateArrivalMinutes,
        criticalEarlyDepartureMinutes: config.criticalEarlyDepartureMinutes,
        alertsEnabled: config.alertsEnabled,
        alertsRequireResolution: config.alertsRequireResolution,
        alertNotificationsEnabled: config.alertNotificationsEnabled,
        alertNotificationRoles: config.alertNotificationRoles,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al actualizar configuración de validaciones:", error);
    throw error;
  }
}

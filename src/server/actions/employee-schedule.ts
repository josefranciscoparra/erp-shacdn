"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// Force recompile schedule-engine
import { getEffectiveSchedule, getWeekSchedule } from "@/lib/schedule-engine";
import type { EffectiveSchedule } from "@/types/schedule";

/**
 * Obtiene el horario efectivo de un empleado para hoy
 */
export async function getTodaySchedule(): Promise<{
  success: boolean;
  schedule?: EffectiveSchedule;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Obtener el empleado asociado al usuario
    const employee = await prisma.employee.findFirst({
      where: {
        userId: session.user.id,
        orgId: session.user.orgId,
      },
      select: {
        id: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "No se encontró perfil de empleado",
      };
    }

    // Obtener horario efectivo de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a inicio del día

    const schedule = await getEffectiveSchedule(employee.id, today);

    return {
      success: true,
      schedule,
    };
  } catch (error) {
    console.error("Error al obtener horario del día:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene el resumen del día actual con información de desviaciones
 */
export async function getTodaySummary(): Promise<{
  success: boolean;
  summary?: {
    expectedMinutes: number | null;
    workedMinutes: number;
    deviationMinutes: number | null;
    status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE";
    hasFinished: boolean;
    validationWarnings: string[];
    validationErrors: string[];
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Obtener el empleado asociado al usuario
    const employee = await prisma.employee.findFirst({
      where: {
        userId: session.user.id,
        orgId: session.user.orgId,
      },
      select: {
        id: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "No se encontró perfil de empleado",
      };
    }

    // Obtener resumen del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workdaySummary = await prisma.workdaySummary.findUnique({
      where: {
        orgId_employeeId_date: {
          orgId: session.user.orgId,
          employeeId: employee.id,
          date: today,
        },
      },
      select: {
        totalWorkedMinutes: true,
        expectedMinutes: true,
        deviationMinutes: true,
        status: true,
        clockOut: true,
      },
    });

    // Obtener todos los fichajes del día para agregar warnings/errors
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId: employee.id,
        timestamp: {
          gte: today,
          lte: todayEnd,
        },
      },
      select: {
        validationWarnings: true,
        validationErrors: true,
      },
    });

    // Consolidar todos los warnings y errors únicos
    const allWarnings = new Set<string>();
    const allErrors = new Set<string>();

    for (const entry of timeEntries) {
      entry.validationWarnings.forEach((w) => allWarnings.add(w));
      entry.validationErrors.forEach((e) => allErrors.add(e));
    }

    if (!workdaySummary) {
      // No hay resumen todavía (no ha fichado)
      return {
        success: true,
        summary: {
          expectedMinutes: null,
          workedMinutes: 0,
          deviationMinutes: null,
          status: "IN_PROGRESS",
          hasFinished: false,
          validationWarnings: Array.from(allWarnings),
          validationErrors: Array.from(allErrors),
        },
      };
    }

    let expectedMinutes = workdaySummary.expectedMinutes ? Number(workdaySummary.expectedMinutes) : null;
    let deviationMinutes = workdaySummary.deviationMinutes ? Number(workdaySummary.deviationMinutes) : null;

    // FIX ON-THE-FLY: Si expectedMinutes es 0 o null (posible bug antiguo), recalcular con el motor actual
    if (!expectedMinutes || expectedMinutes === 0) {
      try {
        const freshSchedule = await getEffectiveSchedule(employee.id, today);
        if (freshSchedule.expectedMinutes > 0) {
          expectedMinutes = freshSchedule.expectedMinutes;
          // Recalcular desviación: Trabajado - Esperado
          deviationMinutes = Number(workdaySummary.totalWorkedMinutes) - expectedMinutes;
        }
      } catch (e) {
        console.warn("Error recalculando expectedMinutes al vuelo:", e);
      }
    }

    return {
      success: true,
      summary: {
        expectedMinutes,
        workedMinutes: Number(workdaySummary.totalWorkedMinutes),
        deviationMinutes,
        status: workdaySummary.status,
        hasFinished: workdaySummary.clockOut !== null,
        validationWarnings: Array.from(allWarnings),
        validationErrors: Array.from(allErrors),
      },
    };
  } catch (error) {
    console.error("Error al obtener resumen del día:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene el horario semanal del empleado autenticado
 */
export async function getMyWeekSchedule(weekStart: Date): Promise<{
  success: boolean;
  days?: EffectiveSchedule[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Obtener el empleado asociado al usuario
    const employee = await prisma.employee.findFirst({
      where: {
        userId: session.user.id,
        orgId: session.user.orgId,
      },
      select: {
        id: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "No se encontró perfil de empleado",
      };
    }

    // Obtener horario de la semana
    const weekSchedule = await getWeekSchedule(employee.id, weekStart);

    return {
      success: true,
      days: weekSchedule.days,
    };
  } catch (error) {
    console.error("Error al obtener horario semanal:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

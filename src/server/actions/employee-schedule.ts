"use server";

import { revalidatePath } from "next/cache";

import { endOfWeek, startOfWeek } from "date-fns";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// Force recompile schedule-engine
import { getEffectiveSchedule, getWeekSchedule } from "@/services/schedules/schedule-engine";
import type { EffectiveSchedule } from "@/types/schedule";

/**
 * Obtiene el horario efectivo de un empleado para hoy
 */
export async function getTodaySchedule(): Promise<{
  success: boolean;
  schedule?: EffectiveSchedule;
  flexWeeklySummary?: {
    weekStart: Date;
    weekEnd: Date;
    targetMinutes: number;
    workedMinutes: number;
    remainingMinutes: number;
    deltaMinutes: number;
    progressPercent: number;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Force fresh data for UI consistency
    revalidatePath("/dashboard/me/clock");

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
    today.setHours(12, 0, 0, 0); // Normalizar a mediodía para evitar problemas de timezone

    const schedule = await getEffectiveSchedule(employee.id, today);
    let flexWeeklySummary:
      | {
          weekStart: Date;
          weekEnd: Date;
          targetMinutes: number;
          workedMinutes: number;
          remainingMinutes: number;
          deltaMinutes: number;
          progressPercent: number;
        }
      | undefined;

    if (schedule.scheduleMode === "FLEX_TOTAL") {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const weeklyTotals = await prisma.workdaySummary.aggregate({
        where: {
          orgId: session.user.orgId,
          employeeId: employee.id,
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        _sum: {
          totalWorkedMinutes: true,
        },
      });
      // eslint-disable-next-line no-underscore-dangle -- Prisma uses _sum for aggregations
      const workedMinutes = Number(weeklyTotals._sum.totalWorkedMinutes ?? 0);
      const targetMinutes = schedule.weeklyTargetMinutes ?? 0;
      const remainingMinutes = Math.max(0, targetMinutes - workedMinutes);
      const deltaMinutes = workedMinutes - targetMinutes;
      const progressPercent = targetMinutes > 0 ? Math.round((workedMinutes / targetMinutes) * 100) : 0;

      flexWeeklySummary = {
        weekStart,
        weekEnd,
        targetMinutes,
        workedMinutes,
        remainingMinutes,
        deltaMinutes,
        progressPercent,
      };
    }

    return {
      success: true,
      schedule,
      flexWeeklySummary,
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

    // CONSISTENCIA UI: Siempre obtener el horario fresco del motor
    // La BD puede tener un snapshot obsoleto si se aprobaron vacaciones después de fichar
    let expectedMinutes: number | null = 0;
    let needsDbSync = false;
    let isFlexTotal = false;
    try {
      const scheduleDate = new Date(today);
      scheduleDate.setHours(12, 0, 0, 0); // Usar mediodía para el motor de horarios
      const freshSchedule = await getEffectiveSchedule(employee.id, scheduleDate);
      isFlexTotal = freshSchedule.scheduleMode === "FLEX_TOTAL";
      expectedMinutes = isFlexTotal ? null : freshSchedule.expectedMinutes;

      // FASE 3.3: Detectar si la BD tiene un valor diferente al motor
      const dbExpectedMinutes = workdaySummary.expectedMinutes ? Number(workdaySummary.expectedMinutes) : 0;
      if (!isFlexTotal && expectedMinutes !== null && dbExpectedMinutes !== expectedMinutes) {
        needsDbSync = true;
        console.log(
          `🔄 SYNC expectedMinutes: BD=${dbExpectedMinutes} → Motor=${expectedMinutes} (empleado=${employee.id})`,
        );
      }
    } catch (e) {
      console.warn("Error getting fresh schedule for summary:", e);
      // Fallback a BD si falla el motor
      expectedMinutes = workdaySummary.expectedMinutes ? Number(workdaySummary.expectedMinutes) : 0;
    }

    // Recalcular desviación siempre con el valor fresco
    const deviationMinutes =
      expectedMinutes === null ? null : Number(workdaySummary.totalWorkedMinutes) - expectedMinutes;

    // FASE 3.3: Sincronizar BD si hay diferencia (fire and forget para no bloquear la UI)
    if (needsDbSync && expectedMinutes !== null) {
      prisma.workdaySummary
        .update({
          where: {
            orgId_employeeId_date: {
              orgId: session.user.orgId,
              employeeId: employee.id,
              date: today,
            },
          },
          data: {
            expectedMinutes,
            deviationMinutes,
          },
        })
        .catch((err) => console.error("Error syncing expectedMinutes to DB:", err));
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
 * Obtiene horario efectivo + resumen diario en una sola llamada
 * Evita duplicar consultas cuando la UI necesita ambos
 */
export async function getTodayScheduleAndSummary(): Promise<{
  success: boolean;
  schedule?: EffectiveSchedule;
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

    // Force fresh data for UI consistency
    revalidatePath("/dashboard/me/clock");

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

    const today = new Date();
    const scheduleDate = new Date(today);
    scheduleDate.setHours(12, 0, 0, 0);

    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(today);
    dayEnd.setHours(23, 59, 59, 999);

    const schedulePromise = getEffectiveSchedule(employee.id, scheduleDate).catch((error) => {
      console.warn("Error al obtener horario del día:", error);
      return null;
    });

    const [schedule, workdaySummary, timeEntries] = await Promise.all([
      schedulePromise,
      prisma.workdaySummary.findUnique({
        where: {
          orgId_employeeId_date: {
            orgId: session.user.orgId,
            employeeId: employee.id,
            date: dayStart,
          },
        },
        select: {
          totalWorkedMinutes: true,
          expectedMinutes: true,
          deviationMinutes: true,
          status: true,
          clockOut: true,
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          employeeId: employee.id,
          timestamp: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: {
          validationWarnings: true,
          validationErrors: true,
        },
      }),
    ]);

    const allWarnings = new Set<string>();
    const allErrors = new Set<string>();

    for (const entry of timeEntries) {
      entry.validationWarnings.forEach((w) => allWarnings.add(w));
      entry.validationErrors.forEach((e) => allErrors.add(e));
    }

    if (!workdaySummary) {
      return {
        success: true,
        schedule: schedule ?? undefined,
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

    const isFlexTotal = schedule?.scheduleMode === "FLEX_TOTAL";
    const expectedMinutes = isFlexTotal
      ? null
      : schedule
        ? schedule.expectedMinutes
        : Number(workdaySummary.expectedMinutes ?? 0);
    const deviationMinutes =
      expectedMinutes === null ? null : Number(workdaySummary.totalWorkedMinutes) - expectedMinutes;
    const dbExpectedMinutes = workdaySummary.expectedMinutes ? Number(workdaySummary.expectedMinutes) : 0;

    if (schedule && !isFlexTotal && expectedMinutes !== null && dbExpectedMinutes !== expectedMinutes) {
      prisma.workdaySummary
        .update({
          where: {
            orgId_employeeId_date: {
              orgId: session.user.orgId,
              employeeId: employee.id,
              date: dayStart,
            },
          },
          data: {
            expectedMinutes,
            deviationMinutes,
          },
        })
        .catch((err) => console.error("Error syncing expectedMinutes to DB:", err));
    }

    return {
      success: true,
      schedule: schedule ?? undefined,
      summary: {
        expectedMinutes,
        workedMinutes: Number(workdaySummary.totalWorkedMinutes),
        deviationMinutes,
        status: workdaySummary.status,
        hasFinished: Boolean(workdaySummary.clockOut),
        validationWarnings: Array.from(allWarnings),
        validationErrors: Array.from(allErrors),
      },
    };
  } catch (error) {
    console.error("Error al obtener horario y resumen del día:", error);
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

/**
 * Obtiene el horario efectivo de un empleado para una fecha específica
 * Usado en el formulario de solicitud de PTO para validar horas parciales
 */
export async function getScheduleForDate(date: Date): Promise<{
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

    // Normalizar la fecha a mediodía para evitar problemas de timezone
    const normalizedDate = new Date(date);
    normalizedDate.setHours(12, 0, 0, 0);

    const schedule = await getEffectiveSchedule(employee.id, normalizedDate);

    return {
      success: true,
      schedule,
    };
  } catch (error) {
    console.error("Error al obtener horario para fecha:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

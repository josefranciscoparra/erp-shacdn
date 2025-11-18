"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSchedule } from "@/lib/schedule-engine";
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
        },
      };
    }

    return {
      success: true,
      summary: {
        expectedMinutes: workdaySummary.expectedMinutes ? Number(workdaySummary.expectedMinutes) : null,
        workedMinutes: Number(workdaySummary.totalWorkedMinutes),
        deviationMinutes: workdaySummary.deviationMinutes ? Number(workdaySummary.deviationMinutes) : null,
        status: workdaySummary.status,
        hasFinished: workdaySummary.clockOut !== null,
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

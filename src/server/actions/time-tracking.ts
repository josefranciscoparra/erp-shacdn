"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

// Helper para calcular minutos trabajados
// IMPORTANTE: Solo calcula sesiones CERRADAS, no incluye tiempo en progreso
function calculateWorkedMinutes(entries: any[]): { worked: number; break: number } {
  let totalWorked = 0;
  let totalBreak = 0;
  let lastClockIn: Date | null = null;
  let lastBreakStart: Date | null = null;

  // Ordenar por timestamp
  const sorted = entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  console.log("🔍 Calculando minutos trabajados para", sorted.length, "entradas");

  for (const entry of sorted) {
    console.log(`  📝 ${entry.entryType} a las ${new Date(entry.timestamp).toLocaleTimeString()}`);

    switch (entry.entryType) {
      case "CLOCK_IN":
        lastClockIn = entry.timestamp;
        console.log("    ⏰ Inicio de sesión registrado");
        break;

      case "BREAK_START":
        if (lastClockIn) {
          // Calcular tiempo trabajado hasta la pausa
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          console.log(`    ➕ Sesión trabajada: ${minutes.toFixed(2)} min (total: ${totalWorked.toFixed(2)})`);
          lastBreakStart = entry.timestamp;
          lastClockIn = null; // Cerrar sesión de trabajo
        } else {
          console.log("    ⚠️ BREAK_START sin CLOCK_IN previo");
        }
        break;

      case "BREAK_END":
        if (lastBreakStart) {
          // Calcular tiempo de pausa
          const minutes = (entry.timestamp.getTime() - lastBreakStart.getTime()) / (1000 * 60);
          totalBreak += minutes;
          console.log(`    ☕ Pausa: ${minutes.toFixed(2)} min (total pausas: ${totalBreak.toFixed(2)})`);
          lastClockIn = entry.timestamp; // Continuar desde aquí
          lastBreakStart = null;
        } else {
          console.log("    ⚠️ BREAK_END sin BREAK_START previo");
        }
        break;

      case "CLOCK_OUT":
        if (lastClockIn) {
          // Calcular tiempo trabajado hasta la salida
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          console.log(`    ➕ Sesión trabajada hasta salida: ${minutes.toFixed(2)} min (total: ${totalWorked.toFixed(2)})`);
          lastClockIn = null;
        } else {
          console.log("    ⚠️ CLOCK_OUT sin CLOCK_IN activo");
        }
        if (lastBreakStart) {
          // Si estaba en pausa, cerrar la pausa también
          const minutes = (new Date().getTime() - lastBreakStart.getTime()) / (1000 * 60);
          totalBreak += minutes;
          console.log(`    ☕ Cerrando pausa pendiente: ${minutes.toFixed(2)} min`);
          lastBreakStart = null;
        }
        break;
    }
  }

  console.log(`✅ Total calculado: ${totalWorked.toFixed(2)} min trabajados, ${totalBreak.toFixed(2)} min pausa`);

  return {
    worked: totalWorked, // NO redondear, mantener decimales para segundos
    break: totalBreak,
  };
}

// Helper para actualizar el resumen del día
async function updateWorkdaySummary(employeeId: string, orgId: string, date: Date, dailyHours: number = 8) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // Obtener todos los fichajes del día
  const entries = await prisma.timeEntry.findMany({
    where: {
      employeeId,
      orgId,
      timestamp: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  if (entries.length === 0) {
    return null;
  }

  const { worked, break: breakTime } = calculateWorkedMinutes(entries);

  const firstEntry = entries.find((e) => e.entryType === "CLOCK_IN");
  const lastExit = entries.reverse().find((e) => e.entryType === "CLOCK_OUT");

  // Determinar el estado basándose en horas trabajadas vs esperadas
  let status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" = "IN_PROGRESS";
  if (lastExit) {
    // Si fichó salida, evaluar si completó las horas
    const workedHours = worked / 60;
    const compliance = (workedHours / dailyHours) * 100;

    if (compliance >= 95) {
      status = "COMPLETED"; // Cumplió >= 95% de las horas esperadas
    } else {
      status = "INCOMPLETE"; // Fichó salida pero no cumplió las horas
    }
  }

  // Buscar o crear el resumen del día
  const summary = await prisma.workdaySummary.upsert({
    where: {
      orgId_employeeId_date: {
        orgId,
        employeeId,
        date: dayStart,
      },
    },
    create: {
      orgId,
      employeeId,
      date: dayStart,
      clockIn: firstEntry?.timestamp,
      clockOut: lastExit?.timestamp,
      totalWorkedMinutes: worked,
      totalBreakMinutes: breakTime,
      status,
    },
    update: {
      clockIn: firstEntry?.timestamp,
      clockOut: lastExit?.timestamp,
      totalWorkedMinutes: worked,
      totalBreakMinutes: breakTime,
      status,
    },
  });

  return summary;
}

// Obtener el estado actual del empleado
export async function getCurrentStatus() {
  try {
    const { employeeId, orgId } = await getAuthenticatedEmployee();

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Obtener el último fichaje del día
    const lastEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId,
        orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    if (!lastEntry) {
      return { status: "CLOCKED_OUT" as const };
    }

    // Determinar el estado según el último fichaje
    switch (lastEntry.entryType) {
      case "CLOCK_IN":
      case "BREAK_END":
        return { status: "CLOCKED_IN" as const };

      case "BREAK_START":
        return { status: "ON_BREAK" as const };

      case "CLOCK_OUT":
      default:
        return { status: "CLOCKED_OUT" as const };
    }
  } catch (error) {
    console.error("Error al obtener estado actual:", error);
    throw error;
  }
}

// Fichar entrada
export async function clockIn() {
  try {
    const { employeeId, orgId, dailyHours } = await getAuthenticatedEmployee();

    // Validar que no haya fichado ya
    const currentStatus = await getCurrentStatus();
    if (currentStatus.status !== "CLOCKED_OUT") {
      throw new Error("Ya has fichado entrada");
    }

    // Crear el fichaje
    const entry = await prisma.timeEntry.create({
      data: {
        orgId,
        employeeId,
        entryType: "CLOCK_IN",
        timestamp: new Date(),
      },
    });

    // Actualizar el resumen del día
    await updateWorkdaySummary(employeeId, orgId, new Date(), dailyHours);

    return { success: true, entry };
  } catch (error) {
    console.error("Error al fichar entrada:", error);
    throw error;
  }
}

// Fichar salida
export async function clockOut() {
  try {
    const { employeeId, orgId, dailyHours } = await getAuthenticatedEmployee();

    // Validar que haya fichado entrada
    const currentStatus = await getCurrentStatus();
    if (currentStatus.status === "CLOCKED_OUT") {
      throw new Error("No has fichado entrada");
    }

    // Si está en pausa, finalizarla primero
    if (currentStatus.status === "ON_BREAK") {
      await prisma.timeEntry.create({
        data: {
          orgId,
          employeeId,
          entryType: "BREAK_END",
          timestamp: new Date(),
        },
      });
    }

    // Crear el fichaje de salida
    const entry = await prisma.timeEntry.create({
      data: {
        orgId,
        employeeId,
        entryType: "CLOCK_OUT",
        timestamp: new Date(),
      },
    });

    // Actualizar el resumen del día
    await updateWorkdaySummary(employeeId, orgId, new Date(), dailyHours);

    return { success: true, entry };
  } catch (error) {
    console.error("Error al fichar salida:", error);
    throw error;
  }
}

// Iniciar descanso
export async function startBreak() {
  try {
    const { employeeId, orgId, dailyHours } = await getAuthenticatedEmployee();

    // Validar que esté trabajando
    const currentStatus = await getCurrentStatus();
    if (currentStatus.status !== "CLOCKED_IN") {
      throw new Error("Debes estar trabajando para iniciar un descanso");
    }

    // Crear el fichaje
    const entry = await prisma.timeEntry.create({
      data: {
        orgId,
        employeeId,
        entryType: "BREAK_START",
        timestamp: new Date(),
      },
    });

    // Actualizar el resumen del día
    await updateWorkdaySummary(employeeId, orgId, new Date(), dailyHours);

    return { success: true, entry };
  } catch (error) {
    console.error("Error al iniciar descanso:", error);
    throw error;
  }
}

// Finalizar descanso
export async function endBreak() {
  try {
    const { employeeId, orgId, dailyHours } = await getAuthenticatedEmployee();

    // Validar que esté en pausa
    const currentStatus = await getCurrentStatus();
    if (currentStatus.status !== "ON_BREAK") {
      throw new Error("No estás en descanso");
    }

    // Crear el fichaje
    const entry = await prisma.timeEntry.create({
      data: {
        orgId,
        employeeId,
        entryType: "BREAK_END",
        timestamp: new Date(),
      },
    });

    // Actualizar el resumen del día
    await updateWorkdaySummary(employeeId, orgId, new Date(), dailyHours);

    return { success: true, entry };
  } catch (error) {
    console.error("Error al finalizar descanso:", error);
    throw error;
  }
}

// Obtener horas esperadas del día según contrato
export async function getExpectedDailyHours() {
  try {
    const { dailyHours, hasActiveContract } = await getAuthenticatedEmployee();
    return { dailyHours, hasActiveContract };
  } catch (error) {
    console.error("Error al obtener horas esperadas:", error);
    throw error;
  }
}

// Obtener resumen de hoy
export async function getTodaySummary() {
  try {
    const { employeeId, orgId } = await getAuthenticatedEmployee();

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Obtener el resumen del día
    const summary = await prisma.workdaySummary.findUnique({
      where: {
        orgId_employeeId_date: {
          orgId,
          employeeId,
          date: dayStart,
        },
      },
    });

    // Obtener los fichajes del día (independientemente de si hay resumen o no)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Combinar resumen con entries
    if (summary) {
      return {
        id: summary.id,
        date: summary.date,
        clockIn: summary.clockIn,
        clockOut: summary.clockOut,
        totalWorkedMinutes: Number(summary.totalWorkedMinutes),
        totalBreakMinutes: Number(summary.totalBreakMinutes),
        status: summary.status,
        notes: summary.notes,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
        orgId: summary.orgId,
        employeeId: summary.employeeId,
        timeEntries,
      };
    }

    // Si no hay resumen pero hay entries, retornar estructura básica
    if (timeEntries.length > 0) {
      return {
        id: "",
        date: dayStart,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        status: "IN_PROGRESS" as const,
        timeEntries,
      };
    }

    return null;
  } catch (error) {
    console.error("Error al obtener resumen de hoy:", error);
    throw error;
  }
}

// Obtener resumen semanal
export async function getWeeklySummary() {
  try {
    const { employeeId, orgId } = await getAuthenticatedEmployee();

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Lunes
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const summaries = await prisma.workdaySummary.findMany({
      where: {
        orgId,
        employeeId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        timeEntries: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    const totalWorked = summaries.reduce((acc, s) => acc + Number(s.totalWorkedMinutes), 0);
    const totalBreak = summaries.reduce((acc, s) => acc + Number(s.totalBreakMinutes), 0);

    return {
      weekStart,
      weekEnd,
      totalWorkedMinutes: totalWorked,
      totalBreakMinutes: totalBreak,
      days: summaries.map(s => ({
        ...s,
        totalWorkedMinutes: Number(s.totalWorkedMinutes),
        totalBreakMinutes: Number(s.totalBreakMinutes),
      })),
    };
  } catch (error) {
    console.error("Error al obtener resumen semanal:", error);
    throw error;
  }
}

// Obtener resumen mensual
export async function getMonthlySummaries(year: number, month: number) {
  try {
    const { employeeId, orgId } = await getAuthenticatedEmployee();

    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const summaries = await prisma.workdaySummary.findMany({
      where: {
        orgId,
        employeeId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        timeEntries: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return summaries.map(s => ({
      ...s,
      totalWorkedMinutes: Number(s.totalWorkedMinutes),
      totalBreakMinutes: Number(s.totalBreakMinutes),
    }));
  } catch (error) {
    console.error("Error al obtener resumen mensual:", error);
    throw error;
  }
}

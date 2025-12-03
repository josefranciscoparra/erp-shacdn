"use server";

import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

import { prisma } from "@/lib/prisma";
import { getEffectiveSchedule } from "@/lib/schedule-engine";

import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

// Tipos
type CalendarTimeEntry = {
  id: string;
  entryType: string;
  timestamp: Date;
  location?: string | null;
  notes?: string | null;
  ipAddress?: string | null;
  isManual?: boolean;
  manualRequestId?: string | null;
  createdAt?: Date;
};

export interface DayCalendarData {
  date: Date;
  isWorkday: boolean; // Día laboral según contrato y festivos
  isHoliday: boolean;
  holidayName?: string;
  expectedHours: number; // Horas que debía trabajar
  workedHours: number; // Horas que realmente trabajó
  status: "COMPLETED" | "INCOMPLETE" | "ABSENT" | "NON_WORKDAY";
  workdaySummary?: any;
  hasPendingRequest?: boolean; // Tiene solicitud de fichaje manual pendiente
  timeEntries?: CalendarTimeEntry[];
}

export interface MonthlyCalendarData {
  year: number;
  month: number;
  days: DayCalendarData[];
  totalExpectedHours: number;
  totalWorkedHours: number;
  balance: number; // positivo = horas de más, negativo = horas de menos
  stats: {
    completedDays: number;
    incompleteDays: number;
    absentDays: number;
    workdays: number;
  };
}

// Helper: Obtener horas esperadas para un día usando Schedule V2.0
interface ScheduleInfo {
  expectedMinutes: number;
  isWorkday: boolean;
  source?: string | null;
}

async function getScheduleInfoForDay(employeeId: string, date: Date): Promise<ScheduleInfo> {
  try {
    const schedule = await getEffectiveSchedule(employeeId, date);

    return {
      expectedMinutes: schedule.expectedMinutes ?? 0,
      isWorkday: schedule.isWorkingDay,
      source: schedule.source,
    };
  } catch (error) {
    console.error(`Error al obtener horario para ${date.toISOString()}:`, error);
    return {
      expectedMinutes: 0,
      isWorkday: false,
    };
  }
}

async function getContractFallbackMinutes(employeeId: string, orgId: string): Promise<number | null> {
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      orgId,
      active: true,
      weeklyHours: {
        gt: 0,
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  if (!contract) {
    return null;
  }

  if (typeof contract.workdayMinutes === "number" && contract.workdayMinutes > 0) {
    return contract.workdayMinutes;
  }

  const weeklyHours = contract.weeklyHours ? Number(contract.weeklyHours) : 0;
  if (weeklyHours <= 0) {
    return null;
  }

  const workingDaysPerWeek = contract.workingDaysPerWeek ? Number(contract.workingDaysPerWeek) : 5;
  if (workingDaysPerWeek <= 0) {
    return null;
  }

  return Math.round((weeklyHours / workingDaysPerWeek) * 60);
}

// Obtener datos del calendario mensual
export async function getMonthlyCalendarData(year: number, month: number): Promise<MonthlyCalendarData> {
  try {
    const { employeeId, orgId } = await getAuthenticatedEmployee();

    // Obtener fechas del mes
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Obtener resúmenes de días trabajados del mes
    const workdaySummaries = await prisma.workdaySummary.findMany({
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

    const summaryMap = new Map(workdaySummaries.map((s) => [format(s.date, "yyyy-MM-dd"), s]));

    // Obtener solicitudes de fichaje manual pendientes del mes
    const pendingRequests = await prisma.manualTimeEntryRequest.findMany({
      where: {
        orgId,
        employeeId,
        status: "PENDING",
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const pendingRequestMap = new Set(pendingRequests.map((r) => format(r.date, "yyyy-MM-dd")));

    // Obtener fichajes individuales del mes (aunque no estén vinculados al resumen)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        orgId,
        employeeId,
        timestamp: {
          gte: monthStart,
          lte: monthEnd,
        },
        isCancelled: false,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    const timeEntriesByDay = new Map<string, CalendarTimeEntry[]>();
    timeEntries.forEach((entry) => {
      const dateKey = format(entry.timestamp, "yyyy-MM-dd");
      const normalizedEntry: CalendarTimeEntry = {
        id: entry.id,
        entryType: entry.entryType,
        timestamp: entry.timestamp,
        location: entry.location,
        notes: entry.notes,
        ipAddress: entry.ipAddress,
        isManual: entry.isManual,
        manualRequestId: entry.manualRequestId,
        createdAt: entry.createdAt,
      };

      const existing = timeEntriesByDay.get(dateKey) ?? [];
      existing.push(normalizedEntry);
      timeEntriesByDay.set(dateKey, existing);
    });

    // Procesar cada día del mes - calcular expected hours usando Schedule V2.0
    const fallbackMinutes = await getContractFallbackMinutes(employeeId, orgId);

    const daysWithSchedules = await Promise.all(
      daysInMonth.map(async (date) => {
        const scheduleInfo = await getScheduleInfoForDay(employeeId, date);
        return { date, scheduleInfo };
      }),
    );

    // Procesar cada día del mes
    const days: DayCalendarData[] = daysWithSchedules.map(({ date, scheduleInfo }) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const summary = summaryMap.get(dateKey);
      const summaryExpectedMinutes =
        summary?.expectedMinutes !== null && summary?.expectedMinutes !== undefined
          ? Number(summary.expectedMinutes)
          : null;
      const scheduleExpectedMinutes = scheduleInfo.expectedMinutes ?? 0;

      const isWorkday = scheduleInfo.isWorkday;
      // En días de descanso mantenemos 0h esperadas aunque exista un resumen previo con fallback
      let expectedMinutes = isWorkday ? scheduleExpectedMinutes : 0;
      if (summaryExpectedMinutes !== null && isWorkday) {
        expectedMinutes = summaryExpectedMinutes;
      }

      const fallbackEntries = timeEntriesByDay.get(dateKey)?.map((entry) => ({ ...entry })) ?? [];
      const workedHours = summary ? Number(summary.totalWorkedMinutes) / 60 : 0;
      const summaryEntries = (summary?.timeEntries ?? []).map((entry) => ({
        id: entry.id,
        entryType: entry.entryType,
        timestamp: entry.timestamp,
        location: entry.location,
        notes: entry.notes,
        ipAddress: entry.ipAddress,
        isManual: entry.isManual,
        manualRequestId: entry.manualRequestId,
        createdAt: entry.createdAt,
      }));
      const mergedTimeEntries = summaryEntries.length > 0 ? summaryEntries : fallbackEntries;

      if (isWorkday && expectedMinutes === 0 && mergedTimeEntries.length > 0 && fallbackMinutes) {
        expectedMinutes = fallbackMinutes;
      }
      const expectedHours = expectedMinutes / 60;

      // Determinar estado del día
      let status: DayCalendarData["status"];
      if (!isWorkday) {
        status = "NON_WORKDAY";
      } else if (summary) {
        switch (summary.status) {
          case "COMPLETED":
            status = "COMPLETED";
            break;
          case "INCOMPLETE":
          case "IN_PROGRESS":
            status = "INCOMPLETE";
            break;
          case "ABSENT":
            status = "ABSENT";
            break;
          default: {
            const compliance = expectedHours > 0 ? (workedHours / expectedHours) * 100 : 0;
            status = compliance >= 95 ? "COMPLETED" : "INCOMPLETE";
          }
        }
      } else {
        status = "ABSENT";
      }

      return {
        date,
        isWorkday,
        isHoliday: false, // Schedule V2.0 ya maneja festivos internamente
        expectedHours,
        workedHours,
        status,
        hasPendingRequest: pendingRequestMap.has(dateKey),
        timeEntries: mergedTimeEntries,
        workdaySummary: summary
          ? {
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
              timeEntries: mergedTimeEntries,
            }
          : undefined,
      };
    });

    // Calcular totales y estadísticas SOLO hasta hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtrar días hasta hoy (no contar días futuros)
    const daysUntilToday = days.filter((day) => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate <= today;
    });

    const totalExpectedHours = daysUntilToday.reduce((acc, day) => acc + day.expectedHours, 0);
    const totalWorkedHours = daysUntilToday.reduce((acc, day) => acc + day.workedHours, 0);
    const balance = totalWorkedHours - totalExpectedHours;

    const stats = {
      completedDays: daysUntilToday.filter((d) => d.status === "COMPLETED").length,
      incompleteDays: daysUntilToday.filter((d) => d.status === "INCOMPLETE").length,
      absentDays: daysUntilToday.filter((d) => d.status === "ABSENT").length,
      workdays: daysUntilToday.filter((d) => d.isWorkday).length,
    };

    return {
      year,
      month,
      days,
      totalExpectedHours,
      totalWorkedHours,
      balance,
      stats,
    };
  } catch (error) {
    console.error("Error al obtener datos del calendario:", error);
    throw error;
  }
}

"use server";

import { startOfMonth, endOfMonth, eachDayOfInterval, format, isWeekend } from "date-fns";

import { prisma } from "@/lib/prisma";

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

// Helper: Determinar si una fecha está en el rango de jornada intensiva
function isInIntensivePeriod(date: Date, contract: any): boolean {
  if (!contract.hasIntensiveSchedule || !contract.intensiveStartDate || !contract.intensiveEndDate) {
    return false;
  }

  // Formato: "MM-DD" (ej: "06-15" para 15 de junio)
  const currentMonthDay = format(date, "MM-dd");
  const startMonthDay = contract.intensiveStartDate;
  const endMonthDay = contract.intensiveEndDate;

  // Caso normal: inicio antes del fin (ej: 06-15 a 09-15)
  if (startMonthDay <= endMonthDay) {
    return currentMonthDay >= startMonthDay && currentMonthDay <= endMonthDay;
  }

  // Caso cruzando año: inicio después del fin (ej: 12-15 a 01-31)
  return currentMonthDay >= startMonthDay || currentMonthDay <= endMonthDay;
}

// Helper: Obtener horas esperadas para un día específico
function getExpectedHoursForDay(date: Date, contract: any, isHoliday: boolean): number {
  // Si es festivo, no se espera trabajar
  if (isHoliday) {
    return 0;
  }

  // Determinar si usa patrón semanal personalizado
  const hasCustomPattern = contract.hasCustomWeeklyPattern;
  const isIntensive = isInIntensivePeriod(date, contract);

  // Si tiene patrón personalizado, usar las horas del día específico
  if (hasCustomPattern) {
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[dayOfWeek];

    // Elegir las horas según jornada intensiva o normal
    const hoursField = isIntensive
      ? `intensive${dayName.charAt(0).toUpperCase() + dayName.slice(1)}Hours`
      : `${dayName}Hours`;

    const hours = contract[hoursField];
    return hours ? Number(hours) : 0;
  }

  // Si no tiene patrón personalizado, usar horas semanales / días laborables
  const weeklyHours =
    isIntensive && contract.intensiveWeeklyHours
      ? Number(contract.intensiveWeeklyHours)
      : Number(contract.weeklyHours ?? 40);

  const workingDaysPerWeek = Number(contract.workingDaysPerWeek ?? 5);
  const dailyHours = weeklyHours / workingDaysPerWeek;

  // Verificar si el día es laboral según los días de trabajo por semana
  // Por defecto asumimos Lunes-Viernes si workingDaysPerWeek = 5
  const dayOfWeek = date.getDay();

  if (workingDaysPerWeek === 5) {
    // Lunes-Viernes (1-5)
    return dayOfWeek >= 1 && dayOfWeek <= 5 ? dailyHours : 0;
  } else if (workingDaysPerWeek === 6) {
    // Lunes-Sábado (1-6)
    return dayOfWeek >= 1 && dayOfWeek <= 6 ? dailyHours : 0;
  } else if (workingDaysPerWeek === 4) {
    // Lunes-Jueves (1-4)
    return dayOfWeek >= 1 && dayOfWeek <= 4 ? dailyHours : 0;
  }

  // Si no coincide con los casos comunes, asumir que trabaja si no es fin de semana
  return !isWeekend(date) ? dailyHours : 0;
}

// Obtener datos del calendario mensual
export async function getMonthlyCalendarData(year: number, month: number): Promise<MonthlyCalendarData> {
  try {
    const { employeeId, orgId, activeContract } = await getAuthenticatedEmployee({
      contractInclude: true,
    });

    if (!activeContract) {
      throw new Error("No tienes un contrato activo");
    }

    // Obtener fechas del mes
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    // Fecha de inicio del contrato
    const contractStartDate = new Date(activeContract.startDate);
    contractStartDate.setHours(0, 0, 0, 0);

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Obtener festivos del mes
    const holidays = await prisma.calendarEvent.findMany({
      where: {
        calendar: {
          orgId,
          active: true,
          year,
        },
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        eventType: "HOLIDAY",
      },
      include: {
        calendar: true,
      },
    });

    const holidayMap = new Map(holidays.map((h) => [format(h.date, "yyyy-MM-dd"), h.name]));

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

    // Procesar cada día del mes
    const days: DayCalendarData[] = daysInMonth.map((date) => {
      const dateKey = format(date, "yyyy-MM-dd");

      // Si el día es antes del inicio del contrato, marcarlo como NON_WORKDAY
      if (date < contractStartDate) {
        return {
          date,
          isWorkday: false,
          isHoliday: false,
          expectedHours: 0,
          workedHours: 0,
          status: "NON_WORKDAY" as const,
          hasPendingRequest: false,
        };
      }

      const isHoliday = holidayMap.has(dateKey);
      const holidayName = holidayMap.get(dateKey);
      const expectedHours = getExpectedHoursForDay(date, activeContract, isHoliday);
      const isWorkday = expectedHours > 0;

      const summary = summaryMap.get(dateKey);
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

      // Determinar estado del día
      let status: DayCalendarData["status"];
      if (!isWorkday) {
        status = "NON_WORKDAY";
      } else if (!summary) {
        status = "ABSENT";
      } else {
        // Calcular cumplimiento (95% o más = COMPLETED)
        const compliance = expectedHours > 0 ? (workedHours / expectedHours) * 100 : 0;
        status = compliance >= 95 ? "COMPLETED" : "INCOMPLETE";
      }

      return {
        date,
        isWorkday,
        isHoliday,
        holidayName,
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

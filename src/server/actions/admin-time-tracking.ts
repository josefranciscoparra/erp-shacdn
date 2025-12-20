"use server";
/* eslint-disable no-underscore-dangle */ // Prisma usa _sum, _count, _all para agregaciones

import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
} from "date-fns";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveScheduleForRange } from "@/services/schedules/schedule-engine";

function getLocalDateKey(date: Date): string {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: Calcular días laborables en un período
// Considera: inicio de contrato, patrón de días laborables, festivos
async function calculateWorkableDays(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
  contractStartDate: Date | null,
): Promise<number> {
  // El período efectivo empieza en la fecha más tardía entre el inicio del período y el inicio del contrato
  const effectiveStart = contractStartDate && contractStartDate > periodStart ? contractStartDate : periodStart;

  // Si el contrato empieza después del período, no hay días laborables
  if (effectiveStart > periodEnd) return 0;

  const schedules = await getEffectiveScheduleForRange(employeeId, effectiveStart, periodEnd);
  return schedules.filter((schedule) => schedule.isWorkingDay).length;
}

// Tipos de filtros
export interface TimeTrackingFilters {
  employeeId?: string;
  departmentId?: string;
  costCenterId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT";
}

// Helper para verificar permisos de administrador
async function checkAdminPermissions() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      orgId: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Verificar que tenga permisos (admin, HR, o manager)
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "MANAGER"].includes(user.role)) {
    throw new Error("No tienes permisos para ver esta información");
  }

  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
}

// ============================================================================
// HELPER FUNCTIONS - Cálculo de horas esperadas
// ============================================================================

// Helper: Calcular horas trabajadas desde franjas horarias con pausas
function calculateHoursFromTimeSlots(
  startTime: string | null,
  endTime: string | null,
  breakStart: string | null,
  breakEnd: string | null,
): number {
  if (!startTime || !endTime) {
    return 0;
  }

  // Parsear horas (formato "HH:MM")
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  // Calcular horas trabajadas
  const totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);

  // Restar pausa si existe
  let breakMinutes = 0;
  if (breakStart && breakEnd) {
    const [breakStartHour, breakStartMin] = breakStart.split(":").map(Number);
    const [breakEndHour, breakEndMin] = breakEnd.split(":").map(Number);
    breakMinutes = breakEndHour * 60 + breakEndMin - (breakStartHour * 60 + breakStartMin);
  }

  return (totalMinutes - breakMinutes) / 60;
}

// Helper: Calcular horas promedio desde horas semanales
function calculateAverageHours(
  isIntensivePeriod: boolean,
  intensiveWeeklyHours: any,
  weeklyHours: any,
  workingDaysPerWeek: any,
): number {
  const hours = isIntensivePeriod && intensiveWeeklyHours ? Number(intensiveWeeklyHours) : Number(weeklyHours);
  const days = Number(workingDaysPerWeek ?? 5);
  return hours / days;
}

function isInIntensivePeriod(contract: any, targetDate: Date): boolean {
  if (!contract?.hasIntensiveSchedule || !contract.intensiveStartDate || !contract.intensiveEndDate) {
    return false;
  }

  const currentMonthDay = format(targetDate, "MM-dd");
  const startMonthDay = contract.intensiveStartDate;
  const endMonthDay = contract.intensiveEndDate;

  if (startMonthDay <= endMonthDay) {
    return currentMonthDay >= startMonthDay && currentMonthDay <= endMonthDay;
  }

  return currentMonthDay >= startMonthDay || currentMonthDay <= endMonthDay;
}

// Helper: Calcular horas para un día en horario FIXED
function calculateFixedScheduleHours(
  worksToday: boolean,
  hasFixedTimeSlots: boolean,
  dayOfWeek: number,
  isIntensivePeriod: boolean,
  contract: any,
): number {
  if (!worksToday) {
    return 0;
  }

  if (!hasFixedTimeSlots) {
    return calculateAverageHours(
      isIntensivePeriod,
      contract.intensiveWeeklyHours,
      contract.weeklyHours,
      contract.workingDaysPerWeek,
    );
  }

  // Obtener franjas horarias para hoy
  const startTimeFields = [
    contract.sundayStartTime,
    contract.mondayStartTime,
    contract.tuesdayStartTime,
    contract.wednesdayStartTime,
    contract.thursdayStartTime,
    contract.fridayStartTime,
    contract.saturdayStartTime,
  ];
  const endTimeFields = [
    contract.sundayEndTime,
    contract.mondayEndTime,
    contract.tuesdayEndTime,
    contract.wednesdayEndTime,
    contract.thursdayEndTime,
    contract.fridayEndTime,
    contract.saturdayEndTime,
  ];
  const breakStartFields = [
    contract.sundayBreakStartTime,
    contract.mondayBreakStartTime,
    contract.tuesdayBreakStartTime,
    contract.wednesdayBreakStartTime,
    contract.thursdayBreakStartTime,
    contract.fridayBreakStartTime,
    contract.saturdayBreakStartTime,
  ];
  const breakEndFields = [
    contract.sundayBreakEndTime,
    contract.mondayBreakEndTime,
    contract.tuesdayBreakEndTime,
    contract.wednesdayBreakEndTime,
    contract.thursdayBreakEndTime,
    contract.fridayBreakEndTime,
    contract.saturdayBreakEndTime,
  ];

  // Intensive variants
  const intensiveStartTimeFields = [
    contract.intensiveSundayStartTime,
    contract.intensiveMondayStartTime,
    contract.intensiveTuesdayStartTime,
    contract.intensiveWednesdayStartTime,
    contract.intensiveThursdayStartTime,
    contract.intensiveFridayStartTime,
    contract.intensiveSaturdayStartTime,
  ];
  const intensiveEndTimeFields = [
    contract.intensiveSundayEndTime,
    contract.intensiveMondayEndTime,
    contract.intensiveTuesdayEndTime,
    contract.intensiveWednesdayEndTime,
    contract.intensiveThursdayEndTime,
    contract.intensiveFridayEndTime,
    contract.intensiveSaturdayEndTime,
  ];
  const intensiveBreakStartFields = [
    contract.intensiveSundayBreakStartTime,
    contract.intensiveMondayBreakStartTime,
    contract.intensiveTuesdayBreakStartTime,
    contract.intensiveWednesdayBreakStartTime,
    contract.intensiveThursdayBreakStartTime,
    contract.intensiveFridayBreakStartTime,
    contract.intensiveSaturdayBreakStartTime,
  ];
  const intensiveBreakEndFields = [
    contract.intensiveSundayBreakEndTime,
    contract.intensiveMondayBreakEndTime,
    contract.intensiveTuesdayBreakEndTime,
    contract.intensiveWednesdayBreakEndTime,
    contract.intensiveThursdayBreakEndTime,
    contract.intensiveFridayBreakEndTime,
    contract.intensiveSaturdayBreakEndTime,
  ];

  const startTime = isIntensivePeriod ? intensiveStartTimeFields[dayOfWeek] : startTimeFields[dayOfWeek];
  const endTime = isIntensivePeriod ? intensiveEndTimeFields[dayOfWeek] : endTimeFields[dayOfWeek];
  const breakStart = isIntensivePeriod ? intensiveBreakStartFields[dayOfWeek] : breakStartFields[dayOfWeek];
  const breakEnd = isIntensivePeriod ? intensiveBreakEndFields[dayOfWeek] : breakEndFields[dayOfWeek];

  const calculated = calculateHoursFromTimeSlots(startTime, endTime, breakStart, breakEnd);

  if (calculated > 0) {
    return calculated;
  }

  // Fallback to average
  return calculateAverageHours(
    isIntensivePeriod,
    contract.intensiveWeeklyHours,
    contract.weeklyHours,
    contract.workingDaysPerWeek,
  );
}

function getExpectedHoursFromContract(
  contract: any,
  targetDate: Date,
  isHoliday: boolean,
): { hoursExpected: number; isWorkingDay: boolean; hasActiveContract: boolean } {
  if (!contract) {
    return { hoursExpected: 0, isWorkingDay: false, hasActiveContract: false };
  }

  if (isHoliday) {
    return { hoursExpected: 0, isWorkingDay: false, hasActiveContract: true };
  }

  const dayOfWeek = targetDate.getDay();
  const isIntensivePeriod = isInIntensivePeriod(contract, targetDate);

  const regularHoursByDay = [
    contract.sundayHours,
    contract.mondayHours,
    contract.tuesdayHours,
    contract.wednesdayHours,
    contract.thursdayHours,
    contract.fridayHours,
    contract.saturdayHours,
  ];

  const intensiveHoursByDay = [
    contract.intensiveSundayHours,
    contract.intensiveMondayHours,
    contract.intensiveTuesdayHours,
    contract.intensiveWednesdayHours,
    contract.intensiveThursdayHours,
    contract.intensiveFridayHours,
    contract.intensiveSaturdayHours,
  ];

  const workDaysByDay = [
    contract.workSunday,
    contract.workMonday,
    contract.workTuesday,
    contract.workWednesday,
    contract.workThursday,
    contract.workFriday,
    contract.workSaturday,
  ];

  let hoursExpected = 0;
  let isWorkingDay = false;

  if (contract.scheduleType === "FLEXIBLE") {
    if (contract.hasCustomWeeklyPattern) {
      const todayHours = isIntensivePeriod ? intensiveHoursByDay[dayOfWeek] : regularHoursByDay[dayOfWeek];
      if (todayHours !== null && todayHours !== undefined) {
        hoursExpected = Number(todayHours);
        isWorkingDay = hoursExpected > 0;
      } else {
        hoursExpected = 0;
        isWorkingDay = false;
      }
    } else {
      hoursExpected = calculateAverageHours(
        isIntensivePeriod,
        contract.intensiveWeeklyHours,
        contract.weeklyHours,
        contract.workingDaysPerWeek,
      );
      isWorkingDay = true;
    }
  } else if (contract.scheduleType === "FIXED") {
    const worksToday = workDaysByDay[dayOfWeek] ?? false;
    isWorkingDay = worksToday;
    hoursExpected = calculateFixedScheduleHours(
      worksToday,
      contract.hasFixedTimeSlots ?? false,
      dayOfWeek,
      isIntensivePeriod,
      contract,
    );
  } else {
    hoursExpected = calculateAverageHours(
      isIntensivePeriod,
      contract.intensiveWeeklyHours,
      contract.weeklyHours,
      contract.workingDaysPerWeek,
    );
    isWorkingDay = true;
  }

  return { hoursExpected, isWorkingDay, hasActiveContract: true };
}

function getExpectedEntryTimeFromContract(contract: any, targetDate: Date): string | null {
  if (!contract || contract.scheduleType !== "FIXED" || !contract.hasFixedTimeSlots) {
    return null;
  }

  const dayOfWeek = targetDate.getDay();
  const workDaysByDay = [
    contract.workSunday,
    contract.workMonday,
    contract.workTuesday,
    contract.workWednesday,
    contract.workThursday,
    contract.workFriday,
    contract.workSaturday,
  ];

  const worksToday = workDaysByDay[dayOfWeek] ?? false;
  if (!worksToday) {
    return null;
  }

  const isIntensivePeriod = isInIntensivePeriod(contract, targetDate);
  const startTimeFields = [
    contract.sundayStartTime,
    contract.mondayStartTime,
    contract.tuesdayStartTime,
    contract.wednesdayStartTime,
    contract.thursdayStartTime,
    contract.fridayStartTime,
    contract.saturdayStartTime,
  ];
  const intensiveStartTimeFields = [
    contract.intensiveSundayStartTime,
    contract.intensiveMondayStartTime,
    contract.intensiveTuesdayStartTime,
    contract.intensiveWednesdayStartTime,
    contract.intensiveThursdayStartTime,
    contract.intensiveFridayStartTime,
    contract.intensiveSaturdayStartTime,
  ];

  const startTime = isIntensivePeriod ? intensiveStartTimeFields[dayOfWeek] : startTimeFields[dayOfWeek];
  return startTime ?? null;
}

// ============================================================================
// FUNCIÓN PRINCIPAL - Obtener horas esperadas para un día específico
// ============================================================================

/**
 * Obtiene las horas esperadas para un empleado en una fecha específica
 * Considera: tipo de contrato, patrón semanal, jornada intensiva, festivos
 *
 * @param employeeId - ID del empleado
 * @param targetDate - Fecha a consultar
 * @returns Información completa del día laborable
 */
export async function getExpectedHoursForDay(
  employeeId: string,
  targetDate: Date,
): Promise<{
  hoursExpected: number;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  hasActiveContract: boolean;
}> {
  try {
    // Obtener el empleado con su organización
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { orgId: true },
    });

    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    const { orgId } = employee;

    // Obtener contrato activo
    const contract = await prisma.employmentContract.findFirst({
      where: {
        employeeId,
        active: true,
        weeklyHours: { gt: 0 },
      },
      orderBy: { startDate: "desc" },
    });

    const hasActiveContract = Boolean(contract);

    // Si no hay contrato, retornar valores por defecto
    if (!contract) {
      return {
        hoursExpected: 0,
        isWorkingDay: false,
        isHoliday: false,
        hasActiveContract: false,
      };
    }

    // Obtener día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
    const dayOfWeek = targetDate.getDay();

    // Verificar si es festivo
    // IMPORTANTE: Normalizar fechas a UTC para evitar problemas de timezone
    // El cliente puede estar en UTC+1 (España), el servidor en UTC
    // Si usamos startOfDay() directamente: "17 nov 00:00 UTC+1" = "16 nov 23:00 UTC" en BD
    // Solución: normalizar a mediodía UTC para que el día se mantenga independiente del timezone
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    const dayStart = startOfDay(normalizedDate);
    const dayEnd = endOfDay(normalizedDate);
    const targetYear = normalizedDate.getFullYear();

    const holiday = await prisma.calendarEvent.findFirst({
      where: {
        calendar: {
          orgId,
          active: true,
          year: targetYear,
        },
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        eventType: "HOLIDAY",
      },
      select: {
        name: true,
      },
    });

    // Si es festivo, no hay que trabajar
    if (holiday) {
      return {
        hoursExpected: 0,
        isWorkingDay: false,
        isHoliday: true,
        holidayName: holiday.name,
        hasActiveContract,
      };
    }

    // Verificar si estamos en periodo de jornada intensiva
    let isIntensivePeriod = false;
    if (contract.hasIntensiveSchedule && contract.intensiveStartDate && contract.intensiveEndDate) {
      const currentMonthDay = format(targetDate, "MM-dd");
      const startMonthDay = contract.intensiveStartDate;
      const endMonthDay = contract.intensiveEndDate;

      // Comparar fechas MM-DD
      if (startMonthDay <= endMonthDay) {
        // Periodo dentro del mismo año (ej: 06-15 a 09-15)
        isIntensivePeriod = currentMonthDay >= startMonthDay && currentMonthDay <= endMonthDay;
      } else {
        // Periodo que cruza año (ej: 12-15 a 02-15)
        isIntensivePeriod = currentMonthDay >= startMonthDay || currentMonthDay <= endMonthDay;
      }
    }

    // Determinar horas según tipo de horario y día de la semana
    let hoursExpected = 0;
    let isWorkingDay = false;

    // Array con los campos de horas por día de la semana (domingo a sábado)
    const regularHoursByDay = [
      contract.sundayHours,
      contract.mondayHours,
      contract.tuesdayHours,
      contract.wednesdayHours,
      contract.thursdayHours,
      contract.fridayHours,
      contract.saturdayHours,
    ];

    const intensiveHoursByDay = [
      contract.intensiveSundayHours,
      contract.intensiveMondayHours,
      contract.intensiveTuesdayHours,
      contract.intensiveWednesdayHours,
      contract.intensiveThursdayHours,
      contract.intensiveFridayHours,
      contract.intensiveSaturdayHours,
    ];

    const workDaysByDay = [
      contract.workSunday,
      contract.workMonday,
      contract.workTuesday,
      contract.workWednesday,
      contract.workThursday,
      contract.workFriday,
      contract.workSaturday,
    ];

    if (contract.scheduleType === "FLEXIBLE") {
      if (contract.hasCustomWeeklyPattern) {
        // FLEXIBLE con patrón personalizado: Usar horas específicas del día
        const todayHours = isIntensivePeriod ? intensiveHoursByDay[dayOfWeek] : regularHoursByDay[dayOfWeek];

        if (todayHours !== null && todayHours !== undefined) {
          hoursExpected = Number(todayHours);
          isWorkingDay = hoursExpected > 0;
        } else {
          // Si no hay horas definidas para hoy, no es día laborable
          hoursExpected = 0;
          isWorkingDay = false;
        }
      } else {
        // FLEXIBLE sin patrón: Usar promedio (comportamiento legacy)
        hoursExpected = calculateAverageHours(
          isIntensivePeriod,
          contract.intensiveWeeklyHours,
          contract.weeklyHours,
          contract.workingDaysPerWeek,
        );
        isWorkingDay = true; // Asumimos que trabaja si no hay patrón específico
      }
    } else if (contract.scheduleType === "FIXED") {
      // FIXED: Verificar si trabaja hoy según workMonday, workTuesday, etc.
      const worksToday = workDaysByDay[dayOfWeek] ?? false;
      isWorkingDay = worksToday;
      hoursExpected = calculateFixedScheduleHours(
        worksToday,
        contract.hasFixedTimeSlots ?? false,
        dayOfWeek,
        isIntensivePeriod,
        contract,
      );
    } else {
      // SHIFTS u otro tipo: Por ahora usar promedio
      hoursExpected = calculateAverageHours(
        isIntensivePeriod,
        contract.intensiveWeeklyHours,
        contract.weeklyHours,
        contract.workingDaysPerWeek,
      );
      isWorkingDay = true;
    }

    return {
      hoursExpected,
      isWorkingDay,
      isHoliday: false,
      hasActiveContract,
    };
  } catch (error) {
    console.error("Error al obtener horas esperadas para el día:", error);
    throw error;
  }
}

/**
 * Obtiene la hora de entrada esperada para un empleado en una fecha específica
 * Solo aplica para contratos FIXED con franjas horarias definidas
 *
 * @param employeeId - ID del empleado
 * @param targetDate - Fecha a consultar
 * @returns Hora de entrada en formato "HH:MM" o null si no aplica
 */
export async function getEmployeeEntryTime(employeeId: string, targetDate: Date): Promise<string | null> {
  try {
    // Obtener contrato activo
    const contract = await prisma.employmentContract.findFirst({
      where: {
        employeeId,
        active: true,
        weeklyHours: { gt: 0 },
      },
      orderBy: { startDate: "desc" },
    });

    // Si no hay contrato o no es FIXED, no hay hora de entrada definida
    if (!contract || contract.scheduleType !== "FIXED") {
      return null;
    }

    // Si no tiene franjas horarias definidas, no hay hora de entrada
    if (!contract.hasFixedTimeSlots) {
      return null;
    }

    // Obtener día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
    const dayOfWeek = targetDate.getDay();

    // Verificar si trabaja este día
    const workDaysByDay = [
      contract.workSunday,
      contract.workMonday,
      contract.workTuesday,
      contract.workWednesday,
      contract.workThursday,
      contract.workFriday,
      contract.workSaturday,
    ];

    const worksToday = workDaysByDay[dayOfWeek] ?? false;

    // Si no trabaja hoy, no hay hora de entrada
    if (!worksToday) {
      return null;
    }

    // Verificar si estamos en periodo de jornada intensiva
    let isIntensivePeriod = false;
    if (contract.hasIntensiveSchedule && contract.intensiveStartDate && contract.intensiveEndDate) {
      const currentMonthDay = format(targetDate, "MM-dd");
      const startMonthDay = contract.intensiveStartDate;
      const endMonthDay = contract.intensiveEndDate;

      // Comparar fechas MM-DD
      if (startMonthDay <= endMonthDay) {
        isIntensivePeriod = currentMonthDay >= startMonthDay && currentMonthDay <= endMonthDay;
      } else {
        isIntensivePeriod = currentMonthDay >= startMonthDay || currentMonthDay <= endMonthDay;
      }
    }

    // Obtener franjas horarias de inicio
    const startTimeFields = [
      contract.sundayStartTime,
      contract.mondayStartTime,
      contract.tuesdayStartTime,
      contract.wednesdayStartTime,
      contract.thursdayStartTime,
      contract.fridayStartTime,
      contract.saturdayStartTime,
    ];

    const intensiveStartTimeFields = [
      contract.intensiveSundayStartTime,
      contract.intensiveMondayStartTime,
      contract.intensiveTuesdayStartTime,
      contract.intensiveWednesdayStartTime,
      contract.intensiveThursdayStartTime,
      contract.intensiveFridayStartTime,
      contract.intensiveSaturdayStartTime,
    ];

    // Elegir la hora de inicio según periodo intensivo o normal
    const startTime = isIntensivePeriod ? intensiveStartTimeFields[dayOfWeek] : startTimeFields[dayOfWeek];

    return startTime ?? null;
  } catch (error) {
    console.error("Error al obtener hora de entrada del empleado:", error);
    throw error;
  }
}

// Obtener lista de empleados para time tracking
export async function getEmployeesForTimeTracking() {
  try {
    const { orgId } = await checkAdminPermissions();

    const today = new Date();
    const dayStart = startOfDay(today);

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        active: true,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        employmentContracts: {
          where: {
            active: true,
          },
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 1,
        },
        timeEntries: {
          where: {
            timestamp: {
              gte: dayStart,
            },
          },
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
        },
        workdaySummaries: {
          where: {
            date: dayStart,
          },
          take: 1,
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return employees.map((employee) => {
      const lastEntry = employee.timeEntries[0];
      const todaySummary = employee.workdaySummaries[0];
      const contract = employee.employmentContracts[0];

      let status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK" = "CLOCKED_OUT";

      if (lastEntry) {
        switch (lastEntry.entryType) {
          case "CLOCK_IN":
          case "BREAK_END":
            status = "CLOCKED_IN";
            break;
          case "BREAK_START":
            status = "ON_BREAK";
            break;
          case "CLOCK_OUT":
          default:
            status = "CLOCKED_OUT";
            break;
        }
      }

      return {
        id: employee.id,
        name: employee.user?.name ?? "Sin nombre",
        email: employee.user?.email ?? "",
        image: employee.user?.image,
        department: contract?.department?.name ?? "Sin departamento",
        status,
        lastAction: lastEntry?.timestamp || null,
        todayWorkedMinutes: todaySummary ? Number(todaySummary.totalWorkedMinutes) : 0,
      };
    });
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    throw error;
  }
}

// Obtener resumen semanal de un empleado
export async function getEmployeeWeeklySummary(employeeId: string, dateFrom?: Date, dateTo?: Date) {
  try {
    const { orgId } = await checkAdminPermissions();

    // Obtener contrato activo para horas esperadas
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    const activeContract = employee?.employmentContracts[0];
    const weeklyHours = activeContract?.weeklyHours ? Number(activeContract.weeklyHours) : 40;
    const workingDaysPerWeek = activeContract?.workingDaysPerWeek ? Number(activeContract.workingDaysPerWeek) : 5;
    const dailyHours = weeklyHours / workingDaysPerWeek;
    const contractStartDate = activeContract?.startDate ?? null;

    const where: any = {
      orgId,
      employeeId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = startOfDay(dateFrom);
      }
      if (dateTo) {
        where.date.lte = endOfDay(dateTo);
      }
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      orderBy: {
        date: "asc",
      },
    });

    // Agrupar por semana
    const weeklyData = new Map<
      string,
      {
        weekStart: Date;
        weekEnd: Date;
        totalWorkedMinutes: number;
        totalBreakMinutes: number;
        daysWorked: number;
        daysCompleted: number;
        daysIncomplete: number;
        daysAbsent: number;
      }
    >();

    summaries.forEach((summary) => {
      const weekStart = startOfWeek(new Date(summary.date), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(summary.date), { weekStartsOn: 1 });
      const weekKey = weekStart.toISOString();

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          weekStart,
          weekEnd,
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          daysWorked: 0,
          daysCompleted: 0,
          daysIncomplete: 0,
          daysAbsent: 0,
        });
      }

      const week = weeklyData.get(weekKey)!;
      week.totalWorkedMinutes += Number(summary.totalWorkedMinutes);
      week.totalBreakMinutes += Number(summary.totalBreakMinutes);
      week.daysWorked++;

      if (summary.status === "COMPLETED") week.daysCompleted++;
      if (summary.status === "INCOMPLETE") week.daysIncomplete++;
      if (summary.status === "ABSENT") week.daysAbsent++;
    });

    return Promise.all(
      Array.from(weeklyData.values()).map(async (week) => {
        // Calcular días laborables esperados en esta semana (considerando inicio de contrato)
        const expectedDays = await calculateWorkableDays(employeeId, week.weekStart, week.weekEnd, contractStartDate);
        const expectedHours = expectedDays * dailyHours;

        const actualHours = week.totalWorkedMinutes / 60;
        const compliance = expectedHours > 0 ? (actualHours / expectedHours) * 100 : 0;
        const averageDaily = week.daysWorked > 0 ? actualHours / week.daysWorked : 0;

        let status: "complete" | "incomplete" | "absent";
        if (compliance >= 95) status = "complete";
        else if (compliance >= 70) status = "incomplete";
        else status = "absent";

        return {
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          totalWorkedMinutes: week.totalWorkedMinutes,
          totalBreakMinutes: week.totalBreakMinutes,
          expectedHours: Math.round(expectedHours * 100) / 100,
          actualHours: Math.round(actualHours * 100) / 100,
          compliance: Math.round(compliance),
          daysWorked: week.daysWorked,
          expectedDays,
          daysCompleted: week.daysCompleted,
          daysIncomplete: week.daysIncomplete,
          daysAbsent: week.daysAbsent,
          averageDaily: Math.round(averageDaily * 100) / 100,
          status,
        };
      }),
    );
  } catch (error) {
    console.error("Error al obtener resumen semanal:", error);
    throw error;
  }
}

// Obtener resumen mensual de un empleado
export async function getEmployeeMonthlySummary(employeeId: string, dateFrom?: Date, dateTo?: Date) {
  try {
    const { orgId } = await checkAdminPermissions();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    const activeContract = employee?.employmentContracts[0];
    const weeklyHours = activeContract?.weeklyHours ? Number(activeContract.weeklyHours) : 40;
    const workingDaysPerWeek = activeContract?.workingDaysPerWeek ? Number(activeContract.workingDaysPerWeek) : 5;
    const dailyHours = weeklyHours / workingDaysPerWeek;
    const contractStartDate = activeContract?.startDate ?? null;

    const where: any = {
      orgId,
      employeeId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = startOfDay(dateFrom);
      }
      if (dateTo) {
        where.date.lte = endOfDay(dateTo);
      }
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      orderBy: {
        date: "asc",
      },
    });

    // Agrupar por mes
    const monthlyData = new Map<
      string,
      {
        month: Date;
        totalWorkedMinutes: number;
        totalBreakMinutes: number;
        daysWorked: number;
        daysCompleted: number;
        daysIncomplete: number;
        daysAbsent: number;
      }
    >();

    summaries.forEach((summary) => {
      const month = startOfMonth(new Date(summary.date));
      const monthKey = month.toISOString();

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month,
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          daysWorked: 0,
          daysCompleted: 0,
          daysIncomplete: 0,
          daysAbsent: 0,
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.totalWorkedMinutes += Number(summary.totalWorkedMinutes);
      monthData.totalBreakMinutes += Number(summary.totalBreakMinutes);
      monthData.daysWorked++;

      if (summary.status === "COMPLETED") monthData.daysCompleted++;
      if (summary.status === "INCOMPLETE") monthData.daysIncomplete++;
      if (summary.status === "ABSENT") monthData.daysAbsent++;
    });

    return Promise.all(
      Array.from(monthlyData.values()).map(async (month) => {
        // Calcular días laborables esperados en este mes (considerando inicio de contrato)
        const monthEnd = endOfMonth(month.month);
        const expectedDays = await calculateWorkableDays(employeeId, month.month, monthEnd, contractStartDate);
        const expectedHours = expectedDays * dailyHours;

        const actualHours = month.totalWorkedMinutes / 60;
        const averageDaily = month.daysWorked > 0 ? actualHours / month.daysWorked : 0;
        const averageWeekly = actualHours / 4.33; // Promedio de semanas por mes
        const compliance = expectedHours > 0 ? (actualHours / expectedHours) * 100 : 0;

        return {
          month: month.month,
          totalWorkedMinutes: month.totalWorkedMinutes,
          totalBreakMinutes: month.totalBreakMinutes,
          actualHours: Math.round(actualHours * 100) / 100,
          expectedHours: Math.round(expectedHours * 100) / 100,
          averageDaily: Math.round(averageDaily * 100) / 100,
          averageWeekly: Math.round(averageWeekly * 100) / 100,
          compliance: Math.round(compliance),
          daysWorked: month.daysWorked,
          expectedDays,
          daysCompleted: month.daysCompleted,
          daysIncomplete: month.daysIncomplete,
          daysAbsent: month.daysAbsent,
        };
      }),
    );
  } catch (error) {
    console.error("Error al obtener resumen mensual:", error);
    throw error;
  }
}

// Obtener resumen anual de un empleado
export async function getEmployeeYearlySummary(employeeId: string, dateFrom?: Date, dateTo?: Date) {
  try {
    const { orgId } = await checkAdminPermissions();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    const activeContract = employee?.employmentContracts[0];
    const weeklyHours = activeContract?.weeklyHours ? Number(activeContract.weeklyHours) : 40;
    const workingDaysPerWeek = activeContract?.workingDaysPerWeek ? Number(activeContract.workingDaysPerWeek) : 5;
    const dailyHours = weeklyHours / workingDaysPerWeek;
    const contractStartDate = activeContract?.startDate ?? null;

    const where: any = {
      orgId,
      employeeId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = startOfDay(dateFrom);
      }
      if (dateTo) {
        where.date.lte = endOfDay(dateTo);
      }
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      orderBy: {
        date: "asc",
      },
    });

    // Agrupar por año
    const yearlyData = new Map<
      string,
      {
        year: number;
        totalWorkedMinutes: number;
        totalBreakMinutes: number;
        daysWorked: number;
        daysCompleted: number;
        daysIncomplete: number;
        daysAbsent: number;
      }
    >();

    summaries.forEach((summary) => {
      const year = new Date(summary.date).getFullYear();
      const yearKey = year.toString();

      if (!yearlyData.has(yearKey)) {
        yearlyData.set(yearKey, {
          year,
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          daysWorked: 0,
          daysCompleted: 0,
          daysIncomplete: 0,
          daysAbsent: 0,
        });
      }

      const yearData = yearlyData.get(yearKey)!;
      yearData.totalWorkedMinutes += Number(summary.totalWorkedMinutes);
      yearData.totalBreakMinutes += Number(summary.totalBreakMinutes);
      yearData.daysWorked++;

      if (summary.status === "COMPLETED") yearData.daysCompleted++;
      if (summary.status === "INCOMPLETE") yearData.daysIncomplete++;
      if (summary.status === "ABSENT") yearData.daysAbsent++;
    });

    return Promise.all(
      Array.from(yearlyData.values()).map(async (year) => {
        // Calcular días laborables esperados en este año (considerando inicio de contrato)
        const yearStart = startOfYear(new Date(year.year, 0, 1));
        const yearEnd = endOfYear(new Date(year.year, 11, 31));
        const expectedDays = await calculateWorkableDays(employeeId, yearStart, yearEnd, contractStartDate);
        const expectedHours = expectedDays * dailyHours;

        const actualHours = year.totalWorkedMinutes / 60;
        const averageMonthly = actualHours / 12;
        const attendanceRate = year.daysWorked > 0 ? (year.daysCompleted / year.daysWorked) * 100 : 0;

        return {
          year: year.year,
          totalWorkedMinutes: year.totalWorkedMinutes,
          totalBreakMinutes: year.totalBreakMinutes,
          actualHours: Math.round(actualHours),
          expectedHours: Math.round(expectedHours * 100) / 100,
          averageMonthly: Math.round(averageMonthly),
          attendanceRate: Math.round(attendanceRate),
          daysWorked: year.daysWorked,
          expectedDays,
          daysCompleted: year.daysCompleted,
          daysIncomplete: year.daysIncomplete,
          daysAbsent: year.daysAbsent,
        };
      }),
    );
  } catch (error) {
    console.error("Error al obtener resumen anual:", error);
    throw error;
  }
}

// Obtener historial de fichajes de un empleado
export async function getEmployeeTimeTrackingHistory(
  employeeId: string,
  filters: Omit<TimeTrackingFilters, "employeeId"> = {},
) {
  try {
    const { orgId } = await checkAdminPermissions();

    const where: any = {
      orgId,
      employeeId,
    };

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = startOfDay(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = endOfDay(filters.dateTo);
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
            employmentContracts: {
              where: {
                active: true,
              },
              include: {
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                costCenter: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        timeEntries: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return summaries.map((s) => {
      const contract = s.employee.employmentContracts[0];

      // Recalcular el estado basándose en las horas trabajadas
      let status = s.status;
      if (s.clockOut) {
        const weeklyHours = contract?.weeklyHours ? Number(contract.weeklyHours) : 40;
        const workingDaysPerWeek = contract?.workingDaysPerWeek ? Number(contract.workingDaysPerWeek) : 5;
        const dailyHours = weeklyHours / workingDaysPerWeek;
        const workedHours = Number(s.totalWorkedMinutes) / 60;
        const compliance = (workedHours / dailyHours) * 100;

        if (compliance >= 95) {
          status = "COMPLETED";
        } else {
          status = "INCOMPLETE";
        }
      }

      return {
        id: s.id,
        date: s.date,
        clockIn: s.clockIn,
        clockOut: s.clockOut,
        totalWorkedMinutes: Number(s.totalWorkedMinutes),
        totalBreakMinutes: Number(s.totalBreakMinutes),
        status,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        orgId: s.orgId,
        employeeId: s.employeeId,
        employee: {
          id: s.employee.id,
          user: s.employee.user,
          department: contract?.department ?? null,
          costCenter: contract?.costCenter ?? null,
        },
        timeEntries: s.timeEntries,
        totalWorkedHours: Math.round((Number(s.totalWorkedMinutes) / 60) * 100) / 100,
        totalBreakHours: Math.round((Number(s.totalBreakMinutes) / 60) * 100) / 100,
      };
    });
  } catch (error) {
    console.error("Error al obtener historial del empleado:", error);
    throw error;
  }
}

// Obtener todos los fichajes con filtros
export async function getTimeTrackingRecords(filters: TimeTrackingFilters = {}) {
  try {
    const { orgId } = await checkAdminPermissions();

    const where: any = {
      orgId,
    };

    // Aplicar filtros
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.departmentId || filters.costCenterId) {
      const contractWhere: any = {
        active: true,
      };

      if (filters.departmentId) {
        contractWhere.departmentId = filters.departmentId;
      }

      if (filters.costCenterId) {
        contractWhere.costCenterId = filters.costCenterId;
      }

      where.employee = {
        ...(where.employee ?? {}),
        employmentContracts: {
          some: contractWhere,
        },
      };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = startOfDay(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = endOfDay(filters.dateTo);
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            employmentContracts: {
              where: {
                active: true,
              },
              include: {
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                costCenter: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        timeEntries: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
      orderBy: [
        {
          date: "desc",
        },
        {
          employee: {
            user: {
              name: "asc",
            },
          },
        },
      ],
    });

    return summaries.map((s) => {
      const contract = s.employee.employmentContracts[0];
      return {
        id: s.id,
        date: s.date,
        clockIn: s.clockIn,
        clockOut: s.clockOut,
        totalWorkedMinutes: Number(s.totalWorkedMinutes),
        totalBreakMinutes: Number(s.totalBreakMinutes),
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        orgId: s.orgId,
        employeeId: s.employeeId,
        employee: {
          id: s.employee.id,
          user: s.employee.user,
          department: contract?.department ?? null,
          costCenter: contract?.costCenter ?? null,
        },
        timeEntries: s.timeEntries,
      };
    });
  } catch (error) {
    console.error("Error al obtener fichajes:", error);
    throw error;
  }
}

// Obtener empleados activos trabajando ahora
export async function getCurrentlyWorkingEmployees() {
  try {
    const { orgId } = await checkAdminPermissions();

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Detectar festivo del día (una sola consulta para toda la org)
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    const holidayDayStart = startOfDay(normalizedDate);
    const holidayDayEnd = endOfDay(normalizedDate);
    const targetYear = normalizedDate.getFullYear();

    const holiday = await prisma.calendarEvent.findFirst({
      where: {
        calendar: {
          orgId,
          active: true,
          year: targetYear,
        },
        date: {
          gte: holidayDayStart,
          lte: holidayDayEnd,
        },
        eventType: "HOLIDAY",
      },
      select: {
        name: true,
      },
    });

    const isHoliday = Boolean(holiday);
    const holidayName = holiday?.name;

    // Margen de tolerancia para considerar ausencia (15 minutos)
    const ABSENCE_MARGIN_MINUTES = 15;

    // Obtener todos los empleados con sus últimos fichajes de hoy
    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        user: {
          active: true,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        employmentContracts: {
          where: {
            active: true,
          },
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            costCenter: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 1,
        },
        timeEntries: {
          where: {
            timestamp: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
        },
        workdaySummaries: {
          where: {
            date: dayStart,
          },
          take: 1,
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    // Determinar el estado actual de cada empleado (con validación de días laborables)
    const employeesWithStatus = employees.map((employee) => {
      const lastEntry = employee.timeEntries[0];
      const todaySummary = employee.workdaySummaries[0];
      const contract = employee.employmentContracts[0];

      const dayInfo = getExpectedHoursFromContract(contract, today, isHoliday);
      const expectedEntryTime = dayInfo.isWorkingDay ? getExpectedEntryTimeFromContract(contract, today) : null;

      // Determinar estado de fichaje actual
      let status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK" = "CLOCKED_OUT";
      let lastAction = null;

      if (lastEntry) {
        lastAction = lastEntry.timestamp;
        switch (lastEntry.entryType) {
          case "CLOCK_IN":
          case "BREAK_END":
            status = "CLOCKED_IN";
            break;
          case "BREAK_START":
            status = "ON_BREAK";
            break;
          case "CLOCK_OUT":
          default:
            status = "CLOCKED_OUT";
            break;
        }
      }

      // Calcular si está ausente (solo si es día laborable y tiene hora de entrada definida)
      let isAbsent = false;
      if (dayInfo.isWorkingDay && expectedEntryTime && status === "CLOCKED_OUT") {
        const [entryHour, entryMinute] = expectedEntryTime.split(":").map(Number);
        const expectedEntry = new Date(today);
        expectedEntry.setHours(entryHour, entryMinute, 0, 0);

        const absenceThreshold = new Date(expectedEntry);
        absenceThreshold.setMinutes(absenceThreshold.getMinutes() + ABSENCE_MARGIN_MINUTES);

        if (today >= absenceThreshold) {
          isAbsent = true;
        }
      }

      return {
        id: employee.id,
        name: employee.user.name,
        email: employee.user.email,
        department: contract?.department?.name ?? "Sin departamento",
        costCenter: contract?.costCenter?.name ?? "Sin centro de coste",
        status,
        lastAction,
        todayWorkedMinutes: todaySummary ? Number(todaySummary.totalWorkedMinutes) : 0,
        todayBreakMinutes: todaySummary ? Number(todaySummary.totalBreakMinutes) : 0,
        clockIn: todaySummary?.clockIn,
        clockOut: todaySummary?.clockOut,
        // Nuevos campos
        isWorkingDay: dayInfo.isWorkingDay,
        isHoliday,
        holidayName,
        expectedHours: dayInfo.hoursExpected,
        expectedEntryTime,
        isAbsent,
      };
    });

    return employeesWithStatus;
  } catch (error) {
    console.error("Error al obtener empleados trabajando:", error);
    throw error;
  }
}

// Obtener estadísticas generales
export async function getTimeTrackingStats(dateFrom?: Date, dateTo?: Date) {
  try {
    const { orgId } = await checkAdminPermissions();

    const where: any = {
      orgId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = startOfDay(dateFrom);
      }
      if (dateTo) {
        where.date.lte = endOfDay(dateTo);
      }
    }

    const [totals, byStatus] = await Promise.all([
      prisma.workdaySummary.aggregate({
        where,
        _sum: {
          totalWorkedMinutes: true,
          totalBreakMinutes: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.workdaySummary.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true,
        },
      }),
    ]);

    const totalWorkedMinutes = Number(totals._sum.totalWorkedMinutes ?? 0);
    const totalBreakMinutes = Number(totals._sum.totalBreakMinutes ?? 0);
    const totalRecords = totals._count._all ?? 0;

    const statusCounts = {
      IN_PROGRESS: 0,
      COMPLETED: 0,
      INCOMPLETE: 0,
      ABSENT: 0,
    };

    for (const item of byStatus) {
      statusCounts[item.status as keyof typeof statusCounts] = item._count._all;
    }

    return {
      totalRecords,
      totalWorkedHours: Math.round(totalWorkedMinutes / 60),
      totalBreakHours: Math.round(totalBreakMinutes / 60),
      statusCounts,
      averageWorkedMinutesPerDay: totalRecords > 0 ? Math.round(totalWorkedMinutes / totalRecords) : 0,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    throw error;
  }
}

// Obtener lista de empleados para filtros
export async function getEmployeesForFilter() {
  try {
    const { orgId } = await checkAdminPermissions();

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        user: {
          active: true,
        },
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return employees.map((emp) => ({
      id: emp.id,
      name: emp.user.name || emp.user.email,
    }));
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    throw error;
  }
}

// Obtener lista de departamentos para filtros
export async function getDepartmentsForFilter() {
  try {
    const { orgId } = await checkAdminPermissions();

    const departments = await prisma.department.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return departments;
  } catch (error) {
    console.error("Error al obtener departamentos:", error);
    throw error;
  }
}

// Obtener lista de centros de coste para filtros
export async function getCostCentersForFilter() {
  try {
    const { orgId } = await checkAdminPermissions();

    const costCenters = await prisma.costCenter.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return costCenters;
  } catch (error) {
    console.error("Error al obtener centros de coste:", error);
    throw error;
  }
}

// Obtener detalle diario con todos los TimeEntries
export async function getEmployeeDailyDetail(employeeId: string, dateFrom?: Date, dateTo?: Date) {
  try {
    const { orgId } = await checkAdminPermissions();

    // Obtener información del contrato activo
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    // Generar el rango de fechas completo
    const startDate = dateFrom ?? startOfDay(new Date());
    const endDate = dateTo ?? endOfDay(new Date());
    const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });

    const where: any = {
      orgId,
      employeeId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = startOfDay(dateFrom);
      }
      if (dateTo) {
        where.date.lte = endOfDay(dateTo);
      }
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      orderBy: {
        date: "desc",
      },
    });

    // Crear un Map de summaries por fecha para búsqueda rápida
    // IMPORTANTE: Normalizar a UTC para evitar problemas de timezone al agrupar
    type SummaryType = (typeof summaries)[number];
    const summariesByDate = new Map<string, SummaryType>();
    summaries.forEach((summary) => {
      const dateKey = getLocalDateKey(summary.date);
      summariesByDate.set(dateKey, summary);
    });

    // Cargar todos los TimeEntries del empleado para el período
    const timeEntriesWhere: any = {
      orgId,
      employeeId,
    };

    if (dateFrom || dateTo) {
      timeEntriesWhere.timestamp = {};
      if (dateFrom) {
        timeEntriesWhere.timestamp.gte = dateFrom;
      }
      if (dateTo) {
        timeEntriesWhere.timestamp.lte = dateTo;
      }
    }

    const allTimeEntries = await prisma.timeEntry.findMany({
      where: timeEntriesWhere,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            color: true,
          },
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Agrupar TimeEntries por día
    // IMPORTANTE: Normalizar timestamps a UTC antes de agrupar
    const entriesByDay = new Map<string, typeof allTimeEntries>();
    allTimeEntries.forEach((entry) => {
      const dayKey = getLocalDateKey(entry.timestamp);
      if (!entriesByDay.has(dayKey)) {
        entriesByDay.set(dayKey, []);
      }
      entriesByDay.get(dayKey)!.push(entry);
    });

    // OBTENER HORARIOS EFECTIVOS EN LOTE (Motor V2.0 - Optimizado)
    // Esto reemplaza las 30+ consultas individuales y asegura consistencia con la vista del empleado
    const effectiveSchedules = await getEffectiveScheduleForRange(employeeId, startDate, endDate);

    // Crear mapa de horarios para acceso rápido
    type EffectiveScheduleItem = (typeof effectiveSchedules)[number];
    const scheduleMap = new Map<string, EffectiveScheduleItem>();
    effectiveSchedules.forEach((schedule) => {
      scheduleMap.set(getLocalDateKey(schedule.date), schedule);
    });

    return {
      employee: {
        id: employee.id,
        name: employee.user.name ?? "Sin nombre",
        email: employee.user.email,
        image: employee.user.image ?? null,
      },
      days: allDaysInRange
        .reverse() // Ordenar de más reciente a más antiguo
        .map((dayDate) => {
          const dayKey = getLocalDateKey(dayDate);
          const summary = summariesByDate.get(dayKey);
          const dayEntries = entriesByDay.get(dayKey) ?? [];

          // Obtener datos del motor de horarios
          const schedule = scheduleMap.get(dayKey);

          // Mapear datos del motor a la estructura de la vista
          const hoursExpected = schedule ? schedule.expectedMinutes / 60 : 0;
          const isWorkingDay = schedule ? schedule.isWorkingDay : false;

          // Detectar Festivos
          let isHoliday = schedule?.source === "EXCEPTION" && schedule.exceptionType === "HOLIDAY";
          let holidayName = isHoliday ? schedule?.exceptionReason : undefined;

          // Detectar Ausencias (Vacaciones, Bajas, etc.)
          // Reutilizamos la lógica visual de "Holiday" para mostrar el badge de ausencia
          if (schedule?.source === "ABSENCE" || schedule?.absence) {
            isHoliday = true;
            holidayName = schedule.absence?.type ?? "Ausencia";
          }

          // Si existe summary, usarlo; si no, crear uno virtual
          if (summary) {
            const workedHours = Number(summary.totalWorkedMinutes) / 60;
            const compliance = hoursExpected > 0 ? Math.round((workedHours / hoursExpected) * 100) : 0;

            // Recalcular estado dinámicamente para corregir inconsistencias visuales
            let displayStatus = summary.status;

            if (summary.status !== "IN_PROGRESS") {
              if (hoursExpected > 0) {
                // Día laborable normal: calcular por cumplimiento
                displayStatus = compliance >= 95 ? "COMPLETED" : "INCOMPLETE";
              } else {
                // Día con 0 horas esperadas (Festivo, Vacaciones, Fin de semana)
                // Forzar el estado visual correcto en lugar de mostrar "COMPLETED" erróneamente
                if (schedule?.source === "ABSENCE" || schedule?.absence) {
                  displayStatus = "ABSENT";
                } else if (isHoliday) {
                  displayStatus = "HOLIDAY";
                } else if (!isWorkingDay) {
                  displayStatus = "NON_WORKDAY";
                }
              }
            }

            // Si es un día de ausencia justificada (vacaciones), forzar estado visual si no hay horas trabajadas
            // (Redundancia de seguridad)
            if ((schedule?.source === "ABSENCE" || schedule?.absence) && workedHours === 0) {
              displayStatus = "ABSENT";
            }

            return {
              id: summary.id,
              date: dayDate,
              clockIn: summary.clockIn,
              clockOut: summary.clockOut,
              totalWorkedMinutes: Number(summary.totalWorkedMinutes),
              totalBreakMinutes: Number(summary.totalBreakMinutes),
              status: displayStatus,
              expectedHours: hoursExpected,
              actualHours: Math.round(workedHours * 100) / 100,
              compliance,
              isWorkingDay,
              isHoliday,
              holidayName,
              timeEntries: dayEntries.map((entry) => ({
                id: entry.id,
                entryType: entry.entryType,
                timestamp: entry.timestamp,
                location: entry.location,
                notes: entry.notes,
                isManual: entry.isManual,
                // Campos de cancelación
                isCancelled: entry.isCancelled,
                cancellationReason: entry.cancellationReason,
                cancellationNotes: entry.cancellationNotes,
                projectId: entry.projectId,
                project: entry.project
                  ? {
                      id: entry.project.id,
                      name: entry.project.name,
                      code: entry.project.code,
                      color: entry.project.color,
                    }
                  : null,
                task: entry.task ?? null,
                // Campos GPS - Serializar Decimals a numbers para Next.js 15
                latitude: entry.latitude ? Number(entry.latitude) : null,
                longitude: entry.longitude ? Number(entry.longitude) : null,
                accuracy: entry.accuracy ? Number(entry.accuracy) : null,
                isWithinAllowedArea: entry.isWithinAllowedArea,
                requiresReview: entry.requiresReview,
              })),
            };
          }

          // Crear un summary virtual para días sin fichajes
          // Determinar el status correcto según el tipo de día
          let virtualStatus: "ABSENT" | "HOLIDAY" | "NON_WORKDAY";

          if (schedule?.source === "ABSENCE" || schedule?.absence) {
            virtualStatus = "ABSENT"; // Ausencia justificada
          } else if (schedule?.source === "EXCEPTION" && schedule.exceptionType === "HOLIDAY") {
            virtualStatus = "HOLIDAY";
          } else if (!isWorkingDay) {
            virtualStatus = "NON_WORKDAY";
          } else {
            virtualStatus = "ABSENT"; // Ausencia injustificada
          }

          return {
            id: `virtual-${dayKey}`,
            date: dayDate,
            clockIn: null,
            clockOut: null,
            totalWorkedMinutes: 0,
            totalBreakMinutes: 0,
            status: virtualStatus,
            expectedHours: hoursExpected,
            actualHours: 0,
            compliance: 0,
            isWorkingDay,
            isHoliday,
            holidayName,
            timeEntries: dayEntries.map((entry) => ({
              id: entry.id,
              entryType: entry.entryType,
              timestamp: entry.timestamp,
              location: entry.location,
              notes: entry.notes,
              isManual: entry.isManual,
              projectId: entry.projectId,
              project: entry.project
                ? {
                    id: entry.project.id,
                    name: entry.project.name,
                    code: entry.project.code,
                    color: entry.project.color,
                  }
                : null,
              task: entry.task ?? null,
              // Campos GPS - Serializar Decimals a numbers para Next.js 15
              latitude: entry.latitude ? Number(entry.latitude) : null,
              longitude: entry.longitude ? Number(entry.longitude) : null,
              accuracy: entry.accuracy ? Number(entry.accuracy) : null,
              isWithinAllowedArea: entry.isWithinAllowedArea,
              requiresReview: entry.requiresReview,
            })),
          };
        }),
    };
  } catch (error) {
    console.error("Error al obtener detalle diario:", error);
    throw error;
  }
}

// Exportar a CSV
export async function exportTimeTrackingToCSV(filters: TimeTrackingFilters = {}) {
  try {
    const summaries = await getTimeTrackingRecords(filters);

    // Crear CSV
    const headers = [
      "Fecha",
      "Empleado",
      "Email",
      "Departamento",
      "Centro de Coste",
      "Entrada",
      "Salida",
      "Horas Trabajadas",
      "Minutos Pausa",
      "Estado",
    ];

    const rows = summaries.map((summary) => [
      new Date(summary.date).toLocaleDateString("es-ES"),
      summary.employee.user.name || "Sin nombre",
      summary.employee.user.email,
      summary.employee.department?.name ?? "Sin departamento",
      summary.employee.costCenter?.name ?? "Sin centro de coste",
      summary.clockIn ? new Date(summary.clockIn).toLocaleTimeString("es-ES") : "--:--:--",
      summary.clockOut ? new Date(summary.clockOut).toLocaleTimeString("es-ES") : "--:--:--",
      `${Math.floor(summary.totalWorkedMinutes / 60)}h ${summary.totalWorkedMinutes % 60}m`,
      `${summary.totalBreakMinutes}m`,
      summary.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    return csvContent;
  } catch (error) {
    console.error("Error al exportar CSV:", error);
    throw error;
  }
}

/**
 * Utilidades para el Módulo "Mis Turnos"
 */

import { differenceInHours, isAfter, isBefore, isWithinInterval, startOfDay, startOfToday } from "date-fns";

import {
  calculateDuration,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
} from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
import type { Shift, Employee } from "@/app/(main)/dashboard/shifts/_lib/types";

import type { MyShiftsMetrics } from "./my-shifts-types";

/**
 * Calcular métricas personales de turnos para un empleado
 */
export function calculateMyShiftsMetrics(shifts: Shift[], employee: Employee): MyShiftsMetrics {
  const today = startOfToday();
  const weekStart = getWeekStart(today);
  const weekEnd = getWeekEnd(today);
  const monthStart = getMonthStart(today);
  const monthEnd = getMonthEnd(today);

  // Filtrar turnos del empleado
  const myShifts = shifts.filter((s) => s.employeeId === employee.id);

  // Turnos de esta semana
  const weekShifts = myShifts.filter((s) => {
    const shiftDate = new Date(s.date);
    return isWithinInterval(shiftDate, { start: weekStart, end: weekEnd });
  });

  // Turnos de este mes
  const monthShifts = myShifts.filter((s) => {
    const shiftDate = new Date(s.date);
    return isWithinInterval(shiftDate, { start: monthStart, end: monthEnd });
  });

  // Calcular horas asignadas esta semana
  const weekHoursAssigned = weekShifts.reduce((total, shift) => {
    return total + calculateDuration(shift.startTime, shift.endTime, shift.breakMinutes ?? 0);
  }, 0);

  const weekHoursContracted = employee.contractHours ?? 40;
  const weekProgress = weekHoursContracted > 0 ? Math.round((weekHoursAssigned / weekHoursContracted) * 100) : 0;

  // Próximo turno
  const futureShifts = myShifts
    .filter((s) => {
      const shiftDate = startOfDay(new Date(s.date));
      return isAfter(shiftDate, today) || shiftDate.getTime() === today.getTime();
    })
    .sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

  const nextShift = futureShifts[0] ?? null;
  const hoursUntilNextShift = nextShift
    ? differenceInHours(new Date(`${nextShift.date}T${nextShift.startTime}`), new Date())
    : 0;

  // Turnos y horas este mes
  const monthTotalShifts = monthShifts.length;
  const monthTotalHours = monthShifts.reduce((total, shift) => {
    return total + calculateDuration(shift.startTime, shift.endTime, shift.breakMinutes ?? 0);
  }, 0);

  // Balance semanal
  const weekBalance = weekHoursAssigned - weekHoursContracted;
  let weekBalanceStatus: "under" | "ok" | "over" = "ok";

  if (weekBalance < -2) {
    weekBalanceStatus = "under";
  } else if (weekBalance > 2) {
    weekBalanceStatus = "over";
  }

  return {
    weekHoursAssigned,
    weekHoursContracted,
    weekProgress,
    nextShift,
    hoursUntilNextShift,
    monthTotalShifts,
    monthTotalHours,
    weekBalance,
    weekBalanceStatus,
  };
}

/**
 * Filtrar turnos de un empleado por rango de fechas
 */
export function filterMyShiftsByDateRange(
  shifts: Shift[],
  employeeId: string,
  startDate: Date,
  endDate: Date,
): Shift[] {
  return shifts.filter((s) => {
    if (s.employeeId !== employeeId) return false;
    const shiftDate = new Date(s.date);
    return isWithinInterval(shiftDate, { start: startDate, end: endDate });
  });
}

/**
 * Agrupar turnos por semana
 */
export function groupShiftsByWeek(shifts: Shift[]): Record<string, Shift[]> {
  const grouped: Record<string, Shift[]> = {};

  shifts.forEach((shift) => {
    const shiftDate = new Date(shift.date);
    const weekStart = getWeekStart(shiftDate);
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!grouped[weekKey]) {
      grouped[weekKey] = [];
    }
    grouped[weekKey].push(shift);
  });

  return grouped;
}

/**
 * Formatear horas para mostrar (ej: 8.5h → "8h 30m")
 */
export function formatHoursDetailed(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (m === 0) {
    return `${h}h`;
  }

  return `${h}h ${m}m`;
}

/**
 * Calcular color de badge según balance semanal
 */
export function getBalanceStatusColor(status: "under" | "ok" | "over"): string {
  const colors = {
    under: "text-red-600 dark:text-red-400",
    ok: "text-emerald-600 dark:text-emerald-400",
    over: "text-amber-600 dark:text-amber-400",
  };
  return colors[status];
}

/**
 * Calcular color de badge según progreso semanal
 */
export function getWeekProgressColor(progress: number): string {
  if (progress >= 100) return "text-emerald-600 dark:text-emerald-400";
  if (progress >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

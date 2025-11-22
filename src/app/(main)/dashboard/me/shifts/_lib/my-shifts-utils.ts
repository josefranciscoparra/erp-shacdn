/**
 * Utilidades para el Módulo "Mis Turnos"
 */

import { differenceInHours, isAfter, isWithinInterval, startOfDay, startOfToday } from "date-fns";

import {
  calculateDuration,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  timeToMinutes,
  minutesToTime,
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

  // Calcular horas asignadas esta semana (con merging de intervalos para evitar doble conteo)
  const weekHoursAssigned = Object.values(groupShiftsByWeek(weekShifts)).reduce((totalWeek, weekDayShifts) => {
    // Agrupar por día dentro de la semana
    const shiftsByDay = new Map<string, Shift[]>();
    weekDayShifts.forEach((s) => {
      const d = s.date;
      if (!shiftsByDay.has(d)) shiftsByDay.set(d, []);
      shiftsByDay.get(d)?.push(s);
    });

    // Sumar horas de cada día (mergeando solapamientos)
    let weekTotal = 0;
    shiftsByDay.forEach((dayShifts) => {
      // Convertir a minutos [start, end]
      const ranges = dayShifts
        .map((s) => {
          const start = timeToMinutes(s.startTime);
          let end = timeToMinutes(s.endTime);
          if (end <= start) end += 24 * 60; // Cruza medianoche
          return { start, end, break: s.breakMinutes ?? 0 };
        })
        .sort((a, b) => a.start - b.start);

      if (ranges.length === 0) return;

      // Merge intervals
      const merged: { start: number; end: number }[] = [];
      let current = ranges[0];

      for (let i = 1; i < ranges.length; i++) {
        const next = ranges[i];
        if (next.start < current.end) {
          // Solapamiento: extender final si es necesario
          current.end = Math.max(current.end, next.end);
        } else {
          // No solapamiento: guardar actual y pasar al siguiente
          merged.push({ start: current.start, end: current.end });
          current = next;
        }
      }
      merged.push({ start: current.start, end: current.end });

      // Sumar duración de intervalos mergeados
      // NOTA: Ignoramos los descansos (breakMinutes) en el cálculo mergeado por simplicidad,
      // asumiendo que el intervalo cubre el tiempo "ocupado".
      // Si queremos ser muy precisos, deberíamos restar descansos, pero es complejo con solapamientos.
      const dayMinutes = merged.reduce((acc, interval) => acc + (interval.end - interval.start), 0);
      weekTotal += dayMinutes / 60;
    });

    return totalWeek + weekTotal;
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

  // Logica de consolidación para "Próximo turno":
  // Si hay varios bloques el mismo día (ej: 9-12 y 12:30-15), mostrar 9-15.
  // Si hay ausencia ese día, mostrar la ausencia prioritaria.
  let nextShift: Shift | null = null;
  if (futureShifts.length > 0) {
    const firstShift = futureShifts[0];
    const nextDate = firstShift.date;

    // Buscar todos los turnos de ese día
    const dayShifts = futureShifts.filter((s) => s.date === nextDate);

    // 1. Separar turnos de trabajo y ausencias
    const isAbsence = (s: Shift) => {
      if (s.id.startsWith("absence-")) return true;
      const role = s.role?.toLowerCase();
      return (role?.includes("vacaciones") ?? false) || (role?.includes("ausencia") ?? false);
    };

    const workShifts = dayShifts.filter((s) => !isAbsence(s));
    const absenceShifts = dayShifts.filter((s) => isAbsence(s));

    // 2. Priorizar turnos de trabajo si existen (Consolidación con resta de ausencias)
    // Convertir turnos de trabajo a intervalos
    let workIntervals = workShifts
      .map((s) => {
        if (!s.startTime || !s.endTime) return null;
        const start = timeToMinutes(s.startTime);
        let end = timeToMinutes(s.endTime);
        if (end <= start) end += 24 * 60;
        return { start, end };
      })
      .filter((i): i is { start: number; end: number } => i !== null)
      .sort((a, b) => a.start - b.start);

    // Convertir ausencias a intervalos
    const absenceIntervals = absenceShifts
      .map((s) => {
        if (!s.startTime || !s.endTime) return null;
        const start = timeToMinutes(s.startTime);
        let end = timeToMinutes(s.endTime);
        if (end <= start) end += 24 * 60;
        return { start, end };
      })
      .filter((i): i is { start: number; end: number } => i !== null);

    // Algoritmo de resta de intervalos: Trabajo - Ausencias
    if (workIntervals.length > 0 && absenceIntervals.length > 0) {
      // Función helper para procesar un segmento con una ausencia
      const subtractAbsence = (
        segment: { start: number; end: number },
        absence: { start: number; end: number },
      ): { start: number; end: number }[] => {
        // Caso 1: Ausencia no toca el segmento
        if (absence.end <= segment.start || absence.start >= segment.end) {
          return [segment];
        }
        // Caso 2: Ausencia cubre el principio
        if (absence.start <= segment.start && absence.end < segment.end) {
          return [{ start: absence.end, end: segment.end }];
        }
        // Caso 3: Ausencia cubre el final
        if (absence.start > segment.start && absence.end >= segment.end) {
          return [{ start: segment.start, end: absence.start }];
        }
        // Caso 4: Ausencia en el medio (partir en dos)
        if (absence.start > segment.start && absence.end < segment.end) {
          return [
            { start: segment.start, end: absence.start },
            { start: absence.end, end: segment.end },
          ];
        }
        // Caso 5: Ausencia cubre todo el segmento
        return [];
      };

      // Función helper para aplicar todas las ausencias a un segmento de trabajo
      const applyAbsences = (
        work: { start: number; end: number },
        absences: { start: number; end: number }[],
      ): { start: number; end: number }[] => {
        let segments = [work];
        for (const absence of absences) {
          const nextSegments: { start: number; end: number }[] = [];
          for (const segment of segments) {
            nextSegments.push(...subtractAbsence(segment, absence));
          }
          segments = nextSegments;
        }
        return segments;
      };

      const effectiveIntervals: { start: number; end: number }[] = [];

      for (const work of workIntervals) {
        effectiveIntervals.push(...applyAbsences(work, absenceIntervals));
      }
      workIntervals = effectiveIntervals.sort((a, b) => a.start - b.start);
    }

    if (workIntervals.length > 0) {
      // Consolidar: Tomamos el inicio del primer fragmento libre y el fin del último
      const finalStart = workIntervals[0].start;
      const finalEnd = workIntervals[workIntervals.length - 1].end;

      nextShift = {
        ...workShifts[0], // Usamos metadatos base
        startTime: minutesToTime(finalStart),
        endTime: minutesToTime(finalEnd),
      };
    } else if (absenceShifts.length > 0) {
      // 3. Si no queda trabajo efectivo (ej: vacaciones cubren todo), mostramos la ausencia
      nextShift = absenceShifts[0];
    }
  }

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

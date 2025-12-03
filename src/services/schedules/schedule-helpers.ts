/**
 * Sistema de Horarios V2.0 - Helpers
 *
 * Utilidades para trabajar con el sistema de horarios:
 * - Conversión de minutos a tiempo (HH:mm)
 * - Conversión de tiempo a minutos
 * - Cálculos de duración
 * - Formateo de horas
 * - Helpers para schedule-engine.ts (Refactorización V2.0)
 */

import type { EffectiveSchedule } from "@/types/schedule";

// ============================================================================
// Conversión de Tiempo
// ============================================================================

/**
 * Convierte minutos (0-1440) a formato HH:mm
 * @param minutes Minutos desde medianoche (0-1440)
 * @returns Hora en formato "HH:mm" (ej: "09:00", "14:30")
 *
 * @example
 * minutesToTime(540) // "09:00"
 * minutesToTime(870) // "14:30"
 * minutesToTime(0)   // "00:00"
 * minutesToTime(1440) // "24:00"
 */
export function minutesToTime(minutes: number): string {
  if (minutes < 0 || minutes > 1440) {
    throw new Error(`Minutes must be between 0 and 1440, got ${minutes}`);
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Convierte formato HH:mm a minutos (0-1440)
 * @param time Hora en formato "HH:mm" (ej: "09:00", "14:30")
 * @returns Minutos desde medianoche (0-1440)
 *
 * @example
 * timeToMinutes("09:00") // 540
 * timeToMinutes("14:30") // 870
 * timeToMinutes("00:00") // 0
 * timeToMinutes("24:00") // 1440
 */
export function timeToMinutes(time: string): number {
  const [hoursStr, minutesStr] = time.split(":");

  if (!hoursStr || !minutesStr) {
    throw new Error(`Invalid time format: ${time}. Expected HH:mm`);
  }

  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:mm`);
  }

  if (hours < 0 || hours > 24) {
    throw new Error(`Hours must be between 0 and 24, got ${hours}`);
  }

  if (minutes < 0 || minutes >= 60) {
    throw new Error(`Minutes must be between 0 and 59, got ${minutes}`);
  }

  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes > 1440) {
    throw new Error(`Time ${time} exceeds 24:00 (1440 minutes)`);
  }

  return totalMinutes;
}

// ============================================================================
// Cálculos de Duración
// ============================================================================

/**
 * Calcula la duración en minutos entre dos momentos
 * @param startMinutes Minuto de inicio (0-1440)
 * @param endMinutes Minuto de fin (0-1440)
 * @returns Duración en minutos
 *
 * @example
 * calculateDuration(540, 1080) // 540 (de 9:00 a 18:00 = 9 horas)
 * calculateDuration(840, 900)  // 60  (de 14:00 a 15:00 = 1 hora)
 */
export function calculateDuration(startMinutes: number, endMinutes: number): number {
  if (endMinutes < startMinutes) {
    throw new Error(`End time (${endMinutes}) cannot be before start time (${startMinutes})`);
  }

  return endMinutes - startMinutes;
}

/**
 * Convierte minutos a horas (con decimales)
 * @param minutes Minutos totales
 * @returns Horas con decimales
 *
 * @example
 * minutesToHours(540) // 9.0
 * minutesToHours(570) // 9.5
 * minutesToHours(120) // 2.0
 */
export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

/**
 * Convierte horas (con decimales) a minutos
 * @param hours Horas totales
 * @returns Minutos totales
 *
 * @example
 * hoursToMinutes(9.0)  // 540
 * hoursToMinutes(9.5)  // 570
 * hoursToMinutes(2.0)  // 120
 */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

// ============================================================================
// Formateo de Duración
// ============================================================================

/**
 * Formatea minutos como duración legible
 * @param minutes Minutos totales
 * @param format Formato de salida ("short" = "9h 30m", "long" = "9 horas 30 minutos")
 * @returns Duración formateada
 *
 * @example
 * formatDuration(570, "short") // "9h 30m"
 * formatDuration(570, "long")  // "9 horas 30 minutos"
 * formatDuration(540, "short") // "9h"
 * formatDuration(30, "short")  // "30m"
 */
export function formatDuration(minutes: number, format: "short" | "long" = "short"): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (format === "short") {
    if (hours === 0) {
      return `${mins}m`;
    }
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  }

  // format === "long"
  if (hours === 0) {
    return `${mins} ${mins === 1 ? "minuto" : "minutos"}`;
  }
  if (mins === 0) {
    return `${hours} ${hours === 1 ? "hora" : "horas"}`;
  }
  return `${hours} ${hours === 1 ? "hora" : "horas"} ${mins} ${mins === 1 ? "minuto" : "minutos"}`;
}

/**
 * Formatea minutos como horas decimales
 * @param minutes Minutos totales
 * @param decimals Decimales a mostrar (default 2)
 * @returns Horas formateadas con "h" (ej: "9.5h", "40.00h")
 *
 * @example
 * formatHours(570)     // "9.50h"
 * formatHours(540)     // "9.00h"
 * formatHours(2400, 1) // "40.0h"
 */
export function formatHours(minutes: number, decimals = 2): string {
  const hours = minutesToHours(minutes);
  return `${hours.toFixed(decimals)}h`;
}

// ============================================================================
// Validación
// ============================================================================

/**
 * Valida si un rango de tiempo es válido
 * @param startMinutes Minuto de inicio (0-1440)
 * @param endMinutes Minuto de fin (0-1440)
 * @returns true si el rango es válido
 */
export function isValidTimeRange(startMinutes: number, endMinutes: number): boolean {
  return (
    startMinutes >= 0 && startMinutes <= 1440 && endMinutes >= 0 && endMinutes <= 1440 && endMinutes > startMinutes
  );
}

/**
 * Valida si dos rangos de tiempo se solapan
 * @param range1Start Inicio del rango 1
 * @param range1End Fin del rango 1
 * @param range2Start Inicio del rango 2
 * @param range2End Fin del rango 2
 * @returns true si hay solapamiento
 *
 * @example
 * isOverlapping(540, 1080, 840, 900) // true (9:00-18:00 solapa con 14:00-15:00)
 * isOverlapping(540, 840, 900, 1080) // false (9:00-14:00 NO solapa con 15:00-18:00)
 */
export function isOverlapping(range1Start: number, range1End: number, range2Start: number, range2End: number): boolean {
  return range1Start < range2End && range2Start < range1End;
}

// ============================================================================
// Helpers de Día de Semana
// ============================================================================

/**
 * Convierte número de día (0-6) a nombre en español
 * @param dayOfWeek Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
 * @returns Nombre del día en español
 *
 * @example
 * dayOfWeekToString(0) // "Domingo"
 * dayOfWeekToString(1) // "Lunes"
 * dayOfWeekToString(5) // "Viernes"
 */
export function dayOfWeekToString(dayOfWeek: number): string {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`Day of week must be between 0 and 6, got ${dayOfWeek}`);
  }

  return days[dayOfWeek] ?? "Desconocido";
}

/**
 * Convierte número de día (0-6) a nombre corto en español
 * @param dayOfWeek Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
 * @returns Nombre corto del día
 *
 * @example
 * dayOfWeekToShortString(0) // "Dom"
 * dayOfWeekToShortString(1) // "Lun"
 * dayOfWeekToShortString(5) // "Vie"
 */
export function dayOfWeekToShortString(dayOfWeek: number): string {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`Day of week must be between 0 and 6, got ${dayOfWeek}`);
  }

  return days[dayOfWeek] ?? "???";
}

// ============================================================================
// Helpers para schedule-engine.ts (Refactorización V2.0)
// ============================================================================

/**
 * Normaliza una fecha al inicio del día (00:00:00.000)
 * Usado frecuentemente en schedule-engine.ts para comparaciones de fecha
 *
 * @param date Fecha a normalizar
 * @returns Nueva fecha normalizada al inicio del día
 *
 * @example
 * normalizeToStartOfDay(new Date("2025-01-15T14:30:00")) // 2025-01-15T00:00:00.000
 */
export function normalizeToStartOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Normaliza una fecha al final del día (23:59:59.999)
 * Usado para rangos de búsqueda en schedule-engine.ts
 *
 * @param date Fecha a normalizar
 * @returns Nueva fecha normalizada al final del día
 *
 * @example
 * normalizeToEndOfDay(new Date("2025-01-15T14:30:00")) // 2025-01-15T23:59:59.999
 */
export function normalizeToEndOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

/**
 * Crea un horario efectivo vacío (día no laboral)
 * Extrae el patrón repetido ~13 veces en schedule-engine.ts
 *
 * NOTA: Esta función NO cambia ninguna lógica existente.
 * Solo consolida el patrón { isWorkingDay: false, expectedMinutes: 0, timeSlots: [] }
 *
 * @param date Fecha del horario
 * @param source Origen del horario (ABSENCE, EXCEPTION, PERIOD, etc.)
 * @param options Opciones adicionales
 * @returns EffectiveSchedule vacío
 *
 * @example
 * createEmptySchedule(date, "ABSENCE", { reason: "Vacaciones" })
 * createEmptySchedule(date, "PERIOD", { periodName: "Verano" })
 */
export function createEmptySchedule(
  date: Date,
  source: EffectiveSchedule["source"],
  options?: {
    periodName?: string;
    exceptionType?: string;
    exceptionReason?: string;
    reason?: string;
    absence?: EffectiveSchedule["absence"];
  },
): EffectiveSchedule {
  return {
    date: new Date(date),
    isWorkingDay: false,
    expectedMinutes: 0,
    timeSlots: [],
    source,
    ...(options?.periodName && { periodName: options.periodName }),
    ...(options?.exceptionType && { exceptionType: options.exceptionType }),
    ...(options?.exceptionReason && { exceptionReason: options.exceptionReason }),
    ...(options?.absence && { absence: options.absence }),
  };
}

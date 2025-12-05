/**
 * Utilidades de conversión días ↔ minutos para cálculos de vacaciones
 *
 * Mantiene coherencia con el sistema PTO que trabaja en minutos internamente
 * pero muestra días en la UI.
 */

/**
 * Convierte días de vacaciones a minutos
 *
 * @param days - Número de días a convertir
 * @param workdayMinutes - Minutos de jornada laboral diaria (default: 480 = 8h)
 * @returns Minutos equivalentes
 *
 * @example
 * daysToMinutes(1, 480) // → 480 (1 día de 8h)
 * daysToMinutes(2.5, 480) // → 1200 (2.5 días de 8h)
 * daysToMinutes(1, 360) // → 360 (1 día de 6h para jornada reducida)
 */
export function daysToMinutes(days: number, workdayMinutes: number = 480): number {
  return Math.round(days * workdayMinutes);
}

/**
 * Convierte minutos a días de vacaciones
 *
 * @param minutes - Minutos a convertir
 * @param workdayMinutes - Minutos de jornada laboral diaria (default: 480 = 8h)
 * @returns Días equivalentes (con decimales para precisión)
 *
 * @example
 * minutesToDays(480, 480) // → 1 (8h = 1 día)
 * minutesToDays(1200, 480) // → 2.5 (20h = 2.5 días)
 * minutesToDays(360, 360) // → 1 (6h = 1 día para jornada reducida)
 */
export function minutesToDays(minutes: number, workdayMinutes: number = 480): number {
  if (workdayMinutes === 0) return 0;
  return minutes / workdayMinutes;
}

/**
 * Calcula los minutos de jornada diaria a partir de horas semanales y días de trabajo
 *
 * @param weeklyHours - Horas semanales del contrato
 * @param workingDaysPerWeek - Días laborables por semana (default: 5)
 * @returns Minutos de jornada diaria
 *
 * @example
 * calculateWorkdayMinutes(40, 5) // → 480 (8h/día)
 * calculateWorkdayMinutes(30, 5) // → 360 (6h/día - media jornada)
 * calculateWorkdayMinutes(40, 4) // → 600 (10h/día - semana de 4 días)
 */
export function calculateWorkdayMinutes(weeklyHours: number, workingDaysPerWeek: number = 5): number {
  if (workingDaysPerWeek === 0) return 480; // Default 8h
  const hoursPerDay = weeklyHours / workingDaysPerWeek;
  return Math.round(hoursPerDay * 60);
}

/**
 * Formatea minutos como texto legible de días y horas
 *
 * @param minutes - Minutos totales
 * @param workdayMinutes - Minutos de jornada laboral diaria (default: 480)
 * @returns Texto formateado (ej: "2 días 4h 30min")
 *
 * @example
 * formatMinutesAsTime(1710, 480) // → "3 días 4h 30min"
 * formatMinutesAsTime(480, 480) // → "1 día"
 * formatMinutesAsTime(120, 480) // → "2h"
 */
export function formatMinutesAsTime(minutes: number, workdayMinutes: number = 480): string {
  if (minutes === 0) return "0 días";

  const totalDays = Math.floor(minutes / workdayMinutes);
  const remainingMinutes = minutes % workdayMinutes;
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;

  const parts: string[] = [];

  if (totalDays > 0) {
    parts.push(`${totalDays} ${totalDays === 1 ? "día" : "días"}`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (mins > 0) {
    parts.push(`${mins}min`);
  }

  return parts.length > 0 ? parts.join(" ") : "0 días";
}

/**
 * Redondea días a 2 decimales para mostrar en UI
 *
 * @param days - Días con precisión completa
 * @returns Días redondeados a 2 decimales
 */
export function roundDays(days: number): number {
  return Math.round(days * 100) / 100;
}

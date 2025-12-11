/**
 * Helpers para el Sistema de Balance de PTO en Minutos (CLIENTE)
 *
 * Este archivo contiene funciones auxiliares que se pueden usar en el cliente.
 * NO importa nada de Prisma.
 */

/**
 * Formatea minutos a formato legible (días, horas, minutos)
 *
 * Ejemplos:
 * - 480 minutos → "1 día"
 * - 240 minutos → "4h"
 * - 540 minutos → "1 día 1h"
 * - 570 minutos → "1 día 1h 30m"
 * - 90 minutos → "1h 30m"
 * - 30 minutos → "30m"
 *
 * @param minutes - Cantidad de minutos
 * @param workdayMinutes - Minutos de una jornada laboral (por defecto 480 = 8h)
 * @returns String formateado
 */
export function formatMinutes(minutes: number, workdayMinutes: number = 480): string {
  if (minutes === 0) return "0m";

  const days = Math.floor(minutes / workdayMinutes);
  const remainingMinutes = minutes % workdayMinutes;
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(days === 1 ? "1 día" : `${days} días`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (mins > 0) {
    parts.push(`${mins}m`);
  }

  return parts.join(" ");
}

/**
 * Convierte días a minutos
 *
 * @param days - Cantidad de días
 * @param workdayMinutes - Minutos de una jornada laboral (por defecto 480 = 8h)
 * @returns Cantidad de minutos (Int)
 */
export function daysToMinutes(days: number, workdayMinutes: number = 480): number {
  return Math.round(days * workdayMinutes);
}

/**
 * Convierte minutos a días
 *
 * @param minutes - Cantidad de minutos
 * @param workdayMinutes - Minutos de una jornada laboral (por defecto 480 = 8h)
 * @returns Cantidad de días
 */
export function minutesToDays(minutes: number, workdayMinutes: number = 480): number {
  return minutes / workdayMinutes;
}

/**
 * Calcula los minutos efectivos aplicando factor de compensación
 *
 * Ejemplos:
 * - 480 min × 1.0 = 480 min (vacaciones normales)
 * - 480 min × 1.5 = 720 min (turno nocturno)
 * - 480 min × 1.75 = 840 min (festivo trabajado)
 *
 * @param minutes - Minutos base
 * @param compensationFactor - Factor de compensación
 * @returns Minutos efectivos (Int)
 */
export function applyCompensationFactor(minutes: number, compensationFactor: number): number {
  return Math.round(minutes * compensationFactor);
}

export function formatVacationBalance(
  minutes: number,
  workdayMinutes: number = 480,
  options: { fractionStep?: number } = {},
): { primaryLabel: string; detailLabel: string } {
  const fractionStep = options.fractionStep ?? 0.25;
  const days = minutesToDays(minutes, workdayMinutes);
  const roundedDays = Math.round(days / fractionStep) * fractionStep;

  const primaryLabel = `${roundedDays.toLocaleString("es-ES")} día${roundedDays === 1 ? "" : "s"}`;
  const detailRaw = minutes === 0 ? "0 días" : formatMinutes(minutes, workdayMinutes);
  const detailLabel = detailRaw === primaryLabel ? detailRaw : `≈ ${detailRaw}`;

  return {
    primaryLabel,
    detailLabel,
  };
}

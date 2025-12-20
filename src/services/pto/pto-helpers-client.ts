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
 * Formatea días con un decimal como máximo y sin .0 cuando es entero.
 */
export function formatWorkingDays(days: number): string {
  if (!Number.isFinite(days)) return "0";

  const rounded = Math.round(days * 10) / 10;

  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
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
  options: { fractionStep?: number; roundingMode?: "DOWN" | "NEAREST" | "UP" } = {},
): { primaryLabel: string; detailLabel: string } {
  const fractionStep = options.fractionStep ?? 0.25;
  const roundingMode = options.roundingMode ?? "NEAREST";
  const days = minutesToDays(minutes, workdayMinutes);
  const safeStep = fractionStep > 0 ? fractionStep : 0.1;
  const factor = days / safeStep;
  let roundedDays = 0;

  if (roundingMode === "DOWN") {
    roundedDays = Math.floor(factor) * safeStep;
  } else if (roundingMode === "UP") {
    roundedDays = Math.ceil(factor) * safeStep;
  } else {
    roundedDays = Math.round(factor) * safeStep;
  }

  roundedDays = Math.round(roundedDays * 100) / 100;

  const primaryLabel = `${roundedDays.toLocaleString("es-ES")} día${roundedDays === 1 ? "" : "s"}`;
  const detailRaw = minutes === 0 ? "0 días" : formatMinutes(minutes, workdayMinutes);
  const detailLabel = detailRaw === primaryLabel ? detailRaw : `≈ ${detailRaw}`;

  return {
    primaryLabel,
    detailLabel,
  };
}

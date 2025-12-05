/**
 * Utilidades de fechas para cálculos de vacaciones
 *
 * Funciones para calcular días entre fechas, días del año, etc.
 */

import type { PauseHistoryEntry } from "../types";

/**
 * Calcula los días naturales entre dos fechas (inclusive)
 *
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns Número de días naturales entre las fechas
 *
 * @example
 * daysBetween(new Date("2024-01-01"), new Date("2024-01-31")) // → 31
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalizar a medianoche para evitar problemas con horas
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // +1 porque incluimos ambos días (inicio y fin)
  return Math.max(0, diffDays + 1);
}

/**
 * Calcula los días naturales entre dos fechas (excluyendo fecha fin)
 *
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin (excluida)
 * @returns Número de días naturales
 */
export function daysBetweenExclusive(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Obtiene el número de días en un año
 *
 * @param year - Año a evaluar
 * @returns 366 si es bisiesto, 365 si no
 */
export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/**
 * Verifica si un año es bisiesto
 *
 * @param year - Año a evaluar
 * @returns true si es bisiesto
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Obtiene el primer día del año de una fecha
 *
 * @param date - Fecha de referencia
 * @returns Fecha del 1 de enero del año
 */
export function startOfYear(date: Date): Date {
  const result = new Date(date);
  result.setMonth(0, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Obtiene el último día del año de una fecha
 *
 * @param date - Fecha de referencia
 * @returns Fecha del 31 de diciembre del año
 */
export function endOfYear(date: Date): Date {
  const result = new Date(date);
  result.setMonth(11, 31);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Verifica si una fecha está dentro de un rango
 *
 * @param date - Fecha a verificar
 * @param start - Inicio del rango
 * @param end - Fin del rango
 * @returns true si la fecha está dentro del rango (inclusive)
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date);
  const s = new Date(start);
  const e = new Date(end);

  d.setHours(0, 0, 0, 0);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);

  return d >= s && d <= e;
}

/**
 * Obtiene la fecha mínima (la más antigua)
 *
 * @param dates - Array de fechas
 * @returns La fecha más antigua
 */
export function minDate(...dates: Date[]): Date {
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

/**
 * Obtiene la fecha máxima (la más reciente)
 *
 * @param dates - Array de fechas
 * @returns La fecha más reciente
 */
export function maxDate(...dates: Date[]): Date {
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

/**
 * Calcula los días pausados dentro de un período
 *
 * Recorre el historial de pausas y suma los días que caen dentro
 * del período especificado (startDate - cutoffDate).
 *
 * @param pauseHistory - Historial de pausas del contrato
 * @param periodStart - Inicio del período a evaluar
 * @param periodEnd - Fin del período a evaluar (cutoff date)
 * @returns Número de días pausados en el período
 */
export function calculatePausedDays(pauseHistory: PauseHistoryEntry[], periodStart: Date, periodEnd: Date): number {
  let pausedDays = 0;

  // Filtrar solo las acciones de PAUSE
  const pauses = pauseHistory.filter((entry) => entry.action === "PAUSE");

  for (const pause of pauses) {
    // Determinar el rango efectivo de la pausa dentro del período
    const pauseStart = maxDate(new Date(pause.startDate), periodStart);
    const pauseEnd = pause.endDate ? minDate(new Date(pause.endDate), periodEnd) : periodEnd;

    // Solo contar si el rango es válido (inicio <= fin)
    if (pauseStart <= pauseEnd) {
      pausedDays += daysBetweenExclusive(pauseStart, pauseEnd);
    }
  }

  return pausedDays;
}

/**
 * Verifica si el contrato está actualmente pausado
 *
 * @param pauseHistory - Historial de pausas
 * @returns true si hay una pausa abierta (sin endDate)
 */
export function isCurrentlyPaused(pauseHistory: PauseHistoryEntry[]): boolean {
  // Buscar la última acción de pausa
  const lastPause = pauseHistory
    .filter((entry) => entry.action === "PAUSE")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

  // Si hay una pausa sin endDate, está actualmente pausado
  return lastPause != null && lastPause.endDate == null;
}

/**
 * Obtiene la fecha desde la cual el contrato está pausado
 *
 * @param pauseHistory - Historial de pausas
 * @returns Fecha de inicio de la pausa actual o null si no está pausado
 */
export function getPausedSince(pauseHistory: PauseHistoryEntry[]): Date | null {
  if (!isCurrentlyPaused(pauseHistory)) return null;

  const lastPause = pauseHistory
    .filter((entry) => entry.action === "PAUSE")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

  return lastPause ? new Date(lastPause.startDate) : null;
}

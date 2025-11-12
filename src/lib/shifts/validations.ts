/**
 * Funciones de validación para turnos
 * Sprint 2.6
 */

import type { Shift, ShiftConfiguration } from "@prisma/client";
import { addMinutes, parseISO, differenceInMinutes, isSameDay } from "date-fns";

/**
 * Resultado de validación
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Convierte string de hora "HH:mm" a Date del día especificado
 */
function timeToDate(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Valida que un turno no sobrepase el límite de horas diarias
 */
export function validateDailyHours(
  shift: { date: Date; durationMinutes: number },
  existingShifts: Shift[],
  config: ShiftConfiguration,
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  if (!config.maxDailyHours) return result;

  const maxMinutes = Number(config.maxDailyHours) * 60;

  // Calcular total de minutos en el mismo día (incluyendo el nuevo turno)
  const sameDayShifts = existingShifts.filter((s) => isSameDay(new Date(s.date), shift.date));

  const totalMinutes = sameDayShifts.reduce((sum, s) => sum + s.durationMinutes, shift.durationMinutes);

  if (totalMinutes > maxMinutes) {
    result.valid = false;
    result.errors.push(
      `Excede el límite de ${Number(config.maxDailyHours)}h diarias (total: ${(totalMinutes / 60).toFixed(1)}h)`,
    );
  }

  return result;
}

/**
 * Valida que un turno no sobrepase el límite de horas semanales
 */
export function validateWeeklyHours(
  shift: { date: Date; durationMinutes: number },
  weekShifts: Shift[],
  config: ShiftConfiguration,
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  if (!config.maxWeeklyHours) return result;

  const maxMinutes = Number(config.maxWeeklyHours) * 60;

  const totalMinutes = weekShifts.reduce((sum, s) => sum + s.durationMinutes, shift.durationMinutes);

  if (totalMinutes > maxMinutes) {
    result.valid = false;
    result.errors.push(
      `Excede el límite de ${Number(config.maxWeeklyHours)}h semanales (total: ${(totalMinutes / 60).toFixed(1)}h)`,
    );
  }

  return result;
}

/**
 * Valida que haya descanso mínimo entre turnos
 */
export function validateRestBetweenShifts(
  newShift: { date: Date; startTime: string; endTime: string },
  existingShifts: Shift[],
  config: ShiftConfiguration,
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  if (!config.minRestBetweenShiftsHours) return result;

  const minRestMinutes = Number(config.minRestBetweenShiftsHours) * 60;

  const newStart = timeToDate(newShift.date, newShift.startTime);
  const newEnd = timeToDate(newShift.date, newShift.endTime);

  for (const existingShift of existingShifts) {
    const existingStart = timeToDate(new Date(existingShift.date), existingShift.startTime);
    const existingEnd = timeToDate(new Date(existingShift.date), existingShift.endTime);

    // Verificar descanso después del turno existente
    const restAfterExisting = differenceInMinutes(newStart, existingEnd);
    if (restAfterExisting > 0 && restAfterExisting < minRestMinutes) {
      result.valid = false;
      result.errors.push(
        `Descanso insuficiente después del turno del ${existingShift.date.toLocaleDateString()} (${(restAfterExisting / 60).toFixed(1)}h de ${Number(config.minRestBetweenShiftsHours)}h requeridas)`,
      );
    }

    // Verificar descanso antes del turno nuevo
    const restBeforeNew = differenceInMinutes(existingStart, newEnd);
    if (restBeforeNew > 0 && restBeforeNew < minRestMinutes) {
      result.valid = false;
      result.errors.push(
        `Descanso insuficiente antes del turno del ${existingShift.date.toLocaleDateString()} (${(restBeforeNew / 60).toFixed(1)}h de ${Number(config.minRestBetweenShiftsHours)}h requeridas)`,
      );
    }
  }

  return result;
}

/**
 * Valida que no haya solape entre turnos del mismo empleado
 */
export function validateShiftOverlap(
  newShift: { date: Date; startTime: string; endTime: string },
  existingShifts: Shift[],
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  const newStart = timeToDate(newShift.date, newShift.startTime);
  const newEnd = timeToDate(newShift.date, newShift.endTime);

  for (const existingShift of existingShifts) {
    // Solo verificar turnos del mismo día
    if (!isSameDay(new Date(existingShift.date), newShift.date)) continue;

    const existingStart = timeToDate(new Date(existingShift.date), existingShift.startTime);
    const existingEnd = timeToDate(new Date(existingShift.date), existingShift.endTime);

    // Verificar solape
    const hasOverlap =
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd);

    if (hasOverlap) {
      result.valid = false;
      result.errors.push(`Solapa con turno existente (${existingShift.startTime} - ${existingShift.endTime})`);
    }
  }

  return result;
}

/**
 * Valida que un turno cumpla con todos los requisitos de configuración
 */
export function validateShift(
  newShift: {
    date: Date;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    employeeId?: string;
  },
  existingShifts: Shift[],
  weekShifts: Shift[],
  config: ShiftConfiguration,
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  // Validar solapes
  const overlapResult = validateShiftOverlap(newShift, existingShifts);
  result.errors.push(...overlapResult.errors);
  result.warnings.push(...overlapResult.warnings);
  if (!overlapResult.valid) result.valid = false;

  // Validar descanso entre turnos
  const restResult = validateRestBetweenShifts(newShift, existingShifts, config);
  result.errors.push(...restResult.errors);
  result.warnings.push(...restResult.warnings);
  if (!restResult.valid) result.valid = false;

  // Validar horas diarias
  const dailyResult = validateDailyHours(newShift, existingShifts, config);
  result.errors.push(...dailyResult.errors);
  result.warnings.push(...dailyResult.warnings);
  if (!dailyResult.valid) result.valid = false;

  // Validar horas semanales
  const weeklyResult = validateWeeklyHours(newShift, weekShifts, config);
  result.errors.push(...weeklyResult.errors);
  result.warnings.push(...weeklyResult.warnings);
  if (!weeklyResult.valid) result.valid = false;

  return result;
}

/**
 * Valida la hora de inicio y fin (formato y lógica)
 */
export function validateShiftTimes(startTime: string, endTime: string): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  // Validar formato HH:mm
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime)) {
    result.valid = false;
    result.errors.push("Hora de inicio inválida (formato: HH:mm)");
  }
  if (!timeRegex.test(endTime)) {
    result.valid = false;
    result.errors.push("Hora de fin inválida (formato: HH:mm)");
  }

  if (result.valid) {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      result.valid = false;
      result.errors.push("La hora de fin debe ser posterior a la hora de inicio");
    }
  }

  return result;
}

/**
 * Calcula la duración en minutos entre dos horas
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes - startMinutes;
}

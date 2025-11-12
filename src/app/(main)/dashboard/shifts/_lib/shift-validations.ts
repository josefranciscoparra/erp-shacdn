/**
 * Validaciones Auxiliares para Turnos
 *
 * Helpers de validación que complementan las validaciones del servicio.
 * Útiles para validaciones en tiempo real en la UI antes de enviar al servidor.
 */

import { isDateInRange, doTimesOverlap, calculateDuration } from "./shift-utils";
import type { Shift, ShiftInput, EmployeeShift, Conflict, ConflictType } from "./types";

// ==================== CONFIGURACIÓN ====================

const DEFAULT_MIN_REST_HOURS = 12;
const DEFAULT_MAX_WEEKLY_HOURS_PERCENTAGE = 150;

// ==================== VALIDACIONES DE FORMATO ====================

/**
 * Validar que todos los campos requeridos estén presentes
 * @param data - Datos de turno a validar
 * @returns Array de mensajes de error
 */
export function validateRequiredFields(data: Partial<ShiftInput>): string[] {
  const errors: string[] = [];

  if (!data.employeeId) errors.push("Empleado es requerido");
  if (!data.date) errors.push("Fecha es requerida");
  if (!data.startTime) errors.push("Hora de inicio es requerida");
  if (!data.endTime) errors.push("Hora de fin es requerida");
  if (!data.costCenterId) errors.push("Lugar es requerido");
  if (!data.zoneId) errors.push("Zona es requerida");

  return errors;
}

/**
 * Validar que la hora de fin sea posterior a la de inicio
 * @param startTime - Hora inicio "HH:mm"
 * @param endTime - Hora fin "HH:mm"
 * @returns True si es válido
 */
export function validateTimeRange(startTime: string, endTime: string): boolean {
  // Permitir turnos que cruzan medianoche (ej: 22:00-06:00)
  // Solo validar que no sean iguales
  return startTime !== endTime;
}

/**
 * Validar que la duración del turno esté dentro de límites razonables
 * @param startTime - Hora inicio "HH:mm"
 * @param endTime - Hora fin "HH:mm"
 * @param minHours - Mínimo de horas (default: 0.5)
 * @param maxHours - Máximo de horas (default: 16)
 * @returns Mensaje de error o null si válido
 */
export function validateShiftDuration(
  startTime: string,
  endTime: string,
  minHours = 0.5,
  maxHours = 16,
): string | null {
  const duration = calculateDuration(startTime, endTime);

  if (duration < minHours) {
    return `El turno debe tener al menos ${minHours}h de duración`;
  }

  if (duration > maxHours) {
    return `El turno no puede exceder ${maxHours}h de duración`;
  }

  return null;
}

// ==================== VALIDACIONES DE CONFLICTOS ====================

/**
 * Detectar solapamiento con otros turnos del mismo empleado
 * @param newShift - Turno nuevo o editado
 * @param existingShifts - Turnos existentes del empleado
 * @returns Turno que solapa o null
 */
export function findOverlappingShift(newShift: ShiftInput, existingShifts: Shift[]): Shift | null {
  return (
    existingShifts.find((shift) => {
      if (shift.date !== newShift.date) return false;
      return doTimesOverlap(newShift.startTime, newShift.endTime, shift.startTime, shift.endTime);
    }) ?? null
  );
}

/**
 * Detectar si el empleado está ausente en la fecha
 * @param employee - Datos del empleado
 * @param date - Fecha del turno "YYYY-MM-DD"
 * @returns Ausencia encontrada o null
 */
export function findEmployeeAbsence(employee: EmployeeShift, date: string): EmployeeShift["absences"][0] | null {
  return employee.absences.find((absence) => isDateInRange(date, absence.start, absence.end)) ?? null;
}

/**
 * Calcular horas semanales de un empleado
 * @param shifts - Turnos del empleado en la semana
 * @returns Total de horas
 */
export function calculateWeeklyHours(shifts: Shift[]): number {
  return shifts.reduce((total, shift) => {
    const duration = calculateDuration(shift.startTime, shift.endTime);
    return total + duration;
  }, 0);
}

/**
 * Validar que no se excedan las horas semanales máximas
 * @param currentWeeklyHours - Horas ya asignadas en la semana
 * @param newShiftDuration - Duración del nuevo turno
 * @param contractHours - Horas pactadas en contrato
 * @param maxPercentage - % máximo permitido (default: 150)
 * @returns Mensaje de error o null
 */
export function validateWeeklyHoursLimit(
  currentWeeklyHours: number,
  newShiftDuration: number,
  contractHours: number,
  maxPercentage = DEFAULT_MAX_WEEKLY_HOURS_PERCENTAGE,
): string | null {
  const totalHours = currentWeeklyHours + newShiftDuration;
  const maxAllowed = (contractHours * maxPercentage) / 100;

  if (totalHours > maxAllowed) {
    return `El turno excede el ${maxPercentage}% de la jornada semanal (${maxAllowed}h). Total: ${totalHours.toFixed(1)}h`;
  }

  return null;
}

/**
 * Validar descanso mínimo entre turnos
 * @param previousShiftEnd - Hora fin del turno anterior "HH:mm"
 * @param newShiftStart - Hora inicio del nuevo turno "HH:mm"
 * @param minRestHours - Horas mínimas de descanso (default: 12)
 * @returns Mensaje de error o null
 */
export function validateMinimumRest(
  previousShiftEnd: string,
  newShiftStart: string,
  minRestHours = DEFAULT_MIN_REST_HOURS,
): string | null {
  const duration = calculateDuration(previousShiftEnd, newShiftStart);

  if (duration < minRestHours) {
    return `No cumple el descanso mínimo de ${minRestHours}h. Solo hay ${duration.toFixed(1)}h de descanso`;
  }

  return null;
}

// ==================== GENERACIÓN DE CONFLICTOS ====================

/**
 * Generar objeto de conflicto estructurado
 * @param type - Tipo de conflicto
 * @param message - Mensaje descriptivo
 * @param severity - Nivel de gravedad
 * @param relatedShiftId - ID del turno relacionado (opcional)
 * @returns Objeto Conflict
 */
export function createConflict(
  type: ConflictType,
  message: string,
  severity: "error" | "warning" = "warning",
  relatedShiftId?: string,
): Conflict {
  return {
    type,
    message,
    severity,
    relatedShiftId,
  };
}

/**
 * Validar turno completo y generar lista de conflictos
 * @param data - Datos del turno
 * @param employee - Datos del empleado
 * @param employeeWeekShifts - Turnos del empleado en la semana
 * @param excludeShiftId - ID de turno a excluir (para edición)
 * @returns Array de conflictos
 */
export function validateShiftConflicts(
  data: ShiftInput,
  employee: EmployeeShift,
  employeeWeekShifts: Shift[],
  excludeShiftId?: string,
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Filtrar turno que estamos editando
  const otherShifts = employeeWeekShifts.filter((s) => s.id !== excludeShiftId);

  // 1. Validar solapamiento
  const overlapping = findOverlappingShift(data, otherShifts);
  if (overlapping) {
    conflicts.push(
      createConflict(
        "overlap",
        `Solapa con turno ${overlapping.startTime}-${overlapping.endTime}`,
        "error",
        overlapping.id,
      ),
    );
  }

  // 2. Validar ausencia
  const absence = findEmployeeAbsence(employee, data.date);
  if (absence) {
    conflicts.push(
      createConflict("absence", `Empleado ausente: ${absence.reason} (${absence.start} - ${absence.end})`),
    );
  }

  // 3. Validar horas semanales
  const currentWeeklyHours = calculateWeeklyHours(otherShifts);
  const newDuration = calculateDuration(data.startTime, data.endTime);
  const weeklyLimitError = validateWeeklyHoursLimit(currentWeeklyHours, newDuration, employee.contractHours);
  if (weeklyLimitError) {
    conflicts.push(createConflict("weekly_hours", weeklyLimitError));
  }

  // 4. Validar descanso mínimo (buscar turno del día anterior)
  const yesterday = new Date(data.date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const previousDayShift = otherShifts.find((s) => s.date === yesterdayStr);
  if (previousDayShift) {
    const restError = validateMinimumRest(previousDayShift.endTime, data.startTime);
    if (restError) {
      conflicts.push(createConflict("min_rest", restError, "warning", previousDayShift.id));
    }
  }

  return conflicts;
}

// ==================== HELPERS DE ESTADO ====================

/**
 * Determinar si un turno tiene conflictos
 * @param conflicts - Array de conflictos
 * @returns True si tiene conflictos de nivel error
 */
export function hasErrorConflicts(conflicts: Conflict[]): boolean {
  return conflicts.some((c) => c.severity === "error");
}

/**
 * Determinar si un turno tiene warnings (no bloquean guardado)
 * @param conflicts - Array de conflictos
 * @returns True si tiene warnings
 */
export function hasWarningConflicts(conflicts: Conflict[]): boolean {
  return conflicts.some((c) => c.severity === "warning");
}

/**
 * Filtrar conflictos por severidad
 * @param conflicts - Array de conflictos
 * @param severity - Nivel de severidad
 * @returns Conflictos filtrados
 */
export function filterConflictsBySeverity(conflicts: Conflict[], severity: "error" | "warning"): Conflict[] {
  return conflicts.filter((c) => c.severity === severity);
}

/**
 * Agrupar conflictos por tipo
 * @param conflicts - Array de conflictos
 * @returns Objeto agrupado por tipo
 */
export function groupConflictsByType(conflicts: Conflict[]): Record<ConflictType, Conflict[]> {
  return conflicts.reduce(
    (groups, conflict) => {
      if (!groups[conflict.type]) {
        groups[conflict.type] = [];
      }
      groups[conflict.type].push(conflict);
      return groups;
    },
    {} as Record<ConflictType, Conflict[]>,
  );
}

// ==================== VALIDACIONES PARA PLANTILLAS ====================

/**
 * Validar que el rango de fechas para aplicar plantilla sea válido
 * @param dateFrom - Fecha inicio "YYYY-MM-DD"
 * @param dateTo - Fecha fin "YYYY-MM-DD"
 * @returns Mensaje de error o null
 */
export function validateTemplateDateRange(dateFrom: string, dateTo: string): string | null {
  if (dateFrom > dateTo) {
    return "La fecha de inicio debe ser anterior a la fecha de fin";
  }

  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 180) {
    return "El rango de fechas no puede exceder 6 meses (180 días)";
  }

  return null;
}

/**
 * Validar que se seleccionen empleados para la plantilla
 * @param employeeIds - IDs de empleados seleccionados
 * @returns Mensaje de error o null
 */
export function validateTemplateEmployees(employeeIds: string[]): string | null {
  if (employeeIds.length === 0) {
    return "Debes seleccionar al menos un empleado";
  }

  if (employeeIds.length > 50) {
    return "No puedes aplicar la plantilla a más de 50 empleados a la vez";
  }

  return null;
}

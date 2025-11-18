/**
 * Sistema de Horarios V2.0 - Types
 *
 * Tipos para el nuevo sistema flexible de horarios que soporta:
 * - Horarios fijos (oficinas)
 * - Turnos rotativos (policía, bomberos)
 * - Períodos especiales (verano, Semana Santa)
 * - Presencia obligatoria + flexible (funcionarios)
 */

import type {
  ScheduleTemplateType,
  SchedulePeriodType,
  TimeSlotType,
  PresenceType,
  ScheduleAssignmentType,
} from "@prisma/client";

// ============================================================================
// Interfaces para Horario Efectivo (Resolución de Prioridades)
// ============================================================================

/**
 * Horario efectivo de un empleado para un día específico
 * Resulta de aplicar la lógica de prioridades:
 * 1. Ausencias (vacaciones/permisos)
 * 2. Excepciones de día
 * 3. Período activo (SPECIAL > INTENSIVE > REGULAR)
 * 4. Plantilla base
 */
export interface EffectiveSchedule {
  /** Fecha del horario */
  date: Date;

  /** Si el empleado trabaja este día */
  isWorkingDay: boolean;

  /** Minutos esperados de trabajo (suma de slots WORK) */
  expectedMinutes: number;

  /** Franjas horarias del día */
  timeSlots: EffectiveTimeSlot[];

  /** Origen de este horario (para debugging/UI) */
  source: "EXCEPTION" | "PERIOD" | "TEMPLATE" | "ABSENCE" | "NO_ASSIGNMENT";

  /** Nombre del período (si aplica) */
  periodName?: string;

  /** Información de ausencia (si aplica) */
  absence?: {
    type: string;
    reason?: string;
  };
}

/**
 * Franja horaria efectiva para un día
 */
export interface EffectiveTimeSlot {
  /** Minuto de inicio (0-1440) */
  startMinutes: number;

  /** Minuto de fin (0-1440) */
  endMinutes: number;

  /** Tipo de franja */
  slotType: TimeSlotType;

  /** Tipo de presencia */
  presenceType: PresenceType;

  /** Si es obligatoria la presencia */
  isMandatory: boolean;

  /** Descripción opcional */
  description?: string;
}

/**
 * Horario semanal completo (7 días)
 */
export interface WeekSchedule {
  /** Inicio de la semana (lunes 00:00) */
  weekStart: Date;

  /** Fin de la semana (domingo 23:59) */
  weekEnd: Date;

  /** Horarios efectivos para cada día */
  days: EffectiveSchedule[];

  /** Total de minutos esperados en la semana */
  totalExpectedMinutes: number;

  /** Total de horas esperadas (calculado) */
  totalExpectedHours?: number;
}

// ============================================================================
// Interfaces para Validación de Fichajes
// ============================================================================

/**
 * Resultado de validar un fichaje contra el horario esperado
 */
export interface ValidationResult {
  /** Si el fichaje es válido según el horario */
  isValid: boolean;

  /** Avisos (no críticos) */
  warnings: string[];

  /** Errores (críticos) */
  errors: string[];

  /** Franja horaria esperada */
  expectedSlot?: EffectiveTimeSlot;

  /** Franja horaria real del fichaje */
  actualSlot?: {
    startMinutes: number;
    endMinutes: number;
  };

  /** Desviación en minutos (real - esperado) */
  deviationMinutes?: number;
}

// ============================================================================
// Interfaces para Cambios de Período
// ============================================================================

/**
 * Cambio de período (ej: de verano a regular)
 */
export interface PeriodChange {
  /** Período que termina */
  fromPeriod: {
    type: SchedulePeriodType;
    name?: string;
    endDate: Date;
  };

  /** Período que comienza */
  toPeriod: {
    type: SchedulePeriodType;
    name?: string;
    startDate: Date;
  };
}

// ============================================================================
// Interfaces para Creación/Edición
// ============================================================================

/**
 * Datos para crear una plantilla de horario
 */
export interface CreateScheduleTemplateInput {
  name: string;
  description?: string;
  templateType: ScheduleTemplateType;
}

/**
 * Datos para crear un período
 */
export interface CreateSchedulePeriodInput {
  scheduleTemplateId: string;
  periodType: SchedulePeriodType;
  name?: string;
  validFrom?: Date;
  validTo?: Date;
}

/**
 * Datos para actualizar un patrón de día laboral
 */
export interface UpdateWorkDayPatternInput {
  isWorkingDay: boolean;
  timeSlots: CreateTimeSlotInput[];
}

/**
 * Datos para crear un time slot
 */
export interface CreateTimeSlotInput {
  startTimeMinutes: number;
  endTimeMinutes: number;
  slotType: TimeSlotType;
  presenceType: PresenceType;
  description?: string;
}

/**
 * Datos para asignar horario a un empleado
 */
export interface CreateEmployeeScheduleAssignmentInput {
  employeeId: string;
  assignmentType: ScheduleAssignmentType;
  scheduleTemplateId?: string;
  rotationPatternId?: string;
  rotationStartDate?: Date;
  validFrom: Date;
  validTo?: Date;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Respuesta estándar de las server actions
 */
export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Filtros para buscar plantillas
 */
export interface ScheduleTemplateFilters {
  templateType?: ScheduleTemplateType;
  isActive?: boolean;
  search?: string;
}

/**
 * Filtros para buscar asignaciones de empleados
 */
export interface EmployeeScheduleAssignmentFilters {
  employeeId?: string;
  isActive?: boolean;
  assignmentType?: ScheduleAssignmentType;
  validOn?: Date;
}

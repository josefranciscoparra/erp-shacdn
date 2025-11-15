/**
 * Tipos para el servicio de abstracción de horarios
 * Estos tipos encapsulan la lógica compleja de horarios FIXED/FLEXIBLE
 */

export type ScheduleType = "FLEXIBLE" | "FIXED" | "SHIFTS";

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type PeriodType = "REGULAR" | "INTENSIVE" | "SUMMER" | "HOLIDAY" | "SPECIAL";

/**
 * Horario completo de un día específico
 * Incluye horas esperadas, franjas horarias, pausas y estado
 */
export interface DaySchedule {
  /** Horas que debe trabajar ese día */
  hoursExpected: number;

  /** Si es día laborable según el contrato */
  isWorkingDay: boolean;

  /** Si es festivo según el calendario organizacional */
  isHoliday: boolean;

  /** Nombre del festivo (si aplica) */
  holidayName?: string;

  /** Si tiene contrato activo */
  hasActiveContract: boolean;

  /** Hora de entrada esperada (formato "HH:MM") */
  expectedEntryTime: string | null;

  /** Hora de salida esperada (formato "HH:MM") */
  expectedExitTime: string | null;

  /** Hora de inicio de pausa (formato "HH:MM") */
  breakStart: string | null;

  /** Hora de fin de pausa (formato "HH:MM") */
  breakEnd: string | null;

  /** Información del periodo activo */
  period: {
    /** Tipo de periodo (normal, intensivo, etc.) */
    type: PeriodType;

    /** Horas semanales del periodo */
    weeklyHours: number;
  };
}

/**
 * Ventana de tolerancia para fichaje de entrada
 * Ejemplo: si entra a las 09:00 con tolerancia de 15 min → 08:45 - 09:15
 */
export interface ClockInWindow {
  /** Hora más temprana permitida */
  earliest: Date;

  /** Hora esperada de entrada */
  expected: Date;

  /** Hora más tardía permitida (después es ausencia) */
  latest: Date;

  /** Tolerancia en minutos */
  toleranceMinutes: number;
}

/**
 * Ventana de tolerancia para fichaje de salida
 */
export interface ClockOutWindow {
  /** Hora más temprana permitida */
  earliest: Date;

  /** Hora esperada de salida */
  expected: Date;

  /** Tolerancia en minutos */
  toleranceMinutes: number;
}

/**
 * Periodo de pausa/descanso
 */
export interface BreakPeriod {
  /** Hora de inicio (formato "HH:MM") */
  startTime: string;

  /** Hora de fin (formato "HH:MM") */
  endTime: string;

  /** Duración en minutos */
  durationMinutes: number;
}

/**
 * Resumen de compliance de un día
 */
export interface DayCompliance {
  /** Fecha */
  date: Date;

  /** Horas esperadas */
  hoursExpected: number;

  /** Horas trabajadas */
  hoursWorked: number;

  /** Porcentaje de cumplimiento (0-100) */
  compliance: number;

  /** Estado */
  status: "COMPLETED" | "INCOMPLETE" | "ABSENT" | "IN_PROGRESS" | "NON_WORKDAY" | "HOLIDAY";

  /** Si fichó entrada */
  hasClockedIn: boolean;

  /** Si fichó salida */
  hasClockedOut: boolean;

  /** Si está ausente (no fichó y pasó el umbral) */
  isAbsent: boolean;
}

/**
 * Opciones para cálculo de compliance
 */
export interface ComplianceOptions {
  /** Umbral de compliance para considerar completo (default: 95%) */
  completeThreshold?: number;

  /** Umbral de compliance para considerar incompleto (default: 70%) */
  incompleteThreshold?: number;

  /** Margen de tolerancia para ausencia en minutos (default: 15) */
  absenceMarginMinutes?: number;
}

/**
 * Resultado de validación de fichaje
 */
export interface ClockValidationResult {
  /** Si el fichaje es válido */
  isValid: boolean;

  /** Mensaje de validación (si no es válido) */
  message?: string;

  /** Si está fuera de ventana de tolerancia */
  isOutsideWindow: boolean;

  /** Si está ausente (para entrada) */
  isAbsent: boolean;

  /** Diferencia con hora esperada en minutos (positivo = tarde, negativo = temprano) */
  differenceMinutes: number;
}

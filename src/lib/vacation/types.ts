/**
 * Tipos para el sistema de cálculo de vacaciones
 *
 * Este módulo define las interfaces principales para el cálculo de vacaciones
 * usando el patrón Strategy para diferenciar entre contratos normales y fijos discontinuos.
 */

/**
 * Balance de vacaciones calculado en tiempo real
 */
export interface VacationBalance {
  /** Días anuales teóricos según configuración de la organización (ej: 23) */
  annualAllowanceDays: number;

  /** Días devengados hasta la fecha de corte */
  accruedDays: number;

  /** Días ya disfrutados (solicitudes aprobadas y pasadas) */
  usedDays: number;

  /** Días en solicitudes pendientes de aprobación */
  pendingDays: number;

  /** Días disponibles = devengados - usados - pendientes */
  availableDays: number;

  // Valores en minutos para precisión en cálculos
  accruedMinutes: number;
  usedMinutes: number;
  pendingMinutes: number;
  availableMinutes: number;

  /** Minutos de jornada laboral usados para conversión */
  workdayMinutes: number;

  /** Etiqueta para mostrar en UI según tipo de contrato */
  displayLabel: string;

  /** Tipo de contrato para referencia */
  contractType: string;

  /** Estado del contrato discontinuo (solo para FIJO_DISCONTINUO) */
  discontinuousStatus?: "ACTIVE" | "PAUSED" | null;
}

/**
 * Entrada del historial de pausas para contratos fijos discontinuos
 */
export interface PauseHistoryEntry {
  id: string;
  action: "PAUSE" | "RESUME";
  startDate: Date;
  endDate: Date | null;
  reason: string | null;
  performedAt: Date;
}

/**
 * Información del contrato necesaria para cálculos
 */
export interface ContractInfo {
  id: string;
  contractType: string;
  startDate: Date;
  endDate: Date | null;
  weeklyHours: number;
  workingDaysPerWeek: number;
  workdayMinutes: number | null;
  discontinuousStatus?: "ACTIVE" | "PAUSED" | null;
  pauseHistory: PauseHistoryEntry[];
}

/**
 * Resultado del cálculo de devengo
 */
export interface AccruedResult {
  /** Días devengados */
  days: number;
  /** Minutos devengados (para precisión) */
  minutes: number;
  /** Días asignados para el año (si aplica) */
  assignedDays?: number;
  /** Días activos trabajados (para fijos discontinuos) */
  activeDays?: number;
  /** Días pausados (para fijos discontinuos) */
  pausedDays?: number;
}

/**
 * Información para mostrar en UI
 */
export interface VacationDisplayInfo {
  /** Etiqueta principal (ej: "Vacaciones asignadas" o "Vacaciones devengadas") */
  label: string;
  /** Texto secundario con detalles */
  sublabel?: string;
  /** Mostrar indicador de devengo congelado */
  showFrozenIndicator: boolean;
  /** Fecha desde la que está congelado */
  frozenSince?: Date;
}

/**
 * Opciones para el cálculo de balance
 */
export interface CalculateBalanceOptions {
  /** Fecha de corte para el cálculo (default: hoy) */
  cutoffDate?: Date;
  /** Incluir solicitudes pendientes en el cálculo */
  includePending?: boolean;
  /** Año para el cálculo (default: año actual) */
  year?: number;
  /** Modo de devengo para contratos estándar */
  accrualMode?: "ASSIGNED" | "ACCRUED";
  /** Incluir carryover del año anterior si está configurado */
  includeCarryover?: boolean;
}

/**
 * Resultado de días usados y pendientes
 */
export interface UsageResult {
  usedDays: number;
  usedMinutes: number;
  pendingDays: number;
  pendingMinutes: number;
}

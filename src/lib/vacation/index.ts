/**
 * Módulo de Vacaciones
 *
 * Exporta todas las funcionalidades del sistema de cálculo de vacaciones
 * con arquitectura basada en patrón Strategy.
 *
 * Uso:
 * ```typescript
 * import {
 *   calculateVacationBalance,
 *   getVacationDisplayInfo,
 *   canRequestVacation
 * } from "@/lib/vacation";
 * ```
 */

// Servicio principal - punto de entrada único
export {
  calculateVacationBalance,
  getVacationDisplayInfo,
  calculateSettlementBalance,
  canRequestVacation,
} from "./vacation-service";

// Tipos
export type {
  VacationBalance,
  VacationDisplayInfo,
  CalculateBalanceOptions,
  ContractInfo,
  PauseHistoryEntry,
  AccruedResult,
  UsageResult,
} from "./types";

// Utilidades de conversión (para uso externo si es necesario)
export {
  daysToMinutes,
  minutesToDays,
  calculateWorkdayMinutes,
  formatMinutesAsTime,
  roundDays,
} from "./utils/conversion-utils";

// Utilidades de fechas (para uso externo si es necesario)
export {
  daysBetween,
  daysBetweenExclusive,
  daysInYear,
  isLeapYear,
  startOfYear,
  endOfYear,
  isDateInRange,
  calculatePausedDays,
  isCurrentlyPaused,
  getPausedSince,
} from "./utils/date-utils";

// Estrategias (solo si se necesita uso directo, normalmente a través del servicio)
export { VacationStrategy } from "./strategies/base-strategy";
export { StandardVacationStrategy } from "./strategies/standard-strategy";
export { DiscontinuousVacationStrategy } from "./strategies/discontinuous-strategy";

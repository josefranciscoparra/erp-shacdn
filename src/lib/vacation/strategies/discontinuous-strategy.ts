/**
 * Estrategia de cálculo de vacaciones para contratos fijos discontinuos
 *
 * Comportamiento CRÍTICO:
 * - Al dar de alta: Empieza con 0 días (NO hay prorrateo inicial)
 * - Devenga día a día SOLO durante períodos ACTIVE
 * - Los períodos PAUSED NO generan devengo
 * - Fórmula: (diasAnuales / diasDelAño) × díasActivos
 *
 * Ejemplo:
 * - Alta el 1 de enero con 23 días anuales
 * - Activo: 1-ene a 1-jun (151 días) + 1-sep a 1-dic (91 días) = 242 días activos
 * - Pausado: 1-jun a 1-sep (92 días)
 * - Devengado = 23 × (242/365) = 15.26 días
 */

import type { AccruedResult, ContractInfo, VacationDisplayInfo } from "../types";
import { daysToMinutes } from "../utils/conversion-utils";
import {
  daysBetweenExclusive,
  daysInYear,
  calculatePausedDays,
  isCurrentlyPaused,
  getPausedSince,
} from "../utils/date-utils";

import { VacationStrategy } from "./base-strategy";

export class DiscontinuousVacationStrategy extends VacationStrategy {
  /**
   * Calcula los días devengados solo durante períodos activos
   *
   * IMPORTANTE: Los fijos discontinuos empiezan en 0 y solo devengan
   * durante los días que el contrato está en estado ACTIVE.
   */
  calculateAccrued(
    contract: ContractInfo,
    cutoffDate: Date,
    annualDays: number,
    workdayMinutes: number,
  ): AccruedResult {
    const year = cutoffDate.getFullYear();
    const totalDaysInYear = daysInYear(year);

    // Fecha efectiva de inicio
    const effectiveStart = this.getEffectiveStartDate(contract, year);

    // Fecha efectiva de fin (cutoff o fin de contrato)
    const effectiveEnd = this.getEffectiveEndDate(contract, cutoffDate, year);

    // Si la fecha de inicio es posterior a la de fin, no hay devengo
    if (effectiveStart > effectiveEnd) {
      return {
        days: 0,
        minutes: 0,
        activeDays: 0,
        pausedDays: 0,
      };
    }

    // Días naturales totales en el período
    const totalDays = daysBetweenExclusive(effectiveStart, effectiveEnd);

    // Calcular días pausados dentro del período
    const pausedDays = calculatePausedDays(contract.pauseHistory, effectiveStart, effectiveEnd);

    // Días activos = días totales - días pausados
    const activeDays = Math.max(0, totalDays - pausedDays);

    // Devengo diario: diasAnuales / diasDelAño
    // Devengo total: devengo diario × días activos
    const dailyAccrual = annualDays / totalDaysInYear;
    const accruedDays = dailyAccrual * activeDays;

    return {
      days: accruedDays,
      minutes: daysToMinutes(accruedDays, workdayMinutes),
      activeDays,
      pausedDays,
    };
  }

  /**
   * Etiqueta para UI: "Vacaciones devengadas"
   * porque se van acumulando día a día
   */
  getDisplayLabel(): string {
    return "Vacaciones devengadas";
  }

  /**
   * Información para display - incluye indicador de devengo congelado si está pausado
   */
  getDisplayInfo(contract: ContractInfo): VacationDisplayInfo {
    const isPaused = isCurrentlyPaused(contract.pauseHistory);
    const pausedSince = getPausedSince(contract.pauseHistory);

    return {
      label: this.getDisplayLabel(),
      sublabel: isPaused ? "Devengo congelado - Contrato pausado" : "Contrato Fijo Discontinuo - Activo",
      showFrozenIndicator: isPaused,
      frozenSince: pausedSince ?? undefined,
    };
  }
}

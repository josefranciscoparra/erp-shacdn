/**
 * Clase base abstracta para estrategias de cálculo de vacaciones
 *
 * Implementa el patrón Strategy para diferenciar el cálculo entre:
 * - Contratos normales (StandardVacationStrategy)
 * - Contratos fijos discontinuos (DiscontinuousVacationStrategy)
 */

import type { AccruedResult, ContractInfo, VacationDisplayInfo } from "../types";

/**
 * Clase abstracta que define la interfaz para todas las estrategias de vacaciones
 */
export abstract class VacationStrategy {
  /**
   * Calcula los días/minutos devengados hasta una fecha de corte
   *
   * @param contract - Información del contrato
   * @param cutoffDate - Fecha de corte para el cálculo
   * @param annualDays - Días anuales de vacaciones configurados
   * @param workdayMinutes - Minutos de jornada laboral diaria
   * @returns Resultado con días y minutos devengados
   */
  abstract calculateAccrued(
    contract: ContractInfo,
    cutoffDate: Date,
    annualDays: number,
    workdayMinutes: number,
  ): AccruedResult;

  /**
   * Obtiene la etiqueta para mostrar en UI
   *
   * @returns Etiqueta descriptiva (ej: "Vacaciones asignadas", "Vacaciones devengadas")
   */
  abstract getDisplayLabel(): string;

  /**
   * Obtiene información completa para mostrar en UI
   *
   * @param contract - Información del contrato
   * @returns Información para display incluyendo indicadores visuales
   */
  abstract getDisplayInfo(contract: ContractInfo): VacationDisplayInfo;

  /**
   * Calcula el inicio efectivo del período de devengo para el año
   *
   * @param contract - Información del contrato
   * @param year - Año para el cálculo
   * @returns Fecha de inicio efectiva (máximo entre inicio contrato y 1 de enero)
   */
  protected getEffectiveStartDate(contract: ContractInfo, year: number): Date {
    const yearStart = new Date(year, 0, 1); // 1 de enero
    const contractStart = new Date(contract.startDate);

    // El inicio efectivo es el máximo entre inicio de año e inicio de contrato
    return contractStart > yearStart ? contractStart : yearStart;
  }

  /**
   * Calcula el fin efectivo del período de devengo
   *
   * @param contract - Información del contrato
   * @param cutoffDate - Fecha de corte
   * @param year - Año para el cálculo
   * @returns Fecha de fin efectiva (mínimo entre fin contrato, cutoff y 31 de diciembre)
   */
  protected getEffectiveEndDate(contract: ContractInfo, cutoffDate: Date, year: number): Date {
    const yearEnd = new Date(year, 11, 31); // 31 de diciembre
    const cutoff = new Date(cutoffDate);

    let effectiveEnd = cutoff < yearEnd ? cutoff : yearEnd;

    // Si el contrato tiene fecha de fin, usar el mínimo
    if (contract.endDate) {
      const contractEnd = new Date(contract.endDate);
      if (contractEnd < effectiveEnd) {
        effectiveEnd = contractEnd;
      }
    }

    return effectiveEnd;
  }
}

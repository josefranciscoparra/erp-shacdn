/**
 * Estrategia de cálculo de vacaciones para contratos normales
 *
 * Comportamiento:
 * - Al dar de alta: Se calcula el prorrateo hasta 31 de diciembre
 * - El empleado tiene asignados los días desde el primer día
 * - Fórmula: diasAnuales × (diasDesdeAlta / diasTotalesAño)
 *
 * Ejemplo:
 * - Alta el 1 de julio con 23 días anuales
 * - Días desde alta hasta 31-dic = 184 días
 * - Días del año = 365
 * - Devengado = 23 × (184/365) = 11.6 días
 */

import type { AccruedResult, ContractInfo, VacationDisplayInfo } from "../types";
import { daysToMinutes } from "../utils/conversion-utils";
import { daysBetween, daysInYear, endOfYear } from "../utils/date-utils";

import { VacationStrategy } from "./base-strategy";

export class StandardVacationStrategy extends VacationStrategy {
  /**
   * Calcula los días devengados con prorrateo desde fecha de alta
   *
   * Para contratos normales, el devengo se calcula desde la fecha de alta
   * hasta el 31 de diciembre del año, proporcionalmente.
   */
  calculateAccrued(
    contract: ContractInfo,
    cutoffDate: Date,
    annualDays: number,
    workdayMinutes: number,
  ): AccruedResult {
    const year = cutoffDate.getFullYear();
    const totalDaysInYear = daysInYear(year);

    // Fecha efectiva de inicio (máximo entre inicio contrato y 1 de enero)
    const effectiveStart = this.getEffectiveStartDate(contract, year);

    // Para contratos normales, calculamos hasta fin de año (asignación anticipada)
    // pero el cutoff limita lo que "realmente" ha devengado
    const yearEndDate = endOfYear(new Date(year, 0, 1));

    // Días desde inicio de contrato hasta fin de año (para el prorrateo total asignado)
    const daysFromStartToYearEnd = daysBetween(effectiveStart, yearEndDate);

    // Proporción del año que le corresponde
    const proportionOfYear = daysFromStartToYearEnd / totalDaysInYear;

    // Días asignados proporcionalmente al año
    const assignedDays = annualDays * proportionOfYear;

    // Ahora calculamos cuánto de eso ha "devengado" hasta el cutoff
    // Para contratos normales, se considera que tiene todo asignado desde el inicio
    // pero por compatibilidad con liquidaciones, calculamos el devengo real
    const effectiveEnd = this.getEffectiveEndDate(contract, cutoffDate, year);
    const daysWorked = daysBetween(effectiveStart, effectiveEnd);

    // El devengo real hasta el cutoff
    const accruedProportion = daysWorked / totalDaysInYear;
    const accruedDays = annualDays * accruedProportion;

    return {
      days: accruedDays,
      minutes: daysToMinutes(accruedDays, workdayMinutes),
    };
  }

  /**
   * Etiqueta para UI: "Vacaciones asignadas"
   * porque los días se asignan al dar de alta
   */
  getDisplayLabel(): string {
    return "Vacaciones asignadas";
  }

  /**
   * Información para display - contratos normales no tienen indicador de congelado
   */
  getDisplayInfo(contract: ContractInfo): VacationDisplayInfo {
    return {
      label: this.getDisplayLabel(),
      sublabel: `Contrato ${this.getContractTypeLabel(contract.contractType)}`,
      showFrozenIndicator: false,
    };
  }

  /**
   * Convierte el tipo de contrato a etiqueta legible
   */
  private getContractTypeLabel(contractType: string): string {
    const labels: Record<string, string> = {
      INDEFINIDO: "Indefinido",
      TEMPORAL: "Temporal",
      PRACTICAS: "Prácticas",
      FORMACION: "Formación",
      OBRA_SERVICIO: "Obra o Servicio",
      EVENTUAL: "Eventual",
      INTERINIDAD: "Interinidad",
    };
    return labels[contractType] ?? contractType;
  }
}

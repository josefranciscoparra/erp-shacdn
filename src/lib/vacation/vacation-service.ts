/**
 * VacationService - Punto de entrada único para cálculos de vacaciones
 *
 * Este servicio implementa el patrón Strategy para diferenciar el cálculo
 * entre contratos normales y fijos discontinuos.
 *
 * IMPORTANTE:
 * - Todos los cálculos de vacaciones deben pasar por este servicio
 * - El cálculo es en tiempo real (no almacenado)
 * - Soporta ambos tipos de contrato con lógica diferenciada
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_PTO_BALANCE_TYPE, type PtoBalanceType } from "@/lib/pto/balance-types";

import { VacationStrategy } from "./strategies/base-strategy";
import { DiscontinuousVacationStrategy } from "./strategies/discontinuous-strategy";
import { StandardVacationStrategy } from "./strategies/standard-strategy";
import type {
  CalculateBalanceOptions,
  ContractInfo,
  PauseHistoryEntry,
  VacationBalance,
  VacationDisplayInfo,
} from "./types";
import {
  calculateWorkdayMinutes,
  daysToMinutes,
  minutesToDays,
  roundDays,
  roundDaysByPolicy,
  type PtoRoundingMode,
} from "./utils/conversion-utils";
import { calculateUsageFromRequests } from "./utils/usage-utils";

// Instancias singleton de las estrategias
const standardStrategy = new StandardVacationStrategy();
const discontinuousStrategy = new DiscontinuousVacationStrategy();

/**
 * Obtiene la estrategia de cálculo según el tipo de contrato
 */
function getStrategy(contractType: string): VacationStrategy {
  if (contractType === "FIJO_DISCONTINUO") {
    return discontinuousStrategy;
  }
  return standardStrategy;
}

/**
 * Convierte datos de Prisma a ContractInfo
 * Maneja la conversión de Decimal a number para campos numéricos
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toContractInfo(contract: any): ContractInfo {
  // Convertir Decimal a number si es necesario
  const weeklyHours = typeof contract.weeklyHours === "number" ? contract.weeklyHours : contract.weeklyHours.toNumber();
  const workingDaysPerWeek =
    typeof contract.workingDaysPerWeek === "number"
      ? contract.workingDaysPerWeek
      : contract.workingDaysPerWeek.toNumber();

  return {
    id: contract.id,
    contractType: contract.contractType,
    startDate: contract.startDate,
    endDate: contract.endDate,
    weeklyHours,
    workingDaysPerWeek,
    workdayMinutes: contract.workdayMinutes,
    discontinuousStatus: contract.discontinuousStatus as "ACTIVE" | "PAUSED" | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pauseHistory: (contract.pauseHistory ?? []).map((ph: any) => ({
      id: ph.id,
      action: ph.action as "PAUSE" | "RESUME",
      startDate: ph.startDate,
      endDate: ph.endDate,
      reason: ph.reason,
      performedAt: ph.performedAt,
    })),
  };
}

function endOfYear(year: number): Date {
  return new Date(year, 11, 31, 23, 59, 59, 999);
}

function clampDayToMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(day, 1), lastDay);
}

function buildCarryoverDeadline(year: number, month: number, day: number): Date {
  const monthIndex = Math.min(Math.max(month, 1), 12) - 1;
  const safeDay = clampDayToMonth(year, monthIndex, day);
  return new Date(year, monthIndex, safeDay, 23, 59, 59, 999);
}

type CarryoverConfig = {
  mode: "NONE" | "UNTIL_DATE" | "UNLIMITED";
  usageDeadlineMonth: number;
  usageDeadlineDay: number;
  requestDeadlineMonth: number;
  requestDeadlineDay: number;
};

async function getVacationAdjustments(
  employeeId: string,
  orgId: string,
  year: number,
  workdayMinutes: number,
  balanceType: PtoBalanceType = DEFAULT_PTO_BALANCE_TYPE,
): Promise<{ days: number; minutes: number }> {
  const manualAdjustments = await prisma.ptoBalanceAdjustment.findMany({
    where: {
      orgId,
      ptoBalance: {
        employeeId,
        year,
        balanceType,
      },
    },
    select: {
      daysAdjusted: true,
    },
  });

  const recurringAdjustments = await prisma.recurringPtoAdjustment.findMany({
    where: {
      employeeId,
      orgId,
      active: true,
      startYear: {
        lte: year,
      },
      balanceType,
    },
    select: {
      extraDays: true,
    },
  });

  const manualDays = manualAdjustments.reduce((total, adj) => total + Number(adj.daysAdjusted), 0);
  const recurringDays = recurringAdjustments.reduce((total, adj) => total + Number(adj.extraDays), 0);
  const totalDays = manualDays + recurringDays;

  return {
    days: totalDays,
    minutes: daysToMinutes(totalDays, workdayMinutes),
  };
}

/**
 * Calcula el balance de vacaciones de un empleado
 *
 * @param employeeId - ID del empleado
 * @param options - Opciones de cálculo (cutoffDate, includePending, year)
 * @returns Balance completo de vacaciones
 *
 * @example
 * // Balance actual
 * const balance = await calculateVacationBalance("emp123");
 *
 * // Balance a una fecha específica (para liquidación)
 * const balance = await calculateVacationBalance("emp123", {
 *   cutoffDate: new Date("2024-06-30"),
 *   year: 2024
 * });
 */
export async function calculateVacationBalance(
  employeeId: string,
  options: CalculateBalanceOptions = {},
): Promise<VacationBalance> {
  const { year = new Date().getFullYear() } = options;
  const cutoffDate = options.cutoffDate ?? new Date();
  const accrualMode = options.accrualMode ?? "ASSIGNED";
  const includeCarryover = options.includeCarryover ?? true;
  const includePending = options.includePending ?? true;

  // Obtener empleado con contrato activo y configuración de organización
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      organization: {
        select: {
          annualPtoDays: true,
          ptoConfig: {
            select: {
              carryoverMode: true,
              carryoverDeadlineMonth: true,
              carryoverDeadlineDay: true,
              carryoverRequestDeadlineMonth: true,
              carryoverRequestDeadlineDay: true,
              vacationRoundingUnit: true,
              vacationRoundingMode: true,
            },
          },
        },
      },
      employmentContracts: {
        where: { active: true },
        include: {
          pauseHistory: {
            orderBy: { startDate: "asc" },
          },
        },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  const contract = employee.employmentContracts[0];
  if (!contract) {
    throw new Error("El empleado no tiene contrato activo");
  }

  // Configuración
  const annualDays = employee.organization.annualPtoDays ?? 23;
  const ptoConfig = employee.organization.ptoConfig as {
    carryoverMode?: CarryoverConfig["mode"] | null;
    carryoverDeadlineMonth?: number | null;
    carryoverDeadlineDay?: number | null;
    carryoverRequestDeadlineMonth?: number | null;
    carryoverRequestDeadlineDay?: number | null;
    vacationRoundingUnit?: unknown | null;
    vacationRoundingMode?: PtoRoundingMode | null;
  } | null;
  const rawCarryoverMode = ptoConfig?.carryoverMode;
  const rawUsageDeadlineMonth = ptoConfig?.carryoverDeadlineMonth;
  const rawUsageDeadlineDay = ptoConfig?.carryoverDeadlineDay;
  const rawRequestDeadlineMonth = ptoConfig?.carryoverRequestDeadlineMonth;
  const rawRequestDeadlineDay = ptoConfig?.carryoverRequestDeadlineDay;
  const rawRoundingUnit = ptoConfig?.vacationRoundingUnit;
  const roundingUnit = rawRoundingUnit === null || rawRoundingUnit === undefined ? 0.1 : Number(rawRoundingUnit);
  const rawRoundingMode = ptoConfig?.vacationRoundingMode;
  const roundingMode = rawRoundingMode ?? "NEAREST";
  const usageDeadlineMonth = rawUsageDeadlineMonth ?? 1;
  const usageDeadlineDay = rawUsageDeadlineDay ?? 29;
  const requestDeadlineMonth = rawRequestDeadlineMonth ?? usageDeadlineMonth;
  const requestDeadlineDay = rawRequestDeadlineDay ?? usageDeadlineDay;

  const carryoverConfig: CarryoverConfig = {
    mode: includeCarryover ? (rawCarryoverMode ?? "NONE") : "NONE",
    usageDeadlineMonth,
    usageDeadlineDay,
    requestDeadlineMonth,
    requestDeadlineDay,
  };
  const contractInfo = toContractInfo(contract);
  // Usar los valores ya convertidos a number desde contractInfo
  const workdayMinutes =
    contract.workdayMinutes ?? calculateWorkdayMinutes(contractInfo.weeklyHours, contractInfo.workingDaysPerWeek);

  // Obtener estrategia según tipo de contrato
  const strategy = getStrategy(contract.contractType);

  // Calcular devengado
  const accrued = strategy.calculateAccrued(contractInfo, cutoffDate, annualDays, workdayMinutes);
  const adjustments = await getVacationAdjustments(
    employeeId,
    employee.orgId,
    year,
    workdayMinutes,
    DEFAULT_PTO_BALANCE_TYPE,
  );
  const assignedBaseDays = accrued.assignedDays ?? annualDays;
  const annualAllowanceDays = roundDays(assignedBaseDays + adjustments.days);

  const accrualBaseDays =
    accrualMode === "ASSIGNED" && accrued.assignedDays !== undefined ? accrued.assignedDays : accrued.days;
  const accrualBaseMinutes =
    accrualMode === "ASSIGNED" && accrued.assignedDays !== undefined
      ? daysToMinutes(accrualBaseDays, workdayMinutes)
      : accrued.minutes;

  const accruedMinutesWithAdjustments = accrualBaseMinutes + adjustments.minutes;
  const accruedDaysWithAdjustments = roundDays(minutesToDays(accruedMinutesWithAdjustments, workdayMinutes));

  const yearStart = new Date(year, 0, 1);
  const yearEnd = endOfYear(year);

  const ptoRequests = await prisma.ptoRequest.findMany({
    where: {
      employeeId,
      absenceType: {
        affectsBalance: true,
        balanceType: DEFAULT_PTO_BALANCE_TYPE,
      },
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
    },
    select: {
      status: true,
      durationMinutes: true,
      effectiveMinutes: true,
      workingDays: true,
      startDate: true,
      endDate: true,
      submittedAt: true,
    },
  });

  const usageAllYear = calculateUsageFromRequests(ptoRequests, workdayMinutes, {
    includePending,
    cutoffDate,
    windowStart: yearStart,
    windowEnd: yearEnd,
  });

  let carryoverMinutes = 0;
  let usageBeforeDeadlineTotal = 0;

  if (carryoverConfig.mode !== "NONE") {
    const contractStartYear = new Date(contractInfo.startDate).getFullYear();
    const previousYear = year - 1;

    if (previousYear >= contractStartYear) {
      const carryoverBalance = await calculateVacationBalance(employeeId, {
        year: previousYear,
        cutoffDate: endOfYear(previousYear),
        includePending: true,
        accrualMode: "ASSIGNED",
        includeCarryover: carryoverConfig.mode === "UNLIMITED",
      });

      carryoverMinutes = Math.max(0, carryoverBalance.availableMinutes);
    }

    const requestDeadlineDate = buildCarryoverDeadline(
      year,
      carryoverConfig.requestDeadlineMonth,
      carryoverConfig.requestDeadlineDay,
    );
    const usageDeadlineDate = buildCarryoverDeadline(
      year,
      carryoverConfig.usageDeadlineMonth,
      carryoverConfig.usageDeadlineDay,
    );
    const usageBeforeDeadline = calculateUsageFromRequests(ptoRequests, workdayMinutes, {
      includePending,
      cutoffDate,
      windowStart: yearStart,
      windowEnd: usageDeadlineDate,
      submittedBefore: requestDeadlineDate,
    });

    usageBeforeDeadlineTotal = usageBeforeDeadline.usedMinutes + usageBeforeDeadline.pendingMinutes;

    if (carryoverConfig.mode === "UNTIL_DATE" && cutoffDate > requestDeadlineDate) {
      const carryoverConsumed = Math.min(usageBeforeDeadlineTotal, carryoverMinutes);
      carryoverMinutes = carryoverConsumed;
    }

    if (carryoverConfig.mode === "UNTIL_DATE" && cutoffDate > usageDeadlineDate) {
      const carryoverConsumed = Math.min(usageBeforeDeadlineTotal, carryoverMinutes);
      carryoverMinutes = carryoverConsumed;
    }
  }

  const usageAllYearTotal = usageAllYear.usedMinutes + usageAllYear.pendingMinutes;
  const availableMinutes = accruedMinutesWithAdjustments - usageAllYearTotal + carryoverMinutes;

  const usedDaysRaw = minutesToDays(usageAllYear.usedMinutes, workdayMinutes);
  const pendingDaysRaw = minutesToDays(usageAllYear.pendingMinutes, workdayMinutes);
  const availableDaysRaw = minutesToDays(availableMinutes, workdayMinutes);

  return {
    annualAllowanceDays: roundDaysByPolicy(annualAllowanceDays, roundingUnit, roundingMode),
    accruedDays: roundDaysByPolicy(roundDays(accruedDaysWithAdjustments), roundingUnit, roundingMode),
    usedDays: roundDaysByPolicy(roundDays(usedDaysRaw), roundingUnit, roundingMode),
    pendingDays: roundDaysByPolicy(roundDays(pendingDaysRaw), roundingUnit, roundingMode),
    availableDays: roundDaysByPolicy(roundDays(availableDaysRaw), roundingUnit, roundingMode),
    accruedMinutes: accruedMinutesWithAdjustments,
    usedMinutes: usageAllYear.usedMinutes,
    pendingMinutes: usageAllYear.pendingMinutes,
    availableMinutes: Math.max(0, availableMinutes),
    workdayMinutes,
    displayLabel: strategy.getDisplayLabel(),
    contractType: contract.contractType,
    discontinuousStatus: contractInfo.discontinuousStatus,
    roundingUnit,
    roundingMode,
  };
}

/**
 * Obtiene información para mostrar en UI sobre las vacaciones
 *
 * @param employeeId - ID del empleado
 * @returns Información para display (etiqueta, indicadores)
 */
export async function getVacationDisplayInfo(employeeId: string): Promise<VacationDisplayInfo> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      employmentContracts: {
        where: { active: true },
        include: {
          pauseHistory: {
            orderBy: { startDate: "asc" },
          },
        },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });

  if (!employee?.employmentContracts[0]) {
    return {
      label: "Sin contrato",
      showFrozenIndicator: false,
    };
  }

  const contract = employee.employmentContracts[0];
  const contractInfo = toContractInfo(contract);
  const strategy = getStrategy(contract.contractType);

  return strategy.getDisplayInfo(contractInfo);
}

/**
 * Calcula el balance para liquidación (al finalizar contrato)
 *
 * @param employeeId - ID del empleado
 * @param settlementDate - Fecha de liquidación
 * @returns Balance a la fecha de liquidación
 */
export async function calculateSettlementBalance(employeeId: string, settlementDate: Date): Promise<VacationBalance> {
  return calculateVacationBalance(employeeId, {
    cutoffDate: settlementDate,
    includePending: true,
    accrualMode: "ACCRUED",
    year: settlementDate.getFullYear(),
  });
}

/**
 * Verifica si un empleado puede solicitar vacaciones
 *
 * @param employeeId - ID del empleado
 * @param requestedDays - Días solicitados
 * @returns true si tiene días disponibles suficientes
 */
export async function canRequestVacation(
  employeeId: string,
  requestedDays: number,
): Promise<{ canRequest: boolean; availableDays: number; reason?: string }> {
  try {
    const balance = await calculateVacationBalance(employeeId);

    if (balance.discontinuousStatus === "PAUSED") {
      return {
        canRequest: false,
        availableDays: balance.availableDays,
        reason: "El contrato está pausado. No se pueden solicitar vacaciones.",
      };
    }

    if (requestedDays > balance.availableDays) {
      return {
        canRequest: false,
        availableDays: balance.availableDays,
        reason: `Solo tienes ${balance.availableDays} días disponibles.`,
      };
    }

    return {
      canRequest: true,
      availableDays: balance.availableDays,
    };
  } catch (error) {
    return {
      canRequest: false,
      availableDays: 0,
      reason: error instanceof Error ? error.message : "Error al verificar disponibilidad",
    };
  }
}

// Re-exportar tipos útiles
export type { VacationBalance, VacationDisplayInfo, CalculateBalanceOptions };

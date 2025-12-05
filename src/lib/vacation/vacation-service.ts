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

import { VacationStrategy } from "./strategies/base-strategy";
import { DiscontinuousVacationStrategy } from "./strategies/discontinuous-strategy";
import { StandardVacationStrategy } from "./strategies/standard-strategy";
import type {
  CalculateBalanceOptions,
  ContractInfo,
  PauseHistoryEntry,
  UsageResult,
  VacationBalance,
  VacationDisplayInfo,
} from "./types";
import { calculateWorkdayMinutes, minutesToDays, roundDays } from "./utils/conversion-utils";

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

/**
 * Calcula los días usados y pendientes de un empleado
 */
async function calculateUsage(
  employeeId: string,
  workdayMinutes: number,
  options: CalculateBalanceOptions = {},
): Promise<UsageResult> {
  const { includePending = true, year = new Date().getFullYear() } = options;
  const cutoffDate = options.cutoffDate ?? new Date();

  // Inicio y fin del año para filtrar solicitudes
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  // Obtener solicitudes de PTO del año
  const ptoRequests = await prisma.ptoRequest.findMany({
    where: {
      employeeId,
      // Solo vacaciones (no otros tipos de ausencia)
      absenceType: {
        affectsBalance: true,
      },
      // Solicitudes que caen dentro del año
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
    },
    select: {
      status: true,
      durationMinutes: true,
      startDate: true,
      endDate: true,
    },
  });

  let usedMinutes = 0;
  let pendingMinutes = 0;

  for (const request of ptoRequests) {
    const duration = request.durationMinutes ?? 0;

    if (request.status === "APPROVED") {
      // Solo contar como usado si la fecha de fin ya pasó
      if (request.endDate <= cutoffDate) {
        usedMinutes += duration;
      } else if (includePending) {
        // Solicitud aprobada pero aún no disfrutada
        pendingMinutes += duration;
      }
    } else if (request.status === "PENDING" && includePending) {
      pendingMinutes += duration;
    }
  }

  return {
    usedDays: roundDays(minutesToDays(usedMinutes, workdayMinutes)),
    usedMinutes,
    pendingDays: roundDays(minutesToDays(pendingMinutes, workdayMinutes)),
    pendingMinutes,
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

  // Obtener empleado con contrato activo y configuración de organización
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      organization: {
        select: {
          annualPtoDays: true,
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
  const contractInfo = toContractInfo(contract);
  // Usar los valores ya convertidos a number desde contractInfo
  const workdayMinutes =
    contract.workdayMinutes ?? calculateWorkdayMinutes(contractInfo.weeklyHours, contractInfo.workingDaysPerWeek);

  // Obtener estrategia según tipo de contrato
  const strategy = getStrategy(contract.contractType);

  // Calcular devengado
  const accrued = strategy.calculateAccrued(contractInfo, cutoffDate, annualDays, workdayMinutes);

  // Calcular usado y pendiente
  const usage = await calculateUsage(employeeId, workdayMinutes, {
    ...options,
    year,
    cutoffDate,
  });

  // Calcular disponible
  const availableMinutes = accrued.minutes - usage.usedMinutes - usage.pendingMinutes;

  return {
    annualAllowanceDays: annualDays,
    accruedDays: roundDays(accrued.days),
    usedDays: usage.usedDays,
    pendingDays: usage.pendingDays,
    availableDays: roundDays(minutesToDays(availableMinutes, workdayMinutes)),
    accruedMinutes: accrued.minutes,
    usedMinutes: usage.usedMinutes,
    pendingMinutes: usage.pendingMinutes,
    availableMinutes: Math.max(0, availableMinutes),
    workdayMinutes,
    displayLabel: strategy.getDisplayLabel(),
    contractType: contract.contractType,
    discontinuousStatus: contractInfo.discontinuousStatus,
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

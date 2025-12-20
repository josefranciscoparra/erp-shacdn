/**
 * Vacation Calculator - Sistema de Cálculo de Liquidación de Vacaciones
 *
 * REFACTORIZADO: Este módulo ahora usa la arquitectura de VacationService
 * con patrón Strategy para diferenciar entre contratos normales y fijos discontinuos.
 *
 * IMPORTANTE:
 * - Contrato Normal: Los días se asignan al inicio del año/contrato, se calcula proporcionalmente al liquidar
 * - Fijo Discontinuo: NO se asignan días al inicio, se devengan SOLO durante períodos ACTIVE
 *
 * Las funciones exportadas mantienen compatibilidad con el código existente.
 */

import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";

// Importar desde la nueva arquitectura
import {
  daysToMinutes as newDaysToMinutes,
  minutesToDays as newMinutesToDays,
  daysBetween as newDaysBetween,
  isLeapYear,
} from "./vacation";
import { calculateVacationBalance as calculateFromService } from "./vacation/vacation-service";

// =====================================================
// TIPOS
// =====================================================

export interface PausePeriod {
  startDate: Date;
  endDate: Date | null;
}

export interface VacationCalculation {
  // Días
  accruedDays: number; // Días devengados
  usedDays: number; // Días disfrutados
  pendingDays: number; // Días en solicitudes pendientes
  balanceDays: number; // Saldo final (accrued - used - pending)

  // Minutos (para coherencia con sistema PTO)
  accruedMinutes: number;
  usedMinutes: number;
  pendingMinutes: number;
  balanceMinutes: number;

  // Metadatos del cálculo
  workdayMinutes: number;
  totalActiveDays: number;
  totalPausedDays: number;
  isDiscontinuous: boolean;
  calculationDate: Date;
}

export interface DiscontinuousSummary {
  currentStatus: "ACTIVE" | "PAUSED" | null;
  lastPause: {
    startDate: Date;
    endDate: Date | null;
    reason: string | null;
  } | null;
  pausedPeriods: PausePeriod[];
  totalPausedDays: number;
  totalActiveDays: number;
}

// =====================================================
// CONVERSIÓN DÍAS ↔ MINUTOS (delegados a nueva arquitectura)
// =====================================================

/**
 * Convierte días a minutos usando la jornada laboral del contrato
 *
 * @param days - Cantidad de días
 * @param workdayMinutes - Minutos de una jornada laboral (ej: 480 para 8h)
 * @returns Cantidad de minutos
 */
export function daysToMinutes(days: number, workdayMinutes: number = 480): number {
  return newDaysToMinutes(days, workdayMinutes);
}

/**
 * Convierte minutos a días usando la jornada laboral del contrato
 *
 * @param minutes - Cantidad de minutos
 * @param workdayMinutes - Minutos de una jornada laboral (ej: 480 para 8h)
 * @returns Cantidad de días (decimal)
 */
export function minutesToDays(minutes: number, workdayMinutes: number = 480): number {
  return newMinutesToDays(minutes, workdayMinutes);
}

/**
 * Calcula los minutos de jornada laboral de un contrato
 *
 * @param weeklyHours - Horas semanales del contrato
 * @param workingDaysPerWeek - Días laborables por semana (default: 5)
 * @param workdayMinutesOverride - Si el contrato tiene minutos explícitos, usarlos
 * @returns Minutos de jornada laboral
 */
export function getContractWorkdayMinutes(
  weeklyHours: number | Decimal,
  workingDaysPerWeek: number | Decimal | null = 5,
  workdayMinutesOverride: number | null = null,
): number {
  // Si hay override explícito, usarlo
  if (workdayMinutesOverride !== null) {
    return workdayMinutesOverride;
  }

  const hours = typeof weeklyHours === "number" ? weeklyHours : Number(weeklyHours);
  const days =
    workingDaysPerWeek === null
      ? 5
      : typeof workingDaysPerWeek === "number"
        ? workingDaysPerWeek
        : Number(workingDaysPerWeek);

  if (days === 0) return 480; // Default 8h si no hay días configurados

  const dailyHours = hours / days;
  return Math.round(dailyHours * 60);
}

// =====================================================
// CÁLCULO DE DÍAS ACTIVOS (para fijos discontinuos)
// =====================================================

/**
 * Calcula el número de días naturales entre dos fechas (inclusive)
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  return newDaysBetween(startDate, endDate);
}

/**
 * Obtiene el resumen de discontinuidad de un contrato
 * Incluye estado actual, períodos pausados y totales
 */
export async function getDiscontinuousSummary(contractId: string): Promise<DiscontinuousSummary> {
  const contract = await prisma.employmentContract.findUnique({
    where: { id: contractId },
    include: {
      pauseHistory: {
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!contract) {
    throw new Error("Contrato no encontrado");
  }

  const isDiscontinuous = contract.contractType === "FIJO_DISCONTINUO";
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Si no es fijo discontinuo, retornar valores por defecto
  if (!isDiscontinuous) {
    const contractStart = new Date(contract.startDate);
    const contractEnd = contract.endDate ? new Date(contract.endDate) : today;
    const totalDays = daysBetween(contractStart, contractEnd);

    return {
      currentStatus: null,
      lastPause: null,
      pausedPeriods: [],
      totalPausedDays: 0,
      totalActiveDays: totalDays,
    };
  }

  // Construir períodos de pausa desde el historial
  const pausedPeriods: PausePeriod[] = [];
  let currentPauseStart: Date | null = null;

  for (const entry of contract.pauseHistory) {
    if (entry.action === "PAUSE") {
      currentPauseStart = entry.startDate;
    } else if (entry.action === "RESUME" && currentPauseStart) {
      pausedPeriods.push({
        startDate: currentPauseStart,
        endDate: entry.startDate, // La fecha de reanudación es el fin de la pausa
      });
      currentPauseStart = null;
    }
  }

  // Si hay una pausa abierta (sin resume)
  if (currentPauseStart) {
    pausedPeriods.push({
      startDate: currentPauseStart,
      endDate: null,
    });
  }

  // Calcular días pausados
  let totalPausedDays = 0;
  for (const period of pausedPeriods) {
    const endDate = period.endDate ?? today;
    totalPausedDays += daysBetween(period.startDate, endDate);
  }

  // Calcular días activos
  const contractStart = new Date(contract.startDate);
  const contractEnd = contract.endDate ? new Date(contract.endDate) : today;
  const totalContractDays = daysBetween(contractStart, contractEnd);
  const totalActiveDays = Math.max(0, totalContractDays - totalPausedDays);

  // Obtener última pausa
  const lastPauseEntry = contract.pauseHistory
    .filter((h) => h.action === "PAUSE")
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];

  return {
    currentStatus: contract.discontinuousStatus as "ACTIVE" | "PAUSED" | null,
    lastPause: lastPauseEntry
      ? {
          startDate: lastPauseEntry.startDate,
          endDate: lastPauseEntry.endDate,
          reason: lastPauseEntry.reason,
        }
      : null,
    pausedPeriods,
    totalPausedDays,
    totalActiveDays,
  };
}

/**
 * Calcula los días activos de un contrato hasta una fecha de corte
 * Para fijos discontinuos, resta los períodos pausados
 *
 * @param contract - Contrato con su historial de pausas
 * @param cutoffDate - Fecha de corte para el cálculo
 * @returns Número de días activos
 */
export function calculateActiveDays(
  contract: {
    contractType: string;
    startDate: Date;
    endDate: Date | null;
    discontinuousStatus: string | null;
    pauseHistory?: Array<{
      action: string;
      startDate: Date;
      endDate: Date | null;
    }>;
  },
  cutoffDate: Date,
): number {
  const contractStart = new Date(contract.startDate);
  const contractEnd = contract.endDate
    ? new Date(Math.min(new Date(contract.endDate).getTime(), cutoffDate.getTime()))
    : cutoffDate;

  // Si la fecha de corte es anterior al inicio del contrato, 0 días
  if (cutoffDate < contractStart) {
    return 0;
  }

  const totalDays = daysBetween(contractStart, contractEnd);

  // Si no es fijo discontinuo, todos los días son activos
  if (contract.contractType !== "FIJO_DISCONTINUO") {
    return totalDays;
  }

  // Calcular días pausados dentro del período
  let pausedDays = 0;
  const pauseHistory = contract.pauseHistory ?? [];

  let currentPauseStart: Date | null = null;

  for (const entry of pauseHistory) {
    if (entry.action === "PAUSE") {
      currentPauseStart = entry.startDate;
    } else if (entry.action === "RESUME" && currentPauseStart) {
      // Calcular días pausados en este período (dentro del rango del contrato)
      const pauseStart = new Date(Math.max(currentPauseStart.getTime(), contractStart.getTime()));
      const pauseEnd = new Date(Math.min(entry.startDate.getTime(), contractEnd.getTime()));

      if (pauseEnd > pauseStart) {
        pausedDays += daysBetween(pauseStart, pauseEnd);
      }

      currentPauseStart = null;
    }
  }

  // Si hay una pausa abierta
  if (currentPauseStart) {
    const pauseStart = new Date(Math.max(currentPauseStart.getTime(), contractStart.getTime()));
    const pauseEnd = contractEnd;

    if (pauseEnd > pauseStart) {
      pausedDays += daysBetween(pauseStart, pauseEnd);
    }
  }

  return Math.max(0, totalDays - pausedDays);
}

// =====================================================
// CÁLCULO DE VACACIONES DEVENGADAS
// =====================================================

/**
 * Calcula las vacaciones devengadas de un empleado hasta una fecha de corte
 *
 * REFACTORIZADO: Ahora usa VacationService con patrón Strategy
 *
 * IMPORTANTE - Diferencia entre tipos de contrato:
 *
 * - CONTRATO NORMAL: Se asignan días al inicio (ej: 23 días/año)
 *   Al liquidar: devengado = diasAnuales × (diasTrabajados / diasAño)
 *
 * - FIJO DISCONTINUO: NO se asignan días al inicio
 *   Se devengan SOLO durante períodos ACTIVE
 *   Devengo = diasAnuales × (diasActivos / 365)
 *
 * @param employeeId - ID del empleado
 * @param cutoffDate - Fecha de corte para el cálculo
 * @returns Cálculo completo de vacaciones
 */
export async function calculateVacationAccrual(employeeId: string, cutoffDate: Date): Promise<VacationCalculation> {
  // Usar el nuevo servicio para el cálculo
  const balance = await calculateFromService(employeeId, {
    cutoffDate,
    includePending: true,
    accrualMode: "ACCRUED",
    year: cutoffDate.getFullYear(),
  });

  // Obtener metadatos adicionales que necesita VacationCalculation
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

  const contract = employee?.employmentContracts[0];
  const isDiscontinuous = contract?.contractType === "FIJO_DISCONTINUO";

  // Calcular días activos/pausados para metadatos
  let totalActiveDays = 0;
  let totalPausedDays = 0;

  if (contract) {
    const year = cutoffDate.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const contractStart = new Date(contract.startDate);
    const effectiveStart = contractStart > yearStart ? contractStart : yearStart;
    const effectiveEnd = contract.endDate
      ? new Date(Math.min(new Date(contract.endDate).getTime(), cutoffDate.getTime()))
      : cutoffDate;

    const totalDays = daysBetween(effectiveStart, effectiveEnd);

    if (isDiscontinuous) {
      totalActiveDays = calculateActiveDays(
        {
          contractType: contract.contractType,
          startDate: contract.startDate,
          endDate: contract.endDate,
          discontinuousStatus: contract.discontinuousStatus,
          pauseHistory: contract.pauseHistory,
        },
        cutoffDate,
      );
      totalPausedDays = Math.max(0, totalDays - totalActiveDays);
    } else {
      totalActiveDays = totalDays;
      totalPausedDays = 0;
    }
  }

  // Calcular balance en días
  const balanceDays = Math.round((balance.accruedDays - balance.usedDays - balance.pendingDays) * 100) / 100;
  const balanceMinutes = balance.accruedMinutes - balance.usedMinutes - balance.pendingMinutes;

  return {
    accruedDays: balance.accruedDays,
    usedDays: balance.usedDays,
    pendingDays: balance.pendingDays,
    balanceDays,
    accruedMinutes: balance.accruedMinutes,
    usedMinutes: balance.usedMinutes,
    pendingMinutes: balance.pendingMinutes,
    balanceMinutes,
    workdayMinutes: balance.workdayMinutes,
    totalActiveDays,
    totalPausedDays,
    isDiscontinuous,
    calculationDate: cutoffDate,
  };
}

/**
 * Calcula el balance de liquidación para un empleado
 * Este es el método principal para calcular qué se debe liquidar
 *
 * Fórmula: saldoFinal = devengado - disfrutado - pendiente
 * - saldoFinal > 0 → A favor del empleado (liquidar/pagar)
 * - saldoFinal < 0 → A favor de la empresa (descontar)
 *
 * @param employeeId - ID del empleado
 * @param cutoffDate - Fecha de corte para la liquidación
 * @returns Cálculo completo de liquidación
 */
export async function calculateSettlementBalance(employeeId: string, cutoffDate: Date): Promise<VacationCalculation> {
  return calculateVacationAccrual(employeeId, cutoffDate);
}

// =====================================================
// VALIDACIONES
// =====================================================

/**
 * Valida que un contrato pueda ser reanudado
 * - No debe haber fichajes durante el período pausado
 * - El contrato debe estar actualmente pausado
 */
export async function validateContractResume(contractId: string): Promise<{ valid: boolean; error?: string }> {
  const contract = await prisma.employmentContract.findUnique({
    where: { id: contractId },
    include: {
      pauseHistory: {
        orderBy: { startDate: "desc" },
        take: 1,
      },
      employee: true,
    },
  });

  if (!contract) {
    return { valid: false, error: "Contrato no encontrado" };
  }

  if (contract.contractType !== "FIJO_DISCONTINUO") {
    return { valid: false, error: "Solo los contratos fijos discontinuos pueden ser reanudados" };
  }

  if (contract.discontinuousStatus !== "PAUSED") {
    return { valid: false, error: "El contrato no está pausado" };
  }

  // Obtener la última pausa
  const lastPause = contract.pauseHistory[0];
  if (!lastPause || lastPause.action !== "PAUSE") {
    return { valid: false, error: "No se encontró una pausa activa en el historial" };
  }

  // Verificar que no haya fichajes durante el período pausado
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      employeeId: contract.employeeId,
      timestamp: {
        gte: lastPause.startDate,
      },
    },
    take: 1,
  });

  if (timeEntries.length > 0) {
    return {
      valid: false,
      error: `Existen fichajes durante el período de pausa (desde ${lastPause.startDate.toLocaleDateString()})`,
    };
  }

  return { valid: true };
}

// Re-exportar isLeapYear para compatibilidad
export { isLeapYear };

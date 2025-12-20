"use server";

import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";
import { calculatePtoBalanceByType } from "@/lib/pto/balance-service";
import { DEFAULT_PTO_BALANCE_TYPE, PTO_BALANCE_TYPES, type PtoBalanceType } from "@/lib/pto/balance-types";
import { calculateActiveDays } from "@/lib/vacation-calculator";
import { daysToMinutes } from "@/services/pto";

// =====================================================
// TIPOS INTERNOS
// =====================================================

interface ContractWithPauseHistory {
  contractType: string;
  startDate: Date;
  endDate: Date | null;
  discontinuousStatus: string | null;
  pauseHistory?: Array<{
    action: string;
    startDate: Date;
    endDate: Date | null;
  }>;
}

/**
 * Calcula los días de vacaciones anuales según el método de cálculo proporcional
 * Basado en la fecha de inicio del contrato y los días anuales de la organización
 *
 * IMPORTANTE - Diferencia entre tipos de contrato:
 * - CONTRATO NORMAL: Se asignan días al inicio del año/contrato
 * - FIJO DISCONTINUO: Se devengan SOLO durante períodos ACTIVE (usa calculateActiveDays)
 *
 * @param contract - Contrato con historial de pausas (para fijos discontinuos)
 * @param year - Año para el cálculo
 * @param annualPtoDays - Días de vacaciones anuales de la organización
 * @returns Días de vacaciones asignados/devengados
 */
export async function calculateAnnualAllowance(
  contractStartDate: Date,
  year: number,
  annualPtoDays: number,
  contract?: ContractWithPauseHistory,
): Promise<number> {
  const daysInYear = isLeapYear(year) ? 366 : 365;
  const contractYear = contractStartDate.getFullYear();

  // Si es fijo discontinuo y tenemos el contrato completo, calcular con días activos
  if (contract?.contractType === "FIJO_DISCONTINUO") {
    const yearEnd = new Date(year, 11, 31);
    yearEnd.setHours(23, 59, 59, 999);

    // Calcular días activos (restando períodos pausados)
    const activeDays = calculateActiveDays(contract, yearEnd);

    // Devengo proporcional a días activos
    const proportionalDays = (annualPtoDays / daysInYear) * activeDays;

    // Redondear a 2 decimales
    return Math.round(proportionalDays * 100) / 100;
  }

  // CONTRATO NORMAL: Lógica original
  // Si el contrato empezó antes del año actual, recibe días completos
  if (contractYear < year) {
    return annualPtoDays;
  }

  // Si el contrato empezó en el año actual, calcular proporcional
  if (contractYear === year) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    // Fecha de inicio efectiva (la más tardía entre inicio de contrato y año)
    const startOfWork = contractStartDate > yearStart ? contractStartDate : yearStart;

    // Días trabajados desde el inicio hasta fin de año
    const daysWorked = Math.ceil((yearEnd.getTime() - startOfWork.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Cálculo proporcional
    const proportionalDays = (annualPtoDays / daysInYear) * daysWorked;

    // Redondear a 0.5 días (medios días)
    return Math.round(proportionalDays * 2) / 2;
  }

  return 0;
}

/**
 * Verifica si un año es bisiesto
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Calcula o actualiza el balance de PTO de un empleado para un año específico
 */
export async function calculateOrUpdatePtoBalance(
  employeeId: string,
  orgId: string,
  year: number,
  balanceType: PtoBalanceType = DEFAULT_PTO_BALANCE_TYPE,
): Promise<{
  id: string;
  year: number;
  balanceType: PtoBalanceType;
  annualAllowance: number;
  daysUsed: number;
  daysPending: number;
  daysAvailable: number;
}> {
  // Obtener el contrato activo del empleado con historial de pausas (para fijos discontinuos)
  const activeContract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      orgId,
      active: true,
      weeklyHours: {
        gt: new Decimal(0),
      },
    },
    include: {
      pauseHistory: {
        orderBy: { startDate: "asc" },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  if (!activeContract) {
    throw new Error("No se encontró un contrato activo para el empleado");
  }

  const snapshot = await calculatePtoBalanceByType(employeeId, balanceType, { year });
  const annualAllowanceMinutes = daysToMinutes(snapshot.annualAllowanceDays, snapshot.workdayMinutes);

  // Crear o actualizar el balance
  const balance = await prisma.ptoBalance.upsert({
    where: {
      orgId_employeeId_year_balanceType: {
        orgId,
        employeeId,
        year,
        balanceType,
      },
    },
    create: {
      orgId,
      employeeId,
      year,
      balanceType,
      // ❌ DEPRECADO (mantener temporalmente para migración)
      annualAllowance: new Decimal(snapshot.annualAllowanceDays),
      daysUsed: new Decimal(snapshot.usedDays),
      daysPending: new Decimal(snapshot.pendingDays),
      daysAvailable: new Decimal(snapshot.availableDays),
      // ✅ NUEVOS CAMPOS (en minutos)
      annualAllowanceMinutes,
      minutesUsed: snapshot.usedMinutes,
      minutesPending: snapshot.pendingMinutes,
      minutesAvailable: snapshot.availableMinutes,
      workdayMinutesSnapshot: snapshot.workdayMinutes,
      contractStartDate: activeContract.startDate,
      calculationDate: new Date(),
    },
    update: {
      // ❌ DEPRECADO (mantener temporalmente para migración)
      annualAllowance: new Decimal(snapshot.annualAllowanceDays),
      daysUsed: new Decimal(snapshot.usedDays),
      daysPending: new Decimal(snapshot.pendingDays),
      daysAvailable: new Decimal(snapshot.availableDays),
      // ✅ NUEVOS CAMPOS (en minutos)
      annualAllowanceMinutes,
      minutesUsed: snapshot.usedMinutes,
      minutesPending: snapshot.pendingMinutes,
      minutesAvailable: snapshot.availableMinutes,
      workdayMinutesSnapshot: snapshot.workdayMinutes,
      calculationDate: new Date(),
    },
  });

  return {
    id: balance.id,
    year: balance.year,
    balanceType,
    // ❌ DEPRECADO - Mantener temporalmente para compatibilidad
    annualAllowance: Number(balance.annualAllowance),
    daysUsed: Number(balance.daysUsed),
    daysPending: Number(balance.daysPending),
    daysAvailable: Number(balance.daysAvailable),
    // ✅ NUEVOS CAMPOS (en minutos) - USAR ESTOS
    annualAllowanceMinutes: balance.annualAllowanceMinutes,
    minutesUsed: balance.minutesUsed,
    minutesPending: balance.minutesPending,
    minutesAvailable: balance.minutesAvailable,
    workdayMinutesSnapshot: balance.workdayMinutesSnapshot,
  };
}

/**
 * Recalcula el balance después de un cambio en solicitudes
 * (aprobar, rechazar, cancelar)
 */
export async function recalculatePtoBalance(
  employeeId: string,
  orgId: string,
  year: number,
  balanceType?: PtoBalanceType,
): Promise<void> {
  if (balanceType) {
    await calculateOrUpdatePtoBalance(employeeId, orgId, year, balanceType);
    return;
  }

  await Promise.all(PTO_BALANCE_TYPES.map((type) => calculateOrUpdatePtoBalance(employeeId, orgId, year, type)));
}

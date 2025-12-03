"use server";

import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";
import { daysToMinutes, getWorkdayMinutes } from "@/services/pto";

/**
 * Calcula los días de vacaciones anuales según el método de cálculo proporcional
 * Basado en la fecha de inicio del contrato y los días anuales de la organización
 */
export async function calculateAnnualAllowance(
  contractStartDate: Date,
  year: number,
  annualPtoDays: number,
): Promise<number> {
  const contractYear = contractStartDate.getFullYear();

  // Si el contrato empezó antes del año actual, recibe días completos
  if (contractYear < year) {
    return annualPtoDays;
  }

  // Si el contrato empezó en el año actual, calcular proporcional
  if (contractYear === year) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    // Días totales en el año (ajustado para años bisiestos)
    const daysInYear = isLeapYear(year) ? 366 : 365;

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
): Promise<{
  id: string;
  year: number;
  annualAllowance: number;
  daysUsed: number;
  daysPending: number;
  daysAvailable: number;
}> {
  // Obtener configuración de la organización
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { annualPtoDays: true },
  });

  if (!org) {
    throw new Error("Organización no encontrada");
  }

  // Obtener el contrato activo del empleado
  const activeContract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      orgId,
      active: true,
      weeklyHours: {
        gt: new Decimal(0),
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  if (!activeContract) {
    throw new Error("No se encontró un contrato activo para el empleado");
  }

  // Calcular días permitidos según fecha de inicio de contrato
  let allowance = await calculateAnnualAllowance(activeContract.startDate, year, org.annualPtoDays);

  // Sumar ajustes recurrentes activos
  const recurringAdjustments = await prisma.recurringPtoAdjustment.findMany({
    where: {
      employeeId,
      orgId,
      active: true,
      startYear: {
        lte: year, // Solo los que ya están activos para este año
      },
    },
  });

  recurringAdjustments.forEach((adj) => {
    allowance += Number(adj.extraDays);
  });

  // Sumar ajustes manuales aplicados sobre el balance del año
  const manualAdjustments = await prisma.ptoBalanceAdjustment.findMany({
    where: {
      orgId,
      ptoBalance: {
        employeeId,
        year,
      },
    },
    select: {
      daysAdjusted: true,
    },
  });

  const manualAdjustmentTotal = manualAdjustments.reduce((total, adj) => total + Number(adj.daysAdjusted), 0);

  allowance += manualAdjustmentTotal;

  // Calcular días usados (solicitudes APPROVED)
  const approvedRequests = await prisma.ptoRequest.findMany({
    where: {
      employeeId,
      orgId,
      status: "APPROVED",
      startDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31),
      },
    },
    select: {
      workingDays: true,
    },
  });

  const daysUsed = approvedRequests.reduce((sum, req) => sum + Number(req.workingDays), 0);

  // Calcular días pendientes (solicitudes PENDING)
  const pendingRequests = await prisma.ptoRequest.findMany({
    where: {
      employeeId,
      orgId,
      status: "PENDING",
      startDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31),
      },
    },
    select: {
      workingDays: true,
    },
  });

  const daysPending = pendingRequests.reduce((sum, req) => sum + Number(req.workingDays), 0);

  // Días disponibles = allowance - used - pending
  const daysAvailable = allowance - daysUsed - daysPending;

  // 🆕 SISTEMA DE BALANCE EN MINUTOS - Calcular campos en minutos
  // Usar suma directa de effectiveMinutes para precisión exacta, fallback a días convertidos para legacy
  const workdayMinutes = await getWorkdayMinutes(employeeId, orgId);

  // Calcular minutos usados (solicitudes APPROVED)
  const approvedRequestsMinutes = await prisma.ptoRequest.findMany({
    where: {
      employeeId,
      orgId,
      status: "APPROVED",
      startDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31),
      },
      absenceType: {
        affectsBalance: true, // Solo sumar si afecta al balance
      },
    },
    select: {
      workingDays: true,
      effectiveMinutes: true,
    },
  });

  const minutesUsed = approvedRequestsMinutes.reduce((sum, req) => {
    // Si tiene effectiveMinutes (nuevo sistema), usarlo. Si no, convertir workingDays.
    if (req.effectiveMinutes > 0) return sum + req.effectiveMinutes;
    return sum + daysToMinutes(Number(req.workingDays), workdayMinutes);
  }, 0);

  // Calcular minutos pendientes (solicitudes PENDING)
  const pendingRequestsMinutes = await prisma.ptoRequest.findMany({
    where: {
      employeeId,
      orgId,
      status: "PENDING",
      startDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31),
      },
      absenceType: {
        affectsBalance: true,
      },
    },
    select: {
      workingDays: true,
      effectiveMinutes: true,
    },
  });

  const minutesPending = pendingRequestsMinutes.reduce((sum, req) => {
    if (req.effectiveMinutes > 0) return sum + req.effectiveMinutes;
    return sum + daysToMinutes(Number(req.workingDays), workdayMinutes);
  }, 0);

  const annualAllowanceMinutes = daysToMinutes(allowance, workdayMinutes);
  const minutesAvailable = annualAllowanceMinutes - minutesUsed - minutesPending;

  // Crear o actualizar el balance
  const balance = await prisma.ptoBalance.upsert({
    where: {
      orgId_employeeId_year: {
        orgId,
        employeeId,
        year,
      },
    },
    create: {
      orgId,
      employeeId,
      year,
      // ❌ DEPRECADO (mantener temporalmente para migración)
      annualAllowance: new Decimal(allowance),
      daysUsed: new Decimal(daysUsed),
      daysPending: new Decimal(daysPending),
      daysAvailable: new Decimal(daysAvailable),
      // ✅ NUEVOS CAMPOS (en minutos)
      annualAllowanceMinutes,
      minutesUsed,
      minutesPending,
      minutesAvailable,
      workdayMinutesSnapshot: workdayMinutes,
      contractStartDate: activeContract.startDate,
      calculationDate: new Date(),
    },
    update: {
      // ❌ DEPRECADO (mantener temporalmente para migración)
      annualAllowance: new Decimal(allowance),
      daysUsed: new Decimal(daysUsed),
      daysPending: new Decimal(daysPending),
      daysAvailable: new Decimal(daysAvailable),
      // ✅ NUEVOS CAMPOS (en minutos)
      annualAllowanceMinutes,
      minutesUsed,
      minutesPending,
      minutesAvailable,
      workdayMinutesSnapshot: workdayMinutes,
      calculationDate: new Date(),
    },
  });

  return {
    id: balance.id,
    year: balance.year,
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
export async function recalculatePtoBalance(employeeId: string, orgId: string, year: number): Promise<void> {
  await calculateOrUpdatePtoBalance(employeeId, orgId, year);
}

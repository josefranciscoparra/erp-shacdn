"use server";

import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Calcula los días de vacaciones anuales según el método de cálculo proporcional
 * Basado en la fecha de inicio del contrato y los días anuales de la organización
 */
export async function calculateAnnualAllowance(
  contractStartDate: Date,
  year: number,
  annualPtoDays: number
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
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Calcula o actualiza el balance de PTO de un empleado para un año específico
 */
export async function calculateOrUpdatePtoBalance(
  employeeId: string,
  orgId: string,
  year: number
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
  const allowance = await calculateAnnualAllowance(
    activeContract.startDate,
    year,
    org.annualPtoDays
  );

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

  const daysUsed = approvedRequests.reduce(
    (sum, req) => sum + Number(req.workingDays),
    0
  );

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

  const daysPending = pendingRequests.reduce(
    (sum, req) => sum + Number(req.workingDays),
    0
  );

  // Días disponibles = allowance - used - pending
  const daysAvailable = allowance - daysUsed - daysPending;

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
      annualAllowance: new Decimal(allowance),
      daysUsed: new Decimal(daysUsed),
      daysPending: new Decimal(daysPending),
      daysAvailable: new Decimal(daysAvailable),
      contractStartDate: activeContract.startDate,
      calculationDate: new Date(),
    },
    update: {
      annualAllowance: new Decimal(allowance),
      daysUsed: new Decimal(daysUsed),
      daysPending: new Decimal(daysPending),
      daysAvailable: new Decimal(daysAvailable),
      calculationDate: new Date(),
    },
  });

  return {
    id: balance.id,
    year: balance.year,
    annualAllowance: Number(balance.annualAllowance),
    daysUsed: Number(balance.daysUsed),
    daysPending: Number(balance.daysPending),
    daysAvailable: Number(balance.daysAvailable),
  };
}

/**
 * Recalcula el balance después de un cambio en solicitudes
 * (aprobar, rechazar, cancelar)
 */
export async function recalculatePtoBalance(
  employeeId: string,
  orgId: string,
  year: number
): Promise<void> {
  await calculateOrUpdatePtoBalance(employeeId, orgId, year);
}

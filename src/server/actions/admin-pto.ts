"use server";

import type { Prisma, PtoAdjustmentType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { addWeeks } from "date-fns";

import { auth } from "@/lib/auth";
import { normalizeDateToLocalNoon } from "@/lib/dates/date-only";
import { prisma } from "@/lib/prisma";
import { calculateVacationBalance, getVacationDisplayInfo } from "@/lib/vacation";

import { calculateWorkingDays } from "./employee-pto";
import { createNotification } from "./notifications";
import { recalculatePtoBalance } from "./pto-balance";

/**
 * Verifica que el usuario tenga permisos de administrador de RRHH
 */
async function requireHRAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      orgId: true,
      role: true,
      name: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (!["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new Error("No tienes permisos para realizar esta acción");
  }

  return user;
}

async function notifyParticipants(params: {
  employeeUserId?: string | null;
  approverId?: string | null;
  orgId: string;
  employeeName: string;
  absenceName: string;
  action: "approved" | "rejected" | "cancelled";
  performedBy: string;
  additionalMessage?: string;
  requestId: string;
}) {
  const {
    employeeUserId,
    approverId,
    orgId,
    employeeName,
    absenceName,
    action,
    performedBy,
    additionalMessage,
    requestId,
  } = params;

  const actionMessages = {
    approved: {
      employee: {
        title: "Solicitud aprobada",
        message: `Tu solicitud de ${absenceName} ha sido aprobada por ${performedBy}.`,
      },
      approver: {
        title: "Solicitud aprobada por RRHH",
        message: `${employeeName} - ${absenceName} fue aprobada por ${performedBy}.`,
      },
      type: "PTO_APPROVED" as const,
    },
    rejected: {
      employee: {
        title: "Solicitud rechazada",
        message: `Tu solicitud de ${absenceName} ha sido rechazada por ${performedBy}.${additionalMessage ? ` Motivo: ${additionalMessage}` : ""}`,
      },
      approver: {
        title: "Solicitud rechazada por RRHH",
        message: `${employeeName} - ${absenceName} fue rechazada por ${performedBy}.${additionalMessage ? ` Motivo: ${additionalMessage}` : ""}`,
      },
      type: "PTO_REJECTED" as const,
    },
    cancelled: {
      employee: {
        title: "Solicitud cancelada",
        message: `Tu solicitud de ${absenceName} ha sido cancelada por ${performedBy}.${additionalMessage ? ` Motivo: ${additionalMessage}` : ""}`,
      },
      approver: {
        title: "Solicitud cancelada por RRHH",
        message: `${employeeName} - ${absenceName} fue cancelada por ${performedBy}.${additionalMessage ? ` Motivo: ${additionalMessage}` : ""}`,
      },
      type: "PTO_CANCELLED" as const,
    },
  };

  const config = actionMessages[action];

  if (employeeUserId) {
    await createNotification(
      employeeUserId,
      orgId,
      config.type,
      config.employee.title,
      config.employee.message,
      requestId,
    );
  }

  if (approverId && approverId !== employeeUserId) {
    await createNotification(approverId, orgId, config.type, config.approver.title, config.approver.message, requestId);
  }
}

async function recalcForRequest(employeeId: string, orgId: string, startDate: Date, endDate: Date) {
  const years = new Set<number>();
  years.add(startDate.getFullYear());
  years.add(endDate.getFullYear());
  years.add(new Date().getFullYear());

  for (const year of years) {
    await recalculatePtoBalance(employeeId, orgId, year);
  }
}

// ==================== GESTIÓN DE SOLICITUDES POR RRHH ====================

export async function adminApprovePtoRequest(requestId: string, comments?: string) {
  const user = await requireHRAdmin();

  const request = await prisma.ptoRequest.findFirst({
    where: {
      id: requestId,
      orgId: user.orgId,
    },
    include: {
      employee: {
        include: {
          user: true,
        },
      },
      absenceType: true,
    },
  });

  if (!request) {
    throw new Error("Solicitud no encontrada");
  }

  if (request.status !== "PENDING") {
    throw new Error("Solo se pueden aprobar solicitudes pendientes");
  }

  const employeeFullName = [request.employee.firstName, request.employee.lastName, request.employee.secondLastName]
    .filter(Boolean)
    .join(" ");

  await prisma.ptoRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approverComments: comments ?? `Aprobada por ${user.name ?? "RRHH"}`,
      approverId: user.id,
      rejectedAt: null,
      rejectionReason: null,
    },
  });

  await recalcForRequest(request.employeeId, request.orgId, request.startDate, request.endDate);

  await notifyParticipants({
    employeeUserId: request.employee.user?.id,
    approverId: request.approverId && request.approverId !== user.id ? request.approverId : undefined,
    orgId: request.orgId,
    employeeName: employeeFullName,
    absenceName: request.absenceType.name,
    action: "approved",
    performedBy: user.name ?? "RRHH",
    requestId,
  });

  return { success: true };
}

export async function adminRejectPtoRequest(requestId: string, reason: string, comments?: string) {
  const user = await requireHRAdmin();

  if (!reason?.trim()) {
    throw new Error("Debes proporcionar un motivo de rechazo");
  }

  const request = await prisma.ptoRequest.findFirst({
    where: {
      id: requestId,
      orgId: user.orgId,
    },
    include: {
      employee: {
        include: {
          user: true,
        },
      },
      absenceType: true,
    },
  });

  if (!request) {
    throw new Error("Solicitud no encontrada");
  }

  if (request.status !== "PENDING") {
    throw new Error("Solo se pueden rechazar solicitudes pendientes");
  }

  const employeeFullName = [request.employee.firstName, request.employee.lastName, request.employee.secondLastName]
    .filter(Boolean)
    .join(" ");

  await prisma.ptoRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: reason,
      approverComments: comments ?? `Rechazada por ${user.name ?? "RRHH"}`,
      approverId: user.id,
    },
  });

  await recalcForRequest(request.employeeId, request.orgId, request.startDate, request.endDate);

  await notifyParticipants({
    employeeUserId: request.employee.user?.id,
    approverId: request.approverId && request.approverId !== user.id ? request.approverId : undefined,
    orgId: request.orgId,
    employeeName: employeeFullName,
    absenceName: request.absenceType.name,
    action: "rejected",
    performedBy: user.name ?? "RRHH",
    additionalMessage: reason,
    requestId,
  });

  return { success: true };
}

export async function adminCancelPtoRequest(requestId: string, reason?: string) {
  const user = await requireHRAdmin();

  const request = await prisma.ptoRequest.findFirst({
    where: {
      id: requestId,
      orgId: user.orgId,
    },
    include: {
      employee: {
        include: {
          user: true,
        },
      },
      absenceType: true,
    },
  });

  if (!request) {
    throw new Error("Solicitud no encontrada");
  }

  if (request.status !== "APPROVED") {
    throw new Error("Solo se pueden cancelar solicitudes aprobadas");
  }

  if (request.startDate <= new Date()) {
    throw new Error("Solo se pueden cancelar solicitudes futuras");
  }

  const employeeFullName = [request.employee.firstName, request.employee.lastName, request.employee.secondLastName]
    .filter(Boolean)
    .join(" ");

  await prisma.ptoRequest.update({
    where: { id: requestId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason ?? `Cancelada por ${user.name ?? "RRHH"}`,
      approverId: user.id,
    },
  });

  await recalcForRequest(request.employeeId, request.orgId, request.startDate, request.endDate);

  await notifyParticipants({
    employeeUserId: request.employee.user?.id,
    approverId: request.approverId && request.approverId !== user.id ? request.approverId : undefined,
    orgId: request.orgId,
    employeeName: employeeFullName,
    absenceName: request.absenceType.name,
    action: "cancelled",
    performedBy: user.name ?? "RRHH",
    additionalMessage: reason,
    requestId,
  });

  return { success: true };
}

/**
 * Obtiene el usuario actual autenticado
 */
async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      orgId: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return user;
}

// ==================== LECTURA ====================

/**
 * Obtiene el balance de PTO de un empleado específico
 */
export async function getEmployeePtoBalance(employeeId: string) {
  const user = await getCurrentUser();

  // Verificar que el empleado pertenece a la misma organización
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      orgId: user.orgId,
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  const currentYear = new Date().getFullYear();
  const balance = await calculateVacationBalance(employeeId, { year: currentYear });

  return {
    id: `REALTIME_${employeeId}_${currentYear}`,
    year: currentYear,
    annualAllowance: balance.annualAllowanceDays,
    daysUsed: balance.usedDays,
    daysPending: balance.pendingDays,
    daysAvailable: balance.availableDays,
    workdayMinutes: balance.workdayMinutes,
    contractType: balance.contractType,
    discontinuousStatus: balance.discontinuousStatus,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Obtiene el balance de vacaciones calculado en TIEMPO REAL
 *
 * IMPORTANTE: Esta función usa el patrón Strategy para diferenciar:
 * - Contratos normales: Prorrateo al dar de alta (días asignados)
 * - Fijos discontinuos: Devengo día a día solo en ACTIVE (días devengados)
 *
 * @param employeeId - ID del empleado
 * @returns Balance calculado en tiempo real con información de display
 */
export async function getEmployeeVacationBalanceRealtime(employeeId: string) {
  const user = await getCurrentUser();

  // Verificar que el empleado pertenece a la misma organización
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      orgId: user.orgId,
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  try {
    // Calcular balance en tiempo real usando VacationService
    const balance = await calculateVacationBalance(employeeId);
    const displayInfo = await getVacationDisplayInfo(employeeId);

    return {
      // Datos principales
      year: new Date().getFullYear(),
      annualAllowance: balance.annualAllowanceDays,
      daysAccrued: balance.accruedDays, // Días devengados hasta hoy
      daysUsed: balance.usedDays,
      daysPending: balance.pendingDays,
      daysAvailable: balance.availableDays,
      // Información de display
      displayLabel: displayInfo.label, // "Vacaciones asignadas" o "Vacaciones devengadas"
      sublabel: displayInfo.sublabel,
      showFrozenIndicator: displayInfo.showFrozenIndicator,
      frozenSince: displayInfo.frozenSince?.toISOString() ?? null,
      // Metadatos
      contractType: balance.contractType,
      discontinuousStatus: balance.discontinuousStatus,
      workdayMinutes: balance.workdayMinutes,
      calculatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error calculating vacation balance:", error);
    throw new Error(error instanceof Error ? error.message : "Error al calcular el balance de vacaciones");
  }
}

/**
 * Obtiene todas las solicitudes de PTO de un empleado
 */
export async function getEmployeePtoRequests(employeeId: string) {
  const user = await getCurrentUser();

  const requests = await prisma.ptoRequest.findMany({
    where: {
      employeeId,
      orgId: user.orgId,
    },
    include: {
      absenceType: true,
      approver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  // Convertir Decimals a números y Dates a strings para el cliente
  return requests.map((request) => ({
    id: request.id,
    startDate: request.startDate.toISOString(),
    endDate: request.endDate.toISOString(),
    workingDays: Number(request.workingDays),
    status: request.status,
    reason: request.reason,
    attachmentUrl: request.attachmentUrl,
    approverId: request.approverId,
    approvedAt: request.approvedAt?.toISOString() ?? null,
    approverComments: request.approverComments,
    rejectedAt: request.rejectedAt?.toISOString() ?? null,
    rejectionReason: request.rejectionReason,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
    cancellationReason: request.cancellationReason,
    submittedAt: request.submittedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    orgId: request.orgId,
    employeeId: request.employeeId,
    absenceTypeId: request.absenceTypeId,
    absenceType: {
      ...request.absenceType,
      compensationFactor: Number(request.absenceType.compensationFactor),
      balanceType: request.absenceType.balanceType ?? "VACATION",
    },
    approver: request.approver,
  }));
}

/**
 * Obtiene el historial de ajustes de balance de un empleado
 */
export async function getEmployeePtoAdjustments(employeeId: string, year?: number) {
  const user = await getCurrentUser();

  const currentYear = year ?? new Date().getFullYear();

  // Obtener el balance del año
  const balances = await prisma.ptoBalance.findMany({
    where: {
      employeeId,
      year: currentYear,
      orgId: user.orgId,
    },
    select: {
      id: true,
      balanceType: true,
    },
  });

  if (balances.length === 0) {
    return [];
  }

  const balanceIds = balances.map((balance) => balance.id);

  const adjustments = await prisma.ptoBalanceAdjustment.findMany({
    where: {
      ptoBalanceId: { in: balanceIds },
      orgId: user.orgId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      ptoBalance: {
        select: {
          balanceType: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Convertir Decimals a números y Dates a strings para el cliente
  return adjustments.map((adj) => ({
    id: adj.id,
    adjustmentType: adj.adjustmentType,
    daysAdjusted: Number(adj.daysAdjusted),
    reason: adj.reason,
    notes: adj.notes,
    createdAt: adj.createdAt.toISOString(),
    createdById: adj.createdById,
    orgId: adj.orgId,
    ptoBalanceId: adj.ptoBalanceId,
    balanceType: adj.ptoBalance.balanceType ?? "VACATION",
    createdBy: adj.createdBy,
  }));
}

/**
 * Obtiene la configuración de PTO de la organización
 */
export async function getOrganizationPtoConfig() {
  const user = await getCurrentUser();

  const organization = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { annualPtoDays: true },
  });

  let config = await prisma.organizationPtoConfig.findUnique({
    where: {
      orgId: user.orgId,
    },
  });

  // Si no existe, crear una con valores por defecto
  const createData = {
    orgId: user.orgId,
    maternityLeaveWeeks: 17,
    paternityLeaveWeeks: 17,
    seniorityRules: [],
    allowNegativeBalance: false,
    maxAdvanceRequestMonths: 12,
    carryoverMode: "NONE",
    carryoverDeadlineMonth: 1,
    carryoverDeadlineDay: 29,
    carryoverRequestDeadlineMonth: 1,
    carryoverRequestDeadlineDay: 29,
    vacationRoundingUnit: new Decimal(0.1),
    vacationRoundingMode: "NEAREST",
    personalMattersDays: new Decimal(0),
    compTimeDays: new Decimal(0),
  } as unknown as Prisma.OrganizationPtoConfigCreateInput;

  config =
    config ??
    (await prisma.organizationPtoConfig.create({
      data: createData,
    }));

  const normalizedConfig = config as typeof config & {
    carryoverMode?: "NONE" | "UNTIL_DATE" | "UNLIMITED" | null;
    carryoverDeadlineMonth?: number | null;
    carryoverDeadlineDay?: number | null;
    carryoverRequestDeadlineMonth?: number | null;
    carryoverRequestDeadlineDay?: number | null;
    vacationRoundingUnit?: Decimal | null;
    vacationRoundingMode?: "DOWN" | "NEAREST" | "UP" | null;
    personalMattersDays?: Decimal | null;
    compTimeDays?: Decimal | null;
  };

  const rawRoundingUnit = normalizedConfig.vacationRoundingUnit;
  const roundingUnit = rawRoundingUnit === null || rawRoundingUnit === undefined ? 0.1 : Number(rawRoundingUnit);
  const rawRoundingMode = normalizedConfig.vacationRoundingMode;
  const roundingMode = rawRoundingMode ?? "NEAREST";

  return {
    ...config,
    annualPtoDays: organization?.annualPtoDays ?? 0,
    carryoverMode: normalizedConfig.carryoverMode ?? "NONE",
    carryoverDeadlineMonth: normalizedConfig.carryoverDeadlineMonth ?? 1,
    carryoverDeadlineDay: normalizedConfig.carryoverDeadlineDay ?? 29,
    carryoverRequestDeadlineMonth: normalizedConfig.carryoverRequestDeadlineMonth ?? 1,
    carryoverRequestDeadlineDay: normalizedConfig.carryoverRequestDeadlineDay ?? 29,
    vacationRoundingUnit: roundingUnit,
    vacationRoundingMode: roundingMode,
    personalMattersDays: Number(normalizedConfig.personalMattersDays ?? 0),
    compTimeDays: Number(normalizedConfig.compTimeDays ?? 0),
  };
}

// ==================== AJUSTES DE BALANCE ====================

interface AdjustBalanceParams {
  employeeId: string;
  daysAdjusted: number; // Positivo = añadir, Negativo = quitar
  adjustmentType: PtoAdjustmentType;
  reason: string;
  notes?: string;
  year?: number;
  isRecurring?: boolean; // Si es recurrente, se aplicará cada año
  balanceType?: "VACATION" | "PERSONAL_MATTERS" | "COMP_TIME";
}

/**
 * Ajusta manualmente el balance de PTO de un empleado
 */
export async function adjustPtoBalance(params: AdjustBalanceParams) {
  const user = await requireHRAdmin();

  const {
    employeeId,
    daysAdjusted,
    adjustmentType,
    reason,
    notes,
    year,
    isRecurring = false,
    balanceType = "VACATION",
  } = params;

  if (!reason.trim()) {
    throw new Error("Debes proporcionar un motivo para el ajuste");
  }

  if (daysAdjusted === 0) {
    throw new Error("La cantidad de días ajustados no puede ser cero");
  }

  const currentYear = year ?? new Date().getFullYear();

  // Verificar que el empleado existe y pertenece a la organización
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      orgId: user.orgId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  // Si es recurrente, crear el ajuste recurrente
  let recurringAdjustment = null;
  if (isRecurring) {
    recurringAdjustment = await prisma.recurringPtoAdjustment.create({
      data: {
        employeeId,
        extraDays: new Decimal(daysAdjusted),
        adjustmentType,
        balanceType,
        reason,
        notes,
        startYear: currentYear,
        active: true,
        createdById: user.id,
        orgId: user.orgId,
      },
    });
  }

  // Obtener o crear el balance del año
  let balance = await prisma.ptoBalance.findFirst({
    where: {
      employeeId,
      year: currentYear,
      orgId: user.orgId,
      balanceType,
    },
  });

  if (!balance) {
    // Crear balance si no existe
    const contract = await prisma.employmentContract.findFirst({
      where: {
        employeeId,
        active: true,
      },
    });

    if (!contract) {
      throw new Error("El empleado no tiene un contrato activo");
    }

    balance = await prisma.ptoBalance.create({
      data: {
        employeeId,
        year: currentYear,
        orgId: user.orgId,
        balanceType,
        annualAllowance: new Decimal(0),
        daysUsed: new Decimal(0),
        daysPending: new Decimal(0),
        daysAvailable: new Decimal(0),
        contractStartDate: contract.startDate,
      },
    });
  }

  // Crear el ajuste puntual para auditoría del año actual
  const adjustment = await prisma.ptoBalanceAdjustment.create({
    data: {
      ptoBalanceId: balance.id,
      adjustmentType,
      daysAdjusted: new Decimal(daysAdjusted),
      reason: isRecurring ? `${reason} (recurrente desde ${currentYear})` : reason,
      notes,
      createdById: user.id,
      orgId: user.orgId,
    },
  });

  // Recalcular el balance
  await recalculatePtoBalance(employeeId, user.orgId, currentYear);

  // Notificar al empleado si tiene usuario
  if (employee.user) {
    const actionText = daysAdjusted > 0 ? "añadido" : "restado";
    const recurringText = isRecurring ? " (se aplicará automáticamente cada año)" : "";
    const balanceLabel =
      balanceType === "PERSONAL_MATTERS"
        ? "asuntos propios"
        : balanceType === "COMP_TIME"
          ? "compensación"
          : "vacaciones";

    await createNotification(
      employee.user.id,
      user.orgId,
      "SYSTEM_ANNOUNCEMENT",
      `Ajuste en tu balance de ${balanceLabel}`,
      `Se ha ${actionText} ${Math.abs(daysAdjusted)} día(s) a tu balance de ${balanceLabel}${recurringText}. Motivo: ${reason}`,
    );
  }

  const serializedAdjustment = {
    id: adjustment.id,
    adjustmentType: adjustment.adjustmentType,
    daysAdjusted: Number(adjustment.daysAdjusted),
    reason: adjustment.reason,
    notes: adjustment.notes,
    createdAt: adjustment.createdAt.toISOString(),
    createdById: adjustment.createdById,
    orgId: adjustment.orgId,
    ptoBalanceId: adjustment.ptoBalanceId,
  };

  const serializedRecurringAdjustment = recurringAdjustment
    ? {
        id: recurringAdjustment.id,
        extraDays: Number(recurringAdjustment.extraDays),
        adjustmentType: recurringAdjustment.adjustmentType,
        reason: recurringAdjustment.reason,
        notes: recurringAdjustment.notes,
        active: recurringAdjustment.active,
        startYear: recurringAdjustment.startYear,
        createdAt: recurringAdjustment.createdAt.toISOString(),
        createdById: recurringAdjustment.createdById,
        orgId: recurringAdjustment.orgId,
        employeeId: recurringAdjustment.employeeId,
      }
    : null;

  return {
    adjustment: serializedAdjustment,
    recurringAdjustment: serializedRecurringAdjustment,
  };
}

// ==================== AUSENCIAS MANUALES ====================

interface RegisterManualAbsenceParams {
  employeeId: string;
  absenceTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  notes?: string;
}

/**
 * Registra una ausencia manualmente (sin solicitud previa del empleado)
 */
export async function registerManualAbsence(params: RegisterManualAbsenceParams) {
  const user = await requireHRAdmin();

  const { employeeId, absenceTypeId, startDate, endDate, reason, notes } = params;
  const normalizedStartDate = normalizeDateToLocalNoon(startDate);
  const normalizedEndDate = normalizeDateToLocalNoon(endDate);

  // Verificar que las fechas son válidas
  if (normalizedStartDate > normalizedEndDate) {
    throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin");
  }

  // Verificar que el empleado existe
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      orgId: user.orgId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  // Verificar que el tipo de ausencia existe
  const absenceType = await prisma.absenceType.findFirst({
    where: {
      id: absenceTypeId,
      orgId: user.orgId,
      active: true,
    },
  });

  if (!absenceType) {
    throw new Error("Tipo de ausencia no válido");
  }

  // Calcular días hábiles
  const { workingDays } = await calculateWorkingDays(
    normalizedStartDate,
    normalizedEndDate,
    employeeId,
    user.orgId,
  );

  // Crear la solicitud directamente como APROBADA
  const ptoRequest = await prisma.ptoRequest.create({
    data: {
      employeeId,
      absenceTypeId,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      workingDays: new Decimal(workingDays),
      status: "APPROVED",
      reason: `${reason}${notes ? `\n\nNotas: ${notes}` : ""}`,
      approverId: user.id,
      approvedAt: new Date(),
      approverComments: "Registrada manualmente por RRHH",
      submittedAt: new Date(),
      orgId: user.orgId,
    },
  });

  // Si afecta al balance, recalcular
  if (absenceType.affectsBalance) {
    const currentYear = new Date().getFullYear();
    await recalculatePtoBalance(employeeId, user.orgId, currentYear);
  }

  // Notificar al empleado
  if (employee.user) {
    await createNotification(
      employee.user.id,
      user.orgId,
      "PTO_APPROVED",
      "Ausencia registrada",
      `Se ha registrado una ausencia: ${absenceType.name} del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()} (${workingDays} días hábiles)`,
      ptoRequest.id,
    );
  }

  return ptoRequest;
}

// ==================== BAJAS MATERNAL/PATERNAL ====================

interface MaternityPaternityParams {
  employeeId: string;
  type: "MATERNITY" | "PATERNITY";
  startDate: Date;
  notes?: string;
}

/**
 * Registra una baja maternal o paternal
 */
export async function applyMaternityPaternityLeave(params: MaternityPaternityParams) {
  const user = await requireHRAdmin();

  const { employeeId, type, startDate, notes } = params;

  // Obtener configuración de la organización
  const config = await getOrganizationPtoConfig();

  const weeks = type === "MATERNITY" ? config.maternityLeaveWeeks : config.paternityLeaveWeeks;

  // Calcular fecha de fin (startDate + weeks)
  const endDate = addWeeks(startDate, weeks);

  // Buscar el tipo de ausencia correspondiente
  const absenceTypeCode = type === "MATERNITY" ? "MATERNITY_LEAVE" : "PATERNITY_LEAVE";

  let absenceType = await prisma.absenceType.findFirst({
    where: {
      code: absenceTypeCode,
      orgId: user.orgId,
      active: true,
    },
  });

  // Si no existe, crearlo
  absenceType =
    absenceType ??
    (await prisma.absenceType.create({
      data: {
        name: type === "MATERNITY" ? "Baja Maternal" : "Baja Paternal",
        code: absenceTypeCode,
        description: `Baja por ${type === "MATERNITY" ? "maternidad" : "paternidad"} (${weeks} semanas)`,
        color: type === "MATERNITY" ? "#ec4899" : "#3b82f6",
        isPaid: true,
        requiresApproval: false,
        affectsBalance: false,
        orgId: user.orgId,
      },
    }));

  // Registrar la ausencia
  const result = await registerManualAbsence({
    employeeId,
    absenceTypeId: absenceType.id,
    startDate,
    endDate,
    reason: `Baja ${type === "MATERNITY" ? "maternal" : "paternal"} (${weeks} semanas según legislación)`,
    notes,
  });

  // Crear ajuste en el historial para auditoría
  const currentYear = new Date().getFullYear();
  const balance = await prisma.ptoBalance.findFirst({
    where: {
      employeeId,
      year: currentYear,
      orgId: user.orgId,
      balanceType: "VACATION",
    },
  });

  if (balance) {
    await prisma.ptoBalanceAdjustment.create({
      data: {
        ptoBalanceId: balance.id,
        adjustmentType: type === "MATERNITY" ? "MATERNITY_LEAVE" : "PATERNITY_LEAVE",
        daysAdjusted: new Decimal(0), // No afecta balance
        reason: `Baja ${type === "MATERNITY" ? "maternal" : "paternal"} registrada`,
        notes: `${weeks} semanas desde ${startDate.toLocaleDateString()} hasta ${endDate.toLocaleDateString()}`,
        createdById: user.id,
        orgId: user.orgId,
      },
    });
  }

  return result;
}

// ==================== DÍAS POR ANTIGÜEDAD ====================

interface SeniorityRule {
  yearsFrom: number;
  yearsTo: number | null;
  extraDays: number;
}

/**
 * Calcula y aplica días adicionales por antigüedad
 */
export async function applySeniorityBonus(employeeId: string) {
  const user = await requireHRAdmin();

  // Obtener empleado y su contrato más antiguo
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      orgId: user.orgId,
    },
    include: {
      employmentContracts: {
        where: { active: true },
        orderBy: { startDate: "asc" },
        take: 1,
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!employee || !employee.employmentContracts[0]) {
    throw new Error("Empleado o contrato no encontrado");
  }

  const contract = employee.employmentContracts[0];

  // Calcular años de antigüedad
  const yearsWorked = Math.floor(
    (new Date().getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );

  // Obtener reglas de antigüedad
  const config = await getOrganizationPtoConfig();
  const rules = config.seniorityRules as SeniorityRule[];

  if (!rules || rules.length === 0) {
    throw new Error("No hay reglas de antigüedad configuradas");
  }

  // Encontrar la regla aplicable
  const applicableRule = rules.find((rule) => {
    if (rule.yearsTo === null) {
      return yearsWorked >= rule.yearsFrom;
    }
    return yearsWorked >= rule.yearsFrom && yearsWorked < rule.yearsTo;
  });

  if (!applicableRule) {
    throw new Error(`No hay días adicionales para ${yearsWorked} años de antigüedad`);
  }

  // Aplicar ajuste
  const adjustment = await adjustPtoBalance({
    employeeId,
    daysAdjusted: applicableRule.extraDays,
    adjustmentType: "SENIORITY_BONUS",
    reason: `Días por antigüedad: ${yearsWorked} años trabajados`,
    notes: `Regla aplicada: ${applicableRule.yearsFrom}-${applicableRule.yearsTo ?? "+"} años = ${applicableRule.extraDays} días`,
  });

  return {
    yearsWorked,
    extraDays: applicableRule.extraDays,
    adjustment,
  };
}

// ==================== CONFIGURACIÓN ====================

interface UpdatePtoConfigParams {
  maternityLeaveWeeks?: number;
  paternityLeaveWeeks?: number;
  seniorityRules?: SeniorityRule[];
  allowNegativeBalance?: boolean;
  maxAdvanceRequestMonths?: number;
  annualPtoDays?: number;
  carryoverMode?: "NONE" | "UNTIL_DATE" | "UNLIMITED";
  carryoverDeadlineMonth?: number;
  carryoverDeadlineDay?: number;
  carryoverRequestDeadlineMonth?: number;
  carryoverRequestDeadlineDay?: number;
  vacationRoundingUnit?: number;
  vacationRoundingMode?: "DOWN" | "NEAREST" | "UP";
  personalMattersDays?: number;
  compTimeDays?: number;
}

/**
 * Actualiza la configuración de PTO de la organización
 */
export async function updateOrganizationPtoConfig(params: UpdatePtoConfigParams) {
  const user = await requireHRAdmin();
  const updateData: UpdatePtoConfigParams = { ...params };
  const annualPtoDays = params.annualPtoDays;

  if (updateData.annualPtoDays !== undefined) {
    delete updateData.annualPtoDays;
  }

  if (annualPtoDays !== undefined) {
    const normalizedAnnualPtoDays = Math.min(Math.max(annualPtoDays, 0), 60);
    await prisma.organization.update({
      where: { id: user.orgId },
      data: { annualPtoDays: normalizedAnnualPtoDays },
    });
  }

  if (params.carryoverDeadlineMonth !== undefined) {
    updateData.carryoverDeadlineMonth = Math.min(Math.max(params.carryoverDeadlineMonth, 1), 12);
  }

  if (params.carryoverDeadlineDay !== undefined) {
    updateData.carryoverDeadlineDay = Math.min(Math.max(params.carryoverDeadlineDay, 1), 31);
  }

  if (params.carryoverRequestDeadlineMonth !== undefined) {
    updateData.carryoverRequestDeadlineMonth = Math.min(Math.max(params.carryoverRequestDeadlineMonth, 1), 12);
  }

  if (params.carryoverRequestDeadlineDay !== undefined) {
    updateData.carryoverRequestDeadlineDay = Math.min(Math.max(params.carryoverRequestDeadlineDay, 1), 31);
  }

  if (params.personalMattersDays !== undefined) {
    updateData.personalMattersDays = new Decimal(params.personalMattersDays);
  }

  if (params.compTimeDays !== undefined) {
    updateData.compTimeDays = new Decimal(params.compTimeDays);
  }

  if (params.vacationRoundingUnit !== undefined) {
    const normalizedUnit = Math.min(Math.max(params.vacationRoundingUnit, 0.1), 1);
    updateData.vacationRoundingUnit = new Decimal(normalizedUnit);
  }

  if (params.vacationRoundingMode !== undefined) {
    updateData.vacationRoundingMode = params.vacationRoundingMode;
  }

  const config = await prisma.organizationPtoConfig.upsert({
    where: {
      orgId: user.orgId,
    },
    update: updateData as unknown as Prisma.OrganizationPtoConfigUpdateInput,
    create: {
      orgId: user.orgId,
      maternityLeaveWeeks: params.maternityLeaveWeeks ?? 17,
      paternityLeaveWeeks: params.paternityLeaveWeeks ?? 17,
      seniorityRules: params.seniorityRules ?? [],
      allowNegativeBalance: params.allowNegativeBalance ?? false,
      maxAdvanceRequestMonths: params.maxAdvanceRequestMonths ?? 12,
      carryoverMode: params.carryoverMode ?? "NONE",
      carryoverDeadlineMonth: params.carryoverDeadlineMonth ?? 1,
      carryoverDeadlineDay: params.carryoverDeadlineDay ?? 29,
      carryoverRequestDeadlineMonth: params.carryoverRequestDeadlineMonth ?? 1,
      carryoverRequestDeadlineDay: params.carryoverRequestDeadlineDay ?? 29,
      vacationRoundingUnit: new Decimal(params.vacationRoundingUnit ?? 0.1),
      vacationRoundingMode: params.vacationRoundingMode ?? "NEAREST",
      personalMattersDays: new Decimal(params.personalMattersDays ?? 0),
      compTimeDays: new Decimal(params.compTimeDays ?? 0),
    } as unknown as Prisma.OrganizationPtoConfigCreateInput,
  });

  const organization = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { annualPtoDays: true },
  });

  return {
    ...config,
    annualPtoDays: organization?.annualPtoDays ?? 0,
    vacationRoundingUnit: Number(config.vacationRoundingUnit ?? 0.1),
    vacationRoundingMode: config.vacationRoundingMode ?? "NEAREST",
    personalMattersDays: Number(config.personalMattersDays ?? 0),
    compTimeDays: Number(config.compTimeDays ?? 0),
  };
}

// ==================== AJUSTES RECURRENTES ====================

/**
 * Obtiene los ajustes recurrentes activos de un empleado
 */
export async function getRecurringAdjustments(employeeId: string) {
  const user = await getCurrentUser();

  const adjustments = await prisma.recurringPtoAdjustment.findMany({
    where: {
      employeeId,
      orgId: user.orgId,
      active: true,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      startYear: "desc",
    },
  });

  // Convertir Decimals a números y Dates a strings para el cliente
  return adjustments.map((adj) => ({
    id: adj.id,
    extraDays: Number(adj.extraDays),
    adjustmentType: adj.adjustmentType,
    balanceType: adj.balanceType ?? "VACATION",
    reason: adj.reason,
    notes: adj.notes,
    active: adj.active,
    startYear: adj.startYear,
    createdAt: adj.createdAt.toISOString(),
    createdById: adj.createdById,
    orgId: adj.orgId,
    employeeId: adj.employeeId,
    createdBy: adj.createdBy,
  }));
}

/**
 * Desactiva un ajuste recurrente
 */
export async function deactivateRecurringAdjustment(adjustmentId: string) {
  const user = await requireHRAdmin();

  // Verificar que el ajuste existe y pertenece a la organización
  const adjustment = await prisma.recurringPtoAdjustment.findFirst({
    where: {
      id: adjustmentId,
      orgId: user.orgId,
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!adjustment) {
    throw new Error("Ajuste recurrente no encontrado");
  }

  // Desactivar el ajuste
  await prisma.recurringPtoAdjustment.update({
    where: { id: adjustmentId },
    data: { active: false },
  });

  // Recalcular el balance del año actual
  const currentYear = new Date().getFullYear();
  await recalculatePtoBalance(adjustment.employee.id, user.orgId, currentYear);

  return adjustment;
}

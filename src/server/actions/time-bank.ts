"use server";

import {
  Prisma,
  TimeBankApprovalFlow,
  TimeBankMovementOrigin,
  TimeBankMovementStatus,
  TimeBankMovementType,
  TimeBankRequestStatus,
  TimeBankRequestType,
  type TimeBankMovement,
  type TimeBankRequest,
  type TimeBankSettings,
  type WorkdaySummary,
} from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

import { resolveApproverUsers } from "@/lib/approvals/approval-engine";
import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";
import { getAuthenticatedEmployee, getAuthenticatedUser } from "./shared/get-authenticated-employee";

/**
 * Valores por defecto para la configuración de bolsa de horas.
 * Estos valores están pensados para un uso "razonable generalista",
 * pero pueden adaptarse por organización desde Settings > Bolsa de Horas.
 */
const DEFAULT_TIME_BANK_SETTINGS = {
  maxPositiveMinutes: 4800, // 80h - Límite máximo de horas acumuladas
  maxNegativeMinutes: 480, // 8h - Límite máximo de déficit
  dailyExcessLimitMinutes: 120, // 2h - Alerta si exceso diario > este valor
  dailyDeficitLimitMinutes: 60, // 1h - Alerta si déficit diario > este valor
  roundingIncrementMinutes: 5, // Redondea diferencias a múltiplos de 5 min
  deficitGraceMinutes: 10, // Margen de déficit: si trabajo ≤10 min menos, no penaliza
  excessGraceMinutes: 15, // Margen de exceso: si trabajo ≤15 min más, no acumula
  holidayCompensationFactor: 1.5,
  allowFlexibleWindows: true,
  requireOvertimeAuthorization: true,
  autoCloseMissingClockOut: true,
  allowCashConversion: false,
  approvalFlow: "MIRROR_PTO" as TimeBankApprovalFlow,
} as const;

type NormalizedTimeBankSettings = {
  orgId: string;
  maxPositiveMinutes: number;
  maxNegativeMinutes: number;
  dailyExcessLimitMinutes: number;
  dailyDeficitLimitMinutes: number;
  roundingIncrementMinutes: number;
  deficitGraceMinutes: number;
  excessGraceMinutes: number;
  holidayCompensationFactor: number;
  allowFlexibleWindows: boolean;
  requireOvertimeAuthorization: boolean;
  autoCloseMissingClockOut: boolean;
  allowCashConversion: boolean;
  approvalFlow: TimeBankApprovalFlow;
};

function decimalToNumber(value?: Prisma.Decimal | number | null): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value);
}

function normalizeSettings(orgId: string, settings?: TimeBankSettings | null): NormalizedTimeBankSettings {
  return {
    orgId,
    maxPositiveMinutes: settings?.maxPositiveMinutes ?? DEFAULT_TIME_BANK_SETTINGS.maxPositiveMinutes,
    maxNegativeMinutes: settings?.maxNegativeMinutes ?? DEFAULT_TIME_BANK_SETTINGS.maxNegativeMinutes,
    dailyExcessLimitMinutes: settings?.dailyExcessLimitMinutes ?? DEFAULT_TIME_BANK_SETTINGS.dailyExcessLimitMinutes,
    dailyDeficitLimitMinutes: settings?.dailyDeficitLimitMinutes ?? DEFAULT_TIME_BANK_SETTINGS.dailyDeficitLimitMinutes,
    roundingIncrementMinutes: settings?.roundingIncrementMinutes ?? DEFAULT_TIME_BANK_SETTINGS.roundingIncrementMinutes,
    deficitGraceMinutes: settings?.deficitGraceMinutes ?? DEFAULT_TIME_BANK_SETTINGS.deficitGraceMinutes,
    excessGraceMinutes: settings?.excessGraceMinutes ?? DEFAULT_TIME_BANK_SETTINGS.excessGraceMinutes,
    holidayCompensationFactor:
      settings?.holidayCompensationFactor !== undefined
        ? Number(settings.holidayCompensationFactor)
        : DEFAULT_TIME_BANK_SETTINGS.holidayCompensationFactor,
    allowFlexibleWindows: settings?.allowFlexibleWindows ?? DEFAULT_TIME_BANK_SETTINGS.allowFlexibleWindows,
    requireOvertimeAuthorization:
      settings?.requireOvertimeAuthorization ?? DEFAULT_TIME_BANK_SETTINGS.requireOvertimeAuthorization,
    autoCloseMissingClockOut: settings?.autoCloseMissingClockOut ?? DEFAULT_TIME_BANK_SETTINGS.autoCloseMissingClockOut,
    allowCashConversion: settings?.allowCashConversion ?? DEFAULT_TIME_BANK_SETTINGS.allowCashConversion,
    approvalFlow: settings?.approvalFlow ?? DEFAULT_TIME_BANK_SETTINGS.approvalFlow,
  };
}

export async function getTimeBankSettingsForOrg(orgId: string): Promise<NormalizedTimeBankSettings> {
  const settings = await prisma.timeBankSettings.findUnique({
    where: { orgId },
  });

  return normalizeSettings(orgId, settings);
}

/**
 * Normaliza el valor de desviación aplicando:
 * 1. Redondeo al incremento configurado
 * 2. Márgenes de gracia según el signo (exceso vs déficit)
 */
function normalizeDeviationValue(value: number, settings: NormalizedTimeBankSettings): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  // PASO 1: Redondear al incremento configurado
  const increment = Math.max(1, settings.roundingIncrementMinutes);
  const rounded = Math.round(value / increment) * increment;

  // PASO 2: Aplicar márgenes según el signo
  if (rounded > 0 && rounded < settings.excessGraceMinutes) {
    // Exceso pequeño: no acumula en bolsa de horas
    return 0;
  }
  if (rounded < 0 && Math.abs(rounded) < settings.deficitGraceMinutes) {
    // Déficit pequeño: no penaliza
    return 0;
  }

  return Math.trunc(rounded);
}

export async function removeAutoTimeBankMovement(
  orgId: string,
  employeeId: string,
  date: Date,
  workdayId?: string | null,
) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const whereClause: Prisma.TimeBankMovementWhereInput = {
    orgId,
    employeeId,
    origin: TimeBankMovementOrigin.AUTO_DAILY,
  };

  if (workdayId) {
    whereClause.workdayId = workdayId;
  } else {
    whereClause.date = {
      gte: dayStart,
      lte: dayEnd,
    };
  }

  await prisma.timeBankMovement.deleteMany({
    where: whereClause,
  });
}

type WorkdayForSync = Pick<WorkdaySummary, "id" | "orgId" | "employeeId" | "date" | "totalWorkedMinutes"> & {
  expectedMinutes?: Prisma.Decimal | number | null;
  deviationMinutes?: Prisma.Decimal | number | null;
};

export async function syncTimeBankForWorkday(workday: WorkdayForSync) {
  const hasExpected = workday.expectedMinutes !== null && workday.expectedMinutes !== undefined;

  if (!hasExpected) {
    await removeAutoTimeBankMovement(workday.orgId, workday.employeeId, workday.date, workday.id);
    return null;
  }

  const deviation = (() => {
    if (workday.deviationMinutes !== null && workday.deviationMinutes !== undefined) {
      return decimalToNumber(workday.deviationMinutes);
    }

    const expected = decimalToNumber(workday.expectedMinutes);
    const worked = decimalToNumber(workday.totalWorkedMinutes);
    return worked - expected;
  })();

  const settings = await getTimeBankSettingsForOrg(workday.orgId);
  const normalizedMinutes = normalizeDeviationValue(deviation, settings);

  const existingMovement = await prisma.timeBankMovement.findFirst({
    where: {
      orgId: workday.orgId,
      employeeId: workday.employeeId,
      workdayId: workday.id,
      origin: TimeBankMovementOrigin.AUTO_DAILY,
    },
  });

  if (normalizedMinutes === 0) {
    if (existingMovement) {
      await prisma.timeBankMovement.delete({
        where: { id: existingMovement.id },
      });
    }

    return null;
  }

  const movementType = normalizedMinutes >= 0 ? TimeBankMovementType.EXTRA : TimeBankMovementType.DEFICIT;
  const dayDate = startOfDay(workday.date);

  if (existingMovement) {
    if (existingMovement.minutes === normalizedMinutes) {
      return existingMovement;
    }

    return prisma.timeBankMovement.update({
      where: { id: existingMovement.id },
      data: {
        minutes: normalizedMinutes,
        date: dayDate,
        type: movementType,
        status: TimeBankMovementStatus.SETTLED,
        description: "Ajuste automático según resumen diario",
      },
    });
  }

  return prisma.timeBankMovement.create({
    data: {
      orgId: workday.orgId,
      employeeId: workday.employeeId,
      workdayId: workday.id,
      date: dayDate,
      minutes: normalizedMinutes,
      type: movementType,
      origin: TimeBankMovementOrigin.AUTO_DAILY,
      status: TimeBankMovementStatus.SETTLED,
      requiresApproval: false,
      description: "Diferencia diaria automática",
    },
  });
}

export interface TimeBankSummaryResponse {
  totalMinutes: number;
  totalHours: number;
  todaysMinutes: number;
  pendingRequests: number;
  breakdown: Array<{ type: TimeBankMovementType; minutes: number }>;
  lastMovements: Array<
    Pick<TimeBankMovement, "id" | "date" | "minutes" | "type" | "origin" | "description" | "status">
  >;
  limits: {
    maxPositiveMinutes: number;
    maxNegativeMinutes: number;
  };
}

export async function getEmployeeTimeBankSummary(employeeId: string, orgId: string): Promise<TimeBankSummaryResponse> {
  const [settings, aggregate, grouped, lastMovements, todayMovement, pendingRequests] = await Promise.all([
    getTimeBankSettingsForOrg(orgId),
    prisma.timeBankMovement.aggregate({
      where: {
        orgId,
        employeeId,
      },
      _sum: {
        minutes: true,
      },
    }),
    prisma.timeBankMovement.groupBy({
      by: ["type"],
      where: {
        orgId,
        employeeId,
      },
      _sum: {
        minutes: true,
      },
    }),
    prisma.timeBankMovement.findMany({
      where: {
        orgId,
        employeeId,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.timeBankMovement.findFirst({
      where: {
        orgId,
        employeeId,
        origin: TimeBankMovementOrigin.AUTO_DAILY,
        date: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
    }),
    prisma.timeBankRequest.count({
      where: {
        orgId,
        employeeId,
        status: "PENDING",
      },
    }),
  ]);

  // eslint-disable-next-line no-underscore-dangle
  const totalMinutes = aggregate._sum.minutes ?? 0;

  return {
    totalMinutes,
    totalHours: totalMinutes / 60,
    todaysMinutes: todayMovement?.minutes ?? 0,
    pendingRequests,
    // eslint-disable-next-line no-underscore-dangle
    breakdown: grouped.map((entry) => ({ type: entry.type, minutes: entry._sum.minutes ?? 0 })),
    lastMovements: lastMovements.map((movement) => ({
      id: movement.id,
      date: movement.date,
      minutes: movement.minutes,
      type: movement.type,
      origin: movement.origin,
      description: movement.description,
      status: movement.status,
    })),
    limits: {
      maxPositiveMinutes: settings.maxPositiveMinutes,
      maxNegativeMinutes: settings.maxNegativeMinutes,
    },
  };
}

export async function getMyTimeBankSummary(): Promise<TimeBankSummaryResponse> {
  const { employeeId, orgId } = await getAuthenticatedEmployee();
  return getEmployeeTimeBankSummary(employeeId, orgId);
}

// ============================================================================ //
// Solicitudes de Bolsa de Horas (Empleado)
// ============================================================================ //

export type TimeBankRequestTotals = {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
};

export interface TimeBankRequestListResult {
  requests: TimeBankRequest[];
  totals: TimeBankRequestTotals;
}

function normalizeRequestDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function ensurePositiveMinutes(minutes: number): number {
  const normalized = Math.round(Math.abs(minutes));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("Los minutos solicitados deben ser mayores que 0");
  }
  return normalized;
}

function ensureReviewerRole(role: string) {
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "MANAGER"].includes(role)) {
    throw new Error("No tienes permisos para revisar solicitudes de bolsa de horas");
  }
}

function getMovementTypeForRequest(requestType: TimeBankRequestType): TimeBankMovementType {
  switch (requestType) {
    case "RECOVERY":
      return TimeBankMovementType.RECOVERY;
    case "FESTIVE_COMPENSATION":
      return TimeBankMovementType.FESTIVE;
    default:
      return TimeBankMovementType.ADJUSTMENT;
  }
}

function getMovementMinutesForRequest(requestType: TimeBankRequestType, requestedMinutes: number): number {
  if (requestType === "RECOVERY") {
    return requestedMinutes * -1; // Recuperar horas => restar saldo
  }
  return requestedMinutes;
}

async function applyApprovedRequestMovement(
  tx: Prisma.TransactionClient,
  request: TimeBankRequest,
  actorUserId: string | null,
) {
  await tx.timeBankMovement.upsert({
    where: {
      requestId: request.id,
    },
    create: {
      orgId: request.orgId,
      employeeId: request.employeeId,
      requestId: request.id,
      date: normalizeRequestDate(request.date),
      minutes: getMovementMinutesForRequest(request.type, request.requestedMinutes),
      type: getMovementTypeForRequest(request.type),
      origin: TimeBankMovementOrigin.EMPLOYEE_REQUEST,
      status: TimeBankMovementStatus.APPROVED,
      requiresApproval: false,
      description: request.reason ?? "Solicitud aprobada",
      createdById: actorUserId ?? undefined,
      approvedById: actorUserId ?? undefined,
      approvedAt: new Date(),
    },
    update: {
      minutes: getMovementMinutesForRequest(request.type, request.requestedMinutes),
      type: getMovementTypeForRequest(request.type),
      status: TimeBankMovementStatus.APPROVED,
      approvedById: actorUserId ?? undefined,
      approvedAt: new Date(),
    },
  });
}

async function getRequestTotals(orgId: string, employeeId: string) {
  const [pending, approved, rejected, cancelled] = await Promise.all([
    prisma.timeBankRequest.count({ where: { orgId, employeeId, status: "PENDING" } }),
    prisma.timeBankRequest.count({ where: { orgId, employeeId, status: "APPROVED" } }),
    prisma.timeBankRequest.count({ where: { orgId, employeeId, status: "REJECTED" } }),
    prisma.timeBankRequest.count({ where: { orgId, employeeId, status: "CANCELLED" } }),
  ]);

  return { pending, approved, rejected, cancelled };
}

export async function getMyTimeBankRequests(status?: TimeBankRequestStatus): Promise<TimeBankRequestListResult> {
  const { employeeId, orgId } = await getAuthenticatedEmployee();

  const [requests, totals] = await Promise.all([
    prisma.timeBankRequest.findMany({
      where: {
        orgId,
        employeeId,
        ...(status ? { status } : {}),
      },
      orderBy: {
        submittedAt: "desc",
      },
    }),
    getRequestTotals(orgId, employeeId),
  ]);

  return { requests, totals };
}

interface CreateTimeBankRequestInput {
  type: TimeBankRequestType;
  date: Date;
  minutes: number;
  reason?: string;
}

export async function createTimeBankRequest(input: CreateTimeBankRequestInput) {
  const { employeeId, orgId, employee } = await getAuthenticatedEmployee({
    employeeInclude: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  const normalizedDate = normalizeRequestDate(new Date(input.date));
  const requestedMinutes = ensurePositiveMinutes(input.minutes);

  if (input.type === "RECOVERY") {
    const summary = await getEmployeeTimeBankSummary(employeeId, orgId);
    if (summary.totalMinutes < requestedMinutes) {
      throw new Error("No tienes saldo suficiente en la bolsa de horas");
    }
  }

  const pendingRequest = await prisma.timeBankRequest.findFirst({
    where: {
      orgId,
      employeeId,
      date: normalizedDate,
      status: "PENDING",
    },
  });

  if (pendingRequest) {
    throw new Error("Ya tienes una solicitud pendiente para esa fecha");
  }

  const approverUsers = await resolveApproverUsers(employeeId, orgId);
  const approverIds = approverUsers.map((a) => a.userId);
  const reviewerId: string | null = approverIds[0] ?? null;
  const requiresApproval = approverIds.length > 0;
  const now = new Date();

  const requestWithEmployee = await prisma.$transaction(async (tx) => {
    const created = await tx.timeBankRequest.create({
      data: {
        orgId,
        employeeId,
        type: input.type,
        date: normalizedDate,
        requestedMinutes,
        reason: input.reason?.trim() ?? null,
        status: requiresApproval ? "PENDING" : "APPROVED",
        reviewerId: requiresApproval ? reviewerId : null,
        submittedAt: now,
        approvedAt: requiresApproval ? null : now,
        processedAt: requiresApproval ? null : now,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!requiresApproval) {
      await applyApprovedRequestMovement(tx, created, created.employee.user?.id ?? null);
    }

    return created;
  });

  if (approverIds.length > 0) {
    const requesterName = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "El empleado";
    const hours = requestedMinutes / 60;
    const message =
      `${requesterName} ha solicitado ${hours}h (${input.type === "RECOVERY" ? "recuperación" : "compensación"})` +
      (requiresApproval ? "" : " (aprobada automáticamente)");

    for (const recipientId of approverIds) {
      await createNotification(
        recipientId,
        orgId,
        "TIME_BANK_REQUEST_SUBMITTED",
        "Nueva solicitud de Bolsa de Horas",
        message,
        undefined,
        undefined,
      );
    }
  }

  if (!requiresApproval && requestWithEmployee.employee.user?.id) {
    const hours = requestedMinutes / 60;
    await createNotification(
      requestWithEmployee.employee.user.id,
      orgId,
      "TIME_BANK_REQUEST_APPROVED",
      "Solicitud de Bolsa aprobada",
      `Tu solicitud de ${hours}h (${input.type === "RECOVERY" ? "recuperación" : "compensación"}) se aprobó automáticamente.`,
      undefined,
      undefined,
    );
  }

  const { employee: _employeeInfo, ...plainRequest } = requestWithEmployee as typeof requestWithEmployee & {
    employee: any;
  };

  return plainRequest as TimeBankRequest;
}

export async function cancelTimeBankRequest(requestId: string) {
  const { employeeId, orgId } = await getAuthenticatedEmployee();

  const request = await prisma.timeBankRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.orgId !== orgId || request.employeeId !== employeeId) {
    throw new Error("Solicitud no encontrada");
  }

  if (request.status !== "PENDING") {
    throw new Error("Solo puedes cancelar solicitudes pendientes");
  }

  await prisma.timeBankRequest.update({
    where: { id: requestId },
    data: {
      status: "CANCELLED",
      updatedAt: new Date(),
    },
  });
}

// ============================================================================ //
// Solicitudes de Bolsa de Horas (RRHH / Managers)
// ============================================================================ //

export interface TimeBankRequestWithEmployee extends TimeBankRequest {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string | null;
  };
}

export async function getTimeBankRequestsForReview(
  status: TimeBankRequestStatus = "PENDING",
): Promise<TimeBankRequestWithEmployee[]> {
  const { orgId, role } = await getAuthenticatedUser();
  ensureReviewerRole(role);

  const requests = await prisma.timeBankRequest.findMany({
    where: {
      orgId,
      ...(status ? { status } : {}),
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  return requests;
}

interface ReviewTimeBankRequestInput {
  requestId: string;
  action: "APPROVE" | "REJECT";
  reviewerComments?: string;
}

// ============================================================================ //
// Estadísticas para RRHH
// ============================================================================ //

export interface TimeBankEmployeeSummary {
  employeeId: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  totalMinutes: number;
  pendingRequests: number;
}

export interface TimeBankAdminStats {
  totalEmployeesWithBalance: number;
  totalPositiveMinutes: number;
  totalNegativeMinutes: number;
  pendingRequestsCount: number;
  employeeSummaries: TimeBankEmployeeSummary[];
}

export async function getTimeBankAdminStats(): Promise<TimeBankAdminStats> {
  const { orgId, role } = await getAuthenticatedUser();
  ensureReviewerRole(role);

  // Obtener todos los empleados con saldo en la bolsa de horas
  const employeesWithBalance = await prisma.timeBankMovement.groupBy({
    by: ["employeeId"],
    where: { orgId },
    _sum: { minutes: true },
  });

  const employeeIds = employeesWithBalance.map((e) => e.employeeId);

  // Obtener datos de empleados
  const employees = await prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
      orgId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeNumber: true,
    },
  });

  // Obtener solicitudes pendientes por empleado
  const pendingByEmployee = await prisma.timeBankRequest.groupBy({
    by: ["employeeId"],
    where: {
      orgId,
      employeeId: { in: employeeIds },
      status: "PENDING",
    },
    _count: true,
  });

  const pendingMap = new Map(pendingByEmployee.map((p) => [p.employeeId, p._count]));
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  // Calcular totales
  let totalPositiveMinutes = 0;
  let totalNegativeMinutes = 0;

  const employeeSummaries: TimeBankEmployeeSummary[] = employeesWithBalance
    .map((eb) => {
      const emp = employeeMap.get(eb.employeeId);
      // eslint-disable-next-line no-underscore-dangle
      const totalMinutes = eb._sum.minutes ?? 0;

      if (totalMinutes >= 0) {
        totalPositiveMinutes += totalMinutes;
      } else {
        totalNegativeMinutes += Math.abs(totalMinutes);
      }

      return {
        employeeId: eb.employeeId,
        employeeNumber: emp?.employeeNumber ?? null,
        firstName: emp?.firstName ?? "Desconocido",
        lastName: emp?.lastName ?? "",
        totalMinutes,
        pendingRequests: pendingMap.get(eb.employeeId) ?? 0,
      };
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  // Contar total de solicitudes pendientes
  const pendingRequestsCount = await prisma.timeBankRequest.count({
    where: {
      orgId,
      status: "PENDING",
    },
  });

  return {
    totalEmployeesWithBalance: employeeSummaries.length,
    totalPositiveMinutes,
    totalNegativeMinutes,
    pendingRequestsCount,
    employeeSummaries,
  };
}

export async function reviewTimeBankRequest(input: ReviewTimeBankRequestInput) {
  const { orgId, role, userId } = await getAuthenticatedUser();
  ensureReviewerRole(role);

  const request = await prisma.timeBankRequest.findUnique({
    where: { id: input.requestId },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!request || request.orgId !== orgId) {
    throw new Error("Solicitud no encontrada");
  }

  if (request.status !== "PENDING") {
    throw new Error("La solicitud ya fue procesada");
  }

  if (input.action === "REJECT") {
    await prisma.timeBankRequest.update({
      where: { id: input.requestId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        processedAt: new Date(),
        reviewerId: userId,
        processedById: userId,
        metadata: input.reviewerComments ? { reviewerComments: input.reviewerComments } : Prisma.JsonNull,
      },
    });

    const employeeUserId = request.employee?.user?.id;
    if (employeeUserId) {
      const hours = request.requestedMinutes / 60;
      const reasonSuffix = input.reviewerComments ? ` Motivo: ${input.reviewerComments}` : "";
      await createNotification(
        employeeUserId,
        orgId,
        "TIME_BANK_REQUEST_REJECTED",
        "Solicitud de Bolsa rechazada",
        `Tu solicitud de ${hours}h fue rechazada.${reasonSuffix}`,
        undefined,
        undefined,
      );
    }

    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.timeBankRequest.update({
      where: { id: input.requestId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        processedAt: new Date(),
        reviewerId: userId,
        processedById: userId,
        metadata: input.reviewerComments ? { reviewerComments: input.reviewerComments } : Prisma.JsonNull,
      },
    });

    await applyApprovedRequestMovement(tx, request, userId);
  });

  const employeeUserId = request.employee?.user?.id;
  if (employeeUserId) {
    const hours = request.requestedMinutes / 60;
    await createNotification(
      employeeUserId,
      orgId,
      "TIME_BANK_REQUEST_APPROVED",
      "Solicitud de Bolsa aprobada",
      `Tu solicitud de ${hours}h fue aprobada.`,
      undefined,
      undefined,
    );
  }
}

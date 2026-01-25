"use server";

import type {
  Prisma,
  TimeBankMovement,
  TimeBankSettings,
  OvertimeCalculationMode,
  OvertimeApprovalMode,
  OvertimeCompensationType,
  OvertimeNonWorkingDayPolicy,
  OvertimeCandidateStatus,
  OvertimeCandidateType,
  OvertimeCalcStatus,
} from "@prisma/client";
import { addDays } from "date-fns";

import { resolveApproverUsers } from "@/lib/approvals/approval-engine";
import { prisma } from "@/lib/prisma";
import {
  formatUtcDateKey,
  getLocalDayAnchor,
  getLocalDayStartUtc,
  getLocalDayStartUtcFromDateKey,
  resolveTimeZone,
} from "@/lib/timezone-utils";
import { ensureAlertAssignments } from "@/services/alerts/alert-assignments";
import { getEffectiveSchedule } from "@/services/schedules/schedule-engine";

import { createNotification } from "../actions/notifications";

import { enqueueOvertimeWorkdayJob } from "./overtime-queue";

type OvertimePolicy = {
  calculationMode: OvertimeCalculationMode;
  approvalMode: OvertimeApprovalMode;
  compensationType: OvertimeCompensationType;
  toleranceMinutes: number;
  dailyLimitMinutes: number;
  weeklyLimitMinutes: number;
  monthlyLimitMinutes: number;
  annualLimitMinutes: number;
  fullTimeWeeklyHours: number;
  nonWorkingDayPolicy: OvertimeNonWorkingDayPolicy;
  roundingIncrementMinutes: number;
  deficitGraceMinutes: number;
  maxPositiveMinutes: number;
  maxNegativeMinutes: number;
};

type PrismaClientLike = Prisma.TransactionClient;

const DEFAULT_OVERTIME_POLICY: OvertimePolicy = {
  calculationMode: "DAILY",
  approvalMode: "POST",
  compensationType: "TIME",
  toleranceMinutes: 15,
  dailyLimitMinutes: 0,
  weeklyLimitMinutes: 0,
  monthlyLimitMinutes: 0,
  annualLimitMinutes: 0,
  fullTimeWeeklyHours: 40,
  nonWorkingDayPolicy: "REQUIRE_APPROVAL",
  roundingIncrementMinutes: 5,
  deficitGraceMinutes: 10,
  maxPositiveMinutes: 4800,
  maxNegativeMinutes: 480,
};

type WorkdayOvertimeJobPayload = {
  orgId: string;
  employeeId: string;
  date: string;
};

type WeeklyOvertimeJobPayload = {
  orgId: string;
  weekStart: string;
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

function normalizePolicy(settings?: TimeBankSettings | null): OvertimePolicy {
  const toleranceMinutes =
    settings && typeof settings.overtimeToleranceMinutes === "number"
      ? settings.overtimeToleranceMinutes
      : DEFAULT_OVERTIME_POLICY.toleranceMinutes;
  const dailyLimitMinutes =
    settings && typeof settings.overtimeDailyLimitMinutes === "number"
      ? settings.overtimeDailyLimitMinutes
      : DEFAULT_OVERTIME_POLICY.dailyLimitMinutes;
  const weeklyLimitMinutes =
    settings && typeof settings.overtimeWeeklyLimitMinutes === "number"
      ? settings.overtimeWeeklyLimitMinutes
      : DEFAULT_OVERTIME_POLICY.weeklyLimitMinutes;
  const monthlyLimitMinutes =
    settings && typeof settings.overtimeMonthlyLimitMinutes === "number"
      ? settings.overtimeMonthlyLimitMinutes
      : DEFAULT_OVERTIME_POLICY.monthlyLimitMinutes;
  const annualLimitMinutes =
    settings && typeof settings.overtimeAnnualLimitMinutes === "number"
      ? settings.overtimeAnnualLimitMinutes
      : DEFAULT_OVERTIME_POLICY.annualLimitMinutes;
  const fullTimeWeeklyHours =
    settings && typeof settings.overtimeFullTimeWeeklyHours === "number"
      ? settings.overtimeFullTimeWeeklyHours
      : DEFAULT_OVERTIME_POLICY.fullTimeWeeklyHours;
  const roundingIncrementMinutes =
    settings && typeof settings.roundingIncrementMinutes === "number"
      ? settings.roundingIncrementMinutes
      : DEFAULT_OVERTIME_POLICY.roundingIncrementMinutes;
  const deficitGraceMinutes =
    settings && typeof settings.deficitGraceMinutes === "number"
      ? settings.deficitGraceMinutes
      : DEFAULT_OVERTIME_POLICY.deficitGraceMinutes;
  const maxPositiveMinutes =
    settings && typeof settings.maxPositiveMinutes === "number"
      ? settings.maxPositiveMinutes
      : DEFAULT_OVERTIME_POLICY.maxPositiveMinutes;
  const maxNegativeMinutes =
    settings && typeof settings.maxNegativeMinutes === "number"
      ? settings.maxNegativeMinutes
      : DEFAULT_OVERTIME_POLICY.maxNegativeMinutes;
  const calculationMode = settings ? settings.overtimeCalculationMode : null;
  const approvalMode = settings ? settings.overtimeApprovalMode : null;
  const compensationType = settings ? settings.overtimeCompensationType : null;
  const nonWorkingDayPolicy = settings ? settings.overtimeNonWorkingDayPolicy : null;

  return {
    calculationMode: calculationMode ?? DEFAULT_OVERTIME_POLICY.calculationMode,
    approvalMode: approvalMode ?? DEFAULT_OVERTIME_POLICY.approvalMode,
    compensationType: compensationType ?? DEFAULT_OVERTIME_POLICY.compensationType,
    toleranceMinutes,
    dailyLimitMinutes,
    weeklyLimitMinutes,
    monthlyLimitMinutes,
    annualLimitMinutes,
    fullTimeWeeklyHours,
    nonWorkingDayPolicy: nonWorkingDayPolicy ?? DEFAULT_OVERTIME_POLICY.nonWorkingDayPolicy,
    roundingIncrementMinutes,
    deficitGraceMinutes,
    maxPositiveMinutes,
    maxNegativeMinutes,
  };
}

function normalizeDeviation(value: number, policy: OvertimePolicy): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const increment = Math.max(1, policy.roundingIncrementMinutes);
  const rounded = Math.round(value / increment) * increment;

  if (rounded > 0 && rounded <= policy.toleranceMinutes) {
    return 0;
  }

  if (rounded < 0 && Math.abs(rounded) <= policy.deficitGraceMinutes) {
    return 0;
  }

  return Math.trunc(rounded);
}

async function getEmployeeBalanceMinutes(
  client: PrismaClientLike,
  orgId: string,
  employeeId: string,
  exclude?: { movementId?: string },
): Promise<number> {
  const aggregate = await client.timeBankMovement.aggregate({
    where: {
      orgId,
      employeeId,
      ...(exclude?.movementId ? { NOT: { id: exclude.movementId } } : {}),
    },
    _sum: { minutes: true },
  });

  // eslint-disable-next-line no-underscore-dangle
  return aggregate._sum.minutes ?? 0;
}

function clampMovementMinutes(
  minutes: number,
  balanceMinutes: number,
  policy: OvertimePolicy,
): { appliedMinutes: number; clamped: boolean } {
  if (minutes > 0) {
    const available = policy.maxPositiveMinutes - balanceMinutes;
    if (available <= 0) {
      return { appliedMinutes: 0, clamped: true };
    }
    if (minutes > available) {
      return { appliedMinutes: available, clamped: true };
    }
  }

  if (minutes < 0) {
    const available = balanceMinutes + policy.maxNegativeMinutes;
    if (available <= 0) {
      return { appliedMinutes: 0, clamped: true };
    }
    if (Math.abs(minutes) > available) {
      return { appliedMinutes: available * -1, clamped: true };
    }
  }

  return { appliedMinutes: minutes, clamped: false };
}

async function removeAutoMovementForWorkday(
  client: PrismaClientLike,
  orgId: string,
  employeeId: string,
  date: Date,
  workdayId?: string | null,
) {
  const dayStart = date;
  const dayEnd = addDays(dayStart, 1);

  await client.timeBankMovement.deleteMany({
    where: {
      orgId,
      employeeId,
      origin: "AUTO_DAILY",
      ...(workdayId ? { workdayId } : { date: { gte: dayStart, lt: dayEnd } }),
    },
  });
}

async function removeOverworkMovement(client: PrismaClientLike, overworkAuthorizationId: string) {
  await client.timeBankMovement.deleteMany({
    where: {
      overworkAuthorizationId,
      origin: "OVERTIME_AUTHORIZATION",
    },
  });
}

async function upsertAutoDailyMovement(params: {
  client: PrismaClientLike;
  orgId: string;
  employeeId: string;
  workdayId: string;
  date: Date;
  minutes: number;
  policy: OvertimePolicy;
  candidateType: OvertimeCandidateType;
}): Promise<TimeBankMovement | null> {
  const { client, orgId, employeeId, workdayId, date, minutes, policy, candidateType } = params;

  const existing = await client.timeBankMovement.findUnique({
    where: {
      workdayId_origin: {
        workdayId,
        origin: "AUTO_DAILY",
      },
    },
  });

  if (minutes === 0) {
    if (existing) {
      await client.timeBankMovement.delete({ where: { id: existing.id } });
    }
    return null;
  }

  const balanceMinutes = await getEmployeeBalanceMinutes(
    client,
    orgId,
    employeeId,
    existing ? { movementId: existing.id } : undefined,
  );
  const { appliedMinutes, clamped } = clampMovementMinutes(minutes, balanceMinutes, policy);

  if (appliedMinutes === 0) {
    if (existing) {
      await client.timeBankMovement.delete({ where: { id: existing.id } });
    }
    return null;
  }

  const movementType = appliedMinutes >= 0 ? "EXTRA" : "DEFICIT";
  const movementMetadata = clamped
    ? ({
        clampedByLimit: true,
        attemptedMinutes: minutes,
        appliedMinutes,
        balanceBeforeMinutes: balanceMinutes,
        maxPositiveMinutes: policy.maxPositiveMinutes,
        maxNegativeMinutes: policy.maxNegativeMinutes,
        candidateType,
      } as unknown as Prisma.InputJsonValue)
    : ({ candidateType } as unknown as Prisma.InputJsonValue);

  if (existing && existing.minutes === appliedMinutes) {
    return existing;
  }

  return client.timeBankMovement.upsert({
    where: {
      workdayId_origin: {
        workdayId,
        origin: "AUTO_DAILY",
      },
    },
    create: {
      orgId,
      employeeId,
      workdayId,
      date,
      minutes: appliedMinutes,
      type: movementType,
      origin: "AUTO_DAILY",
      status: "SETTLED",
      requiresApproval: false,
      description: clamped ? "Diferencia diaria automática (recortada por límite)" : "Diferencia diaria automática",
      metadata: movementMetadata,
    },
    update: {
      minutes: appliedMinutes,
      date,
      type: movementType,
      status: "SETTLED",
      description: clamped ? "Diferencia diaria automática (recortada por límite)" : "Diferencia diaria automática",
      metadata: movementMetadata,
    },
  });
}

async function upsertOverworkMovement(params: {
  client: PrismaClientLike;
  orgId: string;
  employeeId: string;
  workdayId: string | null;
  overworkAuthorizationId: string;
  date: Date;
  minutes: number;
  candidateType: OvertimeCandidateType;
}): Promise<TimeBankMovement | null> {
  const { client, orgId, employeeId, workdayId, overworkAuthorizationId, date, minutes, candidateType } = params;

  if (minutes === 0) {
    return null;
  }

  const existing = await client.timeBankMovement.findFirst({
    where: {
      overworkAuthorizationId,
    },
  });

  const movementType = minutes >= 0 ? "EXTRA" : "DEFICIT";
  const metadata = { candidateType } as unknown as Prisma.InputJsonValue;

  if (existing) {
    if (existing.minutes === minutes) {
      return existing;
    }

    return client.timeBankMovement.update({
      where: { id: existing.id },
      data: {
        minutes,
        date,
        type: movementType,
        origin: "OVERTIME_AUTHORIZATION",
        status: "SETTLED",
        requiresApproval: false,
        metadata,
      },
    });
  }

  return client.timeBankMovement.create({
    data: {
      orgId,
      employeeId,
      workdayId,
      overworkAuthorizationId,
      date,
      minutes,
      type: movementType,
      origin: "OVERTIME_AUTHORIZATION",
      status: "SETTLED",
      requiresApproval: false,
      metadata,
    },
  });
}

function resolveCandidateStatus(params: {
  candidateMinutesFinal: number;
  requiresApproval: boolean;
  movementCreated: boolean;
  compensationType: OvertimeCompensationType;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";
}): OvertimeCandidateStatus {
  const { candidateMinutesFinal, requiresApproval, movementCreated, compensationType, approvalStatus } = params;

  if (candidateMinutesFinal === 0) {
    return "SKIPPED";
  }

  if (approvalStatus === "REJECTED" || approvalStatus === "CANCELLED" || approvalStatus === "EXPIRED") {
    return "REJECTED";
  }

  if (requiresApproval && approvalStatus !== "APPROVED") {
    return "PENDING_APPROVAL";
  }

  if (movementCreated) {
    return "SETTLED";
  }

  if (compensationType === "PAY" || compensationType === "NONE") {
    return "READY";
  }

  return "READY";
}

function mapCandidateStatusToCalcStatus(status: OvertimeCandidateStatus): OvertimeCalcStatus {
  switch (status) {
    case "PENDING_APPROVAL":
      return "PENDING_APPROVAL";
    case "SETTLED":
      return "SETTLED";
    case "SKIPPED":
      return "SKIPPED";
    case "REJECTED":
      return "READY";
    case "READY":
      return "READY";
    default:
      return "READY";
  }
}

function buildLimitFlags(candidateMinutesFinal: number, policy: OvertimePolicy) {
  return {
    exceedsDailyLimit: policy.dailyLimitMinutes > 0 && candidateMinutesFinal > policy.dailyLimitMinutes,
  };
}

export async function processWorkdayOvertimeJob(payload: WorkdayOvertimeJobPayload) {
  const organization = await prisma.organization.findUnique({
    where: { id: payload.orgId },
    select: { timezone: true },
  });
  const timeZone = resolveTimeZone(organization?.timezone);
  const dayStart = getLocalDayStartUtcFromDateKey(payload.date, timeZone);
  if (!dayStart) {
    console.error(`[OvertimeProcessor] Fecha inválida recibida en job de overtime: ${payload.date}`);
    return;
  }

  const summary = await prisma.workdaySummary.findUnique({
    where: {
      orgId_employeeId_date: {
        orgId: payload.orgId,
        employeeId: payload.employeeId,
        date: dayStart,
      },
    },
  });

  if (!summary) {
    await prisma.overtimeCandidate.deleteMany({
      where: {
        orgId: payload.orgId,
        employeeId: payload.employeeId,
        date: dayStart,
      },
    });
    return;
  }

  await prisma.workdaySummary.update({
    where: { id: summary.id },
    data: {
      overtimeCalcStatus: "CALCULATING",
      overtimeCalcUpdatedAt: new Date(),
    },
  });

  const [settings, employee] = await Promise.all([
    prisma.timeBankSettings.findUnique({ where: { orgId: payload.orgId } }),
    prisma.employee.findUnique({
      where: { id: payload.employeeId },
      select: {
        id: true,
        orgId: true,
        userId: true,
        firstName: true,
        lastName: true,
        employmentContracts: {
          where: { active: true },
          take: 1,
          orderBy: { startDate: "desc" },
          select: {
            weeklyHours: true,
            departmentId: true,
            costCenterId: true,
          },
        },
      },
    }),
  ]);

  const policy = normalizePolicy(settings);

  const scheduleDate = getLocalDayAnchor(dayStart, timeZone);
  let effectiveSchedule = null;
  try {
    effectiveSchedule = await getEffectiveSchedule(payload.employeeId, scheduleDate);
  } catch (error) {
    console.warn("[OvertimeProcessor] Error al resolver horario efectivo", {
      employeeId: payload.employeeId,
      date: scheduleDate.toISOString(),
      error,
    });
    effectiveSchedule = null;
  }

  const expectedFromSummary = summary.expectedMinutes !== null ? decimalToNumber(summary.expectedMinutes) : null;
  const expectedFromSchedule = effectiveSchedule ? effectiveSchedule.expectedMinutes : null;
  const expectedMinutes = expectedFromSummary ?? expectedFromSchedule ?? null;
  const workedMinutes = Math.round(decimalToNumber(summary.totalWorkedMinutes));
  const deviationRaw = expectedMinutes !== null ? workedMinutes - expectedMinutes : 0;
  const resolutionStatus = summary.resolutionStatus ?? "OK";
  const dataQuality = summary.dataQuality ?? "CONFIRMED";
  const requiresReview =
    resolutionStatus === "UNRESOLVED_MISSING_CLOCK_OUT" ||
    resolutionStatus === "AUTO_CLOSED_SAFETY" ||
    dataQuality !== "CONFIRMED";

  const scheduleIsWorkingDay = effectiveSchedule ? effectiveSchedule.isWorkingDay : null;
  const isWorkingDay = scheduleIsWorkingDay ?? (expectedMinutes ?? 0) > 0;
  const isAbsence = effectiveSchedule?.source === "ABSENCE";
  const isNonWorkingDay = !isWorkingDay || isAbsence;

  if (expectedMinutes === null) {
    await prisma.$transaction(async (tx) => {
      await tx.overtimeCandidate.upsert({
        where: {
          orgId_employeeId_date: {
            orgId: payload.orgId,
            employeeId: payload.employeeId,
            date: dayStart,
          },
        },
        create: {
          orgId: payload.orgId,
          employeeId: payload.employeeId,
          date: dayStart,
          expectedMinutes: null,
          workedMinutes,
          deviationMinutesRaw: deviationRaw,
          candidateMinutesRaw: deviationRaw,
          calculationMode: policy.calculationMode,
          approvalMode: policy.approvalMode,
          compensationType: policy.compensationType,
          requiresApproval: false,
          status: "SKIPPED",
          candidateType: "EXTRA",
          flags: { reason: "NO_EXPECTED_MINUTES" },
          lastCalculatedAt: new Date(),
          workdaySummaryId: summary.id,
        },
        update: {
          expectedMinutes: null,
          workedMinutes,
          deviationMinutesRaw: deviationRaw,
          candidateMinutesRaw: deviationRaw,
          calculationMode: policy.calculationMode,
          approvalMode: policy.approvalMode,
          compensationType: policy.compensationType,
          requiresApproval: false,
          status: "SKIPPED",
          candidateType: "EXTRA",
          flags: { reason: "NO_EXPECTED_MINUTES" },
          lastCalculatedAt: new Date(),
          workdaySummaryId: summary.id,
        },
      });

      await tx.workdaySummary.update({
        where: { id: summary.id },
        data: {
          overtimeCalcStatus: "SKIPPED",
          overtimeCalcUpdatedAt: new Date(),
        },
      });
    });

    return;
  }

  const contract = employee?.employmentContracts[0] ?? null;
  const weeklyHours = contract?.weeklyHours ? Number(contract.weeklyHours) : policy.fullTimeWeeklyHours;
  const isPartTime = weeklyHours < policy.fullTimeWeeklyHours;

  const candidateRaw = isNonWorkingDay ? workedMinutes : deviationRaw;
  const candidateMinutesFinal = normalizeDeviation(candidateRaw, policy);

  let candidateType: OvertimeCandidateType = "EXTRA";
  if (candidateMinutesFinal < 0) {
    candidateType = "DEFICIT";
  } else if (isNonWorkingDay) {
    candidateType = "NON_WORKDAY";
  } else if (candidateMinutesFinal > 0 && isPartTime) {
    candidateType = "COMPLEMENTARY";
  }

  const requiresApproval =
    candidateMinutesFinal > 0 &&
    candidateType !== "DEFICIT" &&
    (policy.approvalMode !== "NONE" ||
      (candidateType === "NON_WORKDAY" && policy.nonWorkingDayPolicy === "REQUIRE_APPROVAL") ||
      requiresReview);

  const limitFlags = buildLimitFlags(candidateMinutesFinal, policy);
  const scheduleSource = effectiveSchedule ? effectiveSchedule.source : null;
  const scheduleExceptionType = effectiveSchedule ? effectiveSchedule.exceptionType : null;
  const flags = {
    isNonWorkingDay,
    isAbsence,
    scheduleSource,
    exceptionType: scheduleExceptionType,
    candidateType,
    isPartTime,
    resolutionStatus,
    dataQuality,
    requiresReview,
    ...limitFlags,
  };

  const policySnapshot = {
    calculationMode: policy.calculationMode,
    approvalMode: policy.approvalMode,
    compensationType: policy.compensationType,
    toleranceMinutes: policy.toleranceMinutes,
    dailyLimitMinutes: policy.dailyLimitMinutes,
    weeklyLimitMinutes: policy.weeklyLimitMinutes,
    monthlyLimitMinutes: policy.monthlyLimitMinutes,
    annualLimitMinutes: policy.annualLimitMinutes,
    fullTimeWeeklyHours: policy.fullTimeWeeklyHours,
    nonWorkingDayPolicy: policy.nonWorkingDayPolicy,
  };

  const employeeName = employee ? `${employee.firstName} ${employee.lastName}`.trim() : "Empleado";
  const requestedById = employee?.userId ?? payload.employeeId;

  const result = await prisma.$transaction(async (tx) => {
    const candidate = await tx.overtimeCandidate.upsert({
      where: {
        orgId_employeeId_date: {
          orgId: payload.orgId,
          employeeId: payload.employeeId,
          date: dayStart,
        },
      },
      create: {
        orgId: payload.orgId,
        employeeId: payload.employeeId,
        date: dayStart,
        expectedMinutes,
        workedMinutes,
        deviationMinutesRaw: deviationRaw,
        candidateMinutesRaw: candidateRaw,
        candidateMinutesFinal,
        calculationMode: policy.calculationMode,
        approvalMode: policy.approvalMode,
        compensationType: policy.compensationType,
        requiresApproval,
        status: "PENDING_CALC",
        candidateType,
        flags: flags as Prisma.InputJsonValue,
        policySnapshot: policySnapshot as Prisma.InputJsonValue,
        lastCalculatedAt: new Date(),
        workdaySummaryId: summary.id,
      },
      update: {
        expectedMinutes,
        workedMinutes,
        deviationMinutesRaw: deviationRaw,
        candidateMinutesRaw: candidateRaw,
        candidateMinutesFinal,
        calculationMode: policy.calculationMode,
        approvalMode: policy.approvalMode,
        compensationType: policy.compensationType,
        requiresApproval,
        status: "PENDING_CALC",
        candidateType,
        flags: flags as Prisma.InputJsonValue,
        policySnapshot: policySnapshot as Prisma.InputJsonValue,
        lastCalculatedAt: new Date(),
        workdaySummaryId: summary.id,
      },
    });

    let approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED" | undefined;
    let movementCreated = false;
    let overworkAuthorizationId = candidate.overworkAuthorizationId ?? null;
    let newAuthorizationCreated = false;
    let alertId: string | null = null;
    let adjustedApprovedAuth: {
      previousMinutes: number;
      newMinutes: number;
      approvedById: string | null;
    } | null = null;

    if (candidateMinutesFinal === 0) {
      await removeAutoMovementForWorkday(tx, payload.orgId, payload.employeeId, dayStart, summary.id);
      if (candidate.overworkAuthorizationId) {
        const existingAuth = await tx.overworkAuthorization.findUnique({
          where: { id: candidate.overworkAuthorizationId },
        });
        if (existingAuth && existingAuth.status === "PENDING") {
          await tx.overworkAuthorization.update({
            where: { id: existingAuth.id },
            data: {
              status: "CANCELLED",
              resolvedAt: new Date(),
            },
          });
        }
      }
    } else if (requiresApproval) {
      const existingAuth = candidate.overworkAuthorizationId
        ? await tx.overworkAuthorization.findUnique({ where: { id: candidate.overworkAuthorizationId } })
        : null;

      if (!existingAuth) {
        const newAuth = await tx.overworkAuthorization.create({
          data: {
            orgId: payload.orgId,
            employeeId: payload.employeeId,
            requestedById,
            date: dayStart,
            minutesApproved: candidateMinutesFinal,
            justification: "Generado automáticamente por exceso de jornada",
            status: "PENDING",
            compensationType: policy.compensationType,
          },
        });
        overworkAuthorizationId = newAuth.id;
        approvalStatus = "PENDING";
        newAuthorizationCreated = true;

        if (employee?.userId) {
          const alert = await tx.alert.create({
            data: {
              orgId: payload.orgId,
              employeeId: payload.employeeId,
              type: "OVERTIME_PENDING_APPROVAL",
              severity: "WARNING",
              title: "Horas extra pendientes",
              description: `${employee.firstName} ${employee.lastName} registró horas extra pendientes de aprobación.`,
              date: dayStart,
              departmentId: contract?.departmentId ?? null,
              costCenterId: contract?.costCenterId ?? null,
              originalCostCenterId: contract?.costCenterId ?? null,
              status: "ACTIVE",
              deviationMinutes: candidateMinutesFinal,
            },
          });
          alertId = alert.id;
        }
      } else {
        approvalStatus = existingAuth.status;
        if (existingAuth.status === "PENDING" && existingAuth.minutesApproved !== candidateMinutesFinal) {
          await tx.overworkAuthorization.update({
            where: { id: existingAuth.id },
            data: {
              minutesApproved: candidateMinutesFinal,
              compensationType: policy.compensationType,
            },
          });
        } else if (existingAuth.status === "APPROVED" && existingAuth.minutesApproved !== candidateMinutesFinal) {
          await tx.overworkAuthorization.update({
            where: { id: existingAuth.id },
            data: {
              minutesApproved: candidateMinutesFinal,
            },
          });

          adjustedApprovedAuth = {
            previousMinutes: existingAuth.minutesApproved,
            newMinutes: candidateMinutesFinal,
            approvedById: existingAuth.approvedById,
          };
        }
      }
    } else {
      const movement = await upsertAutoDailyMovement({
        client: tx,
        orgId: payload.orgId,
        employeeId: payload.employeeId,
        workdayId: summary.id,
        date: dayStart,
        minutes: candidateMinutesFinal,
        policy,
        candidateType,
      });
      movementCreated = Boolean(movement);
    }

    if (overworkAuthorizationId) {
      const currentAuth = await tx.overworkAuthorization.findUnique({ where: { id: overworkAuthorizationId } });
      const currentStatus = currentAuth ? currentAuth.status : null;
      approvalStatus = currentStatus ?? approvalStatus;

      if (currentAuth?.status === "APPROVED") {
        if (policy.compensationType === "TIME" || policy.compensationType === "MIXED") {
          if (candidateMinutesFinal === 0) {
            await removeOverworkMovement(tx, overworkAuthorizationId);
          } else {
            const movement = await upsertOverworkMovement({
              client: tx,
              orgId: payload.orgId,
              employeeId: payload.employeeId,
              workdayId: summary.id,
              overworkAuthorizationId,
              date: dayStart,
              minutes: candidateMinutesFinal,
              candidateType,
            });
            movementCreated = Boolean(movement);
          }
        }
      }
    }

    const finalStatus = resolveCandidateStatus({
      candidateMinutesFinal,
      requiresApproval,
      movementCreated,
      compensationType: policy.compensationType,
      approvalStatus,
    });

    await tx.overtimeCandidate.update({
      where: { id: candidate.id },
      data: {
        status: finalStatus,
        overworkAuthorizationId,
        resolvedAt: finalStatus === "SETTLED" || finalStatus === "REJECTED" ? new Date() : null,
        lastCalculatedAt: new Date(),
      },
    });

    await tx.workdaySummary.update({
      where: { id: summary.id },
      data: {
        overtimeCalcStatus: mapCandidateStatusToCalcStatus(finalStatus),
        overtimeCalcUpdatedAt: new Date(),
      },
    });

    return {
      newAuthorizationCreated,
      alertId,
      adjustedApprovedAuth,
      overworkAuthorizationId,
      candidateMinutesFinal,
    };
  });

  if (result.newAuthorizationCreated && employee?.userId) {
    const approvers = await resolveApproverUsers(payload.employeeId, payload.orgId, "TIME_BANK");
    const approverIds = approvers.map((approver) => approver.userId);

    await Promise.all(
      approverIds.map((approverId) =>
        createNotification(
          approverId,
          payload.orgId,
          "OVERTIME_PENDING_APPROVAL",
          "Horas extra pendientes de aprobación",
          `${employeeName} registró ${(result.candidateMinutesFinal / 60).toFixed(1)}h en ${dayStart.toLocaleDateString(
            "es-ES",
          )}.`,
        ),
      ),
    );
  }

  if (result.alertId) {
    await ensureAlertAssignments(result.alertId, payload.employeeId);
  }

  if (result.adjustedApprovedAuth) {
    if (employee?.userId) {
      await createNotification(
        employee.userId,
        payload.orgId,
        "OVERTIME_ADJUSTED",
        "Horas extra ajustadas",
        `Tus horas extra del ${dayStart.toLocaleDateString("es-ES")} se ajustaron de ${(
          result.adjustedApprovedAuth.previousMinutes / 60
        ).toFixed(1)}h a ${(result.adjustedApprovedAuth.newMinutes / 60).toFixed(1)}h por corrección de fichaje.`,
      );
    }

    if (result.adjustedApprovedAuth.approvedById) {
      await createNotification(
        result.adjustedApprovedAuth.approvedById,
        payload.orgId,
        "OVERTIME_ADJUSTED",
        "Horas extra ajustadas",
        `${employeeName} ajustó las horas extra del ${dayStart.toLocaleDateString("es-ES")} a ${(
          result.adjustedApprovedAuth.newMinutes / 60
        ).toFixed(1)}h.`,
      );
    }
  }
}

export async function processWeeklyOvertimeReconciliation(payload: WeeklyOvertimeJobPayload) {
  const organization = await prisma.organization.findUnique({
    where: { id: payload.orgId },
    select: { timezone: true },
  });
  const timeZone = resolveTimeZone(organization?.timezone);
  const weekStart = getLocalDayStartUtcFromDateKey(payload.weekStart, timeZone);
  if (!weekStart) {
    console.error(`[OvertimeProcessor] Fecha inválida recibida en job semanal: ${payload.weekStart}`);
    return;
  }
  const weekEnd = addDays(weekStart, 6);

  const settings = await prisma.timeBankSettings.findUnique({ where: { orgId: payload.orgId } });
  const policy = normalizePolicy(settings);

  if (policy.calculationMode === "DAILY") {
    return;
  }

  const summaries = await prisma.workdaySummary.findMany({
    where: {
      orgId: payload.orgId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: {
      id: true,
      employeeId: true,
      date: true,
      totalWorkedMinutes: true,
      expectedMinutes: true,
    },
    orderBy: { date: "asc" },
  });

  if (summaries.length === 0) {
    return;
  }

  const summariesByEmployee = new Map<string, typeof summaries>();
  for (const summary of summaries) {
    const existing = summariesByEmployee.get(summary.employeeId);
    if (existing) {
      existing.push(summary);
    } else {
      summariesByEmployee.set(summary.employeeId, [summary]);
    }
  }

  for (const [employeeId, employeeSummaries] of summariesByEmployee.entries()) {
    const totalWorked = employeeSummaries.reduce(
      (acc, item) => acc + Math.round(decimalToNumber(item.totalWorkedMinutes)),
      0,
    );
    const totalExpected = employeeSummaries.reduce((acc, item) => {
      const expected = item.expectedMinutes !== null ? decimalToNumber(item.expectedMinutes) : null;
      return expected !== null ? acc + expected : acc;
    }, 0);

    if (totalExpected === 0) {
      continue;
    }

    const weeklyDeviation = totalWorked - totalExpected;
    const weeklyNormalized = normalizeDeviation(weeklyDeviation, policy);

    if (weeklyNormalized === 0) {
      continue;
    }

    const dailyCandidates = await prisma.overtimeCandidate.findMany({
      where: {
        orgId: payload.orgId,
        employeeId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: {
        candidateMinutesFinal: true,
        status: true,
      },
    });

    const dailySum = dailyCandidates
      .filter((candidate) => candidate.status === "SETTLED" || candidate.status === "READY")
      .reduce((acc, candidate) => acc + (candidate.candidateMinutesFinal ?? 0), 0);

    const correction = weeklyNormalized - dailySum;

    if (correction === 0) {
      continue;
    }
    const balanceMinutes = await getEmployeeBalanceMinutes(prisma, payload.orgId, employeeId);
    const { appliedMinutes, clamped } = clampMovementMinutes(correction, balanceMinutes, policy);

    if (appliedMinutes === 0) {
      continue;
    }

    await prisma.timeBankMovement.create({
      data: {
        orgId: payload.orgId,
        employeeId,
        date: weekEnd,
        minutes: appliedMinutes,
        type: appliedMinutes >= 0 ? "CORRECTION" : "DEFICIT",
        origin: "CORRECTION",
        status: "SETTLED",
        description: clamped ? "Ajuste semanal automático (recortado por límite)" : "Ajuste semanal automático",
        metadata: {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          weeklyNormalized,
          dailySum,
          correction,
          appliedMinutes,
          clampedByLimit: clamped,
          balanceBeforeMinutes: balanceMinutes,
          maxPositiveMinutes: policy.maxPositiveMinutes,
          maxNegativeMinutes: policy.maxNegativeMinutes,
        } as Prisma.InputJsonValue,
      },
    });
  }
}

export async function processOvertimeWorkdaySweep(payload: { orgId: string; lookbackDays: number }) {
  const lookback = Math.max(1, Math.min(14, Math.round(payload.lookbackDays)));
  const organization = await prisma.organization.findUnique({
    where: { id: payload.orgId },
    select: { timezone: true },
  });
  const timeZone = resolveTimeZone(organization?.timezone);
  const todayStart = getLocalDayStartUtc(new Date(), timeZone);
  const since = addDays(todayStart, lookback * -1);
  const batchSize = 200;
  const maxJobs = 1000;
  let enqueued = 0;
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const summaries = await prisma.workdaySummary.findMany({
      where: {
        orgId: payload.orgId,
        date: { gte: since },
        overtimeCalcStatus: { in: ["DIRTY", "CALCULATING"] },
      },
      select: {
        id: true,
        employeeId: true,
        date: true,
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    for (const summary of summaries) {
      if (enqueued >= maxJobs) {
        console.warn(
          `[OvertimeSweep] Límite de ${maxJobs} jobs alcanzado para ${payload.orgId}. Continuará en el siguiente barrido.`,
        );
        hasMore = false;
        break;
      }
      await enqueueOvertimeWorkdayJob({
        orgId: payload.orgId,
        employeeId: summary.employeeId,
        date: formatUtcDateKey(summary.date),
      });
      enqueued += 1;
    }

    if (!hasMore) {
      break;
    }

    if (summaries.length < batchSize) {
      hasMore = false;
    } else {
      cursor = summaries[summaries.length - 1]?.id;
    }
  }
}

export async function processOverworkAuthorizationExpiry(payload: { orgId: string; expiryDays: number }) {
  const expiryDays = Math.max(1, Math.min(90, Math.round(payload.expiryDays)));
  const organization = await prisma.organization.findUnique({
    where: { id: payload.orgId },
    select: { timezone: true },
  });
  const timeZone = resolveTimeZone(organization?.timezone);
  const todayStart = getLocalDayStartUtc(new Date(), timeZone);
  const cutoff = addDays(todayStart, expiryDays * -1);

  const pending = await prisma.overworkAuthorization.findMany({
    where: {
      orgId: payload.orgId,
      status: "PENDING",
      requestedAt: { lt: cutoff },
    },
    select: {
      id: true,
      orgId: true,
      employeeId: true,
      date: true,
      minutesApproved: true,
      employee: {
        select: {
          userId: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (pending.length === 0) {
    return;
  }

  const approverCache = new Map<string, string[]>();
  const notifications: Prisma.PtoNotificationCreateManyInput[] = [];
  const now = new Date();

  for (const auth of pending) {
    const employeeName = `${auth.employee.firstName} ${auth.employee.lastName}`.trim();
    const dateLabel = auth.date.toLocaleDateString("es-ES");
    const hoursLabel = (auth.minutesApproved / 60).toFixed(1);

    if (auth.employee.userId) {
      notifications.push({
        userId: auth.employee.userId,
        orgId: auth.orgId,
        type: "OVERTIME_EXPIRED",
        title: "Horas extra expiradas",
        message: `Tu solicitud de ${hoursLabel}h del ${dateLabel} expiró sin revisión. Si necesitas regularizarlo, contacta con tu responsable.`,
        isRead: false,
      });
    }

    let approverIds = approverCache.get(auth.employeeId);
    if (!approverIds) {
      const approvers = await resolveApproverUsers(auth.employeeId, auth.orgId, "TIME_BANK");
      approverIds = approvers.map((approver) => approver.userId);
      approverCache.set(auth.employeeId, approverIds);
    }

    for (const approverId of approverIds) {
      notifications.push({
        userId: approverId,
        orgId: auth.orgId,
        type: "OVERTIME_EXPIRED",
        title: "Horas extra expiradas",
        message: `La solicitud de ${employeeName} (${hoursLabel}h, ${dateLabel}) expiró sin revisión.`,
        isRead: false,
      });
    }
  }

  const ids = pending.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.overworkAuthorization.updateMany({
      where: { id: { in: ids }, status: "PENDING" },
      data: {
        status: "EXPIRED",
        resolvedAt: now,
      },
    });

    const candidates = await tx.overtimeCandidate.findMany({
      where: {
        overworkAuthorizationId: { in: ids },
      },
      select: {
        id: true,
        workdaySummaryId: true,
      },
    });

    if (candidates.length > 0) {
      const candidateIds = candidates.map((candidate) => candidate.id);
      const summaryIds = candidates
        .map((candidate) => candidate.workdaySummaryId)
        .filter((id): id is string => Boolean(id));

      await tx.overtimeCandidate.updateMany({
        where: { id: { in: candidateIds } },
        data: {
          status: "REJECTED",
          resolvedAt: now,
        },
      });

      if (summaryIds.length > 0) {
        await tx.workdaySummary.updateMany({
          where: { id: { in: summaryIds } },
          data: {
            overtimeCalcStatus: "READY",
            overtimeCalcUpdatedAt: now,
          },
        });
      }
    }

    if (notifications.length > 0) {
      await tx.ptoNotification.createMany({
        data: notifications,
      });
    }
  });
}

"use server";

import type { OvertimeCompensationType, OverworkAuthorizationStatus, Prisma } from "@prisma/client";
import { startOfDay } from "date-fns";

import { canUserApprove } from "@/lib/approvals/approval-engine";
import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";
import { getAuthenticatedUser } from "./shared/get-authenticated-employee";

async function ensureReviewerPermission() {
  const authz = await safePermission("approve_requests");
  if (!authz.ok) {
    throw new Error("No tienes permisos para revisar horas extra");
  }
}

export interface OverworkAuthorizationWithEmployee {
  id: string;
  date: Date;
  minutesApproved: number;
  status: OverworkAuthorizationStatus;
  requestedAt: Date;
  resolvedAt: Date | null;
  justification: string | null;
  compensationType: OvertimeCompensationType;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string | null;
    userId: string | null;
  };
  organization?: {
    id: string;
    name: string | null;
  } | null;
  candidate?: {
    candidateMinutesFinal: number | null;
    candidateType: string;
    flags: Prisma.JsonValue | null;
    workedMinutes: number;
    expectedMinutes: number | null;
  } | null;
}

export async function getOverworkAuthorizationsToApprove(
  status: OverworkAuthorizationStatus = "PENDING",
  orgIdOverride?: string | null,
): Promise<OverworkAuthorizationWithEmployee[]> {
  const { orgId, userId } = await getAuthenticatedUser();
  await ensureReviewerPermission();

  const targetOrgId = orgIdOverride ?? orgId;
  if (!targetOrgId) {
    return [];
  }

  const requests = await prisma.overworkAuthorization.findMany({
    where: {
      orgId: targetOrgId,
      status,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          userId: true,
        },
      },
    },
    orderBy: {
      requestedAt: "desc",
    },
  });

  const requestIds = requests.map((request) => request.id);
  const candidates = await prisma.overtimeCandidate.findMany({
    where: {
      overworkAuthorizationId: { in: requestIds },
    },
    select: {
      overworkAuthorizationId: true,
      candidateMinutesFinal: true,
      candidateType: true,
      flags: true,
      workedMinutes: true,
      expectedMinutes: true,
    },
  });

  const candidateMap = new Map(candidates.map((candidate) => [candidate.overworkAuthorizationId ?? "", candidate]));

  const filtered: OverworkAuthorizationWithEmployee[] = [];

  for (const request of requests) {
    const canApprove = await canUserApprove(userId, request.employeeId, "TIME_BANK");
    if (!canApprove) {
      continue;
    }

    const candidate = candidateMap.get(request.id);
    filtered.push({
      id: request.id,
      date: request.date,
      minutesApproved: request.minutesApproved,
      status: request.status,
      requestedAt: request.requestedAt,
      resolvedAt: request.resolvedAt,
      justification: request.justification,
      compensationType: request.compensationType,
      employee: request.employee,
      organization: request.organization,
      candidate: candidate
        ? {
            candidateMinutesFinal: candidate.candidateMinutesFinal,
            candidateType: candidate.candidateType,
            flags: candidate.flags,
            workedMinutes: candidate.workedMinutes,
            expectedMinutes: candidate.expectedMinutes,
          }
        : null,
    });
  }

  return filtered;
}

export async function approveOverworkAuthorization(input: {
  authorizationId: string;
  compensationType?: OvertimeCompensationType;
  comments?: string;
}) {
  const { userId, role, email, name } = await getAuthenticatedUser();
  await ensureReviewerPermission();

  const request = await prisma.overworkAuthorization.findUnique({
    where: { id: input.authorizationId },
  });

  if (!request) {
    throw new Error("Solicitud de horas extra no encontrada");
  }

  const canApprove = await canUserApprove(userId, request.employeeId, "TIME_BANK");
  if (!canApprove) {
    throw new Error("No tienes permisos para aprobar esta solicitud");
  }

  if (request.status !== "PENDING") {
    throw new Error("Esta solicitud ya fue procesada");
  }

  const selectedCompensation = input.compensationType ?? request.compensationType;

  const previousSnapshot = {
    status: request.status,
    minutesApproved: request.minutesApproved,
    compensationType: request.compensationType,
    justification: request.justification,
  };

  await prisma.overworkAuthorization.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      resolvedAt: new Date(),
      approvedById: userId,
      compensationType: selectedCompensation,
      justification: input.comments ?? request.justification,
    },
  });

  const candidate = await prisma.overtimeCandidate.findFirst({
    where: { overworkAuthorizationId: request.id },
  });

  if (candidate) {
    await prisma.overtimeCandidate.update({
      where: { id: candidate.id },
      data: {
        status: "SETTLED",
        compensationType: selectedCompensation,
        resolvedAt: new Date(),
      },
    });

    if (candidate.workdaySummaryId) {
      await prisma.workdaySummary.update({
        where: { id: candidate.workdaySummaryId },
        data: {
          overtimeCalcStatus: "SETTLED",
          overtimeCalcUpdatedAt: new Date(),
        },
      });
    }

    if (selectedCompensation === "TIME" || selectedCompensation === "MIXED") {
      const existingMovement = await prisma.timeBankMovement.findFirst({
        where: { overworkAuthorizationId: request.id },
      });
      if (!existingMovement) {
        await prisma.timeBankMovement.create({
          data: {
            orgId: request.orgId,
            employeeId: request.employeeId,
            workdayId: candidate.workdaySummaryId,
            overworkAuthorizationId: request.id,
            date: startOfDay(request.date),
            minutes: candidate.candidateMinutesFinal ?? request.minutesApproved,
            type: "EXTRA",
            origin: "OVERTIME_AUTHORIZATION",
            status: "SETTLED",
            requiresApproval: false,
            metadata: {
              candidateType: candidate.candidateType,
              compensationType: selectedCompensation,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }
  }

  const employee = await prisma.employee.findUnique({
    where: { id: request.employeeId },
    select: { userId: true, firstName: true, lastName: true },
  });

  if (employee?.userId) {
    await createNotification(
      employee.userId,
      request.orgId,
      "OVERTIME_APPROVED",
      "Horas extra aprobadas",
      `Tus horas extra del ${request.date.toLocaleDateString("es-ES")} han sido aprobadas.`,
    );
  }

  await prisma.auditLog.create({
    data: {
      action: "OVERTIME_AUTHORIZATION_APPROVED",
      category: "TIME_BANK",
      entityId: request.id,
      entityType: "OverworkAuthorization",
      entityData: {
        previous: previousSnapshot,
        new: {
          status: "APPROVED",
          minutesApproved: request.minutesApproved,
          compensationType: selectedCompensation,
          justification: input.comments ?? request.justification,
        },
      } as Prisma.InputJsonValue,
      description: `Horas extra aprobadas por ${name ?? email}`,
      performedById: userId,
      performedByEmail: email ?? "",
      performedByName: name ?? "",
      performedByRole: role,
      orgId: request.orgId,
    },
  });

  return { success: true };
}

export async function rejectOverworkAuthorization(input: { authorizationId: string; rejectionReason: string }) {
  const { userId, role, email, name } = await getAuthenticatedUser();
  await ensureReviewerPermission();

  const request = await prisma.overworkAuthorization.findUnique({
    where: { id: input.authorizationId },
  });

  if (!request) {
    throw new Error("Solicitud de horas extra no encontrada");
  }

  const canApprove = await canUserApprove(userId, request.employeeId, "TIME_BANK");
  if (!canApprove) {
    throw new Error("No tienes permisos para rechazar esta solicitud");
  }

  if (request.status !== "PENDING") {
    throw new Error("Esta solicitud ya fue procesada");
  }

  const previousSnapshot = {
    status: request.status,
    minutesApproved: request.minutesApproved,
    compensationType: request.compensationType,
    justification: request.justification,
  };

  await prisma.overworkAuthorization.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      resolvedAt: new Date(),
      approvedById: userId,
      justification: input.rejectionReason,
    },
  });

  const candidate = await prisma.overtimeCandidate.findFirst({
    where: { overworkAuthorizationId: request.id },
  });

  if (candidate) {
    await prisma.overtimeCandidate.update({
      where: { id: candidate.id },
      data: {
        status: "REJECTED",
        resolvedAt: new Date(),
      },
    });

    if (candidate.workdaySummaryId) {
      await prisma.workdaySummary.update({
        where: { id: candidate.workdaySummaryId },
        data: {
          overtimeCalcStatus: "READY",
          overtimeCalcUpdatedAt: new Date(),
        },
      });
    }
  }

  const employee = await prisma.employee.findUnique({
    where: { id: request.employeeId },
    select: { userId: true },
  });

  if (employee?.userId) {
    await createNotification(
      employee.userId,
      request.orgId,
      "OVERTIME_REJECTED",
      "Horas extra rechazadas",
      `Tus horas extra del ${request.date.toLocaleDateString("es-ES")} han sido rechazadas.`,
    );
  }

  await prisma.auditLog.create({
    data: {
      action: "OVERTIME_AUTHORIZATION_REJECTED",
      category: "TIME_BANK",
      entityId: request.id,
      entityType: "OverworkAuthorization",
      entityData: {
        previous: previousSnapshot,
        new: {
          status: "REJECTED",
          minutesApproved: request.minutesApproved,
          compensationType: request.compensationType,
          justification: input.rejectionReason,
        },
      } as Prisma.InputJsonValue,
      description: `Horas extra rechazadas por ${name ?? email}`,
      performedById: userId,
      performedByEmail: email ?? "",
      performedByName: name ?? "",
      performedByRole: role,
      orgId: request.orgId,
    },
  });

  return { success: true };
}

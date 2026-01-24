"use server";

import { canUserApprove } from "@/lib/approvals/approval-engine";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateWorkdaySummary } from "@/server/actions/time-tracking";

import { createNotification } from "./notifications";

type ApproverOnCallStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ApproverOnCallTotals {
  pending: number;
  approved: number;
  rejected: number;
}

async function getApproverBaseData() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, orgId: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return { session, user };
}

function mapStatus(status: string): ApproverOnCallStatus | null {
  if (status === "PENDING_APPROVAL") return "PENDING";
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  return null;
}

export async function getOnCallInterventionsToApprove(status: ApproverOnCallStatus) {
  const { user } = await getApproverBaseData();

  const interventions = await prisma.onCallIntervention.findMany({
    where: {
      orgId: user.orgId,
      requiresApproval: true,
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          photoUrl: true,
          employeeNumber: true,
        },
      },
      schedule: {
        select: { id: true, startAt: true, endAt: true },
      },
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { startAt: "desc" },
  });

  const filtered: Array<{
    id: string;
    startAt: Date;
    endAt: Date;
    notes: string | null;
    status: ApproverOnCallStatus;
    requiresApproval: boolean;
    approvedAt?: Date | null;
    rejectedAt?: Date | null;
    approverComments?: string | null;
    rejectionReason?: string | null;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      photoUrl?: string | null;
      employeeNumber?: string | null;
    };
  }> = [];

  for (const intervention of interventions) {
    const mappedStatus = mapStatus(intervention.status);
    if (!mappedStatus) continue;

    const canApprove = await canUserApprove(user.id, intervention.employeeId, "ON_CALL_INTERVENTION");
    if (!canApprove) continue;

    filtered.push({
      id: intervention.id,
      startAt: intervention.startAt,
      endAt: intervention.endAt,
      notes: intervention.notes ?? null,
      status: mappedStatus,
      requiresApproval: intervention.requiresApproval,
      approvedAt: intervention.approvedAt ?? null,
      rejectedAt: intervention.rejectedAt ?? null,
      approverComments: intervention.approverComments ?? null,
      rejectionReason: intervention.rejectionReason ?? null,
      employee: {
        id: intervention.employee.id,
        firstName: intervention.employee.firstName,
        lastName: intervention.employee.lastName,
        email: intervention.employee.email ?? "",
        photoUrl: intervention.employee.photoUrl ?? null,
        employeeNumber: intervention.employee.employeeNumber ?? null,
      },
    });
  }

  const totals: ApproverOnCallTotals = {
    pending: filtered.filter((item) => item.status === "PENDING").length,
    approved: filtered.filter((item) => item.status === "APPROVED").length,
    rejected: filtered.filter((item) => item.status === "REJECTED").length,
  };

  return {
    requests: filtered.filter((item) => item.status === status),
    totals,
  };
}

export async function approveOnCallIntervention(params: { interventionId: string; comments?: string }) {
  const { user } = await getApproverBaseData();

  const intervention = await prisma.onCallIntervention.findUnique({
    where: { id: params.interventionId },
    select: {
      id: true,
      orgId: true,
      employeeId: true,
      status: true,
      startAt: true,
      endAt: true,
      createdClockInId: true,
      createdClockOutId: true,
    },
  });

  if (!intervention || intervention.orgId !== user.orgId) {
    throw new Error("Intervención no encontrada");
  }

  const canApprove = await canUserApprove(user.id, intervention.employeeId, "ON_CALL_INTERVENTION");
  if (!canApprove) {
    throw new Error("No tienes permisos para aprobar esta intervención");
  }

  if (intervention.status !== "PENDING_APPROVAL") {
    throw new Error("La intervención no está pendiente de aprobación");
  }

  await prisma.$transaction(async (tx) => {
    const clockIn = await tx.timeEntry.create({
      data: {
        orgId: intervention.orgId,
        employeeId: intervention.employeeId,
        entryType: "CLOCK_IN",
        timestamp: intervention.startAt,
        isManual: true,
        onCallInterventionId: intervention.id,
        notes: "Intervención de guardia",
      },
    });

    const clockOut = await tx.timeEntry.create({
      data: {
        orgId: intervention.orgId,
        employeeId: intervention.employeeId,
        entryType: "CLOCK_OUT",
        timestamp: intervention.endAt,
        isManual: true,
        onCallInterventionId: intervention.id,
        notes: "Intervención de guardia",
      },
    });

    await tx.onCallIntervention.update({
      where: { id: intervention.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approverId: user.id,
        approverComments: params.comments?.trim() ?? null,
        createdClockInId: clockIn.id,
        createdClockOutId: clockOut.id,
      },
    });
  });

  await updateWorkdaySummary(intervention.employeeId, intervention.orgId, intervention.startAt);
  if (intervention.startAt.toDateString() !== intervention.endAt.toDateString()) {
    await updateWorkdaySummary(intervention.employeeId, intervention.orgId, intervention.endAt);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: intervention.employeeId },
    select: { userId: true },
  });

  if (employee?.userId) {
    await createNotification(
      employee.userId,
      intervention.orgId,
      "ON_CALL_INTERVENTION_APPROVED",
      "Intervención aprobada",
      "Tu intervención de guardia ha sido aprobada.",
    );
  }

  return { success: true };
}

export async function rejectOnCallIntervention(params: { interventionId: string; rejectionReason: string }) {
  const { user } = await getApproverBaseData();

  if (!params.rejectionReason || params.rejectionReason.trim().length < 5) {
    throw new Error("El motivo del rechazo debe tener al menos 5 caracteres");
  }

  const intervention = await prisma.onCallIntervention.findUnique({
    where: { id: params.interventionId },
    select: {
      id: true,
      orgId: true,
      employeeId: true,
      status: true,
      startAt: true,
      endAt: true,
      createdClockInId: true,
      createdClockOutId: true,
    },
  });

  if (!intervention || intervention.orgId !== user.orgId) {
    throw new Error("Intervención no encontrada");
  }

  const canApprove = await canUserApprove(user.id, intervention.employeeId, "ON_CALL_INTERVENTION");
  if (!canApprove) {
    throw new Error("No tienes permisos para rechazar esta intervención");
  }

  await prisma.onCallIntervention.update({
    where: { id: intervention.id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      approverId: user.id,
      rejectionReason: params.rejectionReason.trim(),
    },
  });

  if (intervention.createdClockInId) {
    await prisma.timeEntry.update({
      where: { id: intervention.createdClockInId },
      data: {
        isCancelled: true,
        cancellationReason: "ADMIN_CORRECTION",
        cancelledAt: new Date(),
        cancellationNotes: "Intervención de guardia rechazada",
      },
    });
  }

  if (intervention.createdClockOutId) {
    await prisma.timeEntry.update({
      where: { id: intervention.createdClockOutId },
      data: {
        isCancelled: true,
        cancellationReason: "ADMIN_CORRECTION",
        cancelledAt: new Date(),
        cancellationNotes: "Intervención de guardia rechazada",
      },
    });
  }

  if (intervention.createdClockInId || intervention.createdClockOutId) {
    await updateWorkdaySummary(intervention.employeeId, intervention.orgId, intervention.startAt);
    if (intervention.startAt.toDateString() !== intervention.endAt.toDateString()) {
      await updateWorkdaySummary(intervention.employeeId, intervention.orgId, intervention.endAt);
    }
  }

  const employee = await prisma.employee.findUnique({
    where: { id: intervention.employeeId },
    select: { userId: true },
  });

  if (employee?.userId) {
    await createNotification(
      employee.userId,
      intervention.orgId,
      "ON_CALL_INTERVENTION_REJECTED",
      "Intervención rechazada",
      "Tu intervención de guardia ha sido rechazada.",
    );
  }

  return { success: true };
}

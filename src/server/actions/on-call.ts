"use server";

import { resolveApproverUsers } from "@/lib/approvals/approval-engine";
import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/actions/notifications";
import { updateWorkdaySummary } from "@/server/actions/time-tracking";

type OnCallScheduleInput = {
  scope?: "EMPLOYEE" | "ORGANIZATION";
  employeeId?: string | null;
  startAt: string;
  endAt: string;
  notes?: string | null;
  availabilityCompensationType?: "NONE" | "TIME" | "PAY" | "MIXED";
  availabilityCompensationMinutes?: number | null;
  availabilityCompensationAmount?: number | null;
  availabilityCompensationCurrency?: string | null;
};

type OnCallInterventionInput = {
  employeeId: string;
  startAt: string;
  endAt: string;
  notes?: string | null;
  scheduleId?: string | null;
};

async function requireManagePermission() {
  const authz = await safePermission("manage_time_tracking");
  if (!authz.ok) {
    throw new Error(authz.error);
  }
  return authz.session.user.orgId;
}

async function requireViewPermission() {
  const authz = await safePermission("view_time_tracking");
  if (!authz.ok) {
    throw new Error(authz.error);
  }
  return authz.session.user.orgId;
}

function parseDate(value: string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha inválida para ${label}`);
  }
  return parsed;
}

function normalizeScheduleScope(raw?: string | null) {
  if (raw === "ORGANIZATION") return "ORGANIZATION";
  return "EMPLOYEE";
}

function normalizeAvailabilityCompensation(input: OnCallScheduleInput) {
  const rawType = typeof input.availabilityCompensationType === "string" ? input.availabilityCompensationType : "NONE";
  const type = rawType === "TIME" || rawType === "PAY" || rawType === "MIXED" || rawType === "NONE" ? rawType : "NONE";

  const rawMinutes =
    typeof input.availabilityCompensationMinutes === "number" && Number.isFinite(input.availabilityCompensationMinutes)
      ? input.availabilityCompensationMinutes
      : 0;
  const rawAmount =
    typeof input.availabilityCompensationAmount === "number" && Number.isFinite(input.availabilityCompensationAmount)
      ? input.availabilityCompensationAmount
      : 0;

  const rawCurrency =
    typeof input.availabilityCompensationCurrency === "string" ? input.availabilityCompensationCurrency.trim() : "";
  const currency = rawCurrency.length > 0 ? rawCurrency : "EUR";

  const timeEnabled = type === "TIME" || type === "MIXED";
  const payEnabled = type === "PAY" || type === "MIXED";

  return {
    type,
    minutes: timeEnabled ? Math.max(0, Math.round(rawMinutes)) : 0,
    amount: payEnabled ? Math.max(0, rawAmount) : 0,
    currency,
  };
}

function resolveScheduleCompensationFromEntity(schedule: {
  availabilityCompensationType: string;
  availabilityCompensationMinutes: number;
  availabilityCompensationAmount: unknown;
  availabilityCompensationCurrency: string;
}) {
  const type =
    schedule.availabilityCompensationType === "TIME" ||
    schedule.availabilityCompensationType === "PAY" ||
    schedule.availabilityCompensationType === "MIXED"
      ? schedule.availabilityCompensationType
      : "NONE";
  const minutes = Math.max(0, Number(schedule.availabilityCompensationMinutes) || 0);
  const amount = Math.max(0, Number(schedule.availabilityCompensationAmount) || 0);
  const trimmedCurrency = schedule.availabilityCompensationCurrency.trim();
  const currency = trimmedCurrency.length > 0 ? trimmedCurrency : "EUR";

  const timeEnabled = type === "TIME" || type === "MIXED";
  const payEnabled = type === "PAY" || type === "MIXED";

  return {
    type,
    minutes: timeEnabled ? minutes : 0,
    amount: payEnabled ? amount : 0,
    currency,
  };
}

async function findOnCallMovement(tx: typeof prisma, scheduleId: string) {
  return await tx.timeBankMovement.findFirst({
    where: {
      referenceId: scheduleId,
      origin: "ON_CALL_AVAILABILITY",
    },
  });
}

async function createOnCallTimeMovement(params: {
  tx: typeof prisma;
  orgId: string;
  employeeId: string;
  scheduleId: string;
  date: Date;
  minutes: number;
  description: string;
}) {
  const { tx, orgId, employeeId, scheduleId, date, minutes, description } = params;
  if (!minutes) return null;

  return await tx.timeBankMovement.create({
    data: {
      orgId,
      employeeId,
      date,
      minutes,
      type: "EXTRA",
      origin: "ON_CALL_AVAILABILITY",
      status: "SETTLED",
      requiresApproval: false,
      description,
      referenceId: scheduleId,
    },
  });
}

async function createOnCallCorrectionMovement(params: {
  tx: typeof prisma;
  orgId: string;
  employeeId: string;
  scheduleId: string;
  date: Date;
  minutes: number;
  description: string;
}) {
  const { tx, orgId, employeeId, scheduleId, date, minutes, description } = params;
  if (!minutes) return null;

  return await tx.timeBankMovement.create({
    data: {
      orgId,
      employeeId,
      date,
      minutes,
      type: "EXTRA",
      origin: "CORRECTION",
      status: "SETTLED",
      requiresApproval: false,
      description,
      referenceId: scheduleId,
    },
  });
}

async function syncOnCallAllowance(
  schedule: {
    id: string;
    status: string;
    startAt: Date;
    endAt: Date;
    orgId: string;
    employeeId: string | null;
    availabilityCompensationType: string;
    availabilityCompensationMinutes: number;
    availabilityCompensationAmount: unknown;
    availabilityCompensationCurrency: string;
  },
  tx: typeof prisma,
) {
  if (!schedule.employeeId) return null;

  const existing = await tx.onCallAllowance.findUnique({
    where: { scheduleId: schedule.id },
  });

  if (schedule.status === "CANCELLED") {
    if (!existing) return null;
    if (existing.status === "CANCELLED") return null;

    const shouldReverse = existing.minutes > 0;
    if (shouldReverse) {
      const existingMovement = await findOnCallMovement(tx, schedule.id);
      const existingCorrection = existingMovement
        ? await tx.timeBankMovement.findFirst({
            where: {
              referenceId: schedule.id,
              origin: "CORRECTION",
              description: "Reversión por guardia cancelada",
            },
          })
        : null;

      if (existingMovement && !existingCorrection) {
        await createOnCallCorrectionMovement({
          tx,
          orgId: schedule.orgId,
          employeeId: schedule.employeeId,
          scheduleId: schedule.id,
          date: schedule.endAt,
          minutes: -existing.minutes,
          description: "Reversión por guardia cancelada",
        });
      }
    }

    await tx.onCallAllowance.update({
      where: { id: existing.id },
      data: { status: "CANCELLED" },
    });
    return null;
  }

  if (schedule.endAt.getTime() > Date.now()) {
    return null;
  }

  const compensation = resolveScheduleCompensationFromEntity(schedule);
  if (compensation.type === "NONE" || (compensation.minutes === 0 && compensation.amount === 0)) {
    return null;
  }

  const status = compensation.amount > 0 ? "PENDING" : "SETTLED";

  if (!existing) {
    const allowance = await tx.onCallAllowance.create({
      data: {
        scheduleId: schedule.id,
        orgId: schedule.orgId,
        employeeId: schedule.employeeId,
        compensationType: compensation.type,
        minutes: compensation.minutes,
        amount: compensation.amount,
        currency: compensation.currency,
        status,
        settledAt: status === "SETTLED" ? new Date() : null,
      },
    });

    if (compensation.minutes > 0) {
      const existingMovement = await findOnCallMovement(tx, schedule.id);
      if (!existingMovement) {
        await createOnCallTimeMovement({
          tx,
          orgId: schedule.orgId,
          employeeId: schedule.employeeId,
          scheduleId: schedule.id,
          date: schedule.endAt,
          minutes: compensation.minutes,
          description: "Compensación de guardia",
        });
      }
    }

    return allowance;
  }

  if (
    existing.compensationType !== compensation.type ||
    existing.minutes !== compensation.minutes ||
    Number(existing.amount) !== compensation.amount ||
    existing.currency !== compensation.currency
  ) {
    const existingMovement = await findOnCallMovement(tx, schedule.id);
    if (existingMovement) {
      const delta = compensation.minutes - existing.minutes;
      if (delta) {
        await createOnCallCorrectionMovement({
          tx,
          orgId: schedule.orgId,
          employeeId: schedule.employeeId,
          scheduleId: schedule.id,
          date: schedule.endAt,
          minutes: delta,
          description: "Ajuste de compensación de guardia",
        });
      }
    } else if (compensation.minutes > 0) {
      await createOnCallTimeMovement({
        tx,
        orgId: schedule.orgId,
        employeeId: schedule.employeeId,
        scheduleId: schedule.id,
        date: schedule.endAt,
        minutes: compensation.minutes,
        description: "Compensación de guardia",
      });
    }

    await tx.onCallAllowance.update({
      where: { id: existing.id },
      data: {
        compensationType: compensation.type,
        minutes: compensation.minutes,
        amount: compensation.amount,
        currency: compensation.currency,
        status,
        settledAt: status === "SETTLED" ? new Date() : null,
      },
    });
  }

  return existing;
}

export async function getOnCallSchedules() {
  const orgId = await requireViewPermission();

  const schedules = await prisma.onCallSchedule.findMany({
    where: { orgId },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
      interventions: {
        select: { id: true },
      },
      allowance: {
        select: {
          id: true,
          status: true,
          minutes: true,
          amount: true,
          currency: true,
          compensationType: true,
        },
      },
    },
    orderBy: [{ startAt: "desc" }],
  });

  return schedules.map((schedule) => ({
    id: schedule.id,
    startAt: schedule.startAt,
    endAt: schedule.endAt,
    notes: schedule.notes,
    status: schedule.status,
    scope: schedule.scope,
    availabilityCompensationType: schedule.availabilityCompensationType,
    availabilityCompensationMinutes: schedule.availabilityCompensationMinutes,
    availabilityCompensationAmount: Number(schedule.availabilityCompensationAmount) || 0,
    availabilityCompensationCurrency: schedule.availabilityCompensationCurrency,
    allowance: schedule.allowance
      ? {
          id: schedule.allowance.id,
          status: schedule.allowance.status,
          minutes: schedule.allowance.minutes,
          amount: Number(schedule.allowance.amount) || 0,
          currency: schedule.allowance.currency,
          compensationType: schedule.allowance.compensationType,
        }
      : null,
    employee: schedule.employee
      ? {
          id: schedule.employee.id,
          name: `${schedule.employee.firstName} ${schedule.employee.lastName}`.trim(),
          email: schedule.employee.user.email,
        }
      : null,
    interventionCount: schedule.interventions.length,
  }));
}

export async function getOnCallInterventions() {
  const orgId = await requireViewPermission();

  const interventions = await prisma.onCallIntervention.findMany({
    where: { orgId },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
      schedule: {
        select: { id: true, startAt: true, endAt: true },
      },
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ startAt: "desc" }],
  });

  return interventions.map((intervention) => ({
    id: intervention.id,
    startAt: intervention.startAt,
    endAt: intervention.endAt,
    notes: intervention.notes,
    status: intervention.status,
    requiresApproval: intervention.requiresApproval,
    approvedAt: intervention.approvedAt,
    rejectedAt: intervention.rejectedAt,
    approver: intervention.approver
      ? {
          id: intervention.approver.id,
          name: intervention.approver.name,
          email: intervention.approver.email,
        }
      : null,
    scheduleId: intervention.scheduleId,
    schedule: intervention.schedule
      ? {
          id: intervention.schedule.id,
          label: `${intervention.schedule.startAt.toLocaleDateString("es-ES")} • ${intervention.schedule.startAt.toLocaleTimeString(
            "es-ES",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          )}`,
        }
      : null,
    employee: intervention.employee
      ? {
          id: intervention.employee.id,
          name: `${intervention.employee.firstName} ${intervention.employee.lastName}`.trim(),
          email: intervention.employee.user.email,
        }
      : null,
  }));
}

export async function createOnCallSchedule(input: OnCallScheduleInput) {
  const orgId = await requireManagePermission();
  const startAt = parseDate(input.startAt, "inicio");
  const endAt = parseDate(input.endAt, "fin");
  const scope = normalizeScheduleScope(input.scope);
  const compensation = normalizeAvailabilityCompensation(input);

  if (startAt.getTime() >= endAt.getTime()) {
    throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
  }

  if (scope === "EMPLOYEE" && !input.employeeId) {
    throw new Error("Selecciona un empleado para la guardia");
  }

  const schedule = await prisma.$transaction(async (tx) => {
    const schedule = await tx.onCallSchedule.create({
      data: {
        orgId,
        employeeId: input.employeeId ?? null,
        startAt,
        endAt,
        notes: input.notes?.trim() ?? null,
        status: "SCHEDULED",
        scope,
        availabilityCompensationType: compensation.type,
        availabilityCompensationMinutes: compensation.minutes,
        availabilityCompensationAmount: compensation.amount,
        availabilityCompensationCurrency: compensation.currency,
      },
    });

    await syncOnCallAllowance(schedule, tx);

    return schedule;
  });

  if (schedule.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: schedule.employeeId },
      select: { userId: true, firstName: true, lastName: true },
    });

    if (employee?.userId) {
      await createNotification(
        employee.userId,
        orgId,
        "ON_CALL_SCHEDULE_ASSIGNED",
        "Nueva guardia asignada",
        `Tienes una guardia programada del ${schedule.startAt.toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        })} al ${schedule.endAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}.`,
      );
    }
  }

  return { success: true, scheduleId: schedule.id };
}

export async function updateOnCallSchedule(id: string, input: OnCallScheduleInput) {
  const orgId = await requireManagePermission();
  const startAt = parseDate(input.startAt, "inicio");
  const endAt = parseDate(input.endAt, "fin");
  const scope = normalizeScheduleScope(input.scope);
  const compensation = normalizeAvailabilityCompensation(input);

  if (startAt.getTime() >= endAt.getTime()) {
    throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
  }

  if (scope === "EMPLOYEE" && !input.employeeId) {
    throw new Error("Selecciona un empleado para la guardia");
  }

  const existing = await prisma.onCallSchedule.findUnique({
    where: { id },
    select: { orgId: true },
  });

  if (!existing || existing.orgId !== orgId) {
    throw new Error("Guardia no encontrada");
  }

  const schedule = await prisma.$transaction(async (tx) => {
    const schedule = await tx.onCallSchedule.update({
      where: { id },
      data: {
        employeeId: input.employeeId ?? null,
        startAt,
        endAt,
        notes: input.notes?.trim() ?? null,
        scope,
        availabilityCompensationType: compensation.type,
        availabilityCompensationMinutes: compensation.minutes,
        availabilityCompensationAmount: compensation.amount,
        availabilityCompensationCurrency: compensation.currency,
      },
    });

    await syncOnCallAllowance(schedule, tx);

    return schedule;
  });

  if (schedule.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: schedule.employeeId },
      select: { userId: true, firstName: true, lastName: true },
    });

    if (employee?.userId) {
      await createNotification(
        employee.userId,
        orgId,
        "ON_CALL_SCHEDULE_UPDATED",
        "Guardia actualizada",
        `Se ha actualizado tu guardia del ${schedule.startAt.toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        })} al ${schedule.endAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}.`,
      );
    }
  }

  return { success: true, scheduleId: schedule.id };
}

export async function cancelOnCallSchedule(id: string) {
  const orgId = await requireManagePermission();

  const existing = await prisma.onCallSchedule.findUnique({
    where: { id },
    select: { orgId: true, employeeId: true },
  });

  if (!existing || existing.orgId !== orgId) {
    throw new Error("Guardia no encontrada");
  }

  const schedule = await prisma.$transaction(async (tx) => {
    const updated = await tx.onCallSchedule.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    await syncOnCallAllowance(updated, tx);

    return updated;
  });

  if (schedule.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: schedule.employeeId },
      select: { userId: true, firstName: true, lastName: true },
    });

    if (employee?.userId) {
      await createNotification(
        employee.userId,
        orgId,
        "ON_CALL_SCHEDULE_CANCELLED",
        "Guardia cancelada",
        `Se ha cancelado la guardia del ${schedule.startAt.toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        })} al ${schedule.endAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}.`,
      );
    }
  }

  return { success: true, scheduleId: schedule.id };
}

export async function createOnCallIntervention(input: OnCallInterventionInput) {
  const orgId = await requireManagePermission();
  const startAt = parseDate(input.startAt, "inicio");
  const endAt = parseDate(input.endAt, "fin");

  if (startAt.getTime() >= endAt.getTime()) {
    throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
  }

  const approvers = await resolveApproverUsers(input.employeeId, orgId, "ON_CALL_INTERVENTION");
  const approverIds = approvers.map((approver) => approver.userId);
  const approverId = approverIds[0] ?? null;
  const requiresApproval = approverIds.length > 0;

  const intervention = await prisma.$transaction(async (tx) => {
    const created = await tx.onCallIntervention.create({
      data: {
        orgId,
        employeeId: input.employeeId,
        startAt,
        endAt,
        notes: input.notes?.trim() ?? null,
        scheduleId: input.scheduleId ?? null,
        status: requiresApproval ? "PENDING_APPROVAL" : "REGISTERED",
        requiresApproval,
        approverId: requiresApproval ? approverId : null,
      },
    });

    if (requiresApproval) {
      return created;
    }

    const clockIn = await tx.timeEntry.create({
      data: {
        orgId,
        employeeId: input.employeeId,
        entryType: "CLOCK_IN",
        timestamp: startAt,
        isManual: true,
        onCallInterventionId: created.id,
        notes: "Intervención de guardia",
      },
    });

    const clockOut = await tx.timeEntry.create({
      data: {
        orgId,
        employeeId: input.employeeId,
        entryType: "CLOCK_OUT",
        timestamp: endAt,
        isManual: true,
        onCallInterventionId: created.id,
        notes: "Intervención de guardia",
      },
    });

    await tx.onCallIntervention.update({
      where: { id: created.id },
      data: {
        createdClockInId: clockIn.id,
        createdClockOutId: clockOut.id,
      },
    });

    return created;
  });

  if (requiresApproval) {
    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { firstName: true, lastName: true },
    });
    const employeeLabel = employee ? `${employee.firstName} ${employee.lastName}`.trim() : "Un empleado";

    for (const recipientId of approverIds) {
      await createNotification(
        recipientId,
        orgId,
        "ON_CALL_INTERVENTION_PENDING",
        "Intervención pendiente de aprobación",
        `${employeeLabel} registró una intervención del ${startAt.toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        })} al ${endAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}.`,
      );
    }
    return intervention;
  }

  await updateWorkdaySummary(input.employeeId, orgId, startAt);
  if (startAt.toDateString() !== endAt.toDateString()) {
    await updateWorkdaySummary(input.employeeId, orgId, endAt);
  }

  return intervention;
}

export async function updateOnCallIntervention(id: string, input: OnCallInterventionInput) {
  const orgId = await requireManagePermission();
  const startAt = parseDate(input.startAt, "inicio");
  const endAt = parseDate(input.endAt, "fin");

  if (startAt.getTime() >= endAt.getTime()) {
    throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
  }

  const existing = await prisma.onCallIntervention.findUnique({
    where: { id },
    select: {
      orgId: true,
      createdClockInId: true,
      createdClockOutId: true,
      status: true,
      requiresApproval: true,
      employeeId: true,
    },
  });

  if (!existing || existing.orgId !== orgId) {
    throw new Error("Intervención no encontrada");
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (existing.status === "PENDING_APPROVAL") {
      const approvers = await resolveApproverUsers(input.employeeId, orgId, "ON_CALL_INTERVENTION");
      const approverIds = approvers.map((approver) => approver.userId);
      const approverId = approverIds[0] ?? null;
      const requiresApproval = approverIds.length > 0;

      const updatedPending = await tx.onCallIntervention.update({
        where: { id },
        data: {
          employeeId: input.employeeId,
          startAt,
          endAt,
          notes: input.notes?.trim() ?? null,
          scheduleId: input.scheduleId ?? null,
          requiresApproval,
          approverId: requiresApproval ? approverId : null,
          status: requiresApproval ? "PENDING_APPROVAL" : "REGISTERED",
        },
      });

      if (!requiresApproval) {
        const clockIn = await tx.timeEntry.create({
          data: {
            orgId,
            employeeId: input.employeeId,
            entryType: "CLOCK_IN",
            timestamp: startAt,
            isManual: true,
            onCallInterventionId: updatedPending.id,
            notes: "Intervención de guardia",
          },
        });

        const clockOut = await tx.timeEntry.create({
          data: {
            orgId,
            employeeId: input.employeeId,
            entryType: "CLOCK_OUT",
            timestamp: endAt,
            isManual: true,
            onCallInterventionId: updatedPending.id,
            notes: "Intervención de guardia",
          },
        });

        await tx.onCallIntervention.update({
          where: { id: updatedPending.id },
          data: {
            createdClockInId: clockIn.id,
            createdClockOutId: clockOut.id,
          },
        });
      }

      return updatedPending;
    }

    const updatedRegular = await tx.onCallIntervention.update({
      where: { id },
      data: {
        employeeId: input.employeeId,
        startAt,
        endAt,
        notes: input.notes?.trim() ?? null,
        scheduleId: input.scheduleId ?? null,
      },
    });

    if (existing.createdClockInId) {
      await tx.timeEntry.update({
        where: { id: existing.createdClockInId },
        data: {
          employeeId: input.employeeId,
          timestamp: startAt,
        },
      });
    }

    if (existing.createdClockOutId) {
      await tx.timeEntry.update({
        where: { id: existing.createdClockOutId },
        data: {
          employeeId: input.employeeId,
          timestamp: endAt,
        },
      });
    }

    return updatedRegular;
  });

  if (updated.status !== "PENDING_APPROVAL") {
    await updateWorkdaySummary(input.employeeId, orgId, startAt);
    if (startAt.toDateString() !== endAt.toDateString()) {
      await updateWorkdaySummary(input.employeeId, orgId, endAt);
    }
  }

  return updated;
}

export async function rejectOnCallIntervention(id: string) {
  const orgId = await requireManagePermission();

  const existing = await prisma.onCallIntervention.findUnique({
    where: { id },
    select: {
      orgId: true,
      createdClockInId: true,
      createdClockOutId: true,
      employeeId: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });

  if (!existing || existing.orgId !== orgId) {
    throw new Error("Intervención no encontrada");
  }

  await prisma.onCallIntervention.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: "Intervención de guardia rechazada",
    },
  });

  if (existing.createdClockInId) {
    await prisma.timeEntry.update({
      where: { id: existing.createdClockInId },
      data: {
        isCancelled: true,
        cancellationReason: "ADMIN_CORRECTION",
        cancelledAt: new Date(),
        cancellationNotes: "Intervención de guardia rechazada",
      },
    });
  }

  if (existing.createdClockOutId) {
    await prisma.timeEntry.update({
      where: { id: existing.createdClockOutId },
      data: {
        isCancelled: true,
        cancellationReason: "ADMIN_CORRECTION",
        cancelledAt: new Date(),
        cancellationNotes: "Intervención de guardia rechazada",
      },
    });
  }

  if (existing.createdClockInId || existing.createdClockOutId) {
    await updateWorkdaySummary(existing.employeeId, orgId, existing.startAt);
    if (existing.startAt.toDateString() !== existing.endAt.toDateString()) {
      await updateWorkdaySummary(existing.employeeId, orgId, existing.endAt);
    }
  }

  const employee = await prisma.employee.findUnique({
    where: { id: existing.employeeId },
    select: { userId: true },
  });

  if (employee?.userId) {
    await createNotification(
      employee.userId,
      orgId,
      "ON_CALL_INTERVENTION_REJECTED",
      "Intervención rechazada",
      "Tu intervención de guardia ha sido rechazada.",
    );
  }

  return { success: true };
}

"use server";

import { canUserApprove } from "@/lib/approvals/approval-engine";
import { auth } from "@/lib/auth";
import { isEmployeePausedDuringRange } from "@/lib/contracts/discontinuous-utils";
import { prisma } from "@/lib/prisma";
import { enqueueOvertimeWorkdayJob } from "@/server/jobs/overtime-queue";
import { getEffectiveSchedule } from "@/services/schedules/schedule-engine";
import { calculateWorkdayTotals, extractPaidBreakSlots } from "@/services/time-tracking";
import type { EffectiveSchedule } from "@/types/schedule";

import { createNotification } from "./notifications";
import { resolvePaidBreakSlotIdsFromEntries } from "./shared/paid-breaks";

type ApproverRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ApproverManualTimeEntryTotals {
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
    select: { id: true, orgId: true, role: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return { session, user };
}

type ManualSlot = {
  startMinutes: number;
  endMinutes: number;
  slotType: "WORK" | "BREAK";
  sortOrder: number;
};

function buildUtcDayStart(date: Date): Date {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const day = date.getUTCDate();
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
}

function buildUtcDayEnd(date: Date): Date {
  const dayStart = buildUtcDayStart(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCHours(23, 59, 59, 999);
  return dayEnd;
}

function buildTimestamp(dayStartUtc: Date, minutes: number): Date {
  return new Date(dayStartUtc.getTime() + minutes * 60 * 1000);
}

function normalizeManualSlots(rawSlots: ManualSlot[]): ManualSlot[] {
  return [...rawSlots]
    .map((slot, index) => ({
      startMinutes: Number(slot.startMinutes),
      endMinutes: Number(slot.endMinutes),
      slotType: slot.slotType,
      sortOrder: Number.isFinite(slot.sortOrder) ? slot.sortOrder : index,
    }))
    .sort((a, b) => {
      if (a.sortOrder === b.sortOrder) {
        return a.startMinutes - b.startMinutes;
      }
      return a.sortOrder - b.sortOrder;
    });
}

function validateManualSlots(slots: ManualSlot[]) {
  if (slots.length === 0) {
    throw new Error("No hay tramos de trabajo válidos en la solicitud");
  }

  if (slots[0]?.slotType !== "WORK") {
    throw new Error("El primer tramo debe ser de trabajo");
  }

  const lastSlot = slots[slots.length - 1];
  if (lastSlot?.slotType !== "WORK") {
    throw new Error("El último tramo debe ser de trabajo");
  }

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (slot.slotType !== "WORK" && slot.slotType !== "BREAK") {
      throw new Error("Tipo de tramo inválido en la solicitud");
    }

    if (!Number.isFinite(slot.startMinutes) || !Number.isFinite(slot.endMinutes)) {
      throw new Error("Horas inválidas en los tramos");
    }

    if (slot.startMinutes < 0 || slot.endMinutes > 1440) {
      throw new Error("Los tramos deben estar entre 00:00 y 24:00");
    }

    if (slot.startMinutes >= slot.endMinutes) {
      throw new Error("La hora de inicio debe ser anterior a la hora de fin");
    }

    const prev = slots[i - 1];
    if (prev && slot.startMinutes < prev.endMinutes) {
      throw new Error("Hay solapamientos entre tramos");
    }
  }
}

function buildTimeEntriesFromSlots(dayStartUtc: Date, slots: ManualSlot[]) {
  const entries: Array<{ entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END"; timestamp: Date }> = [];
  const normalized = normalizeManualSlots(slots);
  validateManualSlots(normalized);

  let state: "OFF" | "WORK" | "BREAK" = "OFF";
  let lastEnd: number | null = null;

  for (const slot of normalized) {
    if (lastEnd !== null && slot.startMinutes > lastEnd) {
      if (state === "BREAK") {
        entries.push({ entryType: "BREAK_END", timestamp: buildTimestamp(dayStartUtc, lastEnd) });
      }
      if (state === "WORK" || state === "BREAK") {
        entries.push({ entryType: "CLOCK_OUT", timestamp: buildTimestamp(dayStartUtc, lastEnd) });
      }
      state = "OFF";
    }

    if (slot.slotType === "WORK") {
      if (state === "OFF") {
        entries.push({ entryType: "CLOCK_IN", timestamp: buildTimestamp(dayStartUtc, slot.startMinutes) });
      } else if (state === "BREAK") {
        entries.push({ entryType: "BREAK_END", timestamp: buildTimestamp(dayStartUtc, slot.startMinutes) });
      }
      state = "WORK";
    } else {
      if (state === "OFF") {
        throw new Error("Hay una pausa sin tramo de trabajo previo");
      }
      if (state === "WORK") {
        entries.push({ entryType: "BREAK_START", timestamp: buildTimestamp(dayStartUtc, slot.startMinutes) });
      }
      state = "BREAK";
    }

    lastEnd = slot.endMinutes;
  }

  if (lastEnd !== null && state === "WORK") {
    entries.push({ entryType: "CLOCK_OUT", timestamp: buildTimestamp(dayStartUtc, lastEnd) });
  } else if (lastEnd !== null && state === "BREAK") {
    entries.push({ entryType: "BREAK_END", timestamp: buildTimestamp(dayStartUtc, lastEnd) });
    entries.push({ entryType: "CLOCK_OUT", timestamp: buildTimestamp(dayStartUtc, lastEnd) });
  }

  return entries;
}

/**
 * Obtiene las solicitudes de fichaje manual pendientes de aprobación
 */
export async function getManualTimeEntryRequestsToApprove(status: ApproverRequestStatus) {
  try {
    const { session, user } = await getApproverBaseData();

    const requests = await prisma.manualTimeEntryRequest.findMany({
      where: {
        orgId: user.orgId,
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
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    const uniqueEmployeeIds = Array.from(new Set(requests.map((request) => request.employeeId)));
    const approvals = await Promise.all(
      uniqueEmployeeIds.map(async (employeeId) => {
        const canApprove = await canUserApprove(session.user.id, employeeId, "MANUAL_TIME_ENTRY");
        return [employeeId, canApprove] as const;
      }),
    );
    const approvalMap = new Map(approvals);

    const filteredRequests = requests.filter((request) => approvalMap.get(request.employeeId));
    const totals: ApproverManualTimeEntryTotals = filteredRequests.reduce(
      (acc, request) => {
        if (request.status === "PENDING") {
          acc.pending += 1;
        } else if (request.status === "APPROVED") {
          acc.approved += 1;
        } else if (request.status === "REJECTED") {
          acc.rejected += 1;
        }
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 },
    );

    const filteredByStatus = filteredRequests.filter((request) => request.status === status);

    return {
      requests: filteredByStatus.map((r) => ({
        id: r.id,
        date: r.date,
        clockInTime: r.clockInTime,
        clockOutTime: r.clockOutTime,
        reason: r.reason,
        status: r.status,
        submittedAt: r.submittedAt,
        approvedAt: r.approvedAt,
        rejectedAt: r.rejectedAt,
        approverComments: r.approverComments,
        rejectionReason: r.rejectionReason,
        employee: r.employee,
      })),
      totals,
    };
  } catch (error) {
    console.error("Error al obtener solicitudes de fichaje manual:", error);
    throw error;
  }
}

/**
 * Aprobar una solicitud de fichaje manual
 */
interface ApproveManualTimeEntryRequestInput {
  requestId: string;
  comments?: string;
}

export async function approveManualTimeEntryRequest(input: ApproveManualTimeEntryRequestInput) {
  try {
    const { session, user } = await getApproverBaseData();

    // Buscar la solicitud
    const request = await prisma.manualTimeEntryRequest.findUnique({
      where: { id: input.requestId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
        slots: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!request) {
      throw new Error("Solicitud no encontrada");
    }

    const canApprove = await canUserApprove(session.user.id, request.employeeId, "MANUAL_TIME_ENTRY");
    if (!canApprove) {
      throw new Error("No tienes permiso para aprobar esta solicitud");
    }

    if (request.status !== "PENDING") {
      throw new Error("Solo puedes aprobar solicitudes pendientes");
    }

    const isPausedForRange = await isEmployeePausedDuringRange(
      request.employeeId,
      request.date,
      request.date,
      user.orgId,
    );
    if (isPausedForRange) {
      throw new Error("El contrato fijo discontinuo del empleado está pausado en esa fecha.");
    }

    // Verificar nuevamente que no existan fichajes automáticos para ese día
    const dayStart = buildUtcDayStart(request.date);
    const dayEnd = buildUtcDayEnd(request.date);

    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId: request.employeeId,
        orgId: user.orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        id: true,
        entryType: true,
        manualRequestId: true,
      },
    });

    // Consideramos automáticos los fichajes sin solicitud manual asociada
    const automaticEntries = existingEntries.filter((entry) => entry.manualRequestId === null);

    // Si hay entradas automáticas pero la solicitud NO marca reemplazo, rechazar
    if (automaticEntries.length > 0 && !request.replacesIncompleteEntry) {
      throw new Error("El empleado ya tiene fichajes automáticos para ese día. No se puede aprobar.");
    }

    // Si la solicitud marca reemplazo, verificar que las entradas a reemplazar aún existen
    if (request.replacesIncompleteEntry && request.replacedEntryIds.length > 0) {
      const entriesToReplace = await prisma.timeEntry.findMany({
        where: {
          id: { in: request.replacedEntryIds },
          employeeId: request.employeeId,
          orgId: user.orgId,
        },
      });

      if (entriesToReplace.length !== request.replacedEntryIds.length) {
        throw new Error("Algunas entradas a reemplazar ya no existen. Contacta con RRHH.");
      }

      // CANCELAR (no eliminar) las entradas automáticas para mantener auditoría
      await prisma.timeEntry.updateMany({
        where: {
          id: { in: request.replacedEntryIds },
        },
        data: {
          isCancelled: true,
          cancellationReason: "REPLACED_BY_MANUAL_REQUEST",
          cancelledAt: new Date(),
          cancellationNotes: `Reemplazado por solicitud manual aprobada (ID: ${request.id})`,
        },
      });
    }

    const manualNote = `Fichaje manual aprobado. Motivo: ${request.reason}`;
    const dayStartUtc = buildUtcDayStart(request.date);

    let createdEntries: Array<{ id: string; entryType: string; timestamp: Date }> = [];

    if (request.slots && request.slots.length > 0) {
      const slotPayload = request.slots.map((slot) => ({
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        slotType: slot.slotType === "BREAK" ? "BREAK" : "WORK",
        sortOrder: slot.sortOrder,
      }));

      const entriesToCreate = buildTimeEntriesFromSlots(dayStartUtc, slotPayload).sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      createdEntries = await prisma.$transaction(
        entriesToCreate.map((entry) =>
          prisma.timeEntry.create({
            data: {
              orgId: user.orgId,
              employeeId: request.employeeId,
              entryType: entry.entryType,
              timestamp: entry.timestamp,
              isManual: true,
              manualRequestId: request.id,
              notes: manualNote,
            },
          }),
        ),
      );
    } else {
      const clockInEntry = await prisma.timeEntry.create({
        data: {
          orgId: user.orgId,
          employeeId: request.employeeId,
          entryType: "CLOCK_IN",
          timestamp: request.clockInTime,
          isManual: true,
          manualRequestId: request.id,
          notes: manualNote,
        },
      });

      const clockOutEntry = await prisma.timeEntry.create({
        data: {
          orgId: user.orgId,
          employeeId: request.employeeId,
          entryType: "CLOCK_OUT",
          timestamp: request.clockOutTime,
          isManual: true,
          manualRequestId: request.id,
          notes: manualNote,
        },
      });

      createdEntries = [clockInEntry, clockOutEntry];
    }

    const clockInEntry = createdEntries.find((entry) => entry.entryType === "CLOCK_IN") ?? null;
    const clockOutEntry = [...createdEntries].reverse().find((entry) => entry.entryType === "CLOCK_OUT") ?? null;

    // Actualizar el WorkdaySummary del día
    console.log("📊 ACTUALIZANDO WorkdaySummary después de aprobar fichaje manual...");
    console.log(`   Día: ${dayStart.toLocaleDateString("es-ES")}`);
    console.log(`   Empleado: ${request.employeeId}`);

    const allEntriesOfDay = await prisma.timeEntry.findMany({
      where: {
        employeeId: request.employeeId,
        orgId: user.orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    console.log(`   📋 Total fichajes encontrados (incluidos cancelados): ${allEntriesOfDay.length}`);

    // IMPORTANTE: Solo calcular con fichajes NO cancelados
    const activeEntries = allEntriesOfDay.filter((e) => !e.isCancelled);
    const cancelledEntries = allEntriesOfDay.filter((e) => e.isCancelled);

    console.log(`   ✅ Fichajes ACTIVOS: ${activeEntries.length}`);
    console.log(`   🚫 Fichajes CANCELADOS: ${cancelledEntries.length}`);

    // Log de todos los fichajes activos
    for (const entry of activeEntries) {
      const manualMark = entry.isManual ? "📝 MANUAL" : "🤖 AUTO";
      console.log(
        `   ${manualMark} | ${entry.entryType.padEnd(12)} | ${new Date(entry.timestamp).toLocaleString("es-ES")}`,
      );
    }

    let effectiveSchedule: EffectiveSchedule | null = null;
    try {
      effectiveSchedule = await getEffectiveSchedule(request.employeeId, dayStart);
    } catch {
      effectiveSchedule = null;
    }

    const paidBreakSlotIds = await resolvePaidBreakSlotIdsFromEntries(activeEntries);
    const paidBreakSlots = extractPaidBreakSlots(effectiveSchedule);
    const totals = calculateWorkdayTotals(activeEntries, dayStart, {
      paidBreakSlotIds,
      paidBreakSlots,
    });

    const worked = totals.workedMinutes;
    const breakTime = totals.breakMinutes;

    console.log(`   💡 Calculado: ${worked.toFixed(2)} min trabajados (${(worked / 60).toFixed(2)}h)`);
    console.log(`   ☕ Pausas: ${breakTime.toFixed(2)} min (${(breakTime / 60).toFixed(2)}h)`);
    if (totals.paidBreakMinutes > 0) {
      console.log(
        `   ✅ Pausas computables: ${totals.paidBreakMinutes.toFixed(2)} min (${(totals.paidBreakMinutes / 60).toFixed(2)}h)`,
      );
    }

    const firstEntry = activeEntries.find((e) => e.entryType === "CLOCK_IN");
    const lastExit = [...activeEntries].reverse().find((e) => e.entryType === "CLOCK_OUT");

    // Determinar el estado (COMPLETED si tiene salida)
    const status = lastExit ? "COMPLETED" : "IN_PROGRESS";

    console.log(`   📊 Estado: ${status}`);

    const updatedSummary = await prisma.workdaySummary.upsert({
      where: {
        orgId_employeeId_date: {
          orgId: user.orgId,
          employeeId: request.employeeId,
          date: dayStart,
        },
      },
      create: {
        orgId: user.orgId,
        employeeId: request.employeeId,
        date: dayStart,
        clockIn: firstEntry?.timestamp ?? null,
        clockOut: lastExit?.timestamp ?? null,
        totalWorkedMinutes: worked,
        totalBreakMinutes: breakTime,
        status,
        overtimeCalcStatus: "DIRTY",
        overtimeCalcUpdatedAt: new Date(),
      },
      update: {
        clockIn: firstEntry?.timestamp ?? null,
        clockOut: lastExit?.timestamp ?? null,
        totalWorkedMinutes: worked,
        totalBreakMinutes: breakTime,
        status,
        overtimeCalcStatus: "DIRTY",
        overtimeCalcUpdatedAt: new Date(),
      },
    });

    console.log("   ✅ WorkdaySummary actualizado correctamente");
    console.log(`   💾 Guardado en BD: ${updatedSummary.totalWorkedMinutes} min trabajados`);

    const summaryFlags =
      updatedSummary.resolutionFlags && typeof updatedSummary.resolutionFlags === "object"
        ? updatedSummary.resolutionFlags
        : {};
    await prisma.workdaySummary.update({
      where: { id: updatedSummary.id },
      data: {
        resolutionStatus: "RESOLVED_APPROVED",
        dataQuality: "CONFIRMED",
        resolvedAt: new Date(),
        resolutionFlags: {
          ...summaryFlags,
          manualRequestId: request.id,
          approvedById: session.user.id,
        },
        overtimeCalcStatus: "DIRTY",
        overtimeCalcUpdatedAt: new Date(),
      },
    });

    await enqueueOvertimeWorkdayJob({
      orgId: user.orgId,
      employeeId: request.employeeId,
      date: dayStart.toISOString().split("T")[0],
    });

    // Actualizar la solicitud como aprobada
    await prisma.manualTimeEntryRequest.update({
      where: { id: input.requestId },
      data: {
        status: "APPROVED",
        approverId: session.user.id,
        approvedAt: new Date(),
        approverComments: input.comments,
        createdClockInId: clockInEntry?.id ?? null,
        createdClockOutId: clockOutEntry?.id ?? null,
      },
    });

    // Notificar al empleado
    if (request.employee.userId) {
      await createNotification(
        request.employee.userId,
        user.orgId,
        "MANUAL_TIME_ENTRY_APPROVED",
        "Fichaje manual aprobado",
        `Tu solicitud de fichaje manual para el ${request.date.toLocaleDateString("es-ES")} ha sido aprobada`,
        undefined, // ptoRequestId
        request.id, // manualTimeEntryRequestId
      );
    }

    return {
      success: true,
      message: "Solicitud aprobada correctamente",
    };
  } catch (error) {
    console.error("Error al aprobar solicitud de fichaje manual:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Rechazar una solicitud de fichaje manual
 */
interface RejectManualTimeEntryRequestInput {
  requestId: string;
  rejectionReason: string;
}

export async function rejectManualTimeEntryRequest(input: RejectManualTimeEntryRequestInput) {
  try {
    const { session, user } = await getApproverBaseData();

    if (!input.rejectionReason || input.rejectionReason.trim().length < 10) {
      throw new Error("El motivo del rechazo debe tener al menos 10 caracteres");
    }

    // Buscar la solicitud
    const request = await prisma.manualTimeEntryRequest.findUnique({
      where: { id: input.requestId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
      },
    });

    if (!request) {
      throw new Error("Solicitud no encontrada");
    }

    const canApprove = await canUserApprove(session.user.id, request.employeeId, "MANUAL_TIME_ENTRY");
    if (!canApprove) {
      throw new Error("No tienes permiso para rechazar esta solicitud");
    }

    if (request.status !== "PENDING") {
      throw new Error("Solo puedes rechazar solicitudes pendientes");
    }

    // Actualizar la solicitud como rechazada
    await prisma.manualTimeEntryRequest.update({
      where: { id: input.requestId },
      data: {
        status: "REJECTED",
        approverId: session.user.id,
        rejectedAt: new Date(),
        rejectionReason: input.rejectionReason.trim(),
      },
    });

    const dayStart = buildUtcDayStart(request.date);
    const summary = await prisma.workdaySummary.findUnique({
      where: {
        orgId_employeeId_date: {
          orgId: user.orgId,
          employeeId: request.employeeId,
          date: dayStart,
        },
      },
    });

    if (summary) {
      const summaryFlags =
        summary.resolutionFlags && typeof summary.resolutionFlags === "object" ? summary.resolutionFlags : {};
      await prisma.workdaySummary.update({
        where: { id: summary.id },
        data: {
          resolutionStatus: "RESOLVED_REJECTED",
          dataQuality: "LOW",
          resolvedAt: new Date(),
          resolutionFlags: {
            ...summaryFlags,
            manualRequestId: request.id,
            rejectedById: session.user.id,
          },
          overtimeCalcStatus: "DIRTY",
          overtimeCalcUpdatedAt: new Date(),
        },
      });
    }

    // Notificar al empleado
    if (request.employee.userId) {
      await createNotification(
        request.employee.userId,
        user.orgId,
        "MANUAL_TIME_ENTRY_REJECTED",
        "Fichaje manual rechazado",
        `Tu solicitud de fichaje manual para el ${request.date.toLocaleDateString("es-ES")} ha sido rechazada. Motivo: ${input.rejectionReason}`,
        undefined, // ptoRequestId
        request.id, // manualTimeEntryRequestId
      );
    }

    return {
      success: true,
      message: "Solicitud rechazada correctamente",
    };
  } catch (error) {
    console.error("Error al rechazar solicitud de fichaje manual:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

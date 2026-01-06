"use server";

import { startOfDay, endOfDay } from "date-fns";

import { canUserApprove } from "@/lib/approvals/approval-engine";
import { auth } from "@/lib/auth";
import { isEmployeePausedDuringRange } from "@/lib/contracts/discontinuous-utils";
import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";

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
 * Helper para calcular minutos trabajados desde las entradas
 */
function calculateWorkedMinutes(entries: any[]): { worked: number; break: number } {
  let totalWorked = 0;
  let totalBreak = 0;
  let lastClockIn: Date | null = null;
  let lastBreakStart: Date | null = null;

  const sorted = entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (const entry of sorted) {
    switch (entry.entryType) {
      case "CLOCK_IN":
        lastClockIn = entry.timestamp;
        break;

      case "BREAK_START":
        if (lastClockIn) {
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          lastBreakStart = entry.timestamp;
          lastClockIn = null;
        }
        break;

      case "BREAK_END":
        if (lastBreakStart) {
          const minutes = (entry.timestamp.getTime() - lastBreakStart.getTime()) / (1000 * 60);
          totalBreak += minutes;
          lastClockIn = entry.timestamp;
          lastBreakStart = null;
        }
        break;

      case "CLOCK_OUT":
        if (lastClockIn) {
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          lastClockIn = null;
        }
        if (lastBreakStart) {
          const minutes = (new Date().getTime() - lastBreakStart.getTime()) / (1000 * 60);
          totalBreak += minutes;
          lastBreakStart = null;
        }
        break;
    }
  }

  return {
    worked: totalWorked,
    break: totalBreak,
  };
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
    const dayStart = startOfDay(request.date);
    const dayEnd = endOfDay(request.date);

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

    // Crear los TimeEntry manuales
    const clockInEntry = await prisma.timeEntry.create({
      data: {
        orgId: user.orgId,
        employeeId: request.employeeId,
        entryType: "CLOCK_IN",
        timestamp: request.clockInTime,
        isManual: true,
        manualRequestId: request.id,
        notes: `Fichaje manual aprobado. Motivo: ${request.reason}`,
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
        notes: `Fichaje manual aprobado. Motivo: ${request.reason}`,
      },
    });

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

    const { worked, break: breakTime } = calculateWorkedMinutes(activeEntries);

    console.log(`   💡 Calculado: ${worked.toFixed(2)} min trabajados (${(worked / 60).toFixed(2)}h)`);
    console.log(`   ☕ Pausas: ${breakTime.toFixed(2)} min (${(breakTime / 60).toFixed(2)}h)`);

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
      },
      update: {
        clockIn: firstEntry?.timestamp ?? null,
        clockOut: lastExit?.timestamp ?? null,
        totalWorkedMinutes: worked,
        totalBreakMinutes: breakTime,
        status,
      },
    });

    console.log("   ✅ WorkdaySummary actualizado correctamente");
    console.log(`   💾 Guardado en BD: ${updatedSummary.totalWorkedMinutes} min trabajados`);

    // Actualizar la solicitud como aprobada
    await prisma.manualTimeEntryRequest.update({
      where: { id: input.requestId },
      data: {
        status: "APPROVED",
        approverId: session.user.id,
        approvedAt: new Date(),
        approverComments: input.comments,
        createdClockInId: clockInEntry.id,
        createdClockOutId: clockOutEntry.id,
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

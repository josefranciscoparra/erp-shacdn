"use server";

import { startOfDay, endOfDay } from "date-fns";

import { auth } from "@/lib/auth";
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

    // Buscar solicitudes donde el usuario es el aprobador
    const requests = await prisma.manualTimeEntryRequest.findMany({
      where: {
        orgId: user.orgId,
        approverId: session.user.id,
        status,
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

    // Contar totales
    const [pendingTotal, approvedTotal, rejectedTotal] = await Promise.all([
      prisma.manualTimeEntryRequest.count({
        where: {
          orgId: user.orgId,
          approverId: session.user.id,
          status: "PENDING",
        },
      }),
      prisma.manualTimeEntryRequest.count({
        where: {
          orgId: user.orgId,
          approverId: session.user.id,
          status: "APPROVED",
        },
      }),
      prisma.manualTimeEntryRequest.count({
        where: {
          orgId: user.orgId,
          approverId: session.user.id,
          status: "REJECTED",
        },
      }),
    ]);

    const totals: ApproverManualTimeEntryTotals = {
      pending: pendingTotal,
      approved: approvedTotal,
      rejected: rejectedTotal,
    };

    return {
      requests: requests.map((r) => ({
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

    // Verificar permisos (debe ser el aprobador asignado o HR_ADMIN)
    if (request.approverId !== session.user.id && user.role !== "HR_ADMIN") {
      throw new Error("No tienes permiso para aprobar esta solicitud");
    }

    if (request.status !== "PENDING") {
      throw new Error("Solo puedes aprobar solicitudes pendientes");
    }

    // Verificar nuevamente que no existan fichajes automáticos para ese día
    const dayStart = startOfDay(request.date);
    const dayEnd = endOfDay(request.date);

    const existingEntries = await prisma.timeEntry.findFirst({
      where: {
        employeeId: request.employeeId,
        orgId: user.orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
        isManual: false,
      },
    });

    if (existingEntries) {
      throw new Error("El empleado ya tiene fichajes automáticos para ese día. No se puede aprobar.");
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

    const { worked, break: breakTime } = calculateWorkedMinutes(allEntriesOfDay);

    const firstEntry = allEntriesOfDay.find((e) => e.entryType === "CLOCK_IN");
    const lastExit = [...allEntriesOfDay].reverse().find((e) => e.entryType === "CLOCK_OUT");

    // Determinar el estado (COMPLETED si tiene salida)
    const status = lastExit ? "COMPLETED" : "IN_PROGRESS";

    await prisma.workdaySummary.upsert({
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
        clockIn: firstEntry?.timestamp,
        clockOut: lastExit?.timestamp,
        totalWorkedMinutes: worked,
        totalBreakMinutes: breakTime,
        status,
      },
      update: {
        clockIn: firstEntry?.timestamp,
        clockOut: lastExit?.timestamp,
        totalWorkedMinutes: worked,
        totalBreakMinutes: breakTime,
        status,
      },
    });

    // Actualizar la solicitud como aprobada
    await prisma.manualTimeEntryRequest.update({
      where: { id: input.requestId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approverComments: input.comments,
        createdClockInId: clockInEntry.id,
        createdClockOutId: clockOutEntry.id,
      },
    });

    // Notificar al empleado
    if (request.employee.userId) {
      await createNotification({
        userId: request.employee.userId,
        orgId: user.orgId,
        type: "MANUAL_TIME_ENTRY_APPROVED",
        title: "Fichaje manual aprobado",
        message: `Tu solicitud de fichaje manual para el ${request.date.toLocaleDateString("es-ES")} ha sido aprobada`,
      });
    }

    return {
      success: true,
      message: "Solicitud aprobada correctamente",
    };
  } catch (error) {
    console.error("Error al aprobar solicitud de fichaje manual:", error);
    throw error;
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

    // Verificar permisos
    if (request.approverId !== session.user.id && user.role !== "HR_ADMIN") {
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
        rejectedAt: new Date(),
        rejectionReason: input.rejectionReason.trim(),
      },
    });

    // Notificar al empleado
    if (request.employee.userId) {
      await createNotification({
        userId: request.employee.userId,
        orgId: user.orgId,
        type: "MANUAL_TIME_ENTRY_REJECTED",
        title: "Fichaje manual rechazado",
        message: `Tu solicitud de fichaje manual para el ${request.date.toLocaleDateString("es-ES")} ha sido rechazada. Motivo: ${input.rejectionReason}`,
      });
    }

    return {
      success: true,
      message: "Solicitud rechazada correctamente",
    };
  } catch (error) {
    console.error("Error al rechazar solicitud de fichaje manual:", error);
    throw error;
  }
}

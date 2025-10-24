"use server";

import { startOfDay, endOfDay, isPast, isFuture, isToday } from "date-fns";

import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

/**
 * Obtiene el aprobador por defecto para un empleado (manager del contrato)
 */
async function getManagerForApproval(employeeId: string, orgId: string): Promise<string> {
  // Buscar el manager del empleado en su contrato activo
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      orgId,
      active: true,
    },
    include: {
      manager: {
        include: {
          user: true,
        },
      },
    },
  });

  if (contract?.manager?.user) {
    return contract.manager.user.id;
  }

  // Si no tiene manager, buscar un usuario con rol HR_ADMIN
  const hrAdmin = await prisma.user.findFirst({
    where: {
      orgId,
      role: "HR_ADMIN",
      active: true,
    },
  });

  if (hrAdmin) {
    return hrAdmin.id;
  }

  throw new Error("No se encontró un aprobador disponible. Contacta con RRHH.");
}

/**
 * Crear una nueva solicitud de fichaje manual
 */
interface CreateManualTimeEntryRequestInput {
  date: Date; // Fecha del día (sin hora)
  clockInTime: Date; // Hora de entrada
  clockOutTime: Date; // Hora de salida
  reason: string; // Justificación
}

export async function createManualTimeEntryRequest(input: CreateManualTimeEntryRequestInput) {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();

    // Validaciones
    if (!input.reason || input.reason.trim().length < 10) {
      throw new Error("El motivo debe tener al menos 10 caracteres");
    }

    if (isFuture(startOfDay(input.date))) {
      throw new Error("No puedes solicitar fichajes para fechas futuras");
    }

    if (input.clockInTime >= input.clockOutTime) {
      throw new Error("La hora de entrada debe ser anterior a la hora de salida");
    }

    // Verificar que no exista ya un fichaje automático ese día
    const dayStart = startOfDay(input.date);
    const dayEnd = endOfDay(input.date);

    const existingEntries = await prisma.timeEntry.findFirst({
      where: {
        employeeId: employee.id,
        orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
        isManual: false, // Solo fichajes automáticos
      },
    });

    if (existingEntries) {
      throw new Error("Ya tienes fichajes registrados para ese día. No puedes solicitar un fichaje manual.");
    }

    // Verificar que no exista ya una solicitud pendiente para ese día
    const existingRequest = await prisma.manualTimeEntryRequest.findFirst({
      where: {
        employeeId: employee.id,
        orgId,
        date: dayStart,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      throw new Error("Ya tienes una solicitud pendiente para ese día");
    }

    // Obtener el manager/aprobador
    const approverId = await getManagerForApproval(employee.id, orgId);

    // Crear la solicitud
    const request = await prisma.manualTimeEntryRequest.create({
      data: {
        orgId,
        employeeId: employee.id,
        date: dayStart,
        clockInTime: input.clockInTime,
        clockOutTime: input.clockOutTime,
        reason: input.reason.trim(),
        approverId,
        status: "PENDING",
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notificar al aprobador
    await createNotification({
      userId: approverId,
      orgId,
      type: "MANUAL_TIME_ENTRY_SUBMITTED",
      title: "Nueva solicitud de fichaje manual",
      message: `${request.employee.firstName} ${request.employee.lastName} ha solicitado un fichaje manual para el ${input.date.toLocaleDateString("es-ES")}`,
    });

    return {
      success: true,
      requestId: request.id,
    };
  } catch (error) {
    console.error("Error al crear solicitud de fichaje manual:", error);
    throw error;
  }
}

/**
 * Obtener mis solicitudes de fichaje manual
 */
export async function getMyManualTimeEntryRequests(status?: "PENDING" | "APPROVED" | "REJECTED") {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();

    const requests = await prisma.manualTimeEntryRequest.findMany({
      where: {
        employeeId: employee.id,
        orgId,
        ...(status && { status }),
      },
      include: {
        approver: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    // Contar totales por estado
    const [pendingTotal, approvedTotal, rejectedTotal] = await Promise.all([
      prisma.manualTimeEntryRequest.count({
        where: {
          employeeId: employee.id,
          orgId,
          status: "PENDING",
        },
      }),
      prisma.manualTimeEntryRequest.count({
        where: {
          employeeId: employee.id,
          orgId,
          status: "APPROVED",
        },
      }),
      prisma.manualTimeEntryRequest.count({
        where: {
          employeeId: employee.id,
          orgId,
          status: "REJECTED",
        },
      }),
    ]);

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
        approverName: r.approver?.name,
        approverComments: r.approverComments,
        rejectionReason: r.rejectionReason,
      })),
      totals: {
        pending: pendingTotal,
        approved: approvedTotal,
        rejected: rejectedTotal,
      },
    };
  } catch (error) {
    console.error("Error al obtener solicitudes de fichaje manual:", error);
    throw error;
  }
}

/**
 * Cancelar una solicitud pendiente
 */
export async function cancelManualTimeEntryRequest(requestId: string) {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();

    const request = await prisma.manualTimeEntryRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error("Solicitud no encontrada");
    }

    if (request.employeeId !== employee.id) {
      throw new Error("No tienes permiso para cancelar esta solicitud");
    }

    if (request.status !== "PENDING") {
      throw new Error("Solo puedes cancelar solicitudes pendientes");
    }

    // Simplemente eliminar la solicitud pendiente
    await prisma.manualTimeEntryRequest.delete({
      where: { id: requestId },
    });

    // Notificar al aprobador
    if (request.approverId) {
      await createNotification({
        userId: request.approverId,
        orgId,
        type: "PTO_CANCELLED", // Reutilizamos este tipo
        title: "Solicitud de fichaje manual cancelada",
        message: `Una solicitud de fichaje manual ha sido cancelada por el empleado`,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error al cancelar solicitud:", error);
    throw error;
  }
}

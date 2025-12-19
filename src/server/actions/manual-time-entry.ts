"use server";

import { startOfDay, endOfDay, isPast, isFuture, isToday } from "date-fns";

import { resolveApproverUsers } from "@/lib/approvals/approval-engine";
import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

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

    // NORMALIZAR FECHAS A UTC para evitar problemas de timezone
    // El cliente puede estar en UTC+1, el servidor en UTC
    // Extraemos año/mes/día y reconstruimos en UTC
    const inputDate = new Date(input.date);
    const year = inputDate.getUTCFullYear();
    const month = inputDate.getUTCMonth();
    const day = inputDate.getUTCDate();

    // Crear fecha normalizada a medianoche UTC
    const normalizedDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const dayStart = normalizedDate;
    const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    // Normalizar clockInTime y clockOutTime para que usen la fecha correcta en UTC
    const clockInDate = new Date(input.clockInTime);
    const clockOutDate = new Date(input.clockOutTime);

    const clockInHours = clockInDate.getUTCHours();
    const clockInMinutes = clockInDate.getUTCMinutes();
    const clockOutHours = clockOutDate.getUTCHours();
    const clockOutMinutes = clockOutDate.getUTCMinutes();

    const normalizedClockIn = new Date(Date.UTC(year, month, day, clockInHours, clockInMinutes, 0, 0));
    const normalizedClockOut = new Date(Date.UTC(year, month, day, clockOutHours, clockOutMinutes, 0, 0));

    // Validaciones
    if (!input.reason || input.reason.trim().length < 10) {
      throw new Error("El motivo debe tener al menos 10 caracteres");
    }

    if (isFuture(dayStart)) {
      throw new Error("No puedes solicitar fichajes para fechas futuras");
    }

    if (normalizedClockIn >= normalizedClockOut) {
      throw new Error("La hora de entrada debe ser anterior a la hora de salida");
    }

    // Verificar que no exista ya un fichaje automático ese día

    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId: employee.id,
        orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        id: true,
        entryType: true,
        manualRequestId: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Consideramos automáticos los fichajes NO cancelados y sin solicitud manual asociada
    const automaticEntries = existingEntries.filter((entry) => entry.manualRequestId === null);

    // NUEVO: Permitir solicitudes sobre fichajes completos/incompletos
    // Ya no bloqueamos si hay fichajes completos - solo informamos para que el usuario decida

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

    const approvers = await resolveApproverUsers(employee.id, orgId, "MANUAL_TIME_ENTRY");
    const approverIds = approvers.map((approver) => approver.userId);
    const approverId = approverIds[0] ?? null;

    if (!approverId) {
      throw new Error("No se encontró un aprobador disponible. Contacta con RRHH.");
    }

    // Determinar si esta solicitud reemplaza fichajes automáticos (completos o incompletos)
    const hasClockIn = automaticEntries.some((e) => e.entryType === "CLOCK_IN");
    const hasClockOut = automaticEntries.some((e) => e.entryType === "CLOCK_OUT");
    const replacesIncompleteEntry = automaticEntries.length > 0; // CAMBIADO: Ahora reemplaza cualquier fichaje automático
    const replacedEntryIds = automaticEntries.map((e) => e.id); // Guardar TODOS los IDs para cancelarlos después

    let warningMessage = null;
    if (replacesIncompleteEntry) {
      const clockInEntry = automaticEntries.find((e) => e.entryType === "CLOCK_IN");
      if (clockInEntry) {
        warningMessage = `Esta solicitud reemplazará un fichaje abierto desde ${new Date(clockInEntry.timestamp).toLocaleString("es-ES")}`;
      }
    }

    // Crear la solicitud CON LAS FECHAS NORMALIZADAS
    const request = await prisma.manualTimeEntryRequest.create({
      data: {
        orgId,
        employeeId: employee.id,
        date: dayStart, // Ya normalizado a medianoche UTC
        clockInTime: normalizedClockIn, // Hora de entrada normalizada
        clockOutTime: normalizedClockOut, // Hora de salida normalizada
        reason: input.reason.trim(),
        approverId,
        status: "PENDING",
        replacesIncompleteEntry,
        replacedEntryIds,
        warningMessage,
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

    // Notificar a los aprobadores
    for (const recipientId of approverIds) {
      await createNotification(
        recipientId,
        orgId,
        "MANUAL_TIME_ENTRY_SUBMITTED",
        "Nueva solicitud de fichaje manual",
        `${request.employee.firstName} ${request.employee.lastName} ha solicitado un fichaje manual para el ${input.date.toLocaleDateString("es-ES")}`,
        undefined, // ptoRequestId
        request.id, // manualTimeEntryRequestId
      );
    }

    return {
      success: true,
      requestId: request.id,
    };
  } catch (error) {
    // Manejo de errores mejorado para mostrar mensajes user-friendly
    console.error("[Manual Time Entry] Error al crear solicitud:", {
      error: error instanceof Error ? error.message : "Error desconocido",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Si es un error de validación conocido, re-lanzarlo tal cual
    if (error instanceof Error && error.message) {
      throw error;
    }

    // Para errores desconocidos (de BD, red, etc.), mensaje genérico user-friendly
    throw new Error(
      "No se pudo crear la solicitud de fichaje manual. Por favor, inténtalo de nuevo o contacta con soporte si el problema persiste.",
    );
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
      await createNotification(
        request.approverId,
        orgId,
        "PTO_CANCELLED", // Reutilizamos este tipo
        "Solicitud de fichaje manual cancelada",
        `Una solicitud de fichaje manual ha sido cancelada por el empleado`,
        undefined, // ptoRequestId
        undefined, // manualTimeEntryRequestId (la solicitud ya fue eliminada)
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error al cancelar solicitud:", error);
    throw error;
  }
}

/**
 * Obtener información del aprobador del empleado actual
 */
export async function getMyApprover() {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();

    // Buscar el manager del empleado en su contrato activo
    const contract = await prisma.employmentContract.findFirst({
      where: {
        employeeId: employee.id,
        orgId,
        active: true,
      },
      include: {
        manager: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (contract?.manager?.user) {
      return {
        id: contract.manager.user.id,
        name: contract.manager.user.name,
        email: contract.manager.user.email,
        role: "Manager",
      };
    }

    // Si no tiene manager, buscar un usuario con rol HR_ADMIN
    const hrAdmin = await prisma.user.findFirst({
      where: {
        orgId,
        role: "HR_ADMIN",
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (hrAdmin) {
      return {
        id: hrAdmin.id,
        name: hrAdmin.name,
        email: hrAdmin.email,
        role: "RRHH",
      };
    }

    return null;
  } catch (error) {
    console.error("Error al obtener aprobador:", error);
    return null;
  }
}

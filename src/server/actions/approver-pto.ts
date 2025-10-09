"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";
import { recalculatePtoBalance } from "./pto-balance";

/**
 * Obtiene las solicitudes pendientes de aprobación para el usuario autenticado
 */
export async function getPendingPtoRequests() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Buscar solicitudes donde el usuario es el aprobador
    const requests = await prisma.ptoRequest.findMany({
      where: {
        orgId: user.orgId,
        approverId: session.user.id,
        status: "PENDING",
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
          },
        },
        absenceType: true,
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    return requests.map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      workingDays: Number(r.workingDays),
      status: r.status,
      reason: r.reason,
      attachmentUrl: r.attachmentUrl,
      submittedAt: r.submittedAt,
      employee: r.employee,
      absenceType: r.absenceType,
    }));
  } catch (error) {
    console.error("Error al obtener solicitudes pendientes:", error);
    throw error;
  }
}

/**
 * Obtiene todas las solicitudes de PTO del equipo (para managers y RRHH)
 */
export async function getTeamPtoRequests() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        orgId: true,
        role: true,
        employee: {
          include: {
            managedContracts: {
              where: { active: true },
              select: {
                employeeId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Si es HR_ADMIN u ORG_ADMIN, puede ver todas las solicitudes de la organización
    if (user.role === "HR_ADMIN" || user.role === "ORG_ADMIN") {
      const requests = await prisma.ptoRequest.findMany({
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
            },
          },
          absenceType: true,
          approver: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
      });

      return requests.map((r) => ({
        id: r.id,
        startDate: r.startDate,
        endDate: r.endDate,
        workingDays: Number(r.workingDays),
        status: r.status,
        reason: r.reason,
        attachmentUrl: r.attachmentUrl,
        submittedAt: r.submittedAt,
        approvedAt: r.approvedAt,
        rejectedAt: r.rejectedAt,
        cancelledAt: r.cancelledAt,
        approverComments: r.approverComments,
        rejectionReason: r.rejectionReason,
        employee: r.employee,
        absenceType: r.absenceType,
        approver: r.approver,
      }));
    }

    // Si es MANAGER, solo ve las solicitudes de sus subordinados
    const subordinateIds = user.employee?.managedContracts.map((c) => c.employeeId) ?? [];

    const requests = await prisma.ptoRequest.findMany({
      where: {
        orgId: user.orgId,
        employeeId: {
          in: subordinateIds,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
          },
        },
        absenceType: true,
        approver: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    return requests.map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      workingDays: Number(r.workingDays),
      status: r.status,
      reason: r.reason,
      attachmentUrl: r.attachmentUrl,
      submittedAt: r.submittedAt,
      approvedAt: r.approvedAt,
      rejectedAt: r.rejectedAt,
      cancelledAt: r.cancelledAt,
      approverComments: r.approverComments,
      rejectionReason: r.rejectionReason,
      employee: r.employee,
      absenceType: r.absenceType,
      approver: r.approver,
    }));
  } catch (error) {
    console.error("Error al obtener solicitudes del equipo:", error);
    throw error;
  }
}

/**
 * Aprueba una solicitud de PTO
 */
export async function approvePtoRequest(requestId: string, comments?: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener la solicitud
    const request = await prisma.ptoRequest.findUnique({
      where: {
        id: requestId,
        approverId: session.user.id, // Seguridad: solo puede aprobar si es el aprobador
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
        absenceType: true,
      },
    });

    if (!request) {
      throw new Error("Solicitud no encontrada o no tienes permisos");
    }

    if (request.status !== "PENDING") {
      throw new Error("Solo se pueden aprobar solicitudes pendientes");
    }

    // Actualizar la solicitud
    await prisma.ptoRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approverComments: comments,
      },
    });

    // Recalcular balance del empleado
    const currentYear = new Date().getFullYear();
    await recalculatePtoBalance(request.employeeId, request.orgId, currentYear);

    // Notificar al empleado
    if (request.employee.user) {
      await createNotification(
        request.employee.user.id,
        request.orgId,
        "PTO_APPROVED",
        "Solicitud aprobada",
        `Tu solicitud de ${request.absenceType.name} ha sido aprobada`,
        requestId,
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error al aprobar solicitud:", error);
    throw error;
  }
}

/**
 * Rechaza una solicitud de PTO
 */
export async function rejectPtoRequest(requestId: string, reason: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("Debes proporcionar un motivo para el rechazo");
    }

    // Obtener la solicitud
    const request = await prisma.ptoRequest.findUnique({
      where: {
        id: requestId,
        approverId: session.user.id, // Seguridad: solo puede rechazar si es el aprobador
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
        absenceType: true,
      },
    });

    if (!request) {
      throw new Error("Solicitud no encontrada o no tienes permisos");
    }

    if (request.status !== "PENDING") {
      throw new Error("Solo se pueden rechazar solicitudes pendientes");
    }

    // Actualizar la solicitud
    await prisma.ptoRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Recalcular balance del empleado
    const currentYear = new Date().getFullYear();
    await recalculatePtoBalance(request.employeeId, request.orgId, currentYear);

    // Notificar al empleado
    if (request.employee.user) {
      await createNotification(
        request.employee.user.id,
        request.orgId,
        "PTO_REJECTED",
        "Solicitud rechazada",
        `Tu solicitud de ${request.absenceType.name} ha sido rechazada`,
        requestId,
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error al rechazar solicitud:", error);
    throw error;
  }
}

/**
 * Obtiene el calendario del equipo con las ausencias aprobadas
 * Útil para que los managers vean la disponibilidad del equipo
 */
export async function getTeamPtoCalendar(startDate: Date, endDate: Date) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        orgId: true,
        role: true,
        employee: {
          include: {
            managedContracts: {
              where: { active: true },
              select: {
                employeeId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Determinar qué empleados puede ver
    let employeeIds: string[] = [];

    if (user.role === "HR_ADMIN" || user.role === "ORG_ADMIN") {
      // Ver todos los empleados de la organización
      const allEmployees = await prisma.employee.findMany({
        where: {
          orgId: user.orgId,
          active: true,
        },
        select: { id: true },
      });
      employeeIds = allEmployees.map((e) => e.id);
    } else if (user.role === "MANAGER" && user.employee) {
      // Ver solo sus subordinados
      employeeIds = user.employee.managedContracts.map((c) => c.employeeId);
    }

    // Obtener solicitudes aprobadas en el rango de fechas
    const approvedRequests = await prisma.ptoRequest.findMany({
      where: {
        orgId: user.orgId,
        employeeId: {
          in: employeeIds,
        },
        status: "APPROVED",
        OR: [
          {
            startDate: {
              lte: endDate,
            },
            endDate: {
              gte: startDate,
            },
          },
        ],
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
          },
        },
        absenceType: true,
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return approvedRequests.map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      workingDays: Number(r.workingDays),
      employee: r.employee,
      absenceType: r.absenceType,
    }));
  } catch (error) {
    console.error("Error al obtener calendario del equipo:", error);
    throw error;
  }
}

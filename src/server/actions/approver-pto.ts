"use server";

import { canUserApprove } from "@/lib/approvals/approval-engine";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";
import { recalculatePtoBalance } from "./pto-balance";
import { recalculateWorkdaySummaryForRetroactivePto } from "./time-tracking";

// ==========================================================================
// ACTIONS DE APROBACIÓN DE PTO (SISTEMA CENTRALIZADO)
// ==========================================================================
// Refactorizado el 2025-11-21 para usar el motor de aprobaciones unificado.
// Eliminada lógica "legacy" de búsqueda de managers.

/**
 * Aprueba una solicitud de PTO
 *
 * @param requestId ID de la solicitud
 * @param comments Comentarios opcionales del aprobador
 */
export async function approvePtoRequest(requestId: string, comments?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Usuario no autenticado");

    // 1. Obtener solicitud
    const request = await prisma.ptoRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: { include: { user: true } },
        absenceType: true,
      },
    });

    if (!request) throw new Error("Solicitud no encontrada");
    if (request.status !== "PENDING") throw new Error("La solicitud no está pendiente");

    // 2. VERIFICAR PERMISO CON EL MOTOR DE APROBACIONES
    const canApprove = await canUserApprove(session.user.id, request.employeeId, "PTO");
    if (!canApprove) {
      throw new Error("No tienes permiso para aprobar esta solicitud");
    }

    // 2.5. VERIFICAR SOLAPAMIENTOS (Lógica de Autorregulación Diferida)
    // Ahora que el manager va a aprobar, verificamos si esta solicitud "pisa" otras ya aprobadas.
    const overlappingRequests = await prisma.ptoRequest.findMany({
      where: {
        employeeId: request.employeeId,
        orgId: request.orgId,
        status: "APPROVED", // Solo nos importan las ya aprobadas
        OR: [
          {
            startDate: {
              lte: request.endDate,
            },
            endDate: {
              gte: request.startDate,
            },
          },
        ],
      },
      include: {
        absenceType: true,
      },
    });

    if (overlappingRequests.length > 0) {
      // Definir prioridades (Misma lógica que en creación)
      const HIGH_PRIORITY_CODES = ["SICK_LEAVE", "MATERNITY_PATERNITY"];
      const LOW_PRIORITY_CODES = ["VACATION", "PERSONAL", "UNPAID_LEAVE"];

      const newTypeCode = request.absenceType.code;
      const isHighPriority = HIGH_PRIORITY_CODES.includes(newTypeCode);

      // Función helper para cancelar solicitudes solapadas
      const cancelOverlappingRequest = async (req: (typeof overlappingRequests)[0]) => {
        await prisma.ptoRequest.update({
          where: { id: req.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: `Cancelación automática al aprobar ${request.absenceType.name} (${request.startDate.toLocaleDateString()})`,
          },
        });

        // Notificar al empleado de la cancelación
        if (request.employee.user) {
          await createNotification(
            request.employee.user.id,
            request.orgId,
            "PTO_CANCELLED",
            "Vacaciones canceladas por solapamiento",
            `Tus vacaciones del ${req.startDate.toLocaleDateString()} han sido canceladas al aprobarse tu ${request.absenceType.name}.`,
            req.id,
          );
        }
      };

      if (isHighPriority) {
        // Verificar que lo que pisamos es de baja prioridad
        const allOverlapsAreCancellable = overlappingRequests.every((req) =>
          LOW_PRIORITY_CODES.includes(req.absenceType.code),
        );

        if (!allOverlapsAreCancellable) {
          // Conflicto de Alta Prioridad vs Alta Prioridad (ej: Baja sobre Baja) -> Bloquear
          throw new Error("No se puede aprobar: Solapa con otra ausencia protegida existente.");
        }

        // ✅ Ejecutar cancelación automática de las solicitudes pisadas
        console.log(`🔄 Autorregulación (Aprobación): Cancelando ${overlappingRequests.length} solicitudes.`);

        for (const req of overlappingRequests) {
          await cancelOverlappingRequest(req);
        }
      } else {
        // Conflicto Normal (Vacaciones sobre Vacaciones) -> Bloquear
        // Esto no debería pasar si la validación en creación funcionó, pero por seguridad.
        throw new Error("No se puede aprobar: Ya existen solicitudes aprobadas en estas fechas.");
      }
    }

    // 3. Ejecutar aprobación
    await prisma.ptoRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        approverId: session.user.id, // Guardamos quién lo aprobó realmente
        approvedAt: new Date(),
        approverComments: comments,
      },
    });

    // 4. Recalcular balance y notificar
    const currentYear = new Date().getFullYear();
    await recalculatePtoBalance(request.employeeId, request.orgId, currentYear);

    // 5. FASE 3.2: Recalcular WorkdaySummary si el PTO tiene fechas en el pasado
    // Esto asegura que expectedMinutes se actualice a 0 para los días de ausencia
    await recalculateWorkdaySummaryForRetroactivePto(
      request.employeeId,
      request.orgId,
      request.startDate,
      request.endDate,
      request.absenceType.name,
    );

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
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Rechaza una solicitud de PTO
 *
 * @param requestId ID de la solicitud
 * @param reason Motivo del rechazo (obligatorio)
 */
export async function rejectPtoRequest(requestId: string, reason: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Usuario no autenticado");
    if (!reason?.trim()) throw new Error("Debes proporcionar un motivo");

    // 1. Obtener solicitud
    const request = await prisma.ptoRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: { include: { user: true } },
        absenceType: true,
      },
    });

    if (!request) throw new Error("Solicitud no encontrada");
    if (request.status !== "PENDING") throw new Error("La solicitud no está pendiente");

    // 2. VERIFICAR PERMISO CON EL MOTOR DE APROBACIONES
    const canApprove = await canUserApprove(session.user.id, request.employeeId, "PTO");
    if (!canApprove) {
      throw new Error("No tienes permiso para rechazar esta solicitud");
    }

    // 3. Ejecutar rechazo
    await prisma.ptoRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        approverId: session.user.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // 4. Recalcular balance y notificar
    const currentYear = new Date().getFullYear();
    await recalculatePtoBalance(request.employeeId, request.orgId, currentYear);

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
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * @deprecated Usar src/server/actions/approvals.ts -> getPendingApprovals
 * Mantenido para compatibilidad con /dashboard/approvals/pto/page.tsx
 */
export async function getApproverPtoRequests(status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING") {
  try {
    const session = await auth();
    if (!session?.user?.id) return { requests: [], totals: { pending: 0, approved: 0, rejected: 0 } };

    // Importamos dinámicamente para evitar ciclos
    // eslint-disable-next-line import/no-cycle
    const { getMyPendingApprovals } = await import("./approvals");
    const pendingUnified = await getMyPendingApprovals();

    // Mapear items unificados al formato legacy
    const requests = pendingUnified.items // Accedemos a .items
      .filter((req) => req.type === "PTO")
      .map((req) => ({
        id: req.id,
        startDate: new Date(req.details["startDate"]),
        endDate: new Date(req.details["endDate"]),
        workingDays: parseFloat(req.details["days"]?.toString() ?? "0"),
        status: "PENDING", // Asumimos pendiente porque getPendingApprovals solo devuelve pendientes
        reason: req.details["reason"],
        submittedAt: req.createdAt,
        employee: {
          id: req.employeeId, // Esto podría fallar si el frontend necesita el ID real del empleado, pero approvalItem trae employeeId
          firstName: req.employeeName.split(" ")[0],
          lastName: req.employeeName.split(" ").slice(1).join(" "),
          email: "email@placeholder.com", // Dato no disponible en la vista unificada ligera
          photoUrl: req.employeeImage,
        },
        absenceType: {
          id: "unknown", // No crítico para la vista
          name: req.details["absenceType"] ?? "Vacaciones",
          color: req.details["color"] ?? "#3b82f6",
          requiresDocument: req.details["requiresDocument"] ?? false,
        },
        startTime: req.details["startTime"] ?? null,
        endTime: req.details["endTime"] ?? null,
        durationMinutes: req.details["durationMinutes"] ?? null,
        effectiveMinutes: req.details["effectiveMinutes"] ?? null,
        // 🆕 Info de justificantes
        _count: {
          documents: req.details["documentsCount"] ?? 0,
        },
      }));

    // Si piden aprobadas/rechazadas, devolvemos vacío por ahora para no romper
    // ya que getPendingApprovals NO devuelve historial.
    if (status !== "PENDING") {
      return {
        requests: [],
        totals: { pending: requests.length, approved: 0, rejected: 0 },
      };
    }

    return {
      requests,
      totals: { pending: requests.length, approved: 0, rejected: 0 },
    };
  } catch (error) {
    console.error("Error en getApproverPtoRequests (legacy):", error);
    return { requests: [], totals: { pending: 0, approved: 0, rejected: 0 } };
  }
}

export async function getTeamPtoCalendar(startDate: Date, endDate: Date) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autenticado");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true, role: true },
    });

    if (!user) throw new Error("Usuario no encontrado");

    const requests = await prisma.ptoRequest.findMany({
      where: {
        orgId: user.orgId,
        status: "APPROVED",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, photoUrl: true } },
        absenceType: true,
      },
    });

    return requests;
  } catch (error) {
    console.error(error);
    return [];
  }
}

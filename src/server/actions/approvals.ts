"use server";

import { getAuthorizedApprovers } from "@/lib/approvals/approval-engine";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Dynamic import to avoid circular dependency
// import { approvePtoRequest, rejectPtoRequest } from "./approver-pto";

export type PendingApprovalItem = {
  id: string;
  type: "PTO" | "MANUAL_TIME_ENTRY" | "EXPENSE";
  employeeName: string;
  employeeImage?: string | null;
  employeeId: string; // Necesario para algunas lógicas UI
  date: string; // Fecha relevante
  summary: string;
  status: string;
  createdAt: Date;
  details: Record<string, any>; // Datos flexibles para el diálogo de detalle
};

/**
 * Obtiene las aprobaciones (pendientes o historial) para el usuario actual.
 */
export async function getMyApprovals(filter: "pending" | "history" = "pending"): Promise<{
  success: boolean;
  items: PendingApprovalItem[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, items: [], error: "No autenticado" };
    }

    const userId = session.user.id;
    const orgId = session.user.orgId;
    const items: PendingApprovalItem[] = [];
    const isHistory = filter === "history";
    const statusFilter = isHistory ? { in: ["APPROVED", "REJECTED"] } : "PENDING";

    // Si es historial, buscamos explícitamente donde el usuario actuó como aprobador
    // O si es admin, quizás quiera ver todo, pero por ahora limitamos a "Mis acciones" para consistencia
    const historyWhereClause = isHistory ? { approverId: userId } : {};

    // ==================================================================
    // 1. PTO REQUESTS
    // ==================================================================
    const ptoRequests = await prisma.ptoRequest.findMany({
      where: {
        orgId,
        status: statusFilter,
        ...historyWhereClause,
      },
      include: {
        employee: {
          include: {
            employmentContracts: {
              where: { active: true },
              take: 1,
              include: { position: true, department: true },
            },
          },
        },
        absenceType: true,
      },
      orderBy: isHistory ? { approvedAt: "desc" } : { submittedAt: "desc" },
      take: isHistory ? 50 : undefined, // Limitar historial
    });

    const isGlobalAdmin = ["ORG_ADMIN", "SUPER_ADMIN", "HR_ADMIN"].includes(session.user.role);

    for (const req of ptoRequests) {
      let canView = isGlobalAdmin;

      if (isHistory) {
        // En historial, si ya filtré por approverId, seguro puedo verla.
        // Si soy admin y estoy viendo historial global (si quitara el filtro), entonces ok.
        canView = true;
      } else if (!canView) {
        // Lógica de pendientes (jerarquía)
        const approvers = await getAuthorizedApprovers(req.employeeId, "PTO");
        if (approvers.some((a) => a.userId === userId)) canView = true;
      }

      if (canView) {
        const activeContract = req.employee.employmentContracts[0];
        const positionName = activeContract?.position?.title;
        const departmentName = activeContract?.department?.name;

        items.push({
          id: req.id,
          type: "PTO",
          employeeId: req.employeeId,
          employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
          employeeImage: req.employee.photoUrl,
          date: req.startDate.toISOString(),
          summary: `${req.absenceType.name} (${Number(req.workingDays)} días)`,
          status: req.status,
          createdAt: req.submittedAt,
          details: {
            startDate: req.startDate.toISOString(),
            endDate: req.endDate.toISOString(),
            days: Number(req.workingDays),
            reason: req.reason,
            absenceType: req.absenceType.name,
            color: req.absenceType.color,
            position: positionName,
            department: departmentName,
            approverComments: req.approverComments,
            rejectionReason: req.rejectionReason,
          },
        });
      }
    }

    // ==================================================================
    // 2. MANUAL TIME ENTRIES
    // ==================================================================
    const manualRequests = await prisma.manualTimeEntryRequest.findMany({
      where: {
        orgId,
        status: statusFilter,
        ...historyWhereClause,
      },
      include: { employee: true },
      orderBy: isHistory ? { approvedAt: "desc" } : { submittedAt: "desc" },
      take: isHistory ? 50 : undefined,
    });

    for (const req of manualRequests) {
      let canView = isGlobalAdmin;

      if (isHistory) {
        canView = true;
      } else if (!canView) {
        const approvers = await getAuthorizedApprovers(req.employeeId, "MANUAL_TIME_ENTRY");
        if (approvers.some((a) => a.userId === userId)) canView = true;
      }

      if (canView) {
        items.push({
          id: req.id,
          type: "MANUAL_TIME_ENTRY",
          employeeId: req.employeeId,
          employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
          employeeImage: req.employee.photoUrl,
          date: req.date.toISOString(),
          summary: `Corrección fichaje: ${req.reason}`,
          status: req.status,
          createdAt: req.submittedAt,
          details: {
            date: req.date.toISOString(),
            clockIn: req.clockInTime.toISOString(),
            clockOut: req.clockOutTime.toISOString(),
            reason: req.reason,
            approverComments: req.approverComments,
            rejectionReason: req.rejectionReason,
          },
        });
      }
    }

    // Ordenar: Historial por fecha de resolución (si se pudiera mezclar), Pendientes por creación
    // Simplificamos ordenando todo por createdAt para mezclar tipos, o podríamos usar un campo virtual 'relevantDate'
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { success: true, items };
  } catch (error) {
    console.error("❌ Error CRÍTICO en getMyApprovals:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    return { success: false, items: [], error: "Error interno del servidor" };
  }
}

// Alias para compatibilidad si alguien lo llama desde otro lado
export async function getMyPendingApprovals() {
  return await getMyApprovals("pending");
}

/**
 * Acción unificada para aprobar
 */
export async function approveRequest(id: string, type: string, comments?: string) {
  if (type === "PTO") {
    // eslint-disable-next-line import/no-cycle
    const { approvePtoRequest } = await import("./approver-pto");
    return await approvePtoRequest(id, comments);
  }

  if (type === "MANUAL_TIME_ENTRY") {
    const { approveManualTimeEntryRequest } = await import("./approver-manual-time-entry");
    return await approveManualTimeEntryRequest({ requestId: id, comments });
  }

  return { success: false, error: "Tipo de solicitud no soportado" };
}

/**
 * Acción unificada para rechazar
 */
export async function rejectRequest(id: string, type: string, reason: string) {
  if (type === "PTO") {
    const { rejectPtoRequest } = await import("./approver-pto");
    return await rejectPtoRequest(id, reason);
  }

  if (type === "MANUAL_TIME_ENTRY") {
    const { rejectManualTimeEntryRequest } = await import("./approver-manual-time-entry");
    return await rejectManualTimeEntryRequest({ requestId: id, rejectionReason: reason });
  }

  return { success: false, error: "Tipo de solicitud no soportado" };
}

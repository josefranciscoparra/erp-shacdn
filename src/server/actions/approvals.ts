"use server";

import { revalidatePath } from "next/cache";

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

    // ==================================================================
    // 3. EXPENSES
    // ==================================================================
    // Lógica específica de gastos basada en la tabla ExpenseApproval
    const expenseFilter = isHistory
      ? { decision: { in: ["APPROVED", "REJECTED"] } as const }
      : { decision: "PENDING" as const };

    const expenses = await prisma.expense.findMany({
      where: {
        orgId,
        status: isHistory ? { in: ["APPROVED", "REJECTED"] } : "SUBMITTED",
        approvals: {
          some: {
            approverId: userId,
            ...expenseFilter,
          },
        },
      },
      include: {
        employee: {
          include: {
            // Intentamos obtener el puesto si es posible
            employmentContracts: {
              where: { active: true },
              take: 1,
              include: { position: true },
            },
          },
        },
        approvals: {
          where: { approverId: userId }, // Traer solo mi aprobación para ver comentarios/decisión
        },
        attachments: {
          take: 1, // Solo necesitamos uno para la vista rápida
          select: { id: true }, // Solo ID, la URL se construye en el frontend
        },
      },
      orderBy: isHistory ? { updatedAt: "desc" } : { date: "desc" }, // Fecha de gasto o actualización
      take: isHistory ? 50 : undefined,
    });

    for (const expense of expenses) {
      const myApproval = expense.approvals[0];
      const positionName = expense.employee.employmentContracts[0]?.position?.title;
      const attachmentId = expense.attachments[0]?.id;

      items.push({
        id: expense.id,
        type: "EXPENSE",
        employeeId: expense.employeeId,
        employeeName: `${expense.employee.firstName} ${expense.employee.lastName}`,
        employeeImage: expense.employee.photoUrl,
        date: expense.date.toISOString(),
        summary: `Gasto: ${Number(expense.totalAmount).toFixed(2)}€ (${expense.category})`,
        status: expense.status,
        createdAt: expense.createdAt,
        details: {
          amount: Number(expense.totalAmount),
          category: expense.category,
          notes: expense.notes,
          merchant: expense.merchantName,
          attachmentId, // ID del adjunto para construir la URL
          // Datos de mi aprobación (para historial)
          approverComments: myApproval?.comment,
          rejectionReason: myApproval?.decision === "REJECTED" ? myApproval.comment : undefined,
          position: positionName,
        },
      });
    }

    // Ordenar por fecha más reciente
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
  let result;

  if (type === "PTO") {
    // eslint-disable-next-line import/no-cycle
    const { approvePtoRequest } = await import("./approver-pto");
    result = await approvePtoRequest(id, comments);
  } else if (type === "MANUAL_TIME_ENTRY") {
    const { approveManualTimeEntryRequest } = await import("./approver-manual-time-entry");
    result = await approveManualTimeEntryRequest({ requestId: id, comments });
  } else if (type === "EXPENSE") {
    const { approveExpense } = await import("./expense-approvals");
    result = await approveExpense(id, comments);
  } else {
    return { success: false, error: "Tipo de solicitud no soportado" };
  }

  if (result.success) {
    revalidatePath("/dashboard/approvals");
  }

  return result;
}

/**
 * Acción unificada para rechazar
 */
export async function rejectRequest(id: string, type: string, reason: string) {
  let result;

  if (type === "PTO") {
    const { rejectPtoRequest } = await import("./approver-pto");
    result = await rejectPtoRequest(id, reason);
  } else if (type === "MANUAL_TIME_ENTRY") {
    const { rejectManualTimeEntryRequest } = await import("./approver-manual-time-entry");
    result = await rejectManualTimeEntryRequest({ requestId: id, rejectionReason: reason });
  } else if (type === "EXPENSE") {
    const { rejectExpense } = await import("./expense-approvals");
    result = await rejectExpense(id, reason);
  } else {
    return { success: false, error: "Tipo de solicitud no soportado" };
  }

  if (result.success) {
    revalidatePath("/dashboard/approvals");
  }

  return result;
}

/**
 * Acción unificada para aprobación masiva
 */
export async function bulkApproveRequests(requests: { id: string; type: string }[]) {
  try {
    const results = await Promise.allSettled(requests.map((req) => approveRequest(req.id, req.type)));

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && (r.value as { success: boolean }).success,
    ).length;
    const failureCount = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !(r.value as { success: boolean }).success),
    ).length;

    if (successCount > 0) {
      revalidatePath("/dashboard/approvals");
    }

    return {
      success: true,
      summary: {
        total: requests.length,
        success: successCount,
        failed: failureCount,
      },
    };
  } catch (error) {
    console.error("Error en aprobación masiva:", error);
    return { success: false, error: "Error procesando solicitudes masivas" };
  }
}

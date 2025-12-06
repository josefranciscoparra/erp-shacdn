"use server";

import { revalidatePath } from "next/cache";

import { getAuthorizedApprovers } from "@/lib/approvals/approval-engine";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Dynamic import to avoid circular dependency
// import { approvePtoRequest, rejectPtoRequest } from "./approver-pto";

export type PendingApprovalItem = {
  id: string;
  type: "PTO" | "MANUAL_TIME_ENTRY" | "EXPENSE" | "ALERT";
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
 * OPTIMIZADO: Usa Promise.all para paralelizar consultas.
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
    const isGlobalAdmin = ["ORG_ADMIN", "SUPER_ADMIN", "HR_ADMIN"].includes(session.user.role);

    // --- PREPARAR CONSULTAS ---

    // 1. PTO Promise
    const ptoPromise = prisma.ptoRequest.findMany({
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
        approver: { select: { name: true, image: true } },
        documents: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
          },
        },
        _count: {
          select: { documents: true },
        },
      },
      orderBy: isHistory ? { approvedAt: "desc" } : { submittedAt: "desc" },
      take: isHistory ? 50 : undefined,
    });

    // 2. Manual Time Entry Promise
    const manualPromise = prisma.manualTimeEntryRequest.findMany({
      where: {
        orgId,
        status: statusFilter,
        ...historyWhereClause,
      },
      include: {
        employee: true,
        approver: { select: { name: true, image: true } },
      },
      orderBy: isHistory ? { approvedAt: "desc" } : { submittedAt: "desc" },
      take: isHistory ? 50 : undefined,
    });

    // 3. Expenses Promise
    const expenseStatus = isHistory ? { in: ["APPROVED", "REJECTED"] } : "SUBMITTED";
    const expenseApprovalsFilter = isHistory
      ? { decision: { in: ["APPROVED", "REJECTED"] } as const }
      : { decision: "PENDING" as const };

    const expensesWhere: any = {
      orgId,
      status: expenseStatus,
    };

    if (isHistory || !isGlobalAdmin) {
      expensesWhere.approvals = {
        some: {
          approverId: userId,
          ...expenseApprovalsFilter,
        },
      };
    }

    const expensesPromise = prisma.expense.findMany({
      where: expensesWhere,
      include: {
        employee: {
          include: {
            employmentContracts: {
              where: { active: true },
              take: 1,
              include: { position: true },
            },
          },
        },
        approvals: {
          where: isGlobalAdmin && !isHistory ? {} : { approverId: userId },
          take: 1,
          include: { approver: { select: { name: true, image: true } } },
        },
        attachments: {
          take: 1,
          select: { id: true },
        },
      },
      orderBy: isHistory ? { updatedAt: "desc" } : { date: "desc" },
      take: isHistory ? 50 : undefined,
    });

    // 4. Alerts Promise (Solo Admin)
    const alertsPromise = isGlobalAdmin
      ? prisma.alert.findMany({
          where: {
            orgId,
            status: isHistory ? { in: ["RESOLVED", "DISMISSED"] } : "ACTIVE",
          },
          include: {
            employee: {
              include: {
                employmentContracts: {
                  where: { active: true },
                  take: 1,
                  include: { position: true },
                },
              },
            },
          },
          orderBy: { date: "desc" },
          take: isHistory ? 50 : undefined,
        })
      : Promise.resolve([]);

    // --- EJECUTAR EN PARALELO ---
    const [ptoRequests, manualRequests, expenses, alerts] = await Promise.all([
      ptoPromise,
      manualPromise,
      expensesPromise,
      alertsPromise,
    ]);

    // --- PROCESAR PTO ---
    for (const req of ptoRequests) {
      let canView = isGlobalAdmin;
      if (!isHistory && !canView) {
        const approvers = await getAuthorizedApprovers(req.employeeId, "PTO");
        if (approvers.some((a) => a.userId === userId)) canView = true;
      } else if (isHistory) {
        canView = true; // Ya filtrado por approverId en query
      }

      if (canView) {
        const activeContract = req.employee.employmentContracts[0];
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
            position: activeContract?.position?.title,
            department: activeContract?.department?.name,
            approverComments: req.approverComments,
            rejectionReason: req.rejectionReason,
            documentsCount: req._count?.documents ?? 0,
            documents: req.documents.map((doc) => ({
              id: doc.id,
              fileName: doc.fileName,
              fileSize: doc.fileSize,
              mimeType: doc.mimeType,
              uploadedAt: doc.uploadedAt.toISOString(),
            })),
            requiresDocument: req.absenceType.requiresDocument,
            audit: {
              approvedAt: req.approvedAt?.toISOString(),
              rejectedAt: req.rejectedAt?.toISOString(),
              approverName: req.approver?.name,
              approverImage: req.approver?.image,
            },
          },
        });
      }
    }

    // --- PROCESAR MANUAL TIME ENTRIES ---
    for (const req of manualRequests) {
      let canView = isGlobalAdmin;
      if (!isHistory && !canView) {
        const approvers = await getAuthorizedApprovers(req.employeeId, "MANUAL_TIME_ENTRY");
        if (approvers.some((a) => a.userId === userId)) canView = true;
      } else if (isHistory) {
        canView = true;
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
            audit: {
              approvedAt: req.approvedAt?.toISOString(),
              rejectedAt: req.rejectedAt?.toISOString(),
              approverName: req.approver?.name,
              approverImage: req.approver?.image,
            },
          },
        });
      }
    }

    // --- PROCESAR EXPENSES ---
    for (const expense of expenses) {
      const myApproval = expense.approvals[0];
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
          attachmentId: expense.attachments[0]?.id,
          approverComments: myApproval?.comment,
          rejectionReason: myApproval?.decision === "REJECTED" ? myApproval.comment : undefined,
          position: expense.employee.employmentContracts[0]?.position?.title,
          audit: {
            decidedAt: myApproval?.decidedAt?.toISOString(),
            approverName: myApproval?.approver?.name,
            approverImage: myApproval?.approver?.image,
          },
        },
      });
    }

    // --- PROCESAR ALERTS ---
    for (const alert of alerts) {
      const incidents = alert.incidents as any[];
      const incidentCount = Array.isArray(incidents) ? incidents.length : 0;

      items.push({
        id: alert.id,
        type: "ALERT",
        employeeId: alert.employeeId,
        employeeName: `${alert.employee.firstName} ${alert.employee.lastName}`,
        employeeImage: alert.employee.photoUrl,
        date: alert.date.toISOString(),
        summary: `Alerta: ${incidentCount} incidencia(s) detectada(s)`,
        status: alert.status,
        createdAt: alert.createdAt,
        details: {
          date: alert.date.toISOString(),
          incidents: incidents,
          position: alert.employee.employmentContracts[0]?.position?.title,
          alertType: alert.type,
          // Audit info for alerts (resolver)
          // TODO: Fetch resolver if needed, currently assuming current user action for new ones
        },
      });
    }

    // Ordenar final
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { success: true, items };
  } catch (error) {
    console.error("❌ Error CRÍTICO en getMyApprovals:", error);
    return { success: false, items: [], error: "Error interno del servidor" };
  }
}

// Alias para compatibilidad
export async function getMyPendingApprovals() {
  return await getMyApprovals("pending");
}

/**
 * Acción unificada para aprobar
 */
export async function approveRequest(id: string, type: string, comments?: string) {
  let result;

  if (type === "PTO") {
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

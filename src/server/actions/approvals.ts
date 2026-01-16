"use server";

import { revalidatePath } from "next/cache";

import { getAuthorizedApprovers, hasHrApprovalAccess } from "@/lib/approvals/approval-engine";
import { auth } from "@/lib/auth";
import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// Dynamic import to avoid circular dependency
// import { approvePtoRequest, rejectPtoRequest } from "./approver-pto";

export type PendingApprovalItem = {
  id: string;
  type: "PTO" | "MANUAL_TIME_ENTRY" | "EXPENSE";
  employeeName: string;
  employeeImage?: string | null;
  employeeId: string; // Necesario para algunas lógicas UI
  orgId: string;
  organization?: {
    id: string;
    name: string;
  };
  date: string; // Fecha relevante
  summary: string;
  status: string;
  createdAt: Date;
  canApprove?: boolean;
  currentApprovers?: Array<{ id: string; name: string }>;
  details: Record<string, any>; // Datos flexibles para el diálogo de detalle
};

/**
 * Obtiene las aprobaciones (pendientes o historial) para el usuario actual.
 * OPTIMIZADO: Usa Promise.all para paralelizar consultas.
 */
type UserOrgSummary = {
  id: string;
  name: string;
};

async function getAccessibleOrganizations(userId: string, role: string): Promise<UserOrgSummary[]> {
  if (role === "SUPER_ADMIN") {
    const orgs = await prisma.organization.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return orgs.map((org) => ({
      id: org.id,
      name: org.name ?? "Organización",
    }));
  }

  const memberships = await prisma.userOrganization.findMany({
    where: {
      userId,
      isActive: true,
      organization: { active: true },
    },
    select: {
      orgId: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ organization: { name: "asc" } }],
  });

  const orgMap = new Map<string, string>();
  for (const membership of memberships) {
    if (membership.organization) {
      orgMap.set(membership.organization.id, membership.organization.name ?? "Organización");
    }
  }

  return Array.from(orgMap.entries()).map(([id, name]) => ({ id, name }));
}

export async function getMyApprovals(
  filter: "pending" | "history" = "pending",
  orgId?: string,
  options?: { includeAllExpenses?: boolean },
): Promise<{
  success: boolean;
  items: PendingApprovalItem[];
  organizations: UserOrgSummary[];
  activeOrgId: string | null;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, items: [], organizations: [], activeOrgId: null, error: "No autenticado" };
    }

    if (session.user.role === "SUPER_ADMIN") {
      return { success: true, items: [], organizations: [], activeOrgId: null };
    }

    const userId = session.user.id;
    const canViewAllExpensesResult = await safePermission("view_expense_approvals_all");
    const includeAllExpenses = Boolean(options?.includeAllExpenses && canViewAllExpensesResult.ok);
    const organizations = await getAccessibleOrganizations(userId, session.user.role);

    if (organizations.length === 0) {
      return { success: true, items: [], organizations: [], activeOrgId: null };
    }

    const targetOrgId = orgId && organizations.some((org) => org.id === orgId) ? orgId : (organizations[0]?.id ?? null);

    if (!targetOrgId) {
      return { success: true, items: [], organizations, activeOrgId: null };
    }

    const orgFilterIds = [targetOrgId];
    const hasHrAccess = await hasHrApprovalAccess(userId, targetOrgId);

    const items: PendingApprovalItem[] = [];
    const isHistory = filter === "history";
    const statusFilter = isHistory ? { in: ["APPROVED", "REJECTED"] } : "PENDING";

    // Si es historial, mostramos todo para RRHH; para el resto, solo sus acciones.
    const historyWhereClause = isHistory && !hasHrAccess ? { approverId: userId } : {};
    // --- PREPARAR CONSULTAS ---

    // 1. PTO Promise
    const ptoPromise = prisma.ptoRequest.findMany({
      where: {
        orgId: { in: orgFilterIds },
        status: statusFilter,
        ...historyWhereClause,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
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
        orgId: { in: orgFilterIds },
        status: statusFilter,
        ...historyWhereClause,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        employee: {
          include: {
            employmentContracts: {
              where: { active: true },
              take: 1,
              include: { position: true, department: true },
            },
          },
        },
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
      orgId: { in: orgFilterIds },
      status: expenseStatus,
    };

    if (!includeAllExpenses && (!isHistory || !hasHrAccess)) {
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
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        employee: {
          include: {
            employmentContracts: {
              where: { active: true },
              take: 1,
              include: { position: true, department: true },
            },
          },
        },
        approvals: includeAllExpenses
          ? {
              orderBy: { level: "asc" },
              include: { approver: { select: { id: true, name: true, image: true } } },
            }
          : hasHrAccess && isHistory
            ? {
                orderBy: { decidedAt: "desc" },
                take: 1,
                include: { approver: { select: { name: true, image: true } } },
              }
            : {
                where: { approverId: userId },
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

    // --- EJECUTAR EN PARALELO ---
    const [ptoRequests, manualRequests, expenses] = await Promise.all([ptoPromise, manualPromise, expensesPromise]);

    // --- PROCESAR PTO ---
    for (const req of ptoRequests) {
      // Determinar visibilidad con early-continue
      if (!isHistory && !hasHrAccess) {
        const approvers = await getAuthorizedApprovers(req.employeeId, "PTO");
        if (!approvers.some((a) => a.userId === userId)) continue;
      }

      const activeContract = req.employee.employmentContracts[0];
      items.push({
        id: req.id,
        type: "PTO",
        employeeId: req.employeeId,
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        employeeImage: req.employee.photoUrl,
        orgId: req.orgId,
        organization: req.organization
          ? {
              id: req.organization.id,
              name: req.organization.name,
            }
          : undefined,
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

    // --- PROCESAR MANUAL TIME ENTRIES ---
    for (const req of manualRequests) {
      // Determinar visibilidad con early-continue
      if (!isHistory && !hasHrAccess) {
        const approvers = await getAuthorizedApprovers(req.employeeId, "MANUAL_TIME_ENTRY");
        if (!approvers.some((a) => a.userId === userId)) continue;
      }

      const activeContract = req.employee.employmentContracts?.[0];
      items.push({
        id: req.id,
        type: "MANUAL_TIME_ENTRY",
        employeeId: req.employeeId,
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        employeeImage: req.employee.photoUrl,
        orgId: req.orgId,
        organization: req.organization
          ? {
              id: req.organization.id,
              name: req.organization.name,
            }
          : undefined,
        date: req.date.toISOString(),
        summary: `Corrección fichaje: ${req.reason}`,
        status: req.status,
        createdAt: req.submittedAt,
        details: {
          date: req.date.toISOString(),
          clockIn: req.clockInTime.toISOString(),
          clockOut: req.clockOutTime.toISOString(),
          reason: req.reason,
          position: activeContract?.position?.title,
          department: activeContract?.department?.name,
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

    // --- PROCESAR EXPENSES ---
    for (const expense of expenses) {
      const approvals = expense.approvals ?? [];
      const sortedApprovals = includeAllExpenses ? [...approvals].sort((a, b) => a.level - b.level) : approvals;
      const firstPending = sortedApprovals.find((approval) => approval.decision !== "APPROVED");
      const currentApproverLevel = includeAllExpenses ? (firstPending?.level ?? null) : null;
      const currentApprovers =
        includeAllExpenses && currentApproverLevel !== null
          ? sortedApprovals
              .filter((approval) => approval.level === currentApproverLevel && approval.decision === "PENDING")
              .map((approval) => ({
                id: approval.approver?.id ?? approval.approverId,
                name: approval.approver?.name ?? "Sin asignar",
              }))
          : undefined;
      const canApprove = includeAllExpenses
        ? Boolean(currentApprovers?.some((approver) => approver.id === userId))
        : true;
      const myApproval = approvals[0];
      const activeContract = expense.employee.employmentContracts[0];
      items.push({
        id: expense.id,
        type: "EXPENSE",
        employeeId: expense.employeeId,
        employeeName: `${expense.employee.firstName} ${expense.employee.lastName}`,
        employeeImage: expense.employee.photoUrl,
        orgId: expense.orgId,
        organization: expense.organization
          ? {
              id: expense.organization.id,
              name: expense.organization.name,
            }
          : undefined,
        date: expense.date.toISOString(),
        summary: `Gasto: ${Number(expense.totalAmount).toFixed(2)}€ (${expense.category})`,
        status: expense.status,
        createdAt: expense.createdAt,
        canApprove,
        currentApprovers,
        details: {
          amount: Number(expense.totalAmount),
          category: expense.category,
          notes: expense.notes,
          merchant: expense.merchantName,
          attachmentId: expense.attachments[0]?.id,
          approverComments: myApproval?.comment,
          rejectionReason: myApproval?.decision === "REJECTED" ? myApproval.comment : undefined,
          position: activeContract?.position?.title,
          department: activeContract?.department?.name,
          currentApprovers,
          audit: {
            decidedAt: myApproval?.decidedAt?.toISOString(),
            approverName: myApproval?.approver?.name,
            approverImage: myApproval?.approver?.image,
          },
        },
      });
    }

    // Ordenar final
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { success: true, items, organizations, activeOrgId: targetOrgId };
  } catch (error) {
    console.error("❌ Error CRÍTICO en getMyApprovals:", error);
    return { success: false, items: [], organizations: [], activeOrgId: null, error: "Error interno del servidor" };
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

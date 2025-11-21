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
 * Obtiene todas las aprobaciones pendientes para el usuario actual.
 */
export async function getMyPendingApprovals(): Promise<{
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

    // ==================================================================
    // 1. PTO REQUESTS
    // ==================================================================
    const ptoRequests = await prisma.ptoRequest.findMany({
      where: { orgId, status: "PENDING" },
      include: {
        employee: {
          include: {
            // Buscamos el contrato activo para obtener puesto y departamento
            employmentContracts: {
              where: { active: true },
              take: 1,
              include: {
                position: true,
                department: true,
              },
            },
          },
        },
        absenceType: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    const isGlobalAdmin = ["ORG_ADMIN", "SUPER_ADMIN", "HR_ADMIN"].includes(session.user.role);

    for (const req of ptoRequests) {
      let canView = isGlobalAdmin;

      if (!canView) {
        const approvers = await getAuthorizedApprovers(req.employeeId, "PTO");
        if (approvers.some((a) => a.userId === userId)) canView = true;
      }

      if (canView) {
        // Obtener datos del contrato activo (si existe)
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
          },
        });
      }
    }

    // ==================================================================
    // 2. MANUAL TIME ENTRIES
    // ==================================================================
    const manualRequests = await prisma.manualTimeEntryRequest.findMany({
      where: { orgId, status: "PENDING" },
      include: { employee: true },
      orderBy: { submittedAt: "desc" },
    });

    for (const req of manualRequests) {
      let canView = isGlobalAdmin;

      if (!canView) {
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
          },
        });
      }
    }

    // Ordenar por fecha más reciente
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { success: true, items };
  } catch (error) {
    console.error("❌ Error CRÍTICO en getMyPendingApprovals:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    return { success: false, items: [], error: "Error interno del servidor" };
  }
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
  // if (type === "MANUAL_TIME_ENTRY") return await approveManualTimeEntry(id, comments);

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
  // if (type === "MANUAL_TIME_ENTRY") return await rejectManualTimeEntry(id, reason);

  return { success: false, error: "Tipo de solicitud no soportado" };
}

"use server";

import { z } from "zod";

import { hasHrApprovalAccess } from "@/lib/approvals/approval-engine";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";

// Schemas de validación
const ApprovalFiltersSchema = z.object({
  employeeId: z.string().optional(),
  category: z.enum(["FUEL", "MILEAGE", "MEAL", "TOLL", "PARKING", "LODGING", "OTHER"]).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

/**
 * Helper para obtener el usuario autenticado (aprobadores no necesitan empleado)
 */
async function getApproverBaseData() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, orgId: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return { session, user };
}

/**
 * Obtiene los gastos pendientes de aprobación para el usuario actual
 */
export async function getPendingApprovals(filters?: z.infer<typeof ApprovalFiltersSchema>) {
  const { user } = await getApproverBaseData();

  const validatedFilters = filters ? ApprovalFiltersSchema.parse(filters) : {};

  const expenses = await prisma.expense.findMany({
    where: {
      orgId: user.orgId,
      status: "SUBMITTED",
      approvals: {
        some: {
          approverId: user.id,
          decision: "PENDING",
        },
      },
      ...(validatedFilters.employeeId && { employeeId: validatedFilters.employeeId }),
      ...(validatedFilters.category && { category: validatedFilters.category }),
      ...(validatedFilters.dateFrom && { date: { gte: validatedFilters.dateFrom } }),
      ...(validatedFilters.dateTo && { date: { lte: validatedFilters.dateTo } }),
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      attachments: {
        select: {
          id: true,
          url: true,
          fileName: true,
        },
      },
      approvals: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { level: "asc" },
      },
      costCenter: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  // Filtrar para mostrar solo el nivel actual (aprobaciones previas deben estar aprobadas)
  const filteredExpenses = expenses.filter((expense) => {
    const myApproval = expense.approvals.find(
      (approval) => approval.approverId === user.id && approval.decision === "PENDING",
    );
    if (!myApproval) return false;

    const hasBlockingLevel = expense.approvals.some(
      (approval) => approval.level < myApproval.level && approval.decision !== "APPROVED",
    );
    return !hasBlockingLevel;
  });

  // Convertir Decimals a números para el cliente y devolver solo la aprobación del usuario para la UI
  const serializedExpenses = filteredExpenses.map((expense) => ({
    ...expense,
    amount: Number(expense.amount),
    vatPercent: expense.vatPercent ? Number(expense.vatPercent) : null,
    totalAmount: Number(expense.totalAmount),
    mileageKm: expense.mileageKm ? Number(expense.mileageKm) : null,
    mileageRate: expense.mileageRate ? Number(expense.mileageRate) : null,
    approvals: expense.approvals
      .filter((approval) => approval.approverId === user.id)
      .map((approval) => ({ ...approval })),
  }));

  return {
    success: true,
    expenses: serializedExpenses,
  };
}

/**
 * Aprueba un gasto
 */
export async function approveExpense(id: string, comment?: string) {
  const { user } = await getApproverBaseData();

  // Verificar que el gasto existe
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      approvals: {
        orderBy: { level: "asc" },
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!expense) {
    return { success: false, error: "Gasto no encontrado" };
  }

  if (expense.status !== "SUBMITTED") {
    return { success: false, error: "Este gasto no está pendiente de aprobación" };
  }

  // Verificar que el usuario tiene una aprobación pendiente para este gasto
  const approval = expense.approvals.find((a) => a.approverId === user.id && a.decision === "PENDING");
  if (!approval) {
    return { success: false, error: "No tienes permisos para aprobar este gasto" };
  }

  const hasBlockingLevel = expense.approvals.some((a) => a.level < approval.level && a.decision !== "APPROVED");
  if (hasBlockingLevel) {
    return { success: false, error: "Hay aprobaciones previas pendientes" };
  }

  const hasNextLevelPending = expense.approvals.some((a) => a.level > approval.level && a.decision === "PENDING");

  // Actualizar la aprobación y el gasto en una transacción
  await prisma.$transaction(async (tx) => {
    // Actualizar la aprobación
    await tx.expenseApproval.update({
      where: { id: approval.id },
      data: {
        decision: "APPROVED",
        comment: comment ?? null,
        decidedAt: new Date(),
      },
    });

    await tx.expenseApproval.updateMany({
      where: {
        expenseId: id,
        decision: "PENDING",
        level: approval.level,
        id: { not: approval.id },
      },
      data: {
        decision: "APPROVED",
        comment: "Aprobado por otro responsable",
        decidedAt: new Date(),
      },
    });

    // Actualizar el estado del gasto
    await tx.expense.update({
      where: { id },
      data: {
        status: hasNextLevelPending ? "SUBMITTED" : "APPROVED",
      },
    });

    // Crear notificación para el empleado
    if (expense.employee.user) {
      await createNotification(
        expense.employee.user.id,
        user.orgId,
        "EXPENSE_APPROVED",
        "Gasto aprobado",
        `Tu gasto de ${expense.totalAmount.toString()}€ ha sido aprobado`,
        undefined, // ptoRequestId
        undefined, // manualTimeEntryRequestId
        id, // expenseId
      );
    }
  });

  return {
    success: true,
  };
}

/**
 * Rechaza un gasto
 */
export async function rejectExpense(id: string, reason: string) {
  const { user } = await getApproverBaseData();

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "Debes proporcionar un motivo de rechazo" };
  }

  // Verificar que el gasto existe
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      approvals: {
        orderBy: { level: "asc" },
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!expense) {
    return { success: false, error: "Gasto no encontrado" };
  }

  if (expense.status !== "SUBMITTED") {
    return { success: false, error: "Este gasto no está pendiente de aprobación" };
  }

  // Verificar que el usuario tiene una aprobación pendiente para este gasto
  const approval = expense.approvals.find((a) => a.approverId === user.id && a.decision === "PENDING");
  if (!approval) {
    return { success: false, error: "No tienes permisos para rechazar este gasto" };
  }

  const hasBlockingLevel = expense.approvals.some((a) => a.level < approval.level && a.decision !== "APPROVED");
  if (hasBlockingLevel) {
    return { success: false, error: "Hay aprobaciones previas pendientes" };
  }

  // Actualizar la aprobación y el gasto en una transacción
  await prisma.$transaction(async (tx) => {
    // Actualizar la aprobación
    await tx.expenseApproval.update({
      where: { id: approval.id },
      data: {
        decision: "REJECTED",
        comment: reason,
        decidedAt: new Date(),
      },
    });

    await tx.expenseApproval.updateMany({
      where: {
        expenseId: id,
        decision: "PENDING",
        level: approval.level,
        id: { not: approval.id },
      },
      data: {
        decision: "REJECTED",
        comment: "Rechazado por otro responsable",
        decidedAt: new Date(),
      },
    });

    // Actualizar el estado del gasto
    await tx.expense.update({
      where: { id },
      data: {
        status: "REJECTED",
      },
    });

    // Crear notificación para el empleado
    if (expense.employee.user) {
      await createNotification(
        expense.employee.user.id,
        user.orgId,
        "EXPENSE_REJECTED",
        "Gasto rechazado",
        `Tu gasto de ${expense.totalAmount.toString()}€ ha sido rechazado: ${reason}`,
        undefined, // ptoRequestId
        undefined, // manualTimeEntryRequestId
        id, // expenseId
      );
    }
  });

  return {
    success: true,
  };
}

/**
 * Obtiene estadísticas de aprobaciones para el usuario actual
 */
export async function getApprovalStats() {
  const { user } = await getApproverBaseData();

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total pendientes
  const totalPending = await prisma.expense.count({
    where: {
      orgId: user.orgId,
      status: "SUBMITTED",
      approvals: {
        some: {
          approverId: user.id,
          decision: "PENDING",
        },
      },
    },
  });

  // Total aprobados este mes
  const totalApprovedThisMonth = await prisma.expense.count({
    where: {
      orgId: user.orgId,
      status: "APPROVED",
      approvals: {
        some: {
          approverId: user.id,
          decision: "APPROVED",
          decidedAt: {
            gte: firstDayOfMonth,
          },
        },
      },
    },
  });

  // Total rechazados este mes
  const totalRejectedThisMonth = await prisma.expense.count({
    where: {
      orgId: user.orgId,
      status: "REJECTED",
      approvals: {
        some: {
          approverId: user.id,
          decision: "REJECTED",
          decidedAt: {
            gte: firstDayOfMonth,
          },
        },
      },
    },
  });

  return {
    success: true,
    stats: {
      totalPending,
      totalApprovedThisMonth,
      totalRejectedThisMonth,
    },
  };
}

/**
 * Obtiene el historial de aprobaciones del usuario actual
 */
export async function getApprovalHistory(limit: number = 50) {
  const { user } = await getApproverBaseData();
  const hasHrAccess = await hasHrApprovalAccess(user.id, user.orgId);
  const statusFilter = { in: ["APPROVED", "REJECTED"] as const };

  const expenses = await prisma.expense.findMany({
    where: {
      orgId: user.orgId,
      status: statusFilter,
      ...(hasHrAccess
        ? {}
        : {
            approvals: {
              some: {
                approverId: user.id,
                decision: {
                  in: ["APPROVED", "REJECTED"],
                },
              },
            },
          }),
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      attachments: {
        select: {
          id: true,
          url: true,
          fileName: true,
        },
      },
      approvals: {
        ...(hasHrAccess
          ? {
              orderBy: { decidedAt: "desc" },
              take: 1,
            }
          : {
              where: {
                approverId: user.id,
              },
            }),
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      costCenter: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: limit,
  });

  // Convertir Decimals a números para el cliente
  const serializedExpenses = expenses.map((expense) => ({
    ...expense,
    amount: Number(expense.amount),
    vatPercent: expense.vatPercent ? Number(expense.vatPercent) : null,
    totalAmount: Number(expense.totalAmount),
    mileageKm: expense.mileageKm ? Number(expense.mileageKm) : null,
    mileageRate: expense.mileageRate ? Number(expense.mileageRate) : null,
  }));

  return {
    success: true,
    expenses: serializedExpenses,
  };
}

"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

// Schemas de validación
const ApprovalFiltersSchema = z.object({
  employeeId: z.string().optional(),
  category: z.enum(["FUEL", "MILEAGE", "MEAL", "TOLL", "PARKING", "LODGING", "OTHER"]).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

/**
 * Obtiene los gastos pendientes de aprobación para el usuario actual
 */
export async function getPendingApprovals(filters?: z.infer<typeof ApprovalFiltersSchema>) {
  const { user } = await getAuthenticatedEmployee();

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
            },
          },
        },
      },
      attachments: true,
      approvals: {
        where: {
          approverId: user.id,
        },
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
      date: "desc",
    },
  });

  return {
    success: true,
    expenses,
  };
}

/**
 * Aprueba un gasto
 */
export async function approveExpense(id: string, comment?: string) {
  const { user, employee } = await getAuthenticatedEmployee();

  // Verificar que el gasto existe
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      approvals: {
        where: {
          approverId: user.id,
          decision: "PENDING",
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
  const approval = expense.approvals[0];
  if (!approval) {
    return { success: false, error: "No tienes permisos para aprobar este gasto" };
  }

  // Actualizar la aprobación y el gasto en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // Actualizar la aprobación
    await tx.expenseApproval.update({
      where: { id: approval.id },
      data: {
        decision: "APPROVED",
        comment: comment ?? null,
        decidedAt: new Date(),
      },
    });

    // Actualizar el estado del gasto
    const updatedExpense = await tx.expense.update({
      where: { id },
      data: {
        status: "APPROVED",
      },
    });

    // Crear notificación para el empleado
    if (expense.employee.user) {
      await createNotification(
        expense.employee.user.id,
        "EXPENSE_APPROVED",
        `Tu gasto de ${expense.totalAmount.toString()}€ ha sido aprobado`,
        {
          expenseId: id,
        },
      );
    }

    return updatedExpense;
  });

  return {
    success: true,
    expense: result,
  };
}

/**
 * Rechaza un gasto
 */
export async function rejectExpense(id: string, reason: string) {
  const { user } = await getAuthenticatedEmployee();

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "Debes proporcionar un motivo de rechazo" };
  }

  // Verificar que el gasto existe
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      approvals: {
        where: {
          approverId: user.id,
          decision: "PENDING",
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
  const approval = expense.approvals[0];
  if (!approval) {
    return { success: false, error: "No tienes permisos para rechazar este gasto" };
  }

  // Actualizar la aprobación y el gasto en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // Actualizar la aprobación
    await tx.expenseApproval.update({
      where: { id: approval.id },
      data: {
        decision: "REJECTED",
        comment: reason,
        decidedAt: new Date(),
      },
    });

    // Actualizar el estado del gasto
    const updatedExpense = await tx.expense.update({
      where: { id },
      data: {
        status: "REJECTED",
      },
    });

    // Crear notificación para el empleado
    if (expense.employee.user) {
      await createNotification(
        expense.employee.user.id,
        "EXPENSE_REJECTED",
        `Tu gasto de ${expense.totalAmount.toString()}€ ha sido rechazado: ${reason}`,
        {
          expenseId: id,
        },
      );
    }

    return updatedExpense;
  });

  return {
    success: true,
    expense: result,
  };
}

/**
 * Obtiene estadísticas de aprobaciones para el usuario actual
 */
export async function getApprovalStats() {
  const { user } = await getAuthenticatedEmployee();

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
  const { user } = await getAuthenticatedEmployee();

  const expenses = await prisma.expense.findMany({
    where: {
      orgId: user.orgId,
      approvals: {
        some: {
          approverId: user.id,
          decision: {
            in: ["APPROVED", "REJECTED"],
          },
        },
      },
    },
    include: {
      employee: {
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
      attachments: true,
      approvals: {
        where: {
          approverId: user.id,
        },
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

  return {
    success: true,
    expenses,
  };
}

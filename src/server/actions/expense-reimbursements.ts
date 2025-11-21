"use server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";

// Schemas de validación
const ReimbursementFiltersSchema = z.object({
  employeeId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  costCenterId: z.string().optional(),
});

const ReimburseExpensesSchema = z.object({
  expenseIds: z.array(z.string()).min(1, "Debes seleccionar al menos un gasto"),
  method: z.enum(["TRANSFER", "PAYROLL", "CASH", "OTHER"]),
  reference: z.string().optional(),
});

/**
 * Helper para serializar campos Decimal de Prisma a números
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeExpense(expense: any) {
  return {
    ...expense,
    amount: expense.amount ? Number(expense.amount) : null,
    vatPercent: expense.vatPercent ? Number(expense.vatPercent) : null,
    totalAmount: expense.totalAmount ? Number(expense.totalAmount) : null,
    mileageKm: expense.mileageKm ? Number(expense.mileageKm) : null,
    mileageRate: expense.mileageRate ? Number(expense.mileageRate) : null,
  };
}

/**
 * Helper para obtener el usuario autenticado con permisos de HR
 */
async function getHRUserData() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, orgId: true, role: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Solo HR_ADMIN y ORG_ADMIN pueden gestionar reembolsos
  if (user.role !== "HR_ADMIN" && user.role !== "ORG_ADMIN") {
    throw new Error("No tienes permisos para gestionar reembolsos");
  }

  return { session, user };
}

/**
 * Obtiene los gastos APPROVED pendientes de reembolso
 */
export async function getPendingReimbursements(filters?: z.infer<typeof ReimbursementFiltersSchema>) {
  try {
    const { user } = await getHRUserData();
    const validatedFilters = filters ? ReimbursementFiltersSchema.parse(filters) : {};

    const expenses = await prisma.expense.findMany({
      where: {
        orgId: user.orgId,
        status: "APPROVED",
        reimbursedAt: null, // Solo gastos NO reembolsados
        ...(validatedFilters.employeeId && { employeeId: validatedFilters.employeeId }),
        ...(validatedFilters.costCenterId && { costCenterId: validatedFilters.costCenterId }),
        ...(validatedFilters.dateFrom &&
          validatedFilters.dateTo && {
            date: {
              gte: validatedFilters.dateFrom,
              lte: validatedFilters.dateTo,
            },
          }),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            preferredReimbursementMethod: true,
          },
        },
        costCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        approvals: {
          where: { decision: "APPROVED" },
          select: {
            decidedAt: true,
          },
          orderBy: {
            decidedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: [{ date: "asc" }],
    });

    // Calcular días pendientes desde aprobación y serializar Decimals
    const expensesWithDays = expenses.map((expense) => {
      const approvedAt = expense.approvals[0]?.decidedAt;
      const daysSinceApproval = approvedAt
        ? Math.floor((new Date().getTime() - new Date(approvedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return serializeExpense({
        ...expense,
        daysSinceApproval,
      });
    });

    return { success: true, expenses: expensesWithDays };
  } catch (error) {
    console.error("Error fetching pending reimbursements:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener gastos pendientes de reembolso",
    };
  }
}

/**
 * Obtiene estadísticas de reembolsos pendientes
 */
export async function getReimbursementStats() {
  try {
    const { user } = await getHRUserData();

    // Total pendiente de reembolso
    const pendingExpenses = await prisma.expense.findMany({
      where: {
        orgId: user.orgId,
        status: "APPROVED",
        reimbursedAt: null,
      },
      select: {
        totalAmount: true,
        employeeId: true,
        approvals: {
          where: { decision: "APPROVED" },
          select: { decidedAt: true },
          orderBy: { decidedAt: "desc" },
          take: 1,
        },
      },
    });

    const totalPendingAmount = pendingExpenses.reduce((sum, exp) => sum + Number(exp.totalAmount), 0);

    const uniqueEmployees = new Set(pendingExpenses.map((exp) => exp.employeeId)).size;

    // Calcular promedio de días de espera
    const daysArray = pendingExpenses
      .map((exp) => {
        const approvedAt = exp.approvals[0]?.decidedAt;
        return approvedAt
          ? Math.floor((new Date().getTime() - new Date(approvedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
      })
      .filter((days) => days > 0);

    const averageDaysWaiting =
      daysArray.length > 0 ? Math.round(daysArray.reduce((a, b) => a + b, 0) / daysArray.length) : 0;

    return {
      success: true,
      stats: {
        totalPendingAmount,
        pendingCount: pendingExpenses.length,
        uniqueEmployees,
        averageDaysWaiting,
      },
    };
  } catch (error) {
    console.error("Error fetching reimbursement stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener estadísticas de reembolsos",
    };
  }
}

/**
 * Marca gastos como reembolsados
 */
export async function reimburseExpenses(data: z.infer<typeof ReimburseExpensesSchema>) {
  try {
    const { user } = await getHRUserData();
    const validatedData = ReimburseExpensesSchema.parse(data);

    // Verificar que todos los gastos existen y están en estado APPROVED
    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: validatedData.expenseIds },
        orgId: user.orgId,
        status: "APPROVED",
        reimbursedAt: null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
      },
    });

    if (expenses.length === 0) {
      throw new Error("No se encontraron gastos válidos para reembolsar");
    }

    if (expenses.length !== validatedData.expenseIds.length) {
      throw new Error("Algunos gastos no están disponibles para reembolsar");
    }

    // Actualizar gastos a REIMBURSED
    const reimbursedAt = new Date();

    await prisma.$transaction(async (tx) => {
      // Actualizar gastos
      await tx.expense.updateMany({
        where: {
          id: { in: validatedData.expenseIds },
        },
        data: {
          status: "REIMBURSED",
          reimbursedAt,
          reimbursedBy: user.id,
          reimbursementMethod: validatedData.method,
          reimbursementReference: validatedData.reference,
        },
      });

      // Crear notificaciones para cada empleado
      const employeeIds = [...new Set(expenses.map((exp) => exp.employee.userId).filter(Boolean))] as string[];

      for (const employeeUserId of employeeIds) {
        const employeeExpenses = expenses.filter((exp) => exp.employee.userId === employeeUserId);
        const totalAmount = employeeExpenses.reduce((sum, exp) => sum + Number(exp.totalAmount), 0);
        const count = employeeExpenses.length;

        const methodLabels = {
          TRANSFER: "transferencia",
          PAYROLL: "nómina",
          CASH: "efectivo",
          OTHER: "otro método",
        };

        await createNotification(
          employeeUserId, // userId
          user.orgId, // orgId
          "EXPENSE_REIMBURSED", // type
          "Gastos reembolsados", // title
          `Se han reembolsado ${count} gasto${count > 1 ? "s" : ""} por un total de ${totalAmount.toFixed(2)}€ vía ${methodLabels[validatedData.method]}`, // message
          undefined, // ptoRequestId
          undefined, // manualTimeEntryRequestId
          employeeExpenses[0]?.id, // expenseId
        );
      }
    });

    return {
      success: true,
      reimbursedCount: expenses.length,
      message: `Se han reembolsado ${expenses.length} gasto${expenses.length > 1 ? "s" : ""} correctamente`,
    };
  } catch (error) {
    console.error("Error reimbursing expenses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al reembolsar gastos",
    };
  }
}

/**
 * Obtiene el historial de reembolsos procesados con paginación
 */
export async function getReimbursementHistory(
  filters?: z.infer<typeof ReimbursementFiltersSchema>,
  page: number = 1,
  pageSize: number = 20,
) {
  try {
    const { user } = await getHRUserData();
    const validatedFilters = filters ? ReimbursementFiltersSchema.parse(filters) : {};

    const where = {
      orgId: user.orgId,
      status: "REIMBURSED" as const,
      reimbursedAt: { not: null },
      ...(validatedFilters.employeeId && { employeeId: validatedFilters.employeeId }),
      ...(validatedFilters.costCenterId && { costCenterId: validatedFilters.costCenterId }),
      ...(validatedFilters.dateFrom &&
        validatedFilters.dateTo && {
          reimbursedAt: {
            gte: validatedFilters.dateFrom,
            lte: validatedFilters.dateTo,
          },
        }),
    };

    // Obtener total de registros
    const total = await prisma.expense.count({ where });

    // Obtener gastos paginados
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
          },
        },
        costCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        reimbursedByUser: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ reimbursedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Serializar Decimals
    const serializedExpenses = expenses.map(serializeExpense);

    return {
      success: true,
      expenses: serializedExpenses,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("Error fetching reimbursement history:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener historial de reembolsos",
    };
  }
}

/**
 * Obtiene gastos reembolsados de un empleado específico (para vista del empleado)
 */
export async function getMyReimbursedExpenses() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, orgId: true, employee: { select: { id: true } } },
    });

    if (!user?.employee) {
      throw new Error("No se encontró el perfil de empleado");
    }

    const expenses = await prisma.expense.findMany({
      where: {
        orgId: user.orgId,
        employeeId: user.employee.id,
        status: "REIMBURSED",
      },
      include: {
        costCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: true,
      },
      orderBy: [{ reimbursedAt: "desc" }],
    });

    // Serializar Decimals
    const serializedExpenses = expenses.map(serializeExpense);

    return { success: true, expenses: serializedExpenses };
  } catch (error) {
    console.error("Error fetching my reimbursed expenses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener tus gastos reembolsados",
    };
  }
}

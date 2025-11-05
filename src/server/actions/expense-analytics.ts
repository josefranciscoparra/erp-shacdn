"use server";

/* eslint-disable no-underscore-dangle */ // Prisma usa _sum para agregaciones

import { Decimal } from "@prisma/client/runtime/library";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";

// Schemas de validación
const DateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

/**
 * Obtiene estadísticas generales de gastos
 */
export async function getExpenseStats(dateRange?: z.infer<typeof DateRangeSchema>) {
  const { employee, role, orgId } = await getAuthenticatedUser();

  const validatedRange = dateRange ? DateRangeSchema.parse(dateRange) : {};

  // Por defecto, usar el mes actual
  const now = new Date();
  const from = validatedRange.from ?? startOfMonth(now);
  const to = validatedRange.to ?? endOfMonth(now);

  // Mes anterior para comparación
  const previousFrom = startOfMonth(subMonths(from, 1));
  const previousTo = endOfMonth(subMonths(from, 1));

  // Determinar si el usuario puede ver todos los gastos de la org o solo los suyos
  const isAdmin = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role);
  const baseWhere = isAdmin ? { orgId } : { employeeId: employee!.id };

  // Obtener totales del período actual
  const currentPeriodExpenses = await prisma.expense.groupBy({
    by: ["status"],
    where: {
      ...baseWhere,
      date: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      totalAmount: true,
    },
    _count: {
      id: true,
    },
  });

  // Obtener totales del período anterior
  const previousPeriodExpenses = await prisma.expense.groupBy({
    by: ["status"],
    where: {
      ...baseWhere,
      date: {
        gte: previousFrom,
        lte: previousTo,
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Calcular totales por estado
  const stats = {
    draft: {
      count: 0,
      total: new Decimal(0),
    },
    submitted: {
      count: 0,
      total: new Decimal(0),
    },
    approved: {
      count: 0,
      total: new Decimal(0),
    },
    rejected: {
      count: 0,
      total: new Decimal(0),
    },
    reimbursed: {
      count: 0,
      total: new Decimal(0),
    },
  };

  for (const group of currentPeriodExpenses) {
    const status = group.status.toLowerCase() as keyof typeof stats;
    stats[status].count = group._count.id;
    stats[status].total = group._sum.totalAmount ?? new Decimal(0);
  }

  // Calcular total del mes anterior
  const previousTotal = previousPeriodExpenses.reduce(
    (sum, group) => sum.add(group._sum.totalAmount ?? new Decimal(0)),
    new Decimal(0),
  );

  // Calcular total del mes actual
  const currentTotal = Object.values(stats).reduce((sum, stat) => sum.add(stat.total), new Decimal(0));

  // Calcular cambio porcentual
  let percentageChange = 0;
  if (previousTotal.gt(0)) {
    percentageChange = currentTotal.sub(previousTotal).div(previousTotal).mul(100).toNumber();
  } else if (currentTotal.gt(0)) {
    percentageChange = 100;
  }

  return {
    success: true,
    stats: {
      currentPeriod: {
        from,
        to,
        total: currentTotal,
        draft: stats.draft,
        submitted: stats.submitted,
        approved: stats.approved,
        rejected: stats.rejected,
        reimbursed: stats.reimbursed,
      },
      previousPeriod: {
        from: previousFrom,
        to: previousTo,
        total: previousTotal,
      },
      comparison: {
        percentageChange,
        trend: percentageChange > 0 ? "up" : percentageChange < 0 ? "down" : "stable",
      },
    },
  };
}

/**
 * Obtiene gastos agrupados por categoría
 */
export async function getExpensesByCategory(year?: number, month?: number) {
  const { employee, role, orgId } = await getAuthenticatedUser();

  // Por defecto, usar el mes actual
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth();

  const from = new Date(targetYear, targetMonth, 1);
  const to = endOfMonth(from);

  // Determinar si el usuario puede ver todos los gastos de la org o solo los suyos
  const isAdmin = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role);
  const baseWhere = isAdmin ? { orgId } : { employeeId: employee!.id };

  const expensesByCategory = await prisma.expense.groupBy({
    by: ["category"],
    where: {
      ...baseWhere,
      date: {
        gte: from,
        lte: to,
      },
      status: {
        in: ["APPROVED", "REIMBURSED"],
      },
    },
    _sum: {
      totalAmount: true,
    },
    _count: {
      id: true,
    },
  });

  const categories = expensesByCategory.map((group) => ({
    category: group.category,
    total: group._sum.totalAmount ?? new Decimal(0),
    count: group._count.id,
  }));

  // Calcular total
  const total = categories.reduce((sum, cat) => sum.add(cat.total), new Decimal(0));

  return {
    success: true,
    data: {
      period: { year: targetYear, month: targetMonth, from, to },
      categories,
      total,
    },
  };
}

/**
 * Obtiene gastos agrupados por empleado (solo para admins)
 */
export async function getExpensesByEmployee(year?: number, month?: number) {
  const { role, orgId } = await getAuthenticatedUser();

  // Verificar permisos
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role)) {
    return {
      success: false,
      error: "No tienes permisos para ver este reporte",
    };
  }

  // Por defecto, usar el mes actual
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth();

  const from = new Date(targetYear, targetMonth, 1);
  const to = endOfMonth(from);

  const expensesByEmployee = await prisma.expense.groupBy({
    by: ["employeeId"],
    where: {
      orgId,
      date: {
        gte: from,
        lte: to,
      },
      status: {
        in: ["APPROVED", "REIMBURSED"],
      },
    },
    _sum: {
      totalAmount: true,
    },
    _count: {
      id: true,
    },
  });

  // Obtener información de los empleados
  const employeeIds = expensesByEmployee.map((group) => group.employeeId);
  const employees = await prisma.employee.findMany({
    where: {
      id: {
        in: employeeIds,
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeNumber: true,
    },
  });

  const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));

  const data = expensesByEmployee.map((group) => {
    const emp = employeeMap.get(group.employeeId);
    return {
      employeeId: group.employeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Desconocido",
      employeeNumber: emp?.employeeNumber ?? "",
      total: group._sum.totalAmount ?? new Decimal(0),
      count: group._count.id,
    };
  });

  // Ordenar por total descendente
  data.sort((a, b) => b.total.sub(a.total).toNumber());

  // Calcular total
  const total = data.reduce((sum, item) => sum.add(item.total), new Decimal(0));

  return {
    success: true,
    data: {
      period: { year: targetYear, month: targetMonth, from, to },
      employees: data,
      total,
    },
  };
}

/**
 * Obtiene tendencia de gastos por mes (últimos 12 meses)
 */
export async function getExpensesTrend(months: number = 12) {
  const { employee, role, orgId } = await getAuthenticatedUser();

  // Determinar si el usuario puede ver todos los gastos de la org o solo los suyos
  const isAdmin = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role);
  const baseWhere = isAdmin ? { orgId } : { employeeId: employee!.id };

  const now = new Date();
  const monthsData = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const from = startOfMonth(monthDate);
    const to = endOfMonth(monthDate);

    const expenses = await prisma.expense.aggregate({
      where: {
        ...baseWhere,
        date: {
          gte: from,
          lte: to,
        },
        status: {
          in: ["APPROVED", "REIMBURSED"],
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    monthsData.push({
      year: from.getFullYear(),
      month: from.getMonth() + 1,
      monthName: from.toLocaleDateString("es-ES", { month: "short", year: "numeric" }),
      total: expenses._sum.totalAmount ?? new Decimal(0),
      count: expenses._count.id,
    });
  }

  return {
    success: true,
    data: monthsData,
  };
}

/**
 * Obtiene un resumen ejecutivo de gastos (solo para admins)
 */
export async function getExecutiveSummary(year?: number, month?: number) {
  const { role, orgId } = await getAuthenticatedUser();

  // Verificar permisos
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role)) {
    return {
      success: false,
      error: "No tienes permisos para ver este reporte",
    };
  }

  // Por defecto, usar el mes actual
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth();

  const from = new Date(targetYear, targetMonth, 1);
  const to = endOfMonth(from);

  // Totales por estado
  const totals = await prisma.expense.groupBy({
    by: ["status"],
    where: {
      orgId,
      date: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      totalAmount: true,
    },
    _count: {
      id: true,
    },
  });

  // Por categoría
  const byCategory = await prisma.expense.groupBy({
    by: ["category"],
    where: {
      orgId,
      date: {
        gte: from,
        lte: to,
      },
      status: {
        in: ["APPROVED", "REIMBURSED"],
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Empleados únicos con gastos
  const uniqueEmployees = await prisma.expense.findMany({
    where: {
      orgId,
      date: {
        gte: from,
        lte: to,
      },
    },
    select: {
      employeeId: true,
    },
    distinct: ["employeeId"],
  });

  // Tiempo promedio de aprobación
  const approvedExpenses = await prisma.expense.findMany({
    where: {
      orgId,
      date: {
        gte: from,
        lte: to,
      },
      status: {
        in: ["APPROVED", "REIMBURSED"],
      },
    },
    include: {
      approvals: {
        where: {
          decision: "APPROVED",
        },
        orderBy: {
          decidedAt: "asc",
        },
        take: 1,
      },
    },
  });

  let totalApprovalTime = 0;
  let approvalCount = 0;

  for (const expense of approvedExpenses) {
    if (expense.approvals[0]?.decidedAt) {
      const timeDiff = expense.approvals[0].decidedAt.getTime() - expense.createdAt.getTime();
      totalApprovalTime += timeDiff;
      approvalCount++;
    }
  }

  const avgApprovalTimeHours = approvalCount > 0 ? totalApprovalTime / approvalCount / (1000 * 60 * 60) : 0;

  return {
    success: true,
    summary: {
      period: { year: targetYear, month: targetMonth, from, to },
      totals: totals.map((t) => ({
        status: t.status,
        count: t._count.id,
        total: t._sum.totalAmount ?? new Decimal(0),
      })),
      byCategory: byCategory.map((c) => ({
        category: c.category,
        total: c._sum.totalAmount ?? new Decimal(0),
      })),
      uniqueEmployees: uniqueEmployees.length,
      avgApprovalTimeHours: Math.round(avgApprovalTimeHours * 10) / 10,
    },
  };
}

/**
 * Exporta gastos a CSV
 */
export async function exportExpensesCSV(filters?: {
  status?: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  employeeId?: string;
}) {
  const { role, orgId } = await getAuthenticatedUser();

  // Verificar permisos - solo admins pueden exportar
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role)) {
    return {
      success: false,
      error: "No tienes permisos para exportar gastos",
    };
  }

  const expenses = await prisma.expense.findMany({
    where: {
      orgId,
      ...(filters?.status && { status: filters.status as any }),
      ...(filters?.category && { category: filters.category as any }),
      ...(filters?.dateFrom && { date: { gte: filters.dateFrom } }),
      ...(filters?.dateTo && { date: { lte: filters.dateTo } }),
      ...(filters?.employeeId && { employeeId: filters.employeeId }),
    },
    include: {
      employee: {
        select: {
          employeeNumber: true,
          firstName: true,
          lastName: true,
        },
      },
      approvals: {
        include: {
          approver: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          decidedAt: "desc",
        },
        take: 1,
      },
      costCenter: {
        select: {
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  // Generar CSV
  const headers = [
    "Fecha",
    "Número Empleado",
    "Empleado",
    "Categoría",
    "Comercio",
    "Importe",
    "IVA %",
    "IVA €",
    "Total",
    "Moneda",
    "Kilometraje",
    "Tarifa Km",
    "Centro de Coste",
    "Estado",
    "Aprobador",
    "Fecha Aprobación",
    "Comentarios",
  ];

  const rows = expenses.map((expense) => {
    const approval = expense.approvals[0];
    const vatAmount = expense.vatPercent ? expense.amount.mul(expense.vatPercent).div(100) : new Decimal(0);

    return [
      expense.date.toISOString().split("T")[0],
      expense.employee.employeeNumber,
      `${expense.employee.firstName} ${expense.employee.lastName}`,
      expense.category,
      expense.merchantName ?? "",
      expense.amount.toString(),
      expense.vatPercent?.toString() ?? "0",
      vatAmount.toString(),
      expense.totalAmount.toString(),
      expense.currency,
      expense.mileageKm?.toString() ?? "",
      expense.mileageRate?.toString() ?? "",
      expense.costCenter?.name ?? "",
      expense.status,
      approval?.approver.name ?? "",
      approval?.decidedAt?.toISOString().split("T")[0] ?? "",
      approval?.comment ?? "",
    ];
  });

  // Convertir a CSV
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return {
    success: true,
    csv: csvContent,
    count: expenses.length,
  };
}

"use server";

import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { ExpenseServiceFactory } from "@/services/expenses/expense-factory";
import { CreateExpenseDTO, UpdateExpenseDTO } from "@/services/expenses/expense.interface";

import { createNotification } from "./notifications";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

/**
 * Obtiene el aprobador por defecto para un empleado
 * Prioridad: Manager del contrato > HR_ADMIN
 */
async function getDefaultApprover(employeeId: string, orgId: string): Promise<string> {
  // Buscar el manager del empleado en su contrato activo
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      orgId,
      active: true,
      weeklyHours: {
        gt: new Decimal(0),
      },
    },
    include: {
      manager: {
        include: {
          user: true,
        },
      },
    },
  });

  if (contract?.manager?.user) {
    return contract.manager.user.id;
  }

  // Si no tiene manager, buscar un usuario con rol HR_ADMIN
  const hrAdmin = await prisma.user.findFirst({
    where: {
      orgId,
      role: "HR_ADMIN",
      active: true,
    },
  });

  if (hrAdmin) {
    return hrAdmin.id;
  }

  throw new Error("No se encontró un aprobador disponible");
}

/**
 * Calcula el monto total de un gasto
 */
function calculateTotalAmount(
  category: string,
  amount: Decimal,
  vatPercent: Decimal | null,
  mileageKm: Decimal | null,
  mileageRate: Decimal | null,
): Decimal {
  if (category === "MILEAGE" && mileageKm && mileageRate) {
    return new Decimal(mileageKm).mul(mileageRate);
  }

  const baseAmount = new Decimal(amount);
  if (vatPercent && vatPercent.gt(0)) {
    const vatAmount = baseAmount.mul(vatPercent).div(100);
    return baseAmount.add(vatAmount);
  }

  return baseAmount;
}

// Schemas de validación
const ExpenseFiltersSchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "REIMBURSED"]).optional(),
  category: z.enum(["FUEL", "MILEAGE", "MEAL", "TOLL", "PARKING", "LODGING", "OTHER"]).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  costCenterId: z.string().optional(),
});

/**
 * Obtiene los gastos del empleado autenticado
 */
export async function getMyExpenses(filters?: z.infer<typeof ExpenseFiltersSchema>) {
  const { employee } = await getAuthenticatedEmployee();

  const validatedFilters = filters ? ExpenseFiltersSchema.parse(filters) : {};

  const expenses = await prisma.expense.findMany({
    where: {
      employeeId: employee.id,
      orgId: employee.orgId,
      ...(validatedFilters.status && { status: validatedFilters.status }),
      ...(validatedFilters.category && { category: validatedFilters.category }),
      ...(validatedFilters.dateFrom && { date: { gte: validatedFilters.dateFrom } }),
      ...(validatedFilters.dateTo && { date: { lte: validatedFilters.dateTo } }),
      ...(validatedFilters.costCenterId && { costCenterId: validatedFilters.costCenterId }),
    },
    include: {
      attachments: true,
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
      },
      costCenter: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      // Incluir info de procedimiento para UI pública
      procedure: {
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
 * Obtiene un gasto por ID
 */
export async function getExpenseById(id: string) {
  const { employee, user } = await getAuthenticatedEmployee();

  const expense = await prisma.expense.findUnique({
    where: { id },
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
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          level: "asc",
        },
      },
      costCenter: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      policySnapshot: true,
      procedure: true,
    },
  });

  if (!expense) {
    return { success: false, error: "Gasto no encontrado" };
  }

  // Validar permisos: solo el owner o el aprobador pueden ver el gasto
  const isOwner = expense.employeeId === employee.id;
  const isApprover = expense.approvals.some((approval) => approval.approverId === user.id);
  // Managers/Admin pueden ver todo si quisieran, pero por ahora mantenemos restricción simple
  const isAdmin = ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user.role);

  if (!isOwner && !isApprover && !isAdmin) {
    return { success: false, error: "No tienes permisos para ver este gasto" };
  }

  return {
    success: true,
    expense,
  };
}

/**
 * Crea un nuevo gasto utilizando el motor correspondiente
 */
export async function createExpense(data: CreateExpenseDTO) {
  try {
    const { employee, user } = await getAuthenticatedEmployee();
    console.log("🏭 Factory: Obteniendo servicio de gastos para Org:", employee.orgId);

    const service = await ExpenseServiceFactory.getService(employee.orgId);
    return await service.create(data, user.id, employee.orgId);
  } catch (error) {
    console.error("❌ Error en createExpense:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear el gasto",
    };
  }
}

/**
 * Actualiza un gasto (solo si está en DRAFT)
 */
export async function updateExpense(id: string, data: UpdateExpenseDTO) {
  try {
    const { employee, user } = await getAuthenticatedEmployee();
    const service = await ExpenseServiceFactory.getService(employee.orgId);

    return await service.update(id, data, user.id);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error" };
  }
}

/**
 * Elimina un gasto (solo si está en DRAFT)
 */
export async function deleteExpense(id: string) {
  try {
    const { employee, user } = await getAuthenticatedEmployee();
    const service = await ExpenseServiceFactory.getService(employee.orgId);
    return await service.delete(id, user.id);
  } catch (error) {
    return { success: false, error: "Error" };
  }
}

/**
 * Envía un gasto a aprobación
 */
export async function submitExpense(id: string) {
  try {
    const { employee, user } = await getAuthenticatedEmployee();
    const service = await ExpenseServiceFactory.getService(employee.orgId);
    return await service.submit(id, user.id);
  } catch (error) {
    return { success: false, error: "Error" };
  }
}

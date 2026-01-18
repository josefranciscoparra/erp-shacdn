"use server";

import { z } from "zod";

import { resolveApproverUsers, hasHrApprovalAccess } from "@/lib/approvals/approval-engine";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseServiceFactory } from "@/services/expenses/expense-factory";
import { CreateExpenseDTO, UpdateExpenseDTO } from "@/services/expenses/expense.interface";

import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

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

export type ExpenseRecipient = {
  id: string;
  name: string | null;
  email: string | null;
  level: number | null;
  decision: "PENDING" | "APPROVED" | "REJECTED" | null;
  source:
    | "DIRECT_MANAGER"
    | "TEAM_RESPONSIBLE"
    | "DEPARTMENT_RESPONSIBLE"
    | "COST_CENTER_RESPONSIBLE"
    | "APPROVER_LIST"
    | "GROUP_HR"
    | "HR_ADMIN"
    | "ORG_ADMIN"
    | null;
};

export async function getExpenseRecipients(expenseId: string): Promise<{
  success: boolean;
  recipients: ExpenseRecipient[];
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, recipients: [], error: "No autenticado" };
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: {
      id: true,
      orgId: true,
      employeeId: true,
      createdBy: true,
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
    },
  });

  if (!expense) {
    return { success: false, recipients: [], error: "Gasto no encontrado" };
  }

  const hasHrAccess = await hasHrApprovalAccess(session.user.id, expense.orgId);
  if (!hasHrAccess) {
    return { success: false, recipients: [], error: "Sin permisos" };
  }

  let recipients: ExpenseRecipient[] = [];

  if (expense.approvals.length > 0) {
    recipients = expense.approvals.map((approval) => ({
      id: approval.approver?.id ?? approval.approverId,
      name: approval.approver?.name ?? null,
      email: approval.approver?.email ?? null,
      level: approval.level,
      decision: approval.decision,
      source: null,
    }));
  } else {
    const approvers = await resolveApproverUsers(expense.employeeId, expense.orgId, "EXPENSE");
    const filtered = approvers.filter((approver) => approver.userId !== expense.createdBy);

    recipients = filtered.map((approver) => ({
      id: approver.userId,
      name: approver.name,
      email: approver.email,
      level: approver.level ?? null,
      decision: null,
      source: approver.source ?? null,
    }));
  }

  const uniqueRecipients = new Map<string, ExpenseRecipient>();
  for (const recipient of recipients) {
    if (!uniqueRecipients.has(recipient.id)) {
      uniqueRecipients.set(recipient.id, recipient);
    }
  }

  return { success: true, recipients: Array.from(uniqueRecipients.values()) };
}

/**
 * Crea un nuevo gasto utilizando el motor correspondiente
 */
export async function createExpense(data: CreateExpenseDTO) {
  try {
    console.log("🛠️ [createExpense Action] Iniciando...");
    const { employee, userId, orgId } = await getAuthenticatedEmployee();
    console.log("🛠️ [createExpense Action] Auth OK. Employee:", employee.id, "Org:", orgId);

    const service = await ExpenseServiceFactory.getService(orgId);
    console.log("🛠️ [createExpense Action] Servicio obtenido:", service.constructor.name);

    const result = await service.create(data, userId, orgId);
    console.log("🛠️ [createExpense Action] Resultado servicio:", result.success ? "OK" : "ERROR");

    return result;
  } catch (error) {
    console.error("Error creating expense:", error);
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
    const { userId, orgId } = await getAuthenticatedEmployee();
    const service = await ExpenseServiceFactory.getService(orgId);

    return await service.update(id, data, userId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido al actualizar" };
  }
}

/**
 * Elimina un gasto (solo si está en DRAFT)
 */
export async function deleteExpense(id: string) {
  try {
    const { userId, orgId } = await getAuthenticatedEmployee();
    const service = await ExpenseServiceFactory.getService(orgId);
    return await service.delete(id, userId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido al eliminar" };
  }
}

/**
 * Envía un gasto a aprobación
 */
export async function submitExpense(id: string) {
  try {
    const { userId, orgId } = await getAuthenticatedEmployee();
    const service = await ExpenseServiceFactory.getService(orgId);
    return await service.submit(id, userId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido al enviar" };
  }
}

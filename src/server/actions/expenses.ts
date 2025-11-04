"use server";

import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

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

const CreateExpenseSchema = z.object({
  date: z.date(),
  currency: z.string().default("EUR"),
  amount: z.number().nonnegative(), // Permite 0 para MILEAGE
  vatPercent: z.number().min(0).max(100).nullable().optional(),
  category: z.enum(["FUEL", "MILEAGE", "MEAL", "TOLL", "PARKING", "LODGING", "OTHER"]),
  mileageKm: z.number().positive().nullable().optional(),
  costCenterId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  merchantName: z.string().nullable().optional(),
  merchantVat: z.string().nullable().optional(),
  ocrRawData: z.any().nullable().optional(),
});

const UpdateExpenseSchema = CreateExpenseSchema.partial();

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
    },
  });

  if (!expense) {
    return { success: false, error: "Gasto no encontrado" };
  }

  // Validar permisos: solo el owner o el aprobador pueden ver el gasto
  const isOwner = expense.employeeId === employee.id;
  const isApprover = expense.approvals.some((approval) => approval.approverId === user.id);

  if (!isOwner && !isApprover) {
    return { success: false, error: "No tienes permisos para ver este gasto" };
  }

  return {
    success: true,
    expense,
  };
}

/**
 * Crea un nuevo gasto en estado DRAFT
 */
export async function createExpense(data: z.infer<typeof CreateExpenseSchema>) {
  try {
    const { employee } = await getAuthenticatedEmployee();

    console.log("🔍 createExpense - Data recibida:", JSON.stringify(data, null, 2));

    const validatedData = CreateExpenseSchema.parse(data);
    console.log("✅ Validación de Zod exitosa");

  // Obtener o crear la política actual de la organización
  let policy = await prisma.expensePolicy.findUnique({
    where: { orgId: employee.orgId },
  });

  // Crear una política por defecto si no existe
  policy ??= await prisma.expensePolicy.create({
    data: {
      orgId: employee.orgId,
      mileageRateEurPerKm: new Decimal(0.26), // Tarifa por defecto
      attachmentRequired: true,
      costCenterRequired: false,
      vatAllowed: true,
      approvalLevels: 1,
      categoryRequirements: {},
    },
  });

  // Obtener mileageRate de la política si es MILEAGE
  let mileageRate: Decimal | null = null;
  if (validatedData.category === "MILEAGE") {
    mileageRate = policy.mileageRateEurPerKm;
  }

  // Calcular el monto total
  const totalAmount = calculateTotalAmount(
    validatedData.category,
    new Decimal(validatedData.amount),
    validatedData.vatPercent ? new Decimal(validatedData.vatPercent) : null,
    validatedData.mileageKm ? new Decimal(validatedData.mileageKm) : null,
    mileageRate,
  );

  // Crear el gasto
  const expense = await prisma.expense.create({
    data: {
      date: validatedData.date,
      currency: validatedData.currency,
      amount: new Decimal(validatedData.amount),
      vatPercent: validatedData.vatPercent ? new Decimal(validatedData.vatPercent) : null,
      totalAmount,
      category: validatedData.category,
      mileageKm: validatedData.mileageKm ? new Decimal(validatedData.mileageKm) : null,
      mileageRate,
      costCenterId: validatedData.costCenterId,
      notes: validatedData.notes,
      merchantName: validatedData.merchantName,
      merchantVat: validatedData.merchantVat,
      ocrRawData: validatedData.ocrRawData,
      status: "DRAFT",
      orgId: employee.orgId,
      employeeId: employee.id,
      createdBy: employee.userId, // Campo de auditoría requerido
    },
    include: {
      attachments: true,
      approvals: true,
    },
  });

    // Crear snapshot de la política (solo campos que existen en PolicySnapshot)
    await prisma.policySnapshot.create({
      data: {
        mileageRateEurPerKm: policy.mileageRateEurPerKm,
        mealDailyLimit: policy.mealDailyLimit,
        fuelRequiresReceipt: true, // Default
        vatAllowed: policy.vatAllowed,
        costCenterRequired: policy.costCenterRequired,
        expenseId: expense.id,
      },
    });

    return {
      success: true,
      expense,
    };
  } catch (error) {
    console.error("❌ Error en createExpense:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Error desconocido al crear el gasto",
    };
  }
}

/**
 * Actualiza un gasto (solo si está en DRAFT)
 */
export async function updateExpense(id: string, data: z.infer<typeof UpdateExpenseSchema>) {
  const { employee } = await getAuthenticatedEmployee();

  const validatedData = UpdateExpenseSchema.parse(data);

  // Verificar que el gasto existe y pertenece al empleado
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      policySnapshot: true,
    },
  });

  if (!expense) {
    return { success: false, error: "Gasto no encontrado" };
  }

  if (expense.employeeId !== employee.id) {
    return { success: false, error: "No tienes permisos para editar este gasto" };
  }

  if (expense.status !== "DRAFT") {
    return { success: false, error: "Solo se pueden editar gastos en estado borrador" };
  }

  // Recalcular el monto total si cambian los valores
  let totalAmount = expense.totalAmount;
  if (
    validatedData.amount !== undefined ||
    validatedData.vatPercent !== undefined ||
    validatedData.mileageKm !== undefined
  ) {
    const mileageRate =
      validatedData.category === "MILEAGE" ? expense.mileageRate : expense.mileageRate;

    totalAmount = calculateTotalAmount(
      validatedData.category ?? expense.category,
      validatedData.amount !== undefined ? new Decimal(validatedData.amount) : expense.amount,
      validatedData.vatPercent !== undefined
        ? validatedData.vatPercent
          ? new Decimal(validatedData.vatPercent)
          : null
        : expense.vatPercent,
      validatedData.mileageKm !== undefined
        ? validatedData.mileageKm
          ? new Decimal(validatedData.mileageKm)
          : null
        : expense.mileageKm,
      mileageRate,
    );
  }

  // Actualizar el gasto
  const updatedExpense = await prisma.expense.update({
    where: { id },
    data: {
      ...(validatedData.date && { date: validatedData.date }),
      ...(validatedData.currency && { currency: validatedData.currency }),
      ...(validatedData.amount !== undefined && { amount: new Decimal(validatedData.amount) }),
      ...(validatedData.vatPercent !== undefined && {
        vatPercent: validatedData.vatPercent ? new Decimal(validatedData.vatPercent) : null,
      }),
      totalAmount,
      ...(validatedData.category && { category: validatedData.category }),
      ...(validatedData.mileageKm !== undefined && {
        mileageKm: validatedData.mileageKm ? new Decimal(validatedData.mileageKm) : null,
      }),
      ...(validatedData.costCenterId !== undefined && { costCenterId: validatedData.costCenterId }),
      ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      ...(validatedData.merchantName !== undefined && { merchantName: validatedData.merchantName }),
      ...(validatedData.merchantVat !== undefined && { merchantVat: validatedData.merchantVat }),
      ...(validatedData.ocrRawData !== undefined && { ocrRawData: validatedData.ocrRawData }),
    },
    include: {
      attachments: true,
      approvals: true,
    },
  });

  return {
    success: true,
    expense: updatedExpense,
  };
}

/**
 * Elimina un gasto (solo si está en DRAFT)
 */
export async function deleteExpense(id: string) {
  const { employee } = await getAuthenticatedEmployee();

  // Verificar que el gasto existe y pertenece al empleado
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      attachments: true,
    },
  });

  if (!expense) {
    return { success: false, error: "Gasto no encontrado" };
  }

  if (expense.employeeId !== employee.id) {
    return { success: false, error: "No tienes permisos para eliminar este gasto" };
  }

  if (expense.status !== "DRAFT") {
    return { success: false, error: "Solo se pueden eliminar gastos en estado borrador" };
  }

  // TODO: Eliminar attachments del storage
  // Para esto necesitaremos integrar con el servicio de storage existente

  // Eliminar el gasto (los attachments se eliminan en cascada)
  await prisma.expense.delete({
    where: { id },
  });

  return {
    success: true,
  };
}

/**
 * Envía un gasto a aprobación
 */
export async function submitExpense(id: string) {
  console.log("🔍 submitExpense - Iniciando para ID:", id);
  const { employee } = await getAuthenticatedEmployee();
  console.log("👤 Employee autenticado:", employee.id);

  // Verificar que el gasto existe y pertenece al empleado
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      attachments: true,
      policySnapshot: true,
    },
  });

  console.log("💰 Expense encontrado:", {
    id: expense?.id,
    status: expense?.status,
    attachmentsCount: expense?.attachments.length,
    hasPolicy: !!expense?.policySnapshot,
  });

  if (!expense) {
    console.error("❌ Gasto no encontrado");
    return { success: false, error: "Gasto no encontrado" };
  }

  if (expense.employeeId !== employee.id) {
    console.error("❌ Sin permisos - expense.employeeId:", expense.employeeId, "employee.id:", employee.id);
    return { success: false, error: "No tienes permisos para enviar este gasto" };
  }

  if (expense.status !== "DRAFT") {
    console.error("❌ Estado inválido:", expense.status);
    return { success: false, error: "Solo se pueden enviar gastos en estado borrador" };
  }

  // Validar que tenga attachments si la política lo requiere
  if (expense.policySnapshot?.attachmentRequired && expense.attachments.length === 0) {
    console.error("❌ Faltan attachments");
    return {
      success: false,
      error: "Este gasto requiere al menos un archivo adjunto (ticket/factura)",
    };
  }

  // Obtener el aprobador
  let approverId: string;
  try {
    console.log("🔍 Buscando aprobador...");
    approverId = await getDefaultApprover(employee.id, employee.orgId);
    console.log("✅ Aprobador encontrado:", approverId);
  } catch (error) {
    console.error("❌ Error al buscar aprobador:", error);
    return { success: false, error: "No se encontró un aprobador disponible" };
  }

  // Actualizar el estado del gasto y crear la aprobación en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // Actualizar el gasto
    const updatedExpense = await tx.expense.update({
      where: { id },
      data: {
        status: "SUBMITTED",
      },
    });

    // Crear la aprobación
    await tx.expenseApproval.create({
      data: {
        decision: "PENDING",
        level: 1,
        approverId,
        expenseId: id,
      },
    });

    // Crear notificación para el aprobador
    await createNotification(
      approverId,
      employee.orgId,
      "EXPENSE_SUBMITTED",
      "Nuevo gasto para aprobar",
      `${employee.firstName} ${employee.lastName} ha enviado un gasto de ${expense.totalAmount.toString()}€ para aprobación`,
    );

    return updatedExpense;
  });

  return {
    success: true,
    expense: result,
  };
}

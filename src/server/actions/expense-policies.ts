"use server";

import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";

// Schema de validación para política de gastos
const UpdatePolicySchema = z.object({
  mileageRateEurPerKm: z.number().min(0).max(10).optional(),
  mealDailyLimit: z.number().min(0).optional(),
  lodgingDailyLimit: z.number().min(0).optional(),
  categoryRequirements: z.record(z.any()).optional(),
  attachmentRequired: z.boolean().optional(),
  costCenterRequired: z.boolean().optional(),
  vatAllowed: z.boolean().optional(),
  approvalLevels: z.number().min(1).max(5).optional(),
});

/**
 * Obtiene la política de gastos de la organización
 * Si no existe, la crea con valores por defecto
 */
export async function getOrganizationPolicy() {
  const { orgId } = await getAuthenticatedUser();

  let policy = await prisma.expensePolicy.findUnique({
    where: { orgId },
  });

  // Si no existe, crearla con valores por defecto (España 2024)
  policy ??= await prisma.expensePolicy.create({
    data: {
      orgId,
      mileageRateEurPerKm: new Decimal(0.26), // Tarifa estándar España 2024
      mealDailyLimit: new Decimal(30.0),
      lodgingDailyLimit: new Decimal(100.0),
      categoryRequirements: {
        FUEL: {
          requiresReceipt: true,
          vatAllowed: true,
          description: "Combustible para vehículos de empresa o desplazamientos",
        },
        MILEAGE: {
          requiresReceipt: false,
          vatAllowed: false,
          description: "Kilometraje con vehículo propio",
        },
        MEAL: {
          requiresReceipt: true,
          vatAllowed: true,
          maxDailyAmount: 30.0,
          description: "Comidas en desplazamientos o con clientes",
        },
        TOLL: {
          requiresReceipt: true,
          vatAllowed: true,
          description: "Peajes de autopistas",
        },
        PARKING: {
          requiresReceipt: false,
          vatAllowed: true,
          description: "Parking en desplazamientos",
        },
        LODGING: {
          requiresReceipt: true,
          vatAllowed: true,
          maxDailyAmount: 100.0,
          description: "Alojamiento en desplazamientos",
        },
        OTHER: {
          requiresReceipt: true,
          vatAllowed: true,
          description: "Otros gastos justificados",
        },
      },
      attachmentRequired: true,
      costCenterRequired: false,
      vatAllowed: true,
      approvalLevels: 1,
    },
  });

  return {
    success: true,
    policy,
  };
}

/**
 * Actualiza la política de gastos de la organización
 * Solo accesible para roles ORG_ADMIN, SUPER_ADMIN y HR_ADMIN
 */
export async function updatePolicy(data: z.infer<typeof UpdatePolicySchema>) {
  const { orgId, role } = await getAuthenticatedUser();

  // Verificar permisos
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role)) {
    return {
      success: false,
      error: "No tienes permisos para actualizar la política de gastos",
    };
  }

  const validatedData = UpdatePolicySchema.parse(data);

  // Verificar que la política existe
  const existingPolicy = await prisma.expensePolicy.findUnique({
    where: { orgId },
  });

  if (!existingPolicy) {
    return { success: false, error: "No se encontró la política de gastos" };
  }

  // Actualizar la política
  const policy = await prisma.expensePolicy.update({
    where: { orgId },
    data: {
      ...(validatedData.mileageRateEurPerKm !== undefined && {
        mileageRateEurPerKm: new Decimal(validatedData.mileageRateEurPerKm),
      }),
      ...(validatedData.mealDailyLimit !== undefined && {
        mealDailyLimit: new Decimal(validatedData.mealDailyLimit),
      }),
      ...(validatedData.lodgingDailyLimit !== undefined && {
        lodgingDailyLimit: new Decimal(validatedData.lodgingDailyLimit),
      }),
      ...(validatedData.categoryRequirements !== undefined && {
        categoryRequirements: validatedData.categoryRequirements,
      }),
      ...(validatedData.attachmentRequired !== undefined && {
        attachmentRequired: validatedData.attachmentRequired,
      }),
      ...(validatedData.costCenterRequired !== undefined && {
        costCenterRequired: validatedData.costCenterRequired,
      }),
      ...(validatedData.vatAllowed !== undefined && {
        vatAllowed: validatedData.vatAllowed,
      }),
      ...(validatedData.approvalLevels !== undefined && {
        approvalLevels: validatedData.approvalLevels,
      }),
    },
  });

  return {
    success: true,
    policy,
  };
}

/**
 * Obtiene los límites aplicables para una categoría específica
 */
export async function getCategoryLimits(category: string) {
  const { orgId } = await getAuthenticatedUser();

  const policy = await prisma.expensePolicy.findUnique({
    where: { orgId },
  });

  if (!policy) {
    return { success: false, error: "No se encontró la política de gastos" };
  }

  // Obtener requisitos de la categoría
  const categoryRequirements = (policy.categoryRequirements as Record<string, any>)?.[category] ?? {};

  // Construir respuesta
  const limits = {
    requiresReceipt: categoryRequirements.requiresReceipt ?? true,
    vatAllowed: categoryRequirements.vatAllowed ?? policy.vatAllowed,
    description: categoryRequirements.description ?? "",
    maxDailyAmount: categoryRequirements.maxDailyAmount ?? null,
    mileageRate: category === "MILEAGE" ? policy.mileageRateEurPerKm : null,
  };

  return {
    success: true,
    limits,
  };
}

/**
 * Valida si un gasto cumple con la política de la organización
 */
export async function validateExpenseAgainstPolicy(expenseData: {
  category: string;
  amount: number;
  hasAttachment: boolean;
  hasCostCenter: boolean;
  date: Date;
}) {
  const { orgId } = await getAuthenticatedUser();

  const policy = await prisma.expensePolicy.findUnique({
    where: { orgId },
  });

  if (!policy) {
    return { success: false, error: "No se encontró la política de gastos" };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar attachment requerido
  if (policy.attachmentRequired && !expenseData.hasAttachment) {
    errors.push("La política requiere adjuntar un ticket o factura");
  }

  // Validar centro de coste requerido
  if (policy.costCenterRequired && !expenseData.hasCostCenter) {
    errors.push("La política requiere especificar un centro de coste");
  }

  // Obtener requisitos de categoría
  const categoryRequirements = (policy.categoryRequirements as Record<string, any>)?.[expenseData.category] ?? {};

  // Validar requisitos específicos de categoría
  if (categoryRequirements.requiresReceipt && !expenseData.hasAttachment) {
    errors.push(`Los gastos de tipo ${expenseData.category} requieren ticket`);
  }

  // Validar límites diarios
  if (categoryRequirements.maxDailyAmount && expenseData.amount > categoryRequirements.maxDailyAmount) {
    warnings.push(`El monto excede el límite diario de ${categoryRequirements.maxDailyAmount}€ para esta categoría`);
  }

  // Validar límites generales
  if (expenseData.category === "MEAL" && expenseData.amount > Number(policy.mealDailyLimit)) {
    warnings.push(`El monto excede el límite diario de comidas (${policy.mealDailyLimit}€)`);
  }

  if (expenseData.category === "LODGING" && expenseData.amount > Number(policy.lodgingDailyLimit)) {
    warnings.push(`El monto excede el límite diario de alojamiento (${policy.lodgingDailyLimit}€)`);
  }

  return {
    success: true,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

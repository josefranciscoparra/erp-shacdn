import { Expense } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/actions/notifications";

import { IExpenseService, CreateExpenseDTO, UpdateExpenseDTO, PrivateExpenseSchema } from "./expense.interface";

export class PrivateExpenseService implements IExpenseService {
  /**
   * Lógica auxiliar para calcular montos (compartida o específica)
   */
  private calculateTotalAmount(
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

  /**
   * Valida límites de política (Comidas, Alojamiento)
   * Lanza error si se viola una regla estricta
   */
  private validatePolicyLimits(
    category: string,
    amount: Decimal,
    policy: { mealDailyLimit: Decimal | null; lodgingDailyLimit: Decimal | null },
  ) {
    if (category === "MEAL" && policy.mealDailyLimit && amount.gt(policy.mealDailyLimit)) {
      throw new Error(`El importe (${amount}€) excede el límite diario de comidas (${policy.mealDailyLimit}€).`);
    }

    if (category === "LODGING" && policy.lodgingDailyLimit && amount.gt(policy.lodgingDailyLimit)) {
      throw new Error(`El importe (${amount}€) excede el límite diario de alojamiento (${policy.lodgingDailyLimit}€).`);
    }
  }

  async create(data: CreateExpenseDTO, userId: string, orgId: string) {
    try {
      // 1. Validar con Schema Privado
      const validated = PrivateExpenseSchema.parse(data);

      // 2. Obtener empleado
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (!employee) throw new Error("Empleado no encontrado");

      // 3. Obtener política activa
      let policy = await prisma.expensePolicy.findUnique({ where: { orgId } });

      // Crear política default si no existe (Legacy support)
      policy ??= await prisma.expensePolicy.create({
        data: {
          orgId,
          mileageRateEurPerKm: new Decimal(0.26),
          mealDailyLimit: new Decimal(30.0),
          lodgingDailyLimit: new Decimal(100.0),
          attachmentRequired: true,
        },
      });

      // 4. Lógica específica por categoría
      let mileageRate: Decimal | null = null;
      let finalAmount = new Decimal(validated.amount);
      let finalTotalAmount: Decimal;

      if (validated.category === "MILEAGE") {
        // CÁLCULO AUTOMÁTICO DE KILOMETRAJE
        // En modo privado, forzamos el cálculo basado en la tarifa oficial de la empresa
        if (!validated.mileageKm) {
          throw new Error("Para gastos de kilometraje es necesario indicar la distancia.");
        }
        mileageRate = policy.mileageRateEurPerKm;
        // Recalculamos el importe base: Km * Tarifa
        finalAmount = new Decimal(validated.mileageKm).mul(mileageRate);
        finalTotalAmount = finalAmount; // Kilometraje suele estar exento de IVA o se trata diferente
      } else {
        // VALIDACIÓN DE LÍMITES (Solo para no-kilometraje)
        this.validatePolicyLimits(validated.category, finalAmount, policy);

        // Cálculo estándar con IVA
        finalTotalAmount = this.calculateTotalAmount(
          validated.category,
          finalAmount,
          validated.vatPercent ? new Decimal(validated.vatPercent) : null,
          null,
          null,
        );
      }

      // 5. Crear Gasto
      const expense = await prisma.expense.create({
        data: {
          date: validated.date,
          currency: validated.currency,
          amount: finalAmount,
          vatPercent: validated.vatPercent ? new Decimal(validated.vatPercent) : null,
          totalAmount: finalTotalAmount,
          category: validated.category,
          mileageKm: validated.mileageKm ? new Decimal(validated.mileageKm) : null,
          mileageRate,
          costCenterId: validated.costCenterId,
          notes: validated.notes,
          merchantName: validated.merchantName,
          merchantVat: validated.merchantVat,
          ocrRawData: validated.ocrRawData,
          status: "DRAFT",
          orgId,
          employeeId: employee.id,
          createdBy: userId,
          // Campos nulos en privado
          procedureId: null,
          paidBy: "EMPLOYEE",
        },
      });

      // 6. Snapshot de política (Auditoría inmutable)
      await prisma.policySnapshot.create({
        data: {
          mileageRateEurPerKm: policy.mileageRateEurPerKm,
          mealDailyLimit: policy.mealDailyLimit,
          lodgingDailyLimit: policy.lodgingDailyLimit,
          vatAllowed: policy.vatAllowed,
          fuelRequiresReceipt: (policy.categoryRequirements as any)?.FUEL?.requiresReceipt ?? true,
          expenseId: expense.id,
        },
      });

      return { success: true, expense };
    } catch (error) {
      console.error("PrivateExpenseService.create error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  async update(id: string, data: UpdateExpenseDTO, userId: string) {
    try {
      const expense = await prisma.expense.findUnique({ where: { id } });
      if (!expense) return { success: false, error: "Gasto no encontrado" };
      if (expense.createdBy !== userId) return { success: false, error: "No autorizado" };
      if (expense.status !== "DRAFT") return { success: false, error: "Solo se pueden editar borradores" };

      // Obtener política para re-validar
      const policy = await prisma.expensePolicy.findUnique({ where: { orgId: expense.orgId } });
      if (!policy) throw new Error("Política no encontrada");

      // Preparar datos actualizados
      const category = data.category ?? expense.category;
      const amountInput = data.amount !== undefined ? new Decimal(data.amount) : expense.amount;
      const mileageKmInput =
        data.mileageKm !== undefined ? (data.mileageKm ? new Decimal(data.mileageKm) : null) : expense.mileageKm;
      const vatPercentInput =
        data.vatPercent !== undefined ? (data.vatPercent ? new Decimal(data.vatPercent) : null) : expense.vatPercent;

      let mileageRate = expense.mileageRate; // Mantener rate original si no se recalcula... o usar actual?
      // Política: Al editar draft, actualizamos a la tarifa actual si es kilometraje
      if (category === "MILEAGE") {
        mileageRate = policy.mileageRateEurPerKm;
      }

      let finalAmount = amountInput;
      let finalTotalAmount = expense.totalAmount;

      if (category === "MILEAGE") {
        if (!mileageKmInput) throw new Error("Distancia requerida para kilometraje");
        finalAmount = mileageKmInput.mul(mileageRate ?? new Decimal(0));
        finalTotalAmount = finalAmount;
      } else {
        // Validar límites nuevamente al actualizar
        this.validatePolicyLimits(category, finalAmount, policy);

        finalTotalAmount = this.calculateTotalAmount(category, finalAmount, vatPercentInput, null, null);
      }

      const updated = await prisma.expense.update({
        where: { id },
        data: {
          date: data.date,
          amount: finalAmount,
          totalAmount: finalTotalAmount,
          category: category,
          mileageKm: mileageKmInput,
          mileageRate: mileageRate, // Actualizar rate si cambió política
          vatPercent: vatPercentInput,
          notes: data.notes,
          merchantName: data.merchantName,
          merchantVat: data.merchantVat,
          costCenterId: data.costCenterId,
        },
      });

      return { success: true, expense: updated };
    } catch (error) {
      console.error("PrivateExpenseService.update error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Error al actualizar" };
    }
  }

  async validateForSubmission(expense: Expense) {
    // Recuperar configuración (o snapshot si quisiéramos ser estrictos con el momento de creación)
    // Usamos política actual para validación de envío
    const policy = await prisma.expensePolicy.findUnique({ where: { orgId: expense.orgId } });
    if (!policy) return { valid: false, error: "Política no definida" };

    // 1. REGLA: TICKET OBLIGATORIO
    // Si la política global lo exige, O si la categoría específica lo exige
    const catReqs = (policy.categoryRequirements as any)?.[expense.category];
    const categoryRequiresReceipt = catReqs?.requiresReceipt ?? true; // Default true si no especificado

    if (policy.attachmentRequired || categoryRequiresReceipt) {
      const attachmentsCount = await prisma.expenseAttachment.count({ where: { expenseId: expense.id } });
      if (attachmentsCount === 0) {
        return {
          valid: false,
          error: `Es obligatorio adjuntar un ticket o factura para gastos de tipo ${expense.category}.`,
        };
      }
    }

    return { valid: true };
  }

  async submit(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return { success: false, error: "Gasto no encontrado" };
    if (expense.status !== "DRAFT") return { success: false, error: "El gasto no está en borrador" };

    // 1. Ejecutar validaciones estrictas antes de enviar
    const validation = await this.validateForSubmission(expense);
    if (!validation.valid) return { success: false, error: validation.error };

    // 2. Buscar aprobador (Manager)
    const employee = await prisma.employee.findUnique({
      where: { id: expense.employeeId },
      include: {
        managedContracts: {
          where: { active: true },
          include: { manager: { include: { user: true } } },
        },
      },
    });

    // Obtener ID del manager (fallback a RRHH o Admin si no tiene)
    // Para simplificar, asumimos que el sistema asigna uno. En producción usaría `getDefaultApprover`.

    await prisma.expense.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });

    // TODO: Notificar al manager
    // await createNotification(...)

    return { success: true, expense };
  }

  async delete(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense || expense.createdBy !== userId) return { success: false, error: "No autorizado" };
    if (expense.status !== "DRAFT") return { success: false, error: "Solo borradores" };

    await prisma.expense.delete({ where: { id } });
    return { success: true };
  }
}

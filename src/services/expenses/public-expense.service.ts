import { Expense } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/actions/notifications";

import { buildApprovalChain } from "./approval-chain";
import { IExpenseService, CreateExpenseDTO, UpdateExpenseDTO, PublicExpenseSchema } from "./expense.interface";

export class PublicExpenseService implements IExpenseService {
  /**
   * Lógica auxiliar para calcular montos
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
   * Valida límites de política (Estricto para Sector Público)
   */
  private validatePolicyLimits(
    category: string,
    amount: Decimal,
    policy: { mealDailyLimit: Decimal | null; lodgingDailyLimit: Decimal | null },
  ) {
    if (category === "MEAL" && policy.mealDailyLimit && amount.gt(policy.mealDailyLimit)) {
      throw new Error(`El importe (${amount}€) supera la dieta/límite diario de comidas (${policy.mealDailyLimit}€).`);
    }

    if (category === "LODGING" && policy.lodgingDailyLimit && amount.gt(policy.lodgingDailyLimit)) {
      throw new Error(`El importe (${amount}€) supera el límite diario de alojamiento (${policy.lodgingDailyLimit}€).`);
    }
  }

  async create(data: CreateExpenseDTO, userId: string, orgId: string) {
    try {
      // 1. Validar con Schema PÚBLICO
      const validated = PublicExpenseSchema.parse(data);

      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (!employee) throw new Error("Empleado no encontrado");

      // 2. Validar Expediente
      const procedure = await prisma.expenseProcedure.findUnique({
        where: { id: validated.procedureId },
      });

      if (!procedure) throw new Error("Expediente no encontrado");

      // REGLA: El expediente debe estar AUTORIZADO
      if (procedure.status !== "AUTHORIZED" && procedure.status !== "JUSTIFICATION_PENDING") {
        throw new Error(`El expediente no admite gastos en estado: ${procedure.status}`);
      }

      // 3. Obtener política activa
      let policy = await prisma.expensePolicy.findUnique({ where: { orgId } });
      policy ??= await prisma.expensePolicy.create({
        data: {
          orgId,
          mileageRateEurPerKm: new Decimal(0.26), // Tarifa oficial
          attachmentRequired: true, // Por defecto en público suele ser obligatorio
        },
      });

      // 4. Lógica específica por categoría
      let mileageRate: Decimal | null = null;
      let finalAmount = new Decimal(validated.amount);
      let finalTotalAmount: Decimal;

      if (validated.category === "MILEAGE") {
        // CÁLCULO ESTRICTO DE KILOMETRAJE
        if (!validated.mileageKm) {
          throw new Error("Es obligatorio indicar los kilómetros para la indemnización por razón de servicio.");
        }
        mileageRate = policy.mileageRateEurPerKm;
        // Recalculamos importe base
        finalAmount = new Decimal(validated.mileageKm).mul(mileageRate);
        finalTotalAmount = finalAmount;
      } else {
        // VALIDACIÓN DE LÍMITES / DIETAS
        this.validatePolicyLimits(validated.category, finalAmount, policy);

        finalTotalAmount = this.calculateTotalAmount(
          validated.category,
          finalAmount,
          validated.vatPercent ? new Decimal(validated.vatPercent) : null,
          null,
          null,
        );
      }

      // 5. Crear Gasto vinculado al Expediente
      const expense = await prisma.expense.create({
        data: {
          date: validated.date,
          currency: validated.currency,
          amount: finalAmount, // Guardamos el calculado si es KM
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
          // Campos ESPECÍFICOS PÚBLICOS
          procedureId: validated.procedureId,
          paidBy: validated.paidBy,
        },
      });

      // Snapshot (Auditoría)
      await prisma.policySnapshot.create({
        data: {
          mileageRateEurPerKm: policy.mileageRateEurPerKm,
          mealDailyLimit: policy.mealDailyLimit,
          lodgingDailyLimit: policy.lodgingDailyLimit,
          vatAllowed: policy.vatAllowed,
          expenseId: expense.id,
        },
      });

      return { success: true, expense };
    } catch (error) {
      console.error("PublicExpenseService.create error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Error público desconocido" };
    }
  }

  async update(id: string, data: UpdateExpenseDTO, userId: string) {
    // TODO: Implementar lógica de actualización estricta similar al create
    // Por ahora, bloqueamos la edición simple para evitar inconsistencias en demo
    return { success: false, error: "La edición de gastos públicos está restringida en esta versión." };
  }

  async validateForSubmission(expense: Expense) {
    console.log("🔍 Validando envío gasto:", expense.id);
    // En público, validar adjuntos es CRÍTICO (Intervención)
    const policy = await prisma.expensePolicy.findUnique({ where: { orgId: expense.orgId } });

    // Si la política lo exige (o por defecto en público si no hay config específica)
    if (policy?.attachmentRequired !== false) {
      // Default to true if null/undefined logic
      const attachmentsCount = await prisma.expenseAttachment.count({ where: { expenseId: expense.id } });
      console.log(`📎 Adjuntos encontrados: ${attachmentsCount}`);
      if (attachmentsCount === 0) {
        return { valid: false, error: "Justificante documental obligatorio para fiscalización." };
      }
    }

    return { valid: true };
  }

  async submit(id: string, userId: string) {
    try {
      console.log("🚀 Submit gasto público:", id);
      const expense = await prisma.expense.findUnique({
        where: { id },
        include: {
          approvals: true,
          employee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      if (!expense) return { success: false, error: "Gasto no encontrado" };

      // Validar antes de enviar
      const validation = await this.validateForSubmission(expense);
      if (!validation.valid) {
        console.warn("❌ Validación falló:", validation.error);
        return { success: false, error: validation.error };
      }

      const policy = await prisma.expensePolicy.findUnique({ where: { orgId: expense.orgId } });
      const approverChain = await buildApprovalChain({
        id: expense.id,
        orgId: expense.orgId,
        employeeId: expense.employeeId,
        costCenterId: expense.costCenterId,
        createdBy: expense.createdBy,
      });

      const updated = await prisma.$transaction(async (tx) => {
        if (expense.approvals.length === 0) {
          await tx.expenseApproval.createMany({
            data: approverChain.map((approverId, index) => ({
              expenseId: expense.id,
              approverId,
              level: index + 1,
              decision: "PENDING",
            })),
          });
        }

        return tx.expense.update({
          where: { id },
          data: { status: "SUBMITTED" },
        });
      });
      console.log("✅ Gasto enviado a aprobación:", id);

      const requesterName =
        [expense.employee?.firstName, expense.employee?.lastName].filter(Boolean).join(" ") || "El empleado";
      const totalAmount = Number(expense.totalAmount).toFixed(2);
      const message = `${requesterName} ha enviado un gasto de ${totalAmount}€ (${expense.category})`;

      for (const recipientId of approverChain) {
        await createNotification(
          recipientId,
          expense.orgId,
          "EXPENSE_SUBMITTED",
          "Nuevo gasto para aprobar",
          message,
          undefined,
          undefined,
          expense.id,
        );
      }

      return { success: true, expense: updated };
    } catch (error) {
      console.error("Error submit expense:", error);
      return { success: false, error: "Error interno al enviar gasto" };
    }
  }

  async delete(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense || expense.createdBy !== userId) return { success: false, error: "No autorizado" };

    // Permitir borrar solo si no ha sido fiscalizado/cerrado (aquí simplificado a DRAFT)
    if (expense.status !== "DRAFT") return { success: false, error: "No se puede eliminar un gasto ya tramitado" };

    await prisma.expense.delete({ where: { id } });
    return { success: true };
  }
}

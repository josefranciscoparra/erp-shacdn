import { Expense } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/actions/notifications";

import { IExpenseService, CreateExpenseDTO, UpdateExpenseDTO, PublicExpenseSchema } from "./expense.interface";

export class PublicExpenseService implements IExpenseService {
  // Helper calc (podría ir a una clase base abstracta BaseExpenseService para no duplicar)
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

  async create(data: CreateExpenseDTO, userId: string, orgId: string) {
    try {
      // 1. Validar con Schema PÚBLICO (requiere procedureId)
      const validated = PublicExpenseSchema.parse(data);

      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (!employee) throw new Error("Empleado no encontrado");

      // 2. Validar Expediente
      const procedure = await prisma.expenseProcedure.findUnique({
        where: { id: validated.procedureId },
      });

      if (!procedure) throw new Error("Expediente no encontrado");

      // REGLA DE NEGOCIO PÚBLICA: El expediente debe estar AUTORIZADO
      if (procedure.status !== "AUTHORIZED" && procedure.status !== "JUSTIFICATION_PENDING") {
        throw new Error(`El expediente no admite gastos en estado: ${procedure.status}`);
      }

      // 3. Política (Tarifas oficiales BOE/Convenio)
      let policy = await prisma.expensePolicy.findUnique({ where: { orgId } });
      policy ??= await prisma.expensePolicy.create({
        data: { orgId, mileageRateEurPerKm: new Decimal(0.26) }, // Tarifa oficial
      });

      let mileageRate: Decimal | null = null;
      if (validated.category === "MILEAGE") {
        mileageRate = policy.mileageRateEurPerKm;
      }

      const totalAmount = this.calculateTotalAmount(
        validated.category,
        new Decimal(validated.amount),
        validated.vatPercent ? new Decimal(validated.vatPercent) : null,
        validated.mileageKm ? new Decimal(validated.mileageKm) : null,
        mileageRate,
      );

      // 4. Crear Gasto vinculado al Expediente
      const expense = await prisma.expense.create({
        data: {
          date: validated.date,
          currency: validated.currency,
          amount: new Decimal(validated.amount),
          vatPercent: validated.vatPercent ? new Decimal(validated.vatPercent) : null,
          totalAmount,
          category: validated.category,
          mileageKm: validated.mileageKm ? new Decimal(validated.mileageKm) : null,
          mileageRate,
          costCenterId: validated.costCenterId,
          notes: validated.notes,
          merchantName: validated.merchantName,
          merchantVat: validated.merchantVat,
          ocrRawData: validated.ocrRawData,
          status: "DRAFT", // Empieza en DRAFT hasta que el usuario diga "Hecho"
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
    // Similar lógica a create...
    // REGLA PÚBLICA ADICIONAL: Si cambio el importe, verificar que no exceda el presupuesto del expediente (si fuera restrictivo)
    return { success: false, error: "Not implemented yet" };
  }

  async validateForSubmission(expense: Expense) {
    // En público, validar adjuntos es CRÍTICO (Intervención)
    // Validar que el procedureId siga activo
    return { valid: true };
  }

  async submit(id: string, userId: string) {
    // En flujo público, "submit" un gasto individual suele significar "marcarlo como listo para justificar"
    // O simplemente se queda en DRAFT hasta que se cierra el expediente completo.
    // Asumamos que pasa a "SUBMITTED" para que el gestor lo revise.

    const expense = await prisma.expense.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });

    return { success: true, expense };
  }

  async delete(id: string, userId: string) {
    // Igual que privado
    await prisma.expense.delete({ where: { id } });
    return { success: true };
  }
}

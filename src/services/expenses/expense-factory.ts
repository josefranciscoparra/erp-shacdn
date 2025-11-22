import { prisma } from "@/lib/prisma";

import { IExpenseService } from "./expense.interface";
import { PrivateExpenseService } from "./private-expense.service";
import { PublicExpenseService } from "./public-expense.service";

export class ExpenseServiceFactory {
  /**
   * Obtiene el servicio correcto según la configuración de la organización
   */
  static async getService(orgId: string): Promise<IExpenseService> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { expenseMode: true },
    });

    if (!org) throw new Error("Organización no encontrada");

    // Si la organización es "PUBLIC" -> PublicExpenseService
    // Si es "PRIVATE" -> PrivateExpenseService
    // Si es "MIXED", dependerá del contexto (pero por defecto para 'createExpense' simple,
    // podríamos necesitar un parámetro extra o devolver el Private si no se especifica expediente.
    // Para simplificar, asumimos que el modo PUBLIC fuerza el flujo público).

    if (org.expenseMode === "PUBLIC") {
      return new PublicExpenseService();
    }

    // Default: Private
    return new PrivateExpenseService();
  }
}

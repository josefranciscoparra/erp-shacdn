import { Expense, Prisma } from "@prisma/client";
import { z } from "zod";

// Definimos los Schemas de entrada aquí para separar modelos
export const PrivateExpenseSchema = z.object({
  date: z.date(),
  currency: z.string().default("EUR"),
  amount: z.number().nonnegative(),
  vatPercent: z.number().min(0).max(100).nullable().optional(),
  category: z.enum(["FUEL", "MILEAGE", "MEAL", "TOLL", "PARKING", "LODGING", "OTHER"]),
  mileageKm: z.number().positive().nullable().optional(),
  costCenterId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  merchantName: z.string().nullable().optional(),
  merchantVat: z.string().nullable().optional(),
  ocrRawData: z.any().nullable().optional(),
});

export const PublicExpenseSchema = PrivateExpenseSchema.extend({
  procedureId: z.string({ required_error: "El expediente es obligatorio en sector público" }),
  paidBy: z.enum(["EMPLOYEE", "ORGANIZATION"]).default("EMPLOYEE"),
});

export type CreateExpenseDTO = z.infer<typeof PublicExpenseSchema> | z.infer<typeof PrivateExpenseSchema>;
export type UpdateExpenseDTO = Partial<CreateExpenseDTO>;

// Interfaz del Motor de Gastos
export interface IExpenseService {
  /**
   * Crea un gasto aplicando las reglas de negocio específicas
   */
  create(
    data: CreateExpenseDTO,
    userId: string,
    orgId: string,
  ): Promise<{ success: boolean; expense?: Expense; error?: string }>;

  /**
   * Actualiza un gasto existente
   */
  update(
    id: string,
    data: UpdateExpenseDTO,
    userId: string,
  ): Promise<{ success: boolean; expense?: Expense; error?: string }>;

  /**
   * Valida si un gasto puede ser enviado a aprobación/justificación
   */
  validateForSubmission(expense: Expense): Promise<{ valid: boolean; error?: string }>;

  /**
   * Ejecuta la lógica de envío (submit)
   * Privado: Pasa a estado SUBMITTED y notifica manager
   * Público: Verifica saldo expediente, pasa a JUSTIFICATION_PENDING
   */
  submit(id: string, userId: string): Promise<{ success: boolean; expense?: Expense; error?: string }>;

  /**
   * Elimina un gasto (si el estado lo permite)
   */
  delete(id: string, userId: string): Promise<{ success: boolean; error?: string }>;
}

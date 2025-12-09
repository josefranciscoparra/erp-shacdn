import { z } from "zod";

// Schema para crear un lote de firmas masivas
export const createSignatureBatchSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200, "El nombre no puede exceder 200 caracteres"),
  description: z.string().max(500, "La descripción no puede exceder 500 caracteres").optional(),
  documentId: z.string().min(1, "El documento es requerido"),
  recipientEmployeeIds: z.array(z.string()).min(1, "Debe seleccionar al menos un destinatario"),
  additionalSignerEmployeeIds: z.array(z.string()).default([]),
  requireDoubleSignature: z.boolean().default(false),
  secondSignerRole: z.enum(["MANAGER", "HR", "SPECIFIC_USER"]).optional(),
  secondSignerUserId: z.string().optional(),
  expiresAt: z.date().refine((date) => date > new Date(), "La fecha de expiración debe ser futura"),
  reminderDays: z.array(z.number().min(1).max(30)).default([7, 3, 1]),
});

export type CreateSignatureBatchInput = z.infer<typeof createSignatureBatchSchema>;

// Schema para activar un lote
export const activateBatchSchema = z.object({
  batchId: z.string().min(1, "El ID del lote es requerido"),
});

export type ActivateBatchInput = z.infer<typeof activateBatchSchema>;

// Schema para cancelar un lote
export const cancelBatchSchema = z.object({
  batchId: z.string().min(1, "El ID del lote es requerido"),
  reason: z.string().max(500, "La razón no puede exceder 500 caracteres").optional(),
});

export type CancelBatchInput = z.infer<typeof cancelBatchSchema>;

// Schema para reenviar recordatorios
export const resendRemindersSchema = z.object({
  batchId: z.string().min(1, "El ID del lote es requerido"),
});

export type ResendRemindersInput = z.infer<typeof resendRemindersSchema>;

// Schema para filtros de listado
export const listBatchesSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED", "EXPIRED"]).optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

export type ListBatchesInput = z.infer<typeof listBatchesSchema>;

// Schema para obtener detalle de un lote
export const getBatchDetailSchema = z.object({
  batchId: z.string().min(1, "El ID del lote es requerido"),
});

export type GetBatchDetailInput = z.infer<typeof getBatchDetailSchema>;

// Schema para actualizar firmantes adicionales de una solicitud
export const updateRequestSignersSchema = z.object({
  requestId: z.string().min(1, "El ID de la solicitud es requerido"),
  signerEmployeeIds: z.array(z.string()).default([]),
});

export type UpdateRequestSignersInput = z.infer<typeof updateRequestSignersSchema>;

// Validación custom para doble firma
export function validateDoubleSignature(
  requireDoubleSignature: boolean,
  secondSignerRole?: string,
  secondSignerUserId?: string,
): { valid: boolean; error?: string } {
  if (!requireDoubleSignature) {
    return { valid: true };
  }

  if (!secondSignerRole) {
    return { valid: false, error: "Debe seleccionar un rol para el segundo firmante" };
  }

  if (secondSignerRole === "SPECIFIC_USER" && !secondSignerUserId) {
    return { valid: false, error: "Debe seleccionar un usuario específico como segundo firmante" };
  }

  return { valid: true };
}

import { z } from "zod";

// Categorías de documentos firmables
export const signableDocumentCategorySchema = z.enum(["CONTRATO", "NOMINA", "ACUERDO", "POLITICA", "OTRO"]);

// Estados de solicitud de firma
export const signatureRequestStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED", "EXPIRED"]);

// Estados de firmante
export const signerStatusSchema = z.enum(["PENDING", "SIGNED", "REJECTED", "EXPIRED"]);

// Políticas de firma
export const signaturePolicySchema = z.enum(["SES", "SES_TOTP"]);

// Schema para crear un documento firmable
export const createSignableDocumentSchema = z.object({
  title: z.string().min(1, "Título requerido").max(200, "Título muy largo"),
  description: z.string().max(1000, "Descripción muy larga").optional(),
  category: signableDocumentCategorySchema,
  file: z
    .any()
    .refine((file) => file instanceof File, "Debe ser un archivo válido")
    .refine(
      (file) => file.size <= 20 * 1024 * 1024, // 20MB
      "El archivo no puede superar los 20MB",
    )
    .refine((file) => file.type === "application/pdf", "Solo se permiten archivos PDF"),
  expiresAt: z.date().optional(),
});

// Schema para crear una solicitud de firma
export const createSignatureRequestSchema = z.object({
  documentId: z.string().min(1, "ID de documento requerido"),
  policy: signaturePolicySchema.default("SES"),
  expiresAt: z.date().min(new Date(), "La fecha de vencimiento debe ser futura"),
  signers: z
    .array(
      z.object({
        employeeId: z.string().min(1, "ID de empleado requerido"),
        order: z.number().int().min(1).default(1),
      }),
    )
    .min(1, "Debe haber al menos un firmante"),
});

// Schema para registrar consentimiento
export const giveConsentSchema = z.object({
  signToken: z.string().min(1, "Token requerido"),
  consent: z.boolean().refine((val) => val === true, "Debe aceptar los términos"),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// Schema para confirmar firma
export const confirmSignatureSchema = z.object({
  signToken: z.string().min(1, "Token requerido"),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// Schema para rechazar firma
export const rejectSignatureSchema = z.object({
  signToken: z.string().min(1, "Token requerido"),
  reason: z
    .string()
    .min(10, "El motivo debe tener al menos 10 caracteres")
    .max(500, "El motivo no puede exceder 500 caracteres"),
});

// Schema para filtros de solicitudes
export const signatureRequestFiltersSchema = z.object({
  status: signatureRequestStatusSchema.optional(),
  category: signableDocumentCategorySchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  employeeId: z.string().optional(),
});

// Tipos TypeScript derivados
export type SignableDocumentCategory = z.infer<typeof signableDocumentCategorySchema>;
export type SignatureRequestStatus = z.infer<typeof signatureRequestStatusSchema>;
export type SignerStatus = z.infer<typeof signerStatusSchema>;
export type SignaturePolicy = z.infer<typeof signaturePolicySchema>;
export type CreateSignableDocumentInput = z.infer<typeof createSignableDocumentSchema>;
export type CreateSignatureRequestInput = z.infer<typeof createSignatureRequestSchema>;
export type GiveConsentInput = z.infer<typeof giveConsentSchema>;
export type ConfirmSignatureInput = z.infer<typeof confirmSignatureSchema>;
export type RejectSignatureInput = z.infer<typeof rejectSignatureSchema>;
export type SignatureRequestFilters = z.infer<typeof signatureRequestFiltersSchema>;

// Labels para categorías
export const signableDocumentCategoryLabels: Record<SignableDocumentCategory, string> = {
  CONTRATO: "Contrato",
  NOMINA: "Nómina",
  ACUERDO: "Acuerdo",
  POLITICA: "Política",
  OTRO: "Otro",
};

// Labels para estados de solicitud
export const signatureRequestStatusLabels: Record<SignatureRequestStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En Progreso",
  COMPLETED: "Completada",
  REJECTED: "Rechazada",
  EXPIRED: "Expirada",
};

// Labels para estados de firmante
export const signerStatusLabels: Record<SignerStatus, string> = {
  PENDING: "Pendiente",
  SIGNED: "Firmado",
  REJECTED: "Rechazado",
  EXPIRED: "Expirado",
};

// Colores para badges de estados
export const signatureRequestStatusColors: Record<SignatureRequestStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  EXPIRED: "bg-gray-50 text-gray-700 border-gray-200",
};

// Colores para badges de estado de firmante
export const signerStatusColors: Record<SignerStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  SIGNED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  EXPIRED: "bg-gray-50 text-gray-700 border-gray-200",
};

// Colores para badges de urgencia (basado en días restantes)
export const urgencyColors = {
  expired: "bg-gray-50 text-gray-700 border-gray-200",
  urgent: "bg-red-50 text-red-700 border-red-200", // < 3 días
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200", // 3-7 días
  normal: "bg-green-50 text-green-700 border-green-200", // > 7 días
} as const;

// Helper para calcular días restantes
export function calculateDaysRemaining(expiresAt: Date): number {
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper para obtener el color de urgencia
export function getUrgencyColor(expiresAt: Date): keyof typeof urgencyColors {
  const daysRemaining = calculateDaysRemaining(expiresAt);

  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 3) return "urgent";
  if (daysRemaining <= 7) return "warning";
  return "normal";
}

// Helper para obtener el label de urgencia
export function getUrgencyLabel(expiresAt: Date): string {
  const daysRemaining = calculateDaysRemaining(expiresAt);

  if (daysRemaining < 0) return "Expirado";
  if (daysRemaining === 0) return "¡Hoy!";
  if (daysRemaining === 1) return "Mañana";
  if (daysRemaining <= 3) return "Urgente";
  if (daysRemaining <= 7) return "Próximo";
  return "Tiempo suficiente";
}

// Helper para validar si una solicitud está expirada
export function isRequestExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

// Helper para validar si una solicitud está próxima a expirar (< 3 días)
export function isRequestUrgent(expiresAt: Date): boolean {
  const daysRemaining = calculateDaysRemaining(expiresAt);
  return daysRemaining >= 0 && daysRemaining <= 3;
}

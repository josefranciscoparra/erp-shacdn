// Configuración de documentos para solicitudes PTO
// Este archivo NO es un server action, para poder exportar constantes

// Tipos permitidos para justificantes
export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// Tamaño máximo de archivo (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Máximo de documentos por solicitud
export const MAX_DOCUMENTS_PER_REQUEST = 5;

// Estados que permiten subir documentos
export const ALLOWED_UPLOAD_STATUSES = ["PENDING", "APPROVED"] as const;

// Roles que pueden subir documentos (además del empleado dueño)
export const ADMIN_ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"] as const;

/**
 * Genera la ruta de almacenamiento para un documento de PTO
 */
export function generatePtoDocumentPath(orgId: string, ptoRequestId: string, fileName: string): string {
  // Sanitizar el nombre del archivo
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}_${sanitizedFileName}`;

  return `org-${orgId}/pto-requests/${ptoRequestId}/${uniqueFileName}`;
}

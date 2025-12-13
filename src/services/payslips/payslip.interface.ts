import { type Prisma } from "@prisma/client";

import { type EmployeeMatchCandidate } from "@/lib/payslip/employee-matcher";

/**
 * Estados del lote de nóminas
 * - PROCESSING: En proceso de extracción/OCR
 * - REVIEW: Pendiente de revisión manual
 * - READY_TO_PUBLISH: Listo para publicar (todos READY o revisados)
 * - COMPLETED: Todas asignadas y publicadas
 * - PARTIAL: Parcialmente completado (algunas publicadas, otras no)
 * - ERROR: Error en procesamiento
 * - CANCELLED: Lote cancelado/revocado
 */
export type BatchStatus =
  | "PROCESSING"
  | "REVIEW"
  | "READY_TO_PUBLISH"
  | "COMPLETED"
  | "PARTIAL"
  | "ERROR"
  | "CANCELLED";

/**
 * Estados de un item de nómina
 * - PENDING_OCR: Recién importado, en cola para OCR
 * - PENDING_REVIEW: Requiere revisión humana (baja confianza o múltiples candidatos)
 * - READY: Listo para publicar (match seguro, esperando confirmación)
 * - PUBLISHED: Visible para el empleado
 * - BLOCKED_INACTIVE: Match a empleado inactivo
 * - ERROR: Fallo de OCR/procesado
 * - REVOKED: Publicado y luego revocado
 * - SKIPPED: Saltado manualmente
 * - ASSIGNED: [LEGACY] Asignado automáticamente (mantener compatibilidad)
 * - PENDING: [LEGACY] Pendiente (mantener compatibilidad)
 */
export type ItemStatus =
  | "PENDING_OCR"
  | "PENDING_REVIEW"
  | "READY"
  | "PUBLISHED"
  | "BLOCKED_INACTIVE"
  | "ERROR"
  | "REVOKED"
  | "SKIPPED"
  | "ASSIGNED"
  | "PENDING";

export interface PayslipBatchCreateInput {
  orgId: string;
  uploadedById: string;
  originalFileName: string;
  originalFileType: "ZIP" | "PDF_MULTIPAGE";
  month?: number | null;
  year?: number | null;
}

export interface PayslipUploadItemCreateInput {
  batchId: string;
  tempFilePath: string;
  originalFileName: string | null;
  pageNumber?: number | null;
  detectedDni?: string | null;
  detectedName?: string | null;
  detectedCode?: string | null;
  confidenceScore?: number;
  status?: ItemStatus;
  employeeId?: string | null;
  assignedAt?: Date | null;
  errorMessage?: string | null;
  isAutoMatched?: boolean;
}

/**
 * Resultado del procesamiento de un lote
 */
export interface ProcessingResult {
  totalFiles: number;
  /** Items listos para publicar (match seguro con empleado activo) */
  readyCount: number;
  /** Items que requieren revisión manual (baja confianza, múltiples matches) */
  pendingCount: number;
  /** Items bloqueados por empleado inactivo */
  blockedInactive: number;
  /** Items con error de procesamiento */
  errorCount: number;
  /** @deprecated Usar readyCount - mantener para compatibilidad */
  assignedCount: number;
}

// Interfaz para el servicio de Payslips
export interface IPayslipService {
  // Lotes
  createBatch(data: PayslipBatchCreateInput): Promise<any>;
  updateBatchStatus(batchId: string, status: BatchStatus, counts?: Partial<ProcessingResult>): Promise<void>;
  getBatchWithItems(batchId: string, orgId: string, options?: any): Promise<any>;
  getBatches(orgId: string, options?: any): Promise<any>;

  // Items
  createItem(data: Prisma.PayslipUploadItemUncheckedCreateInput): Promise<any>;
  updateItem(itemId: string, data: Prisma.PayslipUploadItemUncheckedUpdateInput): Promise<any>;
  assignItem(itemId: string, employeeId: string, userId: string): Promise<any>;
  skipItem(itemId: string): Promise<any>;

  // Procesamiento
  processBatchAsync(batchId: string, fileBuffer: Buffer, employees: EmployeeMatchCandidate[]): Promise<void>;

  // Utilidades
  cleanupTempFiles(batchId: string): Promise<void>;
}

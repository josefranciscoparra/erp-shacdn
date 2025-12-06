import { type EmployeeMatchCandidate } from "@/lib/payslip/employee-matcher";
import { type ExtractedFile } from "@/lib/payslip/zip-processor";

export type BatchStatus = "PROCESSING" | "REVIEW" | "COMPLETED" | "PARTIAL" | "ERROR";
export type ItemStatus = "PENDING" | "ASSIGNED" | "ERROR" | "SKIPPED";

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
  orgId: string;
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
}

export interface ProcessingResult {
  totalFiles: number;
  assignedCount: number;
  pendingCount: number;
  errorCount: number;
}

// Interfaz para el servicio de Payslips
export interface IPayslipService {
  // Lotes
  createBatch(data: PayslipBatchCreateInput): Promise<any>;
  updateBatchStatus(batchId: string, status: BatchStatus, counts?: Partial<ProcessingResult>): Promise<void>;
  getBatchWithItems(batchId: string, orgId: string, options?: any): Promise<any>;
  getBatches(orgId: string, options?: any): Promise<any>;

  // Items
  createItem(data: PayslipUploadItemCreateInput): Promise<any>;
  updateItem(itemId: string, data: Partial<PayslipUploadItemCreateInput>): Promise<any>;
  assignItem(itemId: string, employeeId: string, userId: string): Promise<any>;
  skipItem(itemId: string): Promise<any>;
  
  // Procesamiento
  processBatchAsync(batchId: string, fileBuffer: Buffer, employees: EmployeeMatchCandidate[]): Promise<void>;
  
  // Utilidades
  cleanupTempFiles(batchId: string): Promise<void>;
}

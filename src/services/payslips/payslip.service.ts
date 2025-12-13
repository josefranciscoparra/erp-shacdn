import { type Prisma, PayslipItemStatus } from "@prisma/client";

import { createEmployeeMatcher, type EmployeeMatchCandidate } from "@/lib/payslip/employee-matcher";
import { splitPdfIntoPages, getPdfInfo, generatePageFileName } from "@/lib/payslip/pdf-splitter";
import { extractPdfsFromZip, type ExtractedFile } from "@/lib/payslip/zip-processor";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";

import {
  type IPayslipService,
  type PayslipBatchCreateInput,
  type ProcessingResult,
  type BatchStatus,
} from "./payslip.interface";

/**
 * Nombres de meses para notificaciones
 */
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

class PayslipService implements IPayslipService {
  async createBatch(data: PayslipBatchCreateInput) {
    return await prisma.payslipBatch.create({
      data: {
        ...data,
        status: "PROCESSING",
        totalFiles: 0,
        readyCount: 0,
        pendingCount: 0, // Items pendientes de revisión (PENDING_REVIEW)
        blockedInactive: 0, // Bloqueados por empleado inactivo
        publishedCount: 0,
        revokedCount: 0,
        errorCount: 0,
        assignedCount: 0,
      },
    });
  }

  async updateBatchStatus(batchId: string, status: BatchStatus, counts?: Partial<ProcessingResult>) {
    await prisma.payslipBatch.update({
      where: { id: batchId },
      data: {
        status,
        ...counts,
      },
    });
  }

  async getBatches(orgId: string, options: { status?: string; year?: number; page?: number; pageSize?: number } = {}) {
    const { status, year, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where = {
      orgId,
      ...(status && { status: status as any }),
      ...(year && { year }),
    };

    const [batches, total] = await Promise.all([
      prisma.payslipBatch.findMany({
        where,
        include: {
          uploadedBy: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.payslipBatch.count({ where }),
    ]);

    return { batches, total };
  }

  async getBatchWithItems(
    batchId: string,
    orgId: string,
    options: { status?: string; page?: number; pageSize?: number } = {},
  ) {
    const { status, page = 1, pageSize = 50 } = options;
    const skip = (page - 1) * pageSize;

    const batch = await prisma.payslipBatch.findFirst({
      where: { id: batchId, orgId },
      include: {
        uploadedBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!batch) return null;

    const itemWhere = {
      batchId,
      ...(status && { status: status as any }),
    };

    const [items, total] = await Promise.all([
      prisma.payslipUploadItem.findMany({
        where: itemWhere,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nifNie: true,
              employeeNumber: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        skip,
        take: pageSize,
      }),
      prisma.payslipUploadItem.count({ where: itemWhere }),
    ]);

    return { batch, items, total };
  }

  async createItem(data: Prisma.PayslipUploadItemUncheckedCreateInput) {
    return await prisma.payslipUploadItem.create({
      data,
    });
  }

  async updateItem(itemId: string, data: Prisma.PayslipUploadItemUncheckedUpdateInput) {
    return await prisma.payslipUploadItem.update({
      where: { id: itemId },
      data,
    });
  }

  // Lógica principal de procesamiento asíncrono
  async processBatchAsync(batchId: string, fileBuffer: Buffer, employees: EmployeeMatchCandidate[]) {
    try {
      const batch = await prisma.payslipBatch.findUnique({ where: { id: batchId } });
      if (!batch) throw new Error("Batch not found");

      const matcher = createEmployeeMatcher(employees);
      let result: ProcessingResult;

      if (batch.originalFileType === "ZIP") {
        result = await this.processZipFile(fileBuffer, batch, matcher);
      } else {
        // TODO: Implement multipage PDF processing if needed here or reuse existing
        result = await this.processMultipagePdf(fileBuffer, batch.originalFileName, batchId, batch.orgId);
      }

      // Calcular nuevo estado
      const newStatus = this.calculateBatchStatus(result);

      // Actualizar batch final
      await this.updateBatchStatus(batchId, newStatus, result);
    } catch (error) {
      console.error("[PayslipService] Error processing batch:", error);
      await this.updateBatchStatus(batchId, "ERROR");
    }
  }

  private async processZipFile(
    fileBuffer: Buffer,
    batch: { id: string; orgId: string; month: number | null; year: number | null; uploadedById: string },
    matcher: ReturnType<typeof createEmployeeMatcher>,
  ): Promise<ProcessingResult> {
    // TODO: Refactor to use Streams for lower memory usage if possible,
    // currently using existing extractPdfsFromZip which uses JSZip (memory based)
    // Optimización: Procesar uno a uno para liberar memoria lo antes posible

    const zipResult = await extractPdfsFromZip(fileBuffer);

    let readyCount = 0;
    let pendingCount = 0;
    let blockedInactive = 0;
    let errorCount = 0;

    for (const extractedFile of zipResult.files) {
      try {
        const result = await this.processExtractedPdf(extractedFile, batch.id, batch.orgId, matcher);
        if (result === "ready") readyCount++;
        else if (result === "pending_review") pendingCount++;
        else if (result === "blocked_inactive") blockedInactive++;
        else errorCount++;
      } catch (e) {
        console.error(`Error processing file ${extractedFile.fileName}:`, e);
        errorCount++;

        try {
          await this.createItem({
            batchId: batch.id,
            orgId: batch.orgId,
            tempFilePath: "ERROR_UPLOAD_FAILED",
            originalFileName: extractedFile.fileName,
            status: PayslipItemStatus.ERROR,
            errorMessage: e instanceof Error ? e.message : "Error desconocido durante el procesamiento",
            confidenceScore: 0,
          });
        } catch (dbError) {
          console.error("CRITICAL: Failed to log error item to DB", dbError);
        }
      }
    }

    // Sumar errores de extracción del ZIP
    errorCount += zipResult.skippedFiles.filter((f) => f.reason === "error").length;

    // Registrar archivos saltados por validación ZIP
    for (const skipped of zipResult.skippedFiles) {
      if (skipped.reason === "error" || skipped.reason === "too_large" || skipped.reason === "not_pdf") {
        try {
          await this.createItem({
            batchId: batch.id,
            orgId: batch.orgId,
            tempFilePath: "SKIPPED_VALIDATION",
            originalFileName: skipped.fileName,
            status: PayslipItemStatus.ERROR,
            errorMessage: `Archivo ignorado: ${skipped.reason}`,
            confidenceScore: 0,
          });
        } catch {
          // Ignorar errores al registrar archivos saltados
        }
      }
    }

    return {
      totalFiles: zipResult.files.length + zipResult.skippedFiles.length,
      readyCount,
      pendingCount,
      blockedInactive,
      errorCount,
      // Mantener compatibilidad con campos legacy
      assignedCount: readyCount,
    };
  }

  /**
   * Procesa un PDF extraído y determina su estado según el matching
   *
   * Nuevo flujo (Filosofía: "Ante la mínima duda, NO se asigna"):
   * - canAutoAssign + empleado activo → READY (listo para publicar, esperando confirmación)
   * - Match con empleado inactivo → BLOCKED_INACTIVE
   * - Baja confianza / múltiples candidatos → PENDING_REVIEW
   *
   * NO se crea EmployeeDocument ni se envía notificación durante el procesamiento.
   * Eso se hace en la fase de publicación (publish).
   */
  private async processExtractedPdf(
    extractedFile: ExtractedFile,
    batchId: string,
    orgId: string,
    matcher: ReturnType<typeof createEmployeeMatcher>,
  ): Promise<"ready" | "pending_review" | "blocked_inactive" | "error"> {
    // Subir a storage temporal
    const tempUpload = await documentStorageService.uploadPayslipTempFile(
      orgId,
      batchId,
      extractedFile.fileName,
      extractedFile.content,
    );

    // Matching
    const matchResult = matcher.findMatch(extractedFile.fileName);

    // Caso 1: Match con empleado INACTIVO → BLOCKED_INACTIVE
    if (matchResult.matchedInactiveEmployee && matchResult.employee) {
      await this.createItem({
        batchId,
        orgId,
        tempFilePath: tempUpload.path,
        originalFileName: extractedFile.fileName,
        detectedDni: matchResult.detectedDni,
        detectedName: matchResult.detectedName,
        detectedCode: matchResult.detectedCode,
        confidenceScore: matchResult.confidenceScore,
        status: PayslipItemStatus.BLOCKED_INACTIVE,
        employeeId: matchResult.employee.id,
        errorMessage: "Empleado inactivo - requiere revisión manual",
      });
      return "blocked_inactive";
    }

    // Caso 2: Match seguro con empleado activo → READY (sin publicar aún)
    if (matchResult.canAutoAssign && matchResult.employee) {
      await this.createItem({
        batchId,
        orgId,
        tempFilePath: tempUpload.path,
        originalFileName: extractedFile.fileName,
        detectedDni: matchResult.detectedDni,
        detectedName: matchResult.detectedName,
        detectedCode: matchResult.detectedCode,
        confidenceScore: matchResult.confidenceScore,
        status: PayslipItemStatus.READY,
        employeeId: matchResult.employee.id,
        isAutoMatched: true,
      });
      return "ready";
    }

    // Caso 3: Baja confianza, múltiples candidatos o sin match → PENDING_REVIEW
    await this.createItem({
      batchId,
      orgId,
      tempFilePath: tempUpload.path,
      originalFileName: extractedFile.fileName,
      detectedDni: matchResult.detectedDni,
      detectedName: matchResult.detectedName,
      detectedCode: matchResult.detectedCode,
      confidenceScore: matchResult.confidenceScore,
      status: PayslipItemStatus.PENDING_REVIEW,
      employeeId: matchResult.employee?.id,
    });
    return "pending_review";
  }

  private async processMultipagePdf(
    fileBuffer: Buffer,
    fileName: string,
    batchId: string,
    orgId: string,
  ): Promise<ProcessingResult> {
    const pdfInfo = await getPdfInfo(fileBuffer);
    if (!pdfInfo.isValid) {
      throw new Error("Invalid PDF");
    }

    const splitResult = await splitPdfIntoPages(fileBuffer, fileName);
    let pendingCount = 0;
    let errorCount = 0;

    for (const page of splitResult.pages) {
      try {
        const pageFileName = generatePageFileName(fileName, page.pageNumber);
        const uploadResult = await documentStorageService.uploadPayslipTempFile(
          orgId,
          batchId,
          pageFileName,
          page.content,
        );

        await this.createItem({
          batchId,
          orgId,
          tempFilePath: uploadResult.path,
          originalFileName: pageFileName,
          pageNumber: page.pageNumber,
          confidenceScore: 0,
          status: PayslipItemStatus.PENDING_REVIEW, // PDF multipágina siempre necesita revisión manual
        });
        pendingCount++;
      } catch (e) {
        console.error(`Error processing page ${page.pageNumber}:`, e);
        errorCount++;

        try {
          await this.createItem({
            batchId,
            orgId,
            tempFilePath: "ERROR_PAGE_PROCESS",
            originalFileName: `${fileName} (Page ${page.pageNumber})`,
            pageNumber: page.pageNumber,
            status: PayslipItemStatus.ERROR,
            errorMessage: e instanceof Error ? e.message : "Error procesando página",
            confidenceScore: 0,
          });
        } catch (err) {
          console.error("Failed to log error item:", err);
        }
      }
    }

    return {
      totalFiles: splitResult.pages.length,
      readyCount: 0,
      pendingCount,
      blockedInactive: 0,
      errorCount,
      // Compatibilidad legacy
      assignedCount: 0,
    };
  }

  /**
   * Calcula el estado del lote basado en los resultados del procesamiento
   *
   * Nuevos estados:
   * - READY_TO_PUBLISH: Hay items READY y ninguno PENDING_REVIEW
   * - REVIEW: Hay items que requieren revisión (PENDING_REVIEW o BLOCKED_INACTIVE)
   * - ERROR: Solo hay errores
   */
  private calculateBatchStatus(result: ProcessingResult): BatchStatus {
    const hasReady = result.readyCount > 0;
    const hasPendingReview = result.pendingCount > 0;
    const hasBlockedInactive = result.blockedInactive > 0;
    const hasErrors = result.errorCount > 0;

    // Solo errores → ERROR
    if (hasErrors && !hasReady && !hasPendingReview && !hasBlockedInactive) {
      return "ERROR";
    }

    // Items que requieren revisión (PENDING_REVIEW o BLOCKED_INACTIVE) → REVIEW
    if (hasPendingReview || hasBlockedInactive) {
      return "REVIEW";
    }

    // Solo items READY → READY_TO_PUBLISH
    if (hasReady && !hasPendingReview && !hasBlockedInactive) {
      return "READY_TO_PUBLISH";
    }

    // Fallback a REVIEW para cualquier otro caso
    return "REVIEW";
  }

  /**
   * Asigna manualmente un item a un empleado
   * NUEVO FLUJO: Solo marca como READY, no publica (no crea documento ni notifica)
   * La publicación se hace después con publishBatch o publishItems
   */
  async assignItem(itemId: string, employeeId: string, userId: string) {
    const item = await prisma.payslipUploadItem.findUnique({
      where: { id: itemId },
      include: { batch: true },
    });

    if (!item) {
      throw new Error("Item not found");
    }

    // Solo se pueden asignar items en estado PENDING_REVIEW, BLOCKED_INACTIVE o ERROR
    const assignableStatuses = ["PENDING_REVIEW", "BLOCKED_INACTIVE", "ERROR"];
    if (!assignableStatuses.includes(item.status)) {
      throw new Error("Item cannot be assigned in current status");
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new Error("Employee not found");

    // No permitir asignar a empleados inactivos
    if (!employee.active) {
      throw new Error("Cannot assign to inactive employee");
    }

    const previousStatus = item.status;

    // Transacción para atomicidad
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar item: marcar como READY (listo para publicar)
      await tx.payslipUploadItem.update({
        where: { id: itemId },
        data: {
          employeeId,
          status: "READY",
          assignedAt: new Date(),
          assignedById: userId,
          isAutoMatched: false, // Asignación manual
          errorMessage: null,
        },
      });

      // 2. Actualizar contadores del batch con nuevos nombres
      await tx.payslipBatch.update({
        where: { id: item.batchId },
        data: {
          readyCount: { increment: 1 },
          pendingCount: previousStatus === "PENDING_REVIEW" ? { decrement: 1 } : undefined,
          blockedInactive: previousStatus === "BLOCKED_INACTIVE" ? { decrement: 1 } : undefined,
          errorCount: previousStatus === "ERROR" ? { decrement: 1 } : undefined,
        },
      });
    });

    // Recalcular estado del batch
    await this.recalculateBatchStatus(item.batchId);

    // NO se crea documento ni se envía notificación aquí
    // Eso se hace al publicar (publishBatch o publishItems)

    return { success: true };
  }

  async skipItem(itemId: string) {
    const item = await prisma.payslipUploadItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("Item not found");

    // Solo se pueden saltar items que no están publicados
    const skippableStatuses = ["PENDING_OCR", "PENDING_REVIEW", "READY", "BLOCKED_INACTIVE", "ERROR"];
    if (!skippableStatuses.includes(item.status)) {
      throw new Error("Cannot skip item in current status");
    }

    const previousStatus = item.status;

    await prisma.payslipUploadItem.update({
      where: { id: itemId },
      data: { status: "SKIPPED" },
    });

    await prisma.payslipBatch.update({
      where: { id: item.batchId },
      data: {
        readyCount: previousStatus === "READY" ? { decrement: 1 } : undefined,
        pendingCount: previousStatus === "PENDING_REVIEW" ? { decrement: 1 } : undefined,
        blockedInactive: previousStatus === "BLOCKED_INACTIVE" ? { decrement: 1 } : undefined,
        errorCount: previousStatus === "ERROR" ? { decrement: 1 } : undefined,
      },
    });

    await this.recalculateBatchStatus(item.batchId);
    return { success: true };
  }

  private async recalculateBatchStatus(batchId: string) {
    const batch = await prisma.payslipBatch.findUnique({ where: { id: batchId } });
    if (!batch) return;

    // Si ya está CANCELLED, no cambiar estado
    if (batch.status === "CANCELLED") return;

    // Contar items en cola de OCR (PENDING_OCR)
    const pendingOcrCount = await prisma.payslipUploadItem.count({
      where: { batchId, status: "PENDING_OCR" },
    });

    // Contar items saltados
    const skippedCount = await prisma.payslipUploadItem.count({
      where: { batchId, status: "SKIPPED" },
    });

    // Calcular totales efectivos (excluyendo saltados)
    const effectiveTotal = batch.totalFiles - skippedCount;

    const result: ProcessingResult = {
      totalFiles: effectiveTotal,
      readyCount: batch.readyCount,
      pendingCount: batch.pendingCount,
      blockedInactive: batch.blockedInactive,
      errorCount: batch.errorCount,
      // Campos legacy
      assignedCount: batch.assignedCount,
    };

    let newStatus = this.calculateBatchStatus(result);

    // Casos especiales:
    // 1. Si hay items en OCR → PROCESSING
    if (pendingOcrCount > 0) {
      newStatus = "PROCESSING";
    }
    // 2. Si todos publicados → COMPLETED
    else if (batch.publishedCount > 0 && batch.publishedCount >= effectiveTotal - batch.errorCount) {
      newStatus = "COMPLETED";
    }
    // 3. Si hay publicados pero también hay pendientes → PARTIAL
    else if (
      batch.publishedCount > 0 &&
      (batch.readyCount > 0 || batch.pendingCount > 0 || batch.blockedInactive > 0)
    ) {
      newStatus = "PARTIAL";
    }

    if (newStatus !== batch.status) {
      await prisma.payslipBatch.update({
        where: { id: batchId },
        data: { status: newStatus },
      });
    }
  }

  async cleanupTempFiles(_batchId: string) {
    // Implementar limpieza si se desea (borrar de R2 items asignados o descartados)
  }
}

export const payslipService = new PayslipService();

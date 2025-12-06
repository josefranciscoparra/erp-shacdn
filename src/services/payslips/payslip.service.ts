import { createEmployeeMatcher, type EmployeeMatchCandidate } from "@/lib/payslip/employee-matcher";
import { splitPdfIntoPages, getPdfInfo, generatePageFileName } from "@/lib/payslip/pdf-splitter";
import { extractPdfsFromZip, type ExtractedFile } from "@/lib/payslip/zip-processor";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import { createNotification } from "@/server/actions/notifications";

import {
  type IPayslipService,
  type PayslipBatchCreateInput,
  type PayslipUploadItemCreateInput,
  type ProcessingResult,
  type BatchStatus,
} from "./payslip.interface";

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
        assignedCount: 0,
        pendingCount: 0,
        errorCount: 0,
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

  async createItem(data: PayslipUploadItemCreateInput) {
    return await prisma.payslipUploadItem.create({
      data,
    });
  }

  async updateItem(itemId: string, data: Partial<PayslipUploadItemCreateInput>) {
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

    let assignedCount = 0;
    let pendingCount = 0;
    let errorCount = 0;

    for (const extractedFile of zipResult.files) {
      try {
        const result = await this.processExtractedPdf(extractedFile, batch.id, batch.orgId, matcher);
        if (result === "assigned") assignedCount++;
        else if (result === "pending") pendingCount++;
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
            status: "ERROR",
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
            status: "ERROR",
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
      assignedCount,
      pendingCount,
      errorCount,
    };
  }

  private async processExtractedPdf(
    extractedFile: ExtractedFile,
    batchId: string,
    orgId: string,
    matcher: ReturnType<typeof createEmployeeMatcher>,
  ): Promise<"assigned" | "pending" | "error"> {
    // Subir a storage temporal
    const tempUpload = await documentStorageService.uploadPayslipTempFile(
      orgId,
      batchId,
      extractedFile.fileName,
      extractedFile.content,
    );

    // Matching
    const matchResult = matcher.findMatch(extractedFile.fileName);
    const isAutoAssigned = matchResult.canAutoAssign && matchResult.employee;

    // Si no hay auto-asignación, solo registramos el item pendiente
    if (!isAutoAssigned) {
      await this.createItem({
        batchId,
        orgId,
        tempFilePath: tempUpload.path,
        originalFileName: extractedFile.fileName,
        detectedDni: matchResult.detectedDni,
        detectedName: matchResult.detectedName,
        detectedCode: matchResult.detectedCode,
        confidenceScore: matchResult.confidenceScore,
        status: "PENDING",
        employeeId: null,
        assignedAt: null,
      });
      return "pending";
    }

    // Auto-asignación: mover a ruta final y crear documento + item enlazado
    try {
      const batch = await prisma.payslipBatch.findUnique({
        where: { id: batchId },
        select: { uploadedById: true, month: true, year: true },
      });
      const uploaderId = batch?.uploadedById;
      if (!uploaderId) {
        throw new Error("Batch uploader not found");
      }

      // Mover al path final del empleado (elimina el temp)
      const finalUpload = await documentStorageService.movePayslipToEmployee(
        tempUpload.path,
        orgId,
        matchResult.employee!.id,
        extractedFile.fileName,
      );

      // Crear item y documento en transacción para mantener consistencia
      await prisma.$transaction(async (tx) => {
        const item = await tx.payslipUploadItem.create({
          data: {
            batchId,
            orgId,
            tempFilePath: finalUpload.path,
            originalFileName: extractedFile.fileName,
            detectedDni: matchResult.detectedDni,
            detectedName: matchResult.detectedName,
            detectedCode: matchResult.detectedCode,
            confidenceScore: matchResult.confidenceScore,
            status: "ASSIGNED",
            employeeId: matchResult.employee!.id,
            assignedAt: new Date(),
            assignedById: batch?.uploadedById ?? null,
          },
        });

        const document = await tx.employeeDocument.create({
          data: {
            orgId,
            employeeId: matchResult.employee!.id,
            fileName: extractedFile.fileName,
            storageUrl: finalUpload.path,
            fileSize: finalUpload.size ?? extractedFile.size ?? tempUpload.size ?? 0,
            mimeType: "application/pdf",
            kind: "PAYSLIP",
            payslipMonth: batch?.month ?? null,
            payslipYear: batch?.year ?? null,
            payslipBatchId: batchId,
            uploadedById: uploaderId,
          },
        });

        await tx.payslipUploadItem.update({
          where: { id: item.id },
          data: { documentId: document.id },
        });
      });

      // Enviar notificación al empleado (fuera de la transacción)
      // Necesitamos buscar el userId del empleado que puede no estar en EmployeeMatchCandidate
      const employeeForNotification = await prisma.employee.findUnique({
        where: { id: matchResult.employee!.id },
        select: { userId: true },
      });

      if (employeeForNotification?.userId) {
        const monthName = batch?.month ? MONTH_NAMES[batch.month - 1] : null;
        const periodText = monthName && batch?.year ? `${monthName} ${batch.year}` : "";

        await createNotification(
          employeeForNotification.userId,
          orgId,
          "PAYSLIP_AVAILABLE",
          `Nómina disponible${periodText ? `: ${periodText}` : ""}`,
          `Tienes una nueva nómina disponible.`,
        ).catch((err) => console.error("Error enviando notificación de nómina:", err));
      }

      return "assigned";
    } catch (docError) {
      console.error("Error auto-assigning payslip:", docError);

      // Registrar item en error para revisión manual
      await this.createItem({
        batchId,
        orgId,
        tempFilePath: tempUpload.path,
        originalFileName: extractedFile.fileName,
        detectedDni: matchResult.detectedDni,
        detectedName: matchResult.detectedName,
        detectedCode: matchResult.detectedCode,
        confidenceScore: matchResult.confidenceScore,
        status: "ERROR",
        employeeId: null,
        assignedAt: null,
        errorMessage: docError instanceof Error ? docError.message : "Error autoasignando la nómina",
      });

      return "error";
    }
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
          status: "PENDING",
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
            status: "ERROR",
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
      assignedCount: 0,
      pendingCount,
      errorCount,
    };
  }

  private calculateBatchStatus(result: ProcessingResult): BatchStatus {
    if (result.errorCount > 0 && result.pendingCount === 0 && result.assignedCount === 0) return "ERROR";
    if (result.pendingCount > 0) return "REVIEW";
    if (result.assignedCount > 0 && (result.pendingCount > 0 || result.errorCount > 0)) return "PARTIAL";
    if (result.assignedCount > 0 && result.pendingCount === 0 && result.errorCount === 0) return "COMPLETED";
    return "ERROR"; // Default fallback
  }

  async assignItem(itemId: string, employeeId: string, userId: string) {
    const item = await prisma.payslipUploadItem.findUnique({
      where: { id: itemId },
      include: { batch: true },
    });

    if (!item || item.status === "ASSIGNED") {
      throw new Error("Item not found or already assigned");
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new Error("Employee not found");

    const previousStatus = item.status;
    const finalFileName =
      item.originalFileName ?? `nomina_${item.batch.month ?? "sin_mes"}_${item.batch.year ?? "sin_anio"}.pdf`;

    let finalPath = item.tempFilePath;
    let finalSize: number | null = null;

    try {
      if (item.tempFilePath.includes("/payslips/temp/")) {
        const moved = await documentStorageService.movePayslipToEmployee(
          item.tempFilePath,
          item.orgId,
          employeeId,
          finalFileName,
        );
        finalPath = moved.path;
        finalSize = moved.size || null;
      }
    } catch (moveError) {
      console.error("Error moving payslip to employee storage (keeping temp path):", moveError);
    }

    // Transacción para atomicidad
    await prisma.$transaction(async (tx) => {
      const document = await tx.employeeDocument.create({
        data: {
          orgId: item.orgId,
          employeeId: employee.id,
          fileName: finalFileName,
          storageUrl: finalPath,
          fileSize: finalSize ?? 0,
          mimeType: "application/pdf",
          kind: "PAYSLIP",
          payslipMonth: item.batch.month,
          payslipYear: item.batch.year,
          payslipBatchId: item.batchId,
          uploadedById: userId,
        },
      });

      // 1. Actualizar item
      await tx.payslipUploadItem.update({
        where: { id: itemId },
        data: {
          employeeId,
          status: "ASSIGNED",
          assignedAt: new Date(),
          assignedById: userId,
          tempFilePath: finalPath,
          documentId: document.id,
          errorMessage: null,
        },
      });

      // 2. Actualizar contadores del batch
      await tx.payslipBatch.update({
        where: { id: item.batchId },
        data: {
          assignedCount: { increment: 1 },
          pendingCount: previousStatus === "PENDING" ? { decrement: 1 } : undefined,
          errorCount: previousStatus === "ERROR" ? { decrement: 1 } : undefined,
        },
      });
    });

    // Recalcular estado del batch fuera de la transacción (menos crítico)
    await this.recalculateBatchStatus(item.batchId);

    // Notificación (fuera de transacción)
    if (employee.userId) {
      const monthName = item.batch.month ? MONTH_NAMES[item.batch.month - 1] : null;
      const periodText = monthName && item.batch.year ? `${monthName} ${item.batch.year}` : "";

      await createNotification(
        employee.userId,
        item.orgId,
        "PAYSLIP_AVAILABLE",
        `Nómina disponible${periodText ? `: ${periodText}` : ""}`,
        `Tienes una nueva nómina disponible.`,
      ).catch(console.error);
    }

    return { success: true };
  }

  async skipItem(itemId: string) {
    const item = await prisma.payslipUploadItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("Item not found");

    const previousStatus = item.status;

    await prisma.payslipUploadItem.update({
      where: { id: itemId },
      data: { status: "SKIPPED" },
    });

    await prisma.payslipBatch.update({
      where: { id: item.batchId },
      data: {
        pendingCount: previousStatus === "PENDING" ? { decrement: 1 } : undefined,
        errorCount: previousStatus === "ERROR" ? { decrement: 1 } : undefined,
      },
    });

    await this.recalculateBatchStatus(item.batchId);
    return { success: true };
  }

  private async recalculateBatchStatus(batchId: string) {
    const batch = await prisma.payslipBatch.findUnique({ where: { id: batchId } });
    if (!batch) return;

    const result: ProcessingResult = {
      totalFiles: batch.totalFiles,
      assignedCount: batch.assignedCount,
      pendingCount: batch.pendingCount,
      errorCount: batch.errorCount,
    };

    const newStatus = this.calculateBatchStatus(result);
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

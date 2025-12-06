import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import { createEmployeeMatcher, type EmployeeMatchCandidate } from "@/lib/payslip/employee-matcher";
import { extractPdfsFromZip, type ExtractedFile } from "@/lib/payslip/zip-processor";
import { splitPdfIntoPages, getPdfInfo, generatePageFileName } from "@/lib/payslip/pdf-splitter";
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

  async getBatchWithItems(batchId: string, orgId: string, options: { status?: string; page?: number; pageSize?: number } = {}) {
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
        result = await this.processZipFile(fileBuffer, batchId, batch.orgId, matcher);
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
    batchId: string,
    orgId: string,
    matcher: ReturnType<typeof createEmployeeMatcher>
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
        const result = await this.processExtractedPdf(extractedFile, batchId, orgId, matcher);
        if (result === "assigned") assignedCount++;
        else if (result === "pending") pendingCount++;
        else errorCount++;
      } catch (e) {
        console.error(`Error processing file ${extractedFile.fileName}:`, e);
        errorCount++;
      }
    }

    // Sumar errores de extracción del ZIP
    errorCount += zipResult.skippedFiles.filter(f => f.reason === "error").length;

    return {
      totalFiles: zipResult.files.length + zipResult.skippedFiles.length,
      assignedCount,
      pendingCount,
      errorCount
    };
  }

  private async processExtractedPdf(
    extractedFile: ExtractedFile,
    batchId: string,
    orgId: string,
    matcher: ReturnType<typeof createEmployeeMatcher>
  ): Promise<"assigned" | "pending" | "error"> {
    // Subir a R2
    const uploadResult = await documentStorageService.uploadPayslipTempFile(
      orgId,
      batchId,
      extractedFile.fileName,
      extractedFile.content,
    );

    // Matching
    const matchResult = matcher.findMatch(extractedFile.fileName);
    const isAutoAssigned = matchResult.canAutoAssign && matchResult.employee;

    // Crear Item
    await this.createItem({
      batchId,
      orgId,
      tempFilePath: uploadResult.path,
      originalFileName: extractedFile.fileName,
      detectedDni: matchResult.detectedDni,
      detectedName: matchResult.detectedName,
      detectedCode: matchResult.detectedCode,
      confidenceScore: matchResult.confidenceScore,
      status: isAutoAssigned ? "ASSIGNED" : "PENDING",
      employeeId: isAutoAssigned ? matchResult.employee?.id : null,
      assignedAt: isAutoAssigned ? new Date() : null,
    });

    return isAutoAssigned ? "assigned" : "pending";
  }

  private async processMultipagePdf(
    fileBuffer: Buffer,
    fileName: string,
    batchId: string,
    orgId: string
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
         const uploadResult = await documentStorageService.uploadPayslipTempFile(orgId, batchId, pageFileName, page.content);
         
         await this.createItem({
            batchId,
            orgId,
            tempFilePath: uploadResult.path,
            originalFileName: pageFileName,
            pageNumber: page.pageNumber,
            confidenceScore: 0,
            status: "PENDING"
         });
         pendingCount++;
       } catch (e) {
         console.error(`Error processing page ${page.pageNumber}:`, e);
         errorCount++;
       }
     }

     return {
       totalFiles: splitResult.pages.length,
       assignedCount: 0,
       pendingCount,
       errorCount
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
      include: { batch: true }
    });

    if (!item || item.status === "ASSIGNED") {
      throw new Error("Item not found or already assigned");
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) throw new Error("Employee not found");

    // Transacción para atomicidad
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar item
      await tx.payslipUploadItem.update({
        where: { id: itemId },
        data: {
          employeeId,
          status: "ASSIGNED",
          assignedAt: new Date(),
          assignedById: userId,
        },
      });

      // 2. Actualizar contadores del batch
      await tx.payslipBatch.update({
        where: { id: item.batchId },
        data: {
          assignedCount: { increment: 1 },
          pendingCount: { decrement: 1 },
        },
      });

      // 3. Crear registro de documento final
      await tx.employeeDocument.create({
        data: {
            orgId: item.orgId,
            employeeId: employee.id,
            fileName: item.originalFileName || `nomina_${item.batch.month}_${item.batch.year}.pdf`,
            fileUrl: item.tempFilePath, // TODO: Usar path final si se mueve
            mimeType: "application/pdf",
            size: 0, // TODO: Obtener tamaño real si es posible o actualizar esquema
            kind: "PAYSLIP",
            payslipMonth: item.batch.month,
            payslipYear: item.batch.year,
            uploadedById: userId,
        }
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
            `Tienes una nueva nómina disponible.`
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
        errorCount: batch.errorCount
    };
    
    const newStatus = this.calculateBatchStatus(result);
    if (newStatus !== batch.status) {
        await prisma.payslipBatch.update({
            where: { id: batchId },
            data: { status: newStatus }
        });
    }
  }

  async cleanupTempFiles(batchId: string) {
    // Implementar limpieza si se desea (borrar de R2 items asignados o descartados)
  }
}

export const payslipService = new PayslipService();

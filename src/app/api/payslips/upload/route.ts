import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  ALLOWED_MIME_TYPES,
  MAX_DOCUMENTS_PER_BATCH,
  MAX_FILE_SIZE,
  PAYSLIP_ADMIN_ROLES,
  getPayslipTempPath,
} from "@/lib/payslip/config";
import { createEmployeeMatcher, EmployeeMatchCandidate, EmployeeMatcher } from "@/lib/payslip/employee-matcher";
import { splitPdfIntoPages, getPdfInfo, generatePageFileName } from "@/lib/payslip/pdf-splitter";
import { extractPdfsFromZip, ExtractedFile } from "@/lib/payslip/zip-processor";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, StorageProvider } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutos para procesamiento largo

// Tipos para el resultado del procesamiento
interface ProcessingResult {
  totalFiles: number;
  assignedCount: number;
  pendingCount: number;
  errorCount: number;
}

// Procesa un archivo ZIP con PDFs
async function processZipFile(
  fileBuffer: Buffer,
  batchId: string,
  orgId: string,
  matcher: EmployeeMatcher,
  storage: StorageProvider,
): Promise<ProcessingResult> {
  const zipResult = await extractPdfsFromZip(fileBuffer);

  if (zipResult.limitReached) {
    console.warn(`Límite de ${MAX_DOCUMENTS_PER_BATCH} documentos alcanzado`);
  }

  let assignedCount = 0;
  let pendingCount = 0;
  let errorCount = 0;

  for (const extractedFile of zipResult.files) {
    const result = await processExtractedPdf(extractedFile, batchId, orgId, matcher, storage);
    if (result === "assigned") assignedCount++;
    else if (result === "pending") pendingCount++;
    else errorCount++;
  }

  return {
    totalFiles: zipResult.files.length,
    assignedCount,
    pendingCount,
    errorCount,
  };
}

// Procesa un PDF individual extraído del ZIP
async function processExtractedPdf(
  extractedFile: ExtractedFile,
  batchId: string,
  orgId: string,
  matcher: EmployeeMatcher,
  storage: StorageProvider,
): Promise<"assigned" | "pending" | "error"> {
  try {
    const tempPath = getPayslipTempPath(orgId, batchId, extractedFile.fileName);
    await storage.upload(tempPath, extractedFile.content, { contentType: "application/pdf" });

    const matchResult = matcher.findMatch(extractedFile.fileName);
    const isAutoAssigned = matchResult.canAutoAssign && matchResult.employee;

    await prisma.payslipUploadItem.create({
      data: {
        batchId,
        orgId,
        tempFilePath: tempPath,
        originalFileName: extractedFile.fileName,
        detectedDni: matchResult.detectedDni,
        detectedName: matchResult.detectedName,
        detectedCode: matchResult.detectedCode,
        confidenceScore: matchResult.confidenceScore,
        status: isAutoAssigned ? "ASSIGNED" : "PENDING",
        employeeId: isAutoAssigned ? matchResult.employee?.id : null,
        assignedAt: isAutoAssigned ? new Date() : null,
      },
    });

    return isAutoAssigned ? "assigned" : "pending";
  } catch {
    return "error";
  }
}

// Procesa un PDF multipágina
async function processMultipagePdf(
  fileBuffer: Buffer,
  fileName: string,
  batchId: string,
  orgId: string,
  storage: StorageProvider,
): Promise<ProcessingResult | { error: string }> {
  const pdfInfo = await getPdfInfo(fileBuffer);

  if (!pdfInfo.isValid) {
    await prisma.payslipBatch.update({
      where: { id: batchId },
      data: { status: "ERROR" },
    });
    return { error: "El PDF no es válido: " + pdfInfo.error };
  }

  const splitResult = await splitPdfIntoPages(fileBuffer, fileName);
  let pendingCount = 0;
  let errorCount = 0;

  for (const page of splitResult.pages) {
    const result = await processPdfPage(page, fileName, batchId, orgId, storage);
    if (result === "pending") pendingCount++;
    else errorCount++;
  }

  return {
    totalFiles: splitResult.pages.length,
    assignedCount: 0,
    pendingCount,
    errorCount,
  };
}

// Procesa una página individual de un PDF multipágina
async function processPdfPage(
  page: { pageNumber: number; content: Uint8Array },
  originalFileName: string,
  batchId: string,
  orgId: string,
  storage: StorageProvider,
): Promise<"pending" | "error"> {
  try {
    const pageFileName = generatePageFileName(originalFileName, page.pageNumber);
    const tempPath = getPayslipTempPath(orgId, batchId, pageFileName);

    await storage.upload(tempPath, Buffer.from(page.content), { contentType: "application/pdf" });

    await prisma.payslipUploadItem.create({
      data: {
        batchId,
        orgId,
        tempFilePath: tempPath,
        originalFileName: pageFileName,
        pageNumber: page.pageNumber,
        confidenceScore: 0,
        status: "PENDING",
      },
    });

    return "pending";
  } catch {
    return "error";
  }
}

// Calcula el nuevo estado del lote
function calculateBatchStatus(result: ProcessingResult): "REVIEW" | "COMPLETED" | "ERROR" {
  if (result.pendingCount > 0) return "REVIEW";
  if (result.assignedCount > 0) return "COMPLETED";
  return "ERROR";
}

/**
 * POST /api/payslips/upload
 * Sube un archivo ZIP o PDF multipágina y crea un lote de nóminas
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!PAYSLIP_ADMIN_ROLES.includes(role as (typeof PAYSLIP_ADMIN_ROLES)[number])) {
      return NextResponse.json({ error: "No tienes permisos para subir nóminas" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const monthStr = formData.get("month") as string | null;
    const yearStr = formData.get("year") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se ha proporcionado archivo" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Solo ZIP o PDF." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const isZip = file.type.includes("zip");
    const originalFileType = isZip ? "ZIP" : "PDF_MULTIPAGE";

    const batch = await prisma.payslipBatch.create({
      data: {
        orgId,
        uploadedById: userId,
        originalFileName: file.name,
        originalFileType,
        month: monthStr ? parseInt(monthStr, 10) : null,
        year: yearStr ? parseInt(yearStr, 10) : null,
        status: "PROCESSING",
        totalFiles: 0,
        assignedCount: 0,
        pendingCount: 0,
        errorCount: 0,
      },
    });

    const employees = await prisma.employee.findMany({
      where: { orgId },
      select: { id: true, firstName: true, lastName: true, dni: true, employeeNumber: true },
    });

    const matcher = createEmployeeMatcher(employees as EmployeeMatchCandidate[]);
    const storage = getStorageProvider();

    // Procesar según tipo de archivo
    const result = isZip
      ? await processZipFile(fileBuffer, batch.id, orgId, matcher, storage)
      : await processMultipagePdf(fileBuffer, file.name, batch.id, orgId, storage);

    // Si hubo error en validación de PDF
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const newStatus = calculateBatchStatus(result);

    await prisma.payslipBatch.update({
      where: { id: batch.id },
      data: {
        totalFiles: result.totalFiles,
        assignedCount: result.assignedCount,
        pendingCount: result.pendingCount,
        errorCount: result.errorCount,
        status: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      totalFiles: result.totalFiles,
      assignedCount: result.assignedCount,
      pendingCount: result.pendingCount,
      errorCount: result.errorCount,
      status: newStatus,
    });
  } catch (error) {
    console.error("Error en upload de nóminas:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

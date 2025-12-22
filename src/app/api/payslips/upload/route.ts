import { NextRequest, NextResponse } from "next/server";

import { safePermission } from "@/lib/auth-guard";
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/payslip/config";
import { documentStorageService } from "@/lib/storage";
import { enqueuePayslipBatchJob } from "@/server/jobs/payslip-queue";
import { getOrgStorageQuota } from "@/server/storage/quota";
import { payslipService } from "@/services/payslips/payslip.service";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutos para procesamiento largo

/**
 * POST /api/payslips/upload
 * Sube un archivo ZIP o PDF multipágina y crea un lote de nóminas
 * Procesamiento ASÍNCRONO
 */
export async function POST(request: NextRequest) {
  try {
    // Autorización: requiere manage_payslips
    const authz = await safePermission("manage_payslips");
    if (!authz.ok) {
      const status = authz.code === "UNAUTHORIZED" ? 401 : 403;
      return NextResponse.json({ error: authz.error }, { status });
    }

    const { session } = authz;
    const userId = session.user.id;
    const orgId = session.user.orgId;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const monthStr = formData.get("month") as string | null;
    const yearStr = formData.get("year") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se ha proporcionado archivo" }, { status: 400 });
    }

    const normalizedMime = file.type?.toLowerCase() ?? "";
    const fileExtension = file.name?.split(".").pop()?.toLowerCase() ?? "";
    const normalizedExtension = fileExtension ? `.${fileExtension}` : "";

    const isAllowedMime = ALLOWED_MIME_TYPES.some((type) => type === normalizedMime);
    const isAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => ext === normalizedExtension);

    if (!isAllowedMime && !isAllowedExtension) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Solo ZIP o PDF." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    // Verificar que hay espacio de almacenamiento disponible
    // NOTA: Los archivos de payslip se suben a temp y se cuentan individualmente
    // cuando se publican. Esta verificación previene subidas cuando ya no hay espacio.
    const quota = await getOrgStorageQuota(orgId);
    if (quota.availableBytes < BigInt(file.size)) {
      return NextResponse.json(
        { error: "No hay espacio de almacenamiento suficiente. Contacta con tu administrador." },
        { status: 507 },
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const isZip = normalizedMime.includes("zip") || normalizedExtension === ".zip";
    const originalFileType = isZip ? "ZIP" : "PDF_MULTIPAGE";
    const fallbackMimeType = isZip ? "application/zip" : "application/pdf";
    const sourceMimeType = normalizedMime ? normalizedMime : fallbackMimeType;

    // 1. Crear Batch en estado PROCESSING
    const batch = await payslipService.createBatch({
      orgId,
      uploadedById: userId,
      originalFileName: file.name,
      originalFileType,
      month: monthStr ? parseInt(monthStr, 10) : null,
      year: yearStr ? parseInt(yearStr, 10) : null,
    });

    // 2. Subir archivo original a storage para que lo procese el worker
    const sourceUpload = await documentStorageService.uploadPayslipBatchSourceFile(
      orgId,
      batch.id,
      file.name,
      fileBuffer,
      sourceMimeType,
    );

    // 3. Encolar procesamiento en background (pg-boss)
    try {
      console.log(`[PayslipUpload] Encolando job para batch ${batch.id}`);
      await enqueuePayslipBatchJob({ batchId: batch.id, sourcePath: sourceUpload.path });
      console.log(`[PayslipUpload] Job encolado correctamente para batch ${batch.id}`);
    } catch (enqueueError) {
      console.error("Error encolando procesamiento de nóminas:", enqueueError);
      await payslipService.updateBatchStatus(batch.id, "ERROR");
      return NextResponse.json({ error: "No se pudo encolar el procesamiento del lote." }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        batchId: batch.id,
        message: "Archivo subido correctamente. El procesamiento continuará en segundo plano.",
        status: "PROCESSING",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Error en upload de nóminas:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

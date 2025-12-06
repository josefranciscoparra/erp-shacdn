import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, PAYSLIP_ADMIN_ROLES } from "@/lib/payslip/config";
import { prisma } from "@/lib/prisma";
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

    // 1. Crear Batch en estado PROCESSING
    const batch = await payslipService.createBatch({
      orgId,
      uploadedById: userId,
      originalFileName: file.name,
      originalFileType,
      month: monthStr ? parseInt(monthStr, 10) : null,
      year: yearStr ? parseInt(yearStr, 10) : null,
    });

    // 2. Obtener empleados para matching
    const employees = await prisma.employee.findMany({
      where: { orgId },
      select: { id: true, firstName: true, lastName: true, nifNie: true, employeeNumber: true },
    });

    // 3. Disparar procesamiento asíncrono
    // NOTA: En Vercel serverless, esto podría terminarse prematuramente si no se usa waitUntil o Colas.
    // En un entorno VPS/Node funciona bien.
    // Recomendación: Mover a una Cola (Bull/Inngest) si se escala.
    const processingPromise = payslipService.processBatchAsync(batch.id, fileBuffer, employees);

    // Si estamos en un entorno que soporta waitUntil (Cloudflare/Vercel Edge), usarlo para mayor robustez
    (request as any).waitUntil?.(processingPromise);

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
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

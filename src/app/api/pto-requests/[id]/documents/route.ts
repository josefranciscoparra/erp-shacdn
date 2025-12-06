import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ALLOWED_MIME_TYPES, generatePtoDocumentPath, MAX_FILE_SIZE } from "@/lib/pto-documents-config";
import { getStorageProvider } from "@/lib/storage";
import { createPtoDocumentRecord, getPtoDocuments } from "@/server/actions/pto-documents";

export const runtime = "nodejs";

/**
 * GET /api/pto-requests/[id]/documents
 * Lista los documentos de una solicitud PTO
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: ptoRequestId } = await params;

    const result = await getPtoDocuments(ptoRequestId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === "No autorizado" ? 401 : 404 });
    }

    return NextResponse.json({ documents: result.documents });
  } catch (error) {
    console.error("Error al obtener documentos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/pto-requests/[id]/documents
 * Sube un nuevo documento a una solicitud PTO
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: ptoRequestId } = await params;
    const orgId = session.user.orgId;

    // Obtener el archivo del FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido. Solo se permiten: PDF, JPG, PNG`,
          allowedTypes: ALLOWED_MIME_TYPES,
        },
        { status: 400 },
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `El archivo es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          maxSize: MAX_FILE_SIZE,
        },
        { status: 400 },
      );
    }

    // Generar ruta de almacenamiento
    const filePath = generatePtoDocumentPath(orgId, ptoRequestId, file.name);

    // Subir archivo al storage
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(file, filePath, {
      mimeType: file.type,
      metadata: {
        ptoRequestId,
        orgId,
        originalName: file.name.replace(/[^\w\s.-]/g, "_"), // Sanitizar para metadata
      },
    });

    // Crear registro en la base de datos
    const dbResult = await createPtoDocumentRecord(
      ptoRequestId,
      file.name,
      uploadResult.path,
      uploadResult.size,
      uploadResult.mimeType,
      description ?? undefined,
    );

    if (!dbResult.success) {
      // Si falla el registro en BD, intentar eliminar el archivo del storage
      try {
        await storageProvider.delete(uploadResult.path);
      } catch {
        console.warn("No se pudo eliminar el archivo huérfano del storage");
      }

      return NextResponse.json({ error: dbResult.error }, { status: 400 });
    }

    return NextResponse.json({ document: dbResult.document }, { status: 201 });
  } catch (error) {
    console.error("Error al subir documento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

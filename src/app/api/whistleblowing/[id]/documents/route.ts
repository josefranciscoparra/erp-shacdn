import { NextRequest, NextResponse } from "next/server";

import { WHISTLEBLOWING_ALLOWED_MIME_TYPES, WHISTLEBLOWING_MAX_FILE_SIZE } from "@/config/whistleblowing";
import { auth } from "@/lib/auth";
import { getStorageProvider } from "@/lib/storage";
import { createWhistleblowingDocument, getWhistleblowingDocuments } from "@/server/actions/whistleblowing";

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
}

function generateWhistleblowingDocumentPath(orgId: string, reportId: string, originalName: string): string {
  const timestamp = Date.now();
  const extension = originalName.split(".").pop() ?? "dat";
  const baseName = originalName.replace(`.${extension}`, "");
  const sanitizedBase = sanitizeFileName(baseName);
  return `org-${orgId}/whistleblowing/${reportId}/${timestamp}-${sanitizedBase}.${extension}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getWhistleblowingDocuments(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({ documents: result.documents });
  } catch (error) {
    console.error("Error en GET /api/whistleblowing/[id]/documents:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: reportId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    if (!WHISTLEBLOWING_ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido", allowedTypes: WHISTLEBLOWING_ALLOWED_MIME_TYPES },
        { status: 400 },
      );
    }

    if (file.size > WHISTLEBLOWING_MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `El archivo es demasiado grande. Máximo ${(WHISTLEBLOWING_MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`,
        },
        { status: 400 },
      );
    }

    const path = generateWhistleblowingDocumentPath(session.user.orgId, reportId, file.name);
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(file, path, {
      mimeType: file.type,
      metadata: {
        orgId: session.user.orgId,
        reportId,
        originalName: sanitizeFileName(file.name),
      },
    });

    const result = await createWhistleblowingDocument(
      reportId,
      file.name,
      uploadResult.path,
      uploadResult.size ?? file.size,
      uploadResult.mimeType ?? file.type,
      description ?? undefined,
    );

    if (!result.success) {
      try {
        await storageProvider.delete(uploadResult.path);
      } catch (cleanupError) {
        console.warn("No se pudo eliminar el archivo huérfano de whistleblowing:", cleanupError);
      }

      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({ document: result.document }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/whistleblowing/[id]/documents:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

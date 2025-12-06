import { NextRequest, NextResponse } from "next/server";

import { deletePtoDocument, getDocumentDownloadUrl } from "@/server/actions/pto-documents";

export const runtime = "nodejs";

/**
 * GET /api/pto-requests/[id]/documents/[docId]
 * Obtiene la URL de descarga de un documento
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { docId } = await params;

    const result = await getDocumentDownloadUrl(docId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === "No autorizado" ? 401 : 404 });
    }

    return NextResponse.json({
      url: result.url,
      fileName: result.fileName,
      mimeType: result.mimeType,
    });
  } catch (error) {
    console.error("Error al obtener URL de descarga:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * DELETE /api/pto-requests/[id]/documents/[docId]
 * Elimina un documento
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { docId } = await params;

    const result = await deletePtoDocument(docId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === "No autorizado" ? 401 : 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar documento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

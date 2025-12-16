import { NextRequest, NextResponse } from "next/server";

import { deleteWhistleblowingDocument, getWhistleblowingDocumentUrl } from "@/server/actions/whistleblowing";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { docId } = await params;

    const result = await getWhistleblowingDocumentUrl(docId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({
      downloadUrl: result.url,
      fileName: result.fileName,
      mimeType: result.mimeType,
    });
  } catch (error) {
    console.error("Error en GET /api/whistleblowing/[id]/documents/[docId]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { docId } = await params;

    const result = await deleteWhistleblowingDocument(docId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/whistleblowing/[id]/documents/[docId]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

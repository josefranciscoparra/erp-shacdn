import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  if (!features.documents) {
    return NextResponse.json({ error: "El módulo de documentos está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: employeeId, docId } = await params;

    // Verificar que el documento existe y pertenece a la organización
    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: docId,
        employeeId,
        orgId: session.user.orgId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // Determinar si generar URL firmada o descargar directamente
    const action = request.nextUrl.searchParams.get("action") ?? "download";

    if (action === "url") {
      // Generar URL firmada para acceso temporal (1 hora)
      const signedUrl = await documentStorageService.getDocumentUrl(
        document.storageUrl,
        3600, // 1 hora
      );

      return NextResponse.json({ url: signedUrl });
    }

    // Descargar archivo directamente
    try {
      const fileBlob = await documentStorageService.downloadDocument(document.storageUrl);

      // Convertir Blob a ArrayBuffer para NextResponse
      const arrayBuffer = await fileBlob.arrayBuffer();

      // Configurar headers para descarga
      const headers = new Headers();
      headers.set("Content-Type", document.mimeType);
      headers.set("Content-Length", document.fileSize.toString());
      headers.set("Content-Disposition", `attachment; filename="${document.fileName}"`);

      // Añadir headers de caché para optimizar
      headers.set("Cache-Control", "private, max-age=3600"); // 1 hora
      headers.set("ETag", `"${document.id}-${document.updatedAt.getTime()}"`);

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers,
      });
    } catch (storageError) {
      console.error("❌ Error al descargar del storage:", storageError);
      return NextResponse.json(
        {
          error: "No se pudo acceder al archivo. Puede que haya sido eliminado.",
        },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("❌ Error al descargar documento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  if (!features.documents) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return new NextResponse(null, { status: 401 });
    }

    const { id: employeeId, docId } = await params;

    // Verificar que el documento existe
    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: docId,
        employeeId,
        orgId: session.user.orgId,
      },
    });

    if (!document) {
      return new NextResponse(null, { status: 404 });
    }

    // Retornar solo headers sin contenido
    const headers = new Headers();
    headers.set("Content-Type", document.mimeType);
    headers.set("Content-Length", document.fileSize.toString());
    headers.set("Last-Modified", document.updatedAt.toUTCString());
    headers.set("ETag", `"${document.id}-${document.updatedAt.getTime()}"`);

    return new NextResponse(null, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("❌ Error en HEAD documento:", error);
    return new NextResponse(null, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { EmployeeOrgGuardError, ensureEmployeeHasAccessToActiveOrg } from "@/lib/auth/ensure-employee-active-org";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  if (!features.documents) {
    return NextResponse.json({ error: "El módulo de documentos está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensureEmployeeHasAccessToActiveOrg(session);

    const { docId } = await params;

    // Verificar que el documento existe y pertenece al empleado autenticado
    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: docId,
        employeeId: session.user.employeeId,
        orgId: session.user.orgId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
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
    if (error instanceof EmployeeOrgGuardError) {
      const message =
        error.code === "WRONG_ORG"
          ? "Cambia a la organización donde tienes ficha de empleado para descargar tus documentos."
          : "Este módulo solo está disponible para usuarios con ficha de empleado.";
      return NextResponse.json({ error: message, reason: error.code }, { status: 403 });
    }
    console.error("❌ Error al descargar documento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  if (!features.documents) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return new NextResponse(null, { status: 401 });
    }

    await ensureEmployeeHasAccessToActiveOrg(session);

    const { docId } = await params;

    // Verificar que el documento existe
    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: docId,
        employeeId: session.user.employeeId,
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
    if (error instanceof EmployeeOrgGuardError) {
      return new NextResponse(null, { status: 403 });
    }
    console.error("❌ Error en HEAD documento:", error);
    return new NextResponse(null, { status: 500 });
  }
}

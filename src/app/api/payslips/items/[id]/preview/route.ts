import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { PAYSLIP_ADMIN_ROLES } from "@/lib/payslip/config";
import { prisma } from "@/lib/prisma";
import { documentStorageService, getStorageProvider } from "@/lib/storage";

/**
 * GET /api/payslips/items/[id]/preview
 * Devuelve URL firmada para preview del PDF
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!PAYSLIP_ADMIN_ROLES.includes(role as (typeof PAYSLIP_ADMIN_ROLES)[number])) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { id } = await params;

    const item = await prisma.payslipUploadItem.findFirst({
      where: { id, orgId },
      include: {
        document: {
          select: {
            id: true,
            storageUrl: true,
            fileName: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    // Si el item ya fue publicado y tiene documento final, usar la ruta definitiva
    if (item.document?.storageUrl) {
      try {
        const url = await documentStorageService.getDocumentUrl(item.document.storageUrl, 3600);
        return NextResponse.json({
          success: true,
          url,
          fileName: item.document.fileName ?? item.originalFileName,
          source: "final",
        });
      } catch (error) {
        console.error("Error obteniendo URL final de nómina:", error);
        return NextResponse.json(
          { error: "No se pudo acceder al documento publicado. Revisa el almacenamiento." },
          { status: 500 },
        );
      }
    }

    if (!item.tempFilePath) {
      return NextResponse.json(
        { error: "El archivo temporal ya no está disponible. Vuelve a subir el lote." },
        { status: 404 },
      );
    }

    try {
      const storage = getStorageProvider();
      const signedUrl = await storage.getSignedUrl(item.tempFilePath, {
        expiresIn: 3600, // 1 hora
        operation: "read",
      });

      return NextResponse.json({
        success: true,
        url: signedUrl,
        fileName: item.originalFileName,
        source: "temp",
      });
    } catch (error) {
      console.error("Error obteniendo preview temporal:", error);
      return NextResponse.json(
        { error: "No se pudo acceder al archivo temporal. Vuelve a subir el lote." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error al obtener preview:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { signatureStorageService } from "@/lib/signatures/storage";

export const runtime = "nodejs";

/**
 * GET /api/signatures/documents/[id]/download
 * Descarga el documento firmado
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Buscar la solicitud de firma
    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: {
        id,
        orgId: session.user.orgId,
      },
      include: {
        document: true,
        signers: {
          include: {
            employee: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!signatureRequest) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // Verificar permisos

    const isHROrAdmin =
      hasPermission(session.user.role, "pto:read") || hasPermission(session.user.role, "settings:read");

    if (!isHROrAdmin) {
      // Verificar si el usuario es uno de los firmantes
      const isSigner = signatureRequest.signers.some((signer) => signer.employee.email === session.user.email);

      if (!isSigner) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    }

    // Buscar el último firmante que completó la firma (tiene el documento final)
    const lastSigner = signatureRequest.signers
      .filter((s) => s.status === "SIGNED" && s.signedFileUrl)
      .sort((a, b) => (b.signedAt?.getTime() ?? 0) - (a.signedAt?.getTime() ?? 0))[0];

    if (!lastSigner?.signedFileUrl) {
      // Si no hay documento firmado, devolver el original
      const originalUrl = await signatureStorageService.getDocumentUrl(signatureRequest.document.originalFileUrl);
      const originalDoc = await fetch(originalUrl);
      const buffer = await originalDoc.arrayBuffer();

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${signatureRequest.document.title}.pdf"`,
        },
      });
    }

    // Descargar el documento firmado
    const signedUrl = await signatureStorageService.getDocumentUrl(lastSigner.signedFileUrl);
    const signedDoc = await fetch(signedUrl);
    const buffer = await signedDoc.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${signatureRequest.document.title}-firmado.pdf"`,
      },
    });
  } catch (error) {
    console.error("❌ Error al descargar documento firmado:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

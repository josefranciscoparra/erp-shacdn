import { NextRequest, NextResponse } from "next/server";

import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { signatureStorageService } from "@/lib/signatures/storage";
import { resolveSignatureStoragePath } from "@/lib/signatures/storage-utils";
import { isModuleAvailableForOrg } from "@/server/guards/module-availability";

export const runtime = "nodejs";

/**
 * GET /api/signatures/documents/[id]/download
 * Descarga el documento firmado
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.activeOrgId ?? session.user.orgId;
    const signaturesAvailable = await isModuleAvailableForOrg(orgId, "signatures");
    if (!signaturesAvailable) {
      return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 403 });
    }

    const { id } = await params;
    const disposition = request.nextUrl.searchParams.get("disposition");

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
                userId: true,
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

    const effectivePermissions = await computeEffectivePermissions({
      role: session.user.role as Role,
      orgId: session.user.orgId,
      userId: session.user.id,
    });
    const canManageDocuments = effectivePermissions.has("manage_documents");

    if (!canManageDocuments) {
      console.info("🔍 Verificando acceso a descarga de firma", {
        requestId: signatureRequest.id,
        sessionUser: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
        },
        signers: signatureRequest.signers.map((signer) => ({
          signerId: signer.id,
          status: signer.status,
          employeeEmail: signer.employee.email,
          employeeUserId: signer.employee.userId,
        })),
      });

      const sessionEmail = session.user.email?.toLowerCase().trim();

      const isSigner = signatureRequest.signers.some((signer) => {
        const signerEmail = signer.employee.email?.toLowerCase().trim();
        if (signerEmail && sessionEmail && signerEmail === sessionEmail) {
          return true;
        }

        if (signer.employee.userId && signer.employee.userId === session.user.id) {
          return true;
        }

        return false;
      });

      if (!isSigner) {
        console.info("🔍 Resultado verificación firmante", {
          requestId: signatureRequest.id,
          isSigner,
          sessionEmail,
        });
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    }

    // Buscar el último firmante que completó la firma (tiene el documento final)
    const lastSigner = signatureRequest.signers
      .filter((s) => s.status === "SIGNED" && s.signedFileUrl)
      .sort((a, b) => (b.signedAt?.getTime() ?? 0) - (a.signedAt?.getTime() ?? 0))[0];

    if (!lastSigner?.signedFileUrl) {
      const originalPath = resolveSignatureStoragePath(signatureRequest.document.originalFileUrl);
      if (!originalPath) {
        console.error("❌ Documento original sin ruta válida", {
          requestId: signatureRequest.id,
          originalFileUrl: signatureRequest.document.originalFileUrl,
        });
        return NextResponse.json({ error: "Documento no disponible" }, { status: 500 });
      }

      const originalName = `${signatureRequest.document.title}.pdf`;
      const contentDisposition = disposition === "attachment" ? `attachment; filename="${originalName}"` : undefined;
      const originalUrl = await signatureStorageService.getDocumentUrl(originalPath, 3600, contentDisposition);

      return NextResponse.json({
        downloadUrl: originalUrl,
        fileName: originalName,
      });
    }

    // Descargar el documento firmado
    const signedPath = resolveSignatureStoragePath(lastSigner.signedFileUrl);
    if (!signedPath) {
      console.error("❌ Documento firmado sin ruta válida", {
        signerId: lastSigner.id,
        signedFileUrl: lastSigner.signedFileUrl,
      });
      return NextResponse.json({ error: "Documento firmado no disponible" }, { status: 500 });
    }

    const signedName = `${signatureRequest.document.title}-firmado.pdf`;
    const contentDisposition = disposition === "attachment" ? `attachment; filename="${signedName}"` : undefined;
    const signedUrl = await signatureStorageService.getDocumentUrl(signedPath, 3600, contentDisposition);

    return NextResponse.json({
      downloadUrl: signedUrl,
      fileName: signedName,
    });
  } catch (error) {
    console.error("❌ Error al descargar documento firmado:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

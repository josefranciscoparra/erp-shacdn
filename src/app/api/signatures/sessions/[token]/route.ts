import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signatureStorageService } from "@/lib/signatures/storage";
import { resolveSignatureStoragePath } from "@/lib/signatures/storage-utils";

export const runtime = "nodejs";

/**
 * GET /api/signatures/sessions/[token]
 * Obtiene información de la sesión de firma usando el token único
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { token } = await params;

    // Buscar el firmante por su token
    const signer = await prisma.signer.findUnique({
      where: { signToken: token },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        request: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                description: true,
                category: true,
                originalFileUrl: true,
                originalHash: true,
                fileSize: true,
                version: true,
              },
            },
            signers: {
              include: {
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!signer) {
      return NextResponse.json({ error: "Sesión de firma no encontrada" }, { status: 404 });
    }

    // Verificar que el usuario logueado es el firmante
    if (signer.employee.email !== session.user.email) {
      return NextResponse.json({ error: "Sin permisos para esta firma" }, { status: 403 });
    }

    // Si ya está firmado o rechazado, devolver la información completa para mostrar el estado
    // Generar URL firmada para el documento (válida por 1 hora)
    const documentPath = resolveSignatureStoragePath(signer.request.document.originalFileUrl);
    const signedUrl = await signatureStorageService.getDocumentUrl(documentPath, 3600); // 1 hora

    // Devolver información completa incluso si está firmado/rechazado/expirado
    // para que la UI pueda mostrar el estado correcto
    const response = {
      signerId: signer.id,
      status: signer.status,
      consentGiven: !!signer.consentGivenAt,
      consentGivenAt: signer.consentGivenAt?.toISOString() ?? null,
      signedAt: signer.signedAt?.toISOString() ?? null,
      rejectedAt: signer.rejectedAt?.toISOString() ?? null,
      rejectionReason: signer.rejectionReason ?? null,
      order: signer.order,
      employee: signer.employee,
      request: {
        id: signer.request.id,
        status: signer.request.status,
        policy: signer.request.policy,
        expiresAt: signer.request.expiresAt.toISOString(),
        createdAt: signer.request.createdAt.toISOString(),
      },
      document: {
        ...signer.request.document,
        originalFileUrl: signedUrl, // Reemplazar path con URL firmada
      },
      allSigners: signer.request.signers.map((s) => ({
        id: s.id,
        order: s.order,
        status: s.status,
        employee: s.employee,
        consentGivenAt: s.consentGivenAt?.toISOString() ?? null,
        signedAt: s.signedAt?.toISOString() ?? null,
        rejectedAt: s.rejectedAt?.toISOString() ?? null,
        rejectionReason: s.rejectionReason ?? null,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error al obtener sesión de firma:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

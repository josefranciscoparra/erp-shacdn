import { NextRequest, NextResponse } from "next/server";

import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { isModuleAvailableForOrg } from "@/server/guards/module-availability";

export const runtime = "nodejs";

/**
 * GET /api/signatures/requests/[id]
 * Obtiene el detalle completo de una solicitud de firma
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

    // Buscar la solicitud
    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: {
        id,
        orgId: session.user.orgId,
      },
      include: {
        document: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        signers: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeNumber: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        evidences: {
          include: {
            signer: {
              include: {
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!signatureRequest) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // Verificar permisos: manage_documents puede ver todas, empleados solo las suyas
    const effectivePermissions = await computeEffectivePermissions({
      role: session.user.role as Role,
      orgId: session.user.orgId,
      userId: session.user.id,
    });
    const isHROrAdmin = effectivePermissions.has("manage_documents");

    if (!isHROrAdmin) {
      // Verificar si el usuario es uno de los firmantes
      const isSignerOrCreator =
        session.user.employeeId &&
        signatureRequest.signers.some((signer) => signer.employee.id === session.user.employeeId);

      if (!isSignerOrCreator) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    }

    // Transformar fechas
    const transformedRequest = {
      ...signatureRequest,
      createdAt: signatureRequest.createdAt.toISOString(),
      completedAt: signatureRequest.completedAt?.toISOString() ?? null,
      expiresAt: signatureRequest.expiresAt.toISOString(),
      document: {
        ...signatureRequest.document,
        createdAt: signatureRequest.document.createdAt.toISOString(),
        updatedAt: signatureRequest.document.updatedAt.toISOString(),
        expiresAt: signatureRequest.document.expiresAt?.toISOString() ?? null,
      },
      signers: signatureRequest.signers.map((signer) => ({
        ...signer,
        signedAt: signer.signedAt?.toISOString() ?? null,
        rejectedAt: signer.rejectedAt?.toISOString() ?? null,
        consentGivenAt: signer.consentGivenAt?.toISOString() ?? null,
        createdAt: signer.createdAt.toISOString(),
        updatedAt: signer.updatedAt.toISOString(),
      })),
      evidences: signatureRequest.evidences.map((evidence) => ({
        ...evidence,
        createdAt: evidence.createdAt.toISOString(),
      })),
    };

    return NextResponse.json({ request: transformedRequest });
  } catch (error) {
    console.error("❌ Error al obtener solicitud de firma:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

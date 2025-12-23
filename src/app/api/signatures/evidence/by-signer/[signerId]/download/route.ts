import { NextRequest, NextResponse } from "next/server";

import { Role } from "@prisma/client";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/signatures/evidence/by-signer/[signerId]/download
 * Descarga las evidencias de firma en formato JSON usando el signerId
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ signerId: string }> }) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { signerId } = await params;

    // Buscar la evidencia por signerId
    const evidence = await prisma.signatureEvidence.findFirst({
      where: { signerId },
      include: {
        request: {
          select: {
            orgId: true,
            document: {
              select: {
                title: true,
              },
            },
          },
        },
        signer: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!evidence) {
      return NextResponse.json({ error: "Evidencia no encontrada" }, { status: 404 });
    }

    // Verificar que pertenece a la organización
    if (evidence.request.orgId !== session.user.orgId) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Verificar permisos (manage_documents puede descargar evidencias)
    const effectivePermissions = await computeEffectivePermissions({
      role: session.user.role as Role,
      orgId: session.user.orgId,
      userId: session.user.id,
    });
    const isHROrAdmin = effectivePermissions.has("manage_documents");

    if (!isHROrAdmin) {
      // Los empleados también pueden descargar sus propias evidencias
      const isOwnEvidence = session.user.employeeId && evidence.signer.employee.id === session.user.employeeId;

      if (!isOwnEvidence) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    }

    // Preparar evidencias para descarga
    const evidenceData = {
      evidenceId: evidence.id,
      documentTitle: evidence.request.document.title,
      signer: {
        name: `${evidence.signer.employee.firstName} ${evidence.signer.employee.lastName}`,
        email: evidence.signer.employee.email,
      },
      timeline: evidence.timeline,
      hashes: {
        preSign: evidence.preSignHash,
        postSign: evidence.postSignHash,
      },
      signerMetadata: evidence.signerMetadata,
      policy: evidence.policy,
      result: evidence.result,
      createdAt: evidence.createdAt.toISOString(),
    };

    const jsonString = JSON.stringify(evidenceData, null, 2);

    return new NextResponse(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="evidencia-${evidence.id}.json"`,
      },
    });
  } catch (error) {
    console.error("❌ Error al descargar evidencias:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/signatures/evidence/[id]/download
 * Descarga las evidencias de firma en formato JSON
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

    // Buscar la evidencia
    const evidence = await prisma.signatureEvidence.findUnique({
      where: { id },
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

    // Verificar permisos (solo HR/Admin puede descargar evidencias)

    const isHROrAdmin =
      hasPermission(session.user.role, "pto:read") || hasPermission(session.user.role, "settings:read");

    if (!isHROrAdmin) {
      // Los empleados también pueden descargar sus propias evidencias
      const isOwnEvidence = evidence.signer.employee.email === session.user.email;

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

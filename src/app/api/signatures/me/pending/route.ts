import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/signatures/me/pending
 * Obtiene las solicitudes de firma pendientes del empleado logueado
 */
export async function GET(request: NextRequest) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId || !session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Buscar el empleado asociado al usuario
    const employee = await prisma.employee.findFirst({
      where: {
        orgId: session.user.orgId,
        email: session.user.email,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Buscar todas las solicitudes donde este empleado es firmante
    const mySigners = await prisma.signer.findMany({
      where: {
        employeeId: employee.id,
      },
      include: {
        request: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                description: true,
                category: true,
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
      orderBy: {
        request: {
          expiresAt: "asc", // Más urgente primero
        },
      },
    });

    // Agrupar por estado
    const grouped = {
      pending: [] as any[],
      signed: [] as any[],
      rejected: [] as any[],
      expired: [] as any[],
    };

    for (const signer of mySigners) {
      const transformed = {
        id: signer.id,
        requestId: signer.requestId,
        status: signer.status,
        signToken: signer.signToken,
        signedAt: signer.signedAt?.toISOString() ?? null,
        rejectedAt: signer.rejectedAt?.toISOString() ?? null,
        rejectionReason: signer.rejectionReason,
        consentGivenAt: signer.consentGivenAt?.toISOString() ?? null,
        document: signer.request.document,
        request: {
          id: signer.request.id,
          status: signer.request.status,
          policy: signer.request.policy,
          expiresAt: signer.request.expiresAt.toISOString(),
          createdAt: signer.request.createdAt.toISOString(),
        },
        allSigners: signer.request.signers.map((s) => ({
          id: s.id,
          order: s.order,
          status: s.status,
          employee: s.employee,
        })),
      };

      // Clasificar por estado
      if (signer.status === "SIGNED") {
        grouped.signed.push(transformed);
      } else if (signer.status === "REJECTED") {
        grouped.rejected.push(transformed);
      } else if (signer.request.expiresAt < new Date()) {
        grouped.expired.push(transformed);
      } else {
        grouped.pending.push(transformed);
      }
    }

    return NextResponse.json({
      pending: grouped.pending,
      signed: grouped.signed,
      rejected: grouped.rejected,
      expired: grouped.expired,
      counts: {
        pending: grouped.pending.length,
        signed: grouped.signed.length,
        rejected: grouped.rejected.length,
        expired: grouped.expired.length,
      },
    });
  } catch (error) {
    console.error("❌ Error al obtener firmas pendientes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

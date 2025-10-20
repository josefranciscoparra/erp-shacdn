import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Verificar que no esté expirada
    if (signer.request.expiresAt < new Date()) {
      return NextResponse.json({ error: "Esta solicitud de firma ha expirado" }, { status: 410 });
    }

    // Verificar que no esté ya firmado o rechazado
    if (signer.status === "SIGNED") {
      return NextResponse.json({ error: "Este documento ya fue firmado" }, { status: 400 });
    }

    if (signer.status === "REJECTED") {
      return NextResponse.json({ error: "Este documento fue rechazado" }, { status: 400 });
    }

    // Transformar respuesta
    const response = {
      signerId: signer.id,
      status: signer.status,
      consentGiven: !!signer.consentGivenAt,
      consentGivenAt: signer.consentGivenAt?.toISOString() ?? null,
      order: signer.order,
      employee: signer.employee,
      request: {
        id: signer.request.id,
        status: signer.request.status,
        policy: signer.request.policy,
        expiresAt: signer.request.expiresAt.toISOString(),
        createdAt: signer.request.createdAt.toISOString(),
      },
      document: signer.request.document,
      allSigners: signer.request.signers.map((s) => ({
        id: s.id,
        order: s.order,
        status: s.status,
        employee: s.employee,
        signedAt: s.signedAt?.toISOString() ?? null,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error al obtener sesión de firma:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

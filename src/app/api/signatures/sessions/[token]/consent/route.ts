import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { giveConsentSchema } from "@/lib/validations/signature";

export const runtime = "nodejs";

/**
 * POST /api/signatures/sessions/[token]/consent
 * Registra el consentimiento del firmante (paso 1 del flujo)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { token } = await params;
    const body = await request.json();

    // Validar datos
    const data = giveConsentSchema.parse({
      signToken: token,
      consent: body.consent,
      ipAddress: body.ipAddress,
      userAgent: body.userAgent,
    });

    // Buscar el firmante
    const signer = await prisma.signer.findUnique({
      where: { signToken: token },
      include: {
        employee: {
          select: {
            email: true,
          },
        },
        request: {
          select: {
            expiresAt: true,
          },
        },
      },
    });

    if (!signer) {
      return NextResponse.json({ error: "Sesión de firma no encontrada" }, { status: 404 });
    }

    // Verificar que el usuario logueado es el firmante
    if (signer.employee.email !== session.user.email) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Verificar que no esté expirada
    if (signer.request.expiresAt < new Date()) {
      return NextResponse.json({ error: "Solicitud expirada" }, { status: 410 });
    }

    // Verificar estado
    if (signer.status !== "PENDING") {
      return NextResponse.json({ error: "Esta firma ya fue procesada" }, { status: 400 });
    }

    // Registrar consentimiento
    const updatedSigner = await prisma.signer.update({
      where: { id: signer.id },
      data: {
        consentGivenAt: new Date(),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      consentGivenAt: updatedSigner.consentGivenAt?.toISOString(),
    });
  } catch (error) {
    console.error("❌ Error al registrar consentimiento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

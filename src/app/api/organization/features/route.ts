import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getModuleAvailability } from "@/lib/organization-modules";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/features
 *
 * Devuelve todos los módulos/features habilitados para la organización del usuario.
 * Este endpoint se llama UNA sola vez después del login y el resultado se cachea
 * en el store durante toda la sesión.
 *
 * Preparado para venta por módulos: añadir nuevos features es solo añadir campos.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user.orgId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: {
        chatEnabled: true,
        shiftsEnabled: true,
        whistleblowingEnabled: true,
        features: true,
        // Futuros módulos aquí (ej: documentsEnabled, signaturesEnabled, etc.)
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      chatEnabled: org.chatEnabled,
      shiftsEnabled: org.shiftsEnabled,
      whistleblowingEnabled: org.whistleblowingEnabled,
      moduleAvailability: getModuleAvailability(org.features),
      // Futuros módulos aquí
    });
  } catch (error) {
    console.error("Error fetching organization features:", error);
    return NextResponse.json({ error: "Error al cargar features" }, { status: 500 });
  }
}

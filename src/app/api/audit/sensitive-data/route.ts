import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/audit/sensitive-data
 * Registra el acceso a datos sensibles para auditoría
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { dataType, resourceId, resourceType } = body;

    if (!dataType || !resourceId || !resourceType) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // Obtener IP y User Agent
    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    // Registrar el acceso
    await prisma.sensitiveDataAccess.create({
      data: {
        orgId: session.user.orgId,
        userId: session.user.id,
        dataType,
        resourceId,
        resourceType,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al registrar acceso a datos sensibles:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;

    const positions = await prisma.position.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        title: true,
        level: true,
        description: true,
      },
      orderBy: {
        title: "asc",
      },
    });

    return NextResponse.json(positions);
  } catch (error) {
    console.error("Error al obtener posiciones:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
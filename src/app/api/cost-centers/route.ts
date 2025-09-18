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

    const costCenters = await prisma.costCenter.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        timezone: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(costCenters);
  } catch (error) {
    console.error("Error al obtener centros de coste:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
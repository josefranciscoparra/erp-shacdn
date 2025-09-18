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

    const departments = await prisma.department.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error al obtener departamentos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        timezone: true,
        active: true,
        createdAt: true,
        updatedAt: true,
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const body = await request.json();

    const { name, code, address, timezone, active = true } = body;

    if (!name) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    if (code) {
      const existingCode = await prisma.costCenter.findFirst({
        where: {
          orgId,
          code,
          id: { not: undefined },
        },
      });

      if (existingCode) {
        return NextResponse.json({ error: "Ya existe un centro de coste con este código" }, { status: 400 });
      }
    }

    const costCenter = await prisma.costCenter.create({
      data: {
        name,
        code: code ?? null,
        address: address ?? null,
        timezone: timezone ?? null,
        active,
        orgId,
      },
    });

    return NextResponse.json(costCenter);
  } catch (error) {
    console.error("Error al crear centro de coste:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const positionSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  levelId: z.string().optional(),
});

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
        levelId: true,
        level: {
          select: {
            id: true,
            name: true,
            order: true,
          },
        },
        description: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        orgId: true,
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const body = await request.json();

    const validatedData = positionSchema.parse(body);

    const position = await prisma.position.create({
      data: {
        ...validatedData,
        orgId,
      },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error al crear posición:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

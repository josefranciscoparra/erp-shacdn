import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const positionLevelSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  code: z.string().optional(),
  order: z.number().int().min(0).default(0),
  description: z.string().optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;

    const levels = await prisma.positionLevel.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        order: true,
        description: true,
        minSalary: true,
        maxSalary: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        orgId: true,
        _count: {
          select: {
            positions: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(levels);
  } catch (error) {
    console.error("Error al obtener niveles:", error);
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

    const validatedData = positionLevelSchema.parse(body);

    // Verificar que no exista un nivel con el mismo nombre
    const existing = await prisma.positionLevel.findUnique({
      where: {
        orgId_name: {
          orgId,
          name: validatedData.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Ya existe un nivel con el nombre "${validatedData.name}"` }, { status: 400 });
    }

    const level = await prisma.positionLevel.create({
      data: {
        ...validatedData,
        orgId,
      },
    });

    return NextResponse.json(level, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error al crear nivel:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

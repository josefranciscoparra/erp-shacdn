import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const positionLevelUpdateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  code: z.string().optional(),
  order: z.number().int().min(0).optional(),
  description: z.string().optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const body = await request.json();
    const validatedData = positionLevelUpdateSchema.parse(body);
    const { id } = await params;

    // Verificar que el nivel pertenece a la organización
    const existingLevel = await prisma.positionLevel.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existingLevel) {
      return NextResponse.json({ error: "Nivel no encontrado" }, { status: 404 });
    }

    // Si se está cambiando el nombre, verificar que no exista otro con ese nombre
    if (validatedData.name && validatedData.name !== existingLevel.name) {
      const duplicate = await prisma.positionLevel.findUnique({
        where: {
          orgId_name: {
            orgId,
            name: validatedData.name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Ya existe un nivel con el nombre "${validatedData.name}"` },
          { status: 400 },
        );
      }
    }

    const level = await prisma.positionLevel.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(level);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error al actualizar nivel:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const { id } = await params;

    // Verificar que el nivel pertenece a la organización
    const existingLevel = await prisma.positionLevel.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existingLevel) {
      return NextResponse.json({ error: "Nivel no encontrado" }, { status: 404 });
    }

    // Verificar si hay puestos asignados a este nivel
    const positionsCount = await prisma.position.count({
      where: {
        levelId: id,
        active: true,
      },
    });

    if (positionsCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el nivel porque tiene ${positionsCount} puesto(s) asignado(s)` },
        { status: 400 },
      );
    }

    // Soft delete
    await prisma.positionLevel.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar nivel:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

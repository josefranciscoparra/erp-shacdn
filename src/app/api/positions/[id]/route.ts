import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const positionUpdateSchema = z.object({
  title: z.string().min(1, "El título es requerido").optional(),
  description: z.string().optional(),
  level: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const body = await request.json();
    const validatedData = positionUpdateSchema.parse(body);

    // Verificar que el puesto pertenece a la organización
    const existingPosition = await prisma.position.findFirst({
      where: {
        id: params.id,
        orgId,
      },
    });

    if (!existingPosition) {
      return NextResponse.json({ error: "Puesto no encontrado" }, { status: 404 });
    }

    const position = await prisma.position.update({
      where: { id: params.id },
      data: validatedData,
    });

    return NextResponse.json(position);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error al actualizar posición:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;

    // Verificar que el puesto pertenece a la organización
    const existingPosition = await prisma.position.findFirst({
      where: {
        id: params.id,
        orgId,
      },
    });

    if (!existingPosition) {
      return NextResponse.json({ error: "Puesto no encontrado" }, { status: 404 });
    }

    // Verificar si hay empleados asignados a este puesto
    const employeesCount = await prisma.employee.count({
      where: {
        positionId: params.id,
        active: true,
      },
    });

    if (employeesCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el puesto porque tiene ${employeesCount} empleado(s) asignado(s)` },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.position.update({
      where: { id: params.id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar posición:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

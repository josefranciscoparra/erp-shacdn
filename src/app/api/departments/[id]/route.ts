import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const updateDepartmentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre es muy largo").optional(),
  description: z.string().max(500, "La descripción es muy larga").optional(),
  costCenterId: z.string().optional(),
  managerId: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const { id } = await params;

    const department = await prisma.department.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            secondLastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            employmentContracts: true,
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error al obtener departamento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const { id } = await params;
    const body = await request.json();

    const validatedData = updateDepartmentSchema.parse(body);

    // Verificar que el departamento existe y pertenece a la organización
    const existingDepartment = await prisma.department.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existingDepartment) {
      return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 });
    }

    // Verificar que el centro de coste existe y pertenece a la organización
    if (validatedData.costCenterId) {
      const costCenter = await prisma.costCenter.findFirst({
        where: {
          id: validatedData.costCenterId,
          orgId,
          active: true,
        },
      });

      if (!costCenter) {
        return NextResponse.json({ error: "Centro de coste no encontrado" }, { status: 400 });
      }
    }

    // Verificar que el manager existe y pertenece a la organización
    if (validatedData.managerId) {
      const manager = await prisma.employee.findFirst({
        where: {
          id: validatedData.managerId,
          orgId,
          active: true,
        },
      });

      if (!manager) {
        return NextResponse.json({ error: "Responsable no encontrado" }, { status: 400 });
      }
    }

    // Verificar que no existe otro departamento con el mismo nombre (si se está cambiando el nombre)
    if (validatedData.name && validatedData.name !== existingDepartment.name) {
      const duplicateDepartment = await prisma.department.findFirst({
        where: {
          name: validatedData.name,
          orgId,
          active: true,
          id: { not: id },
        },
      });

      if (duplicateDepartment) {
        return NextResponse.json({ error: "Ya existe un departamento con ese nombre" }, { status: 400 });
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: validatedData,
      include: {
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            secondLastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            employmentContracts: true,
          },
        },
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }

    console.error("Error al actualizar departamento:", error);
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

    // Verificar que el departamento existe y pertenece a la organización
    const existingDepartment = await prisma.department.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        _count: {
          select: {
            employmentContracts: true,
          },
        },
      },
    });

    if (!existingDepartment) {
      return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 });
    }

    // Verificar que no hay empleados activos en el departamento
    if (existingDepartment._count.employmentContracts > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un departamento que tiene empleados asignados" },
        { status: 400 },
      );
    }

    // Soft delete - marcar como inactivo
    await prisma.department.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Departamento eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar departamento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

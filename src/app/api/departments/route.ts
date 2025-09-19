import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const createDepartmentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre es muy largo"),
  description: z.string().max(500, "La descripción es muy larga").optional(),
  costCenterId: z.string().optional(),
  managerId: z.string().optional(),
});

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
      },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        createdAt: true,
        updatedAt: true,
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const body = await request.json();

    const validatedData = createDepartmentSchema.parse(body);

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

    // Verificar que no existe otro departamento con el mismo nombre
    const existingDepartment = await prisma.department.findFirst({
      where: {
        name: validatedData.name,
        orgId,
        active: true,
      },
    });

    if (existingDepartment) {
      return NextResponse.json({ error: "Ya existe un departamento con ese nombre" }, { status: 400 });
    }

    const department = await prisma.department.create({
      data: {
        ...validatedData,
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

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }

    console.error("Error al crear departamento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
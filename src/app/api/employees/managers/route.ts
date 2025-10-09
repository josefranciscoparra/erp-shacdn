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

    // Obtener empleados que pueden ser managers
    // Criterio: empleados activos con contratos activos
    const managers = await prisma.employee.findMany({
      where: {
        orgId,
        active: true,
        employmentStatus: "ACTIVE",
        employmentContracts: {
          some: {
            active: true,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        secondLastName: true,
        employeeNumber: true,
        email: true,
        employmentContracts: {
          where: {
            active: true,
          },
          select: {
            position: {
              select: {
                title: true,
                level: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    // Transformar los datos para mejor uso en el frontend
    const managersData = managers.map((employee) => {
      const currentContract = employee.employmentContracts[0];
      const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

      return {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        secondLastName: employee.secondLastName,
        fullName,
        employeeNumber: employee.employeeNumber,
        email: employee.email,
        position: currentContract?.position?.title ?? null,
        department: currentContract?.department?.name ?? null,
      };
    });

    return NextResponse.json(managersData);
  } catch (error) {
    console.error("Error al obtener managers:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

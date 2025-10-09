import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/contracts
 * Obtiene todos los contratos de la organización del usuario autenticado
 * Soporta paginación y filtros por estado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const status = searchParams.get("status"); // active, inactive, all
    const skip = (page - 1) * limit;

    const orgId = session.user.orgId;

    // Construir filtros
    const where: any = {
      orgId,
    };

    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    }

    // Obtener contratos con paginación
    const [contracts, total] = await Promise.all([
      prisma.employmentContract.findMany({
        where,
        include: {
          // Incluir información del empleado
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              secondLastName: true,
            },
          },
          position: {
            select: {
              id: true,
              title: true,
              level: {
                select: {
                  name: true,
                },
              },
            },
          },
          department: {
            select: { id: true, name: true },
          },
          costCenter: {
            select: { id: true, name: true, code: true },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              secondLastName: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.employmentContract.count({ where }),
    ]);

    return NextResponse.json({
      contracts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error al obtener contratos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

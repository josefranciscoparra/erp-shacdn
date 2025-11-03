import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users
 * Obtiene lista de usuarios con filtros
 * Query params:
 * - roles: comma-separated list of roles (MANAGER,HR_ADMIN,ORG_ADMIN)
 * - withEmployee: true/false - filtrar solo usuarios con empleado asociado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const rolesParam = searchParams.get("roles");
    const withEmployeeParam = searchParams.get("withEmployee");

    // Construir filtro de roles
    const roleFilter = rolesParam ? rolesParam.split(",") : undefined;
    const requireEmployee = withEmployeeParam === "true";

    // Obtener usuarios de la organización
    const users = await prisma.user.findMany({
      where: {
        orgId: session.user.orgId,
        active: true,
        ...(roleFilter && {
          role: {
            in: roleFilter,
          },
        }),
        ...(requireEmployee && {
          employee: {
            isNot: null,
          },
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error en GET /api/users:", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

"use server";

import type { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { PAYSLIP_ADMIN_ROLES } from "@/lib/payslip/config";
import { prisma } from "@/lib/prisma";

export type BasicEmployeeInfo = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
  nifNie: string | null;
  active: boolean;
};

interface GetActiveEmployeesOptions {
  includeInactive?: boolean;
  limit?: number;
}

/**
 * Obtiene empleados de la organización actual para el selector de nóminas.
 * Incluye inactivos por defecto para poder subir finiquitos o nóminas antiguas.
 */
export async function getActiveEmployees(
  options: GetActiveEmployeesOptions = {},
): Promise<{ success: boolean; employees?: BasicEmployeeInfo[]; error?: string }> {
  try {
    const session = await auth();
    const orgId = session?.user?.orgId;
    const role = session?.user?.role;

    if (!orgId || !role) {
      return { success: false, error: "No autorizado" };
    }

    if (!PAYSLIP_ADMIN_ROLES.includes(role as (typeof PAYSLIP_ADMIN_ROLES)[number])) {
      return { success: false, error: "No tienes permisos para ver empleados" };
    }

    const includeInactive = options.includeInactive ?? true;

    const where: Prisma.EmployeeWhereInput = {
      orgId,
      ...(includeInactive ? {} : { active: true }),
    };

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        nifNie: true,
        active: true,
      },
      orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
      ...(typeof options.limit === "number" ? { take: options.limit } : {}),
    });

    return { success: true, employees };
  } catch (error) {
    console.error("Error al obtener empleados para nóminas:", error);
    return { success: false, error: "Error al cargar empleados" };
  }
}

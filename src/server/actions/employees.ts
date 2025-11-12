/**
 * Server Actions para Empleados
 */

"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Obtener todos los empleados activos de la organización
 */
export async function getActiveEmployees() {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  const employees = await prisma.employee.findMany({
    where: {
      orgId: session.user.orgId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeNumber: true,
    },
    orderBy: {
      employeeNumber: "asc",
    },
  });

  return employees;
}

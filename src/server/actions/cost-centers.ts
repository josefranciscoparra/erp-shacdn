/**
 * Server Actions para Centros de Coste
 */

"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Obtener todos los centros de coste activos de la organización
 */
export async function getCostCenters() {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  const costCenters = await prisma.costCenter.findMany({
    where: {
      orgId: session.user.orgId,
      active: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return costCenters;
}

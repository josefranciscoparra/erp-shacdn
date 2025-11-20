"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server Actions para gestión de centros de coste
 */

export type CostCenterDetail = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    employmentContracts: number; // Contratos activos (equivale a empleados asignados)
    areaResponsibles: number;
  };
};

/**
 * Obtiene un centro de coste por ID con información completa
 *
 * @param id ID del centro de coste
 * @returns Centro con contadores de empleados y responsables
 */
export async function getCostCenterById(id: string): Promise<{
  success: boolean;
  costCenter?: CostCenterDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const costCenter = await prisma.costCenter.findFirst({
      where: {
        id,
        orgId: session.user.orgId, // Multi-tenant security
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            employmentContracts: true, // Contratos activos (equivale a empleados asignados)
            areaResponsibles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!costCenter) {
      return {
        success: false,
        error: "Centro de coste no encontrado",
      };
    }

    return {
      success: true,
      costCenter: costCenter as CostCenterDetail,
    };
  } catch (error) {
    console.error("Error al obtener centro de coste:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

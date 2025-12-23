"use server";

import { getActionError, safeAnyPermission } from "@/lib/auth-guard";
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
    // Permisivo: cualquier rol de gestión puede ver centros de coste
    const authResult = await safeAnyPermission(["view_cost_centers", "manage_organization", "view_time_tracking"]);
    if (!authResult.ok) {
      return { success: false, error: authResult.error };
    }
    const { session } = authResult;

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
    return {
      success: false,
      error: getActionError(error, "Error al obtener centro de coste"),
    };
  }
}

export type CostCenterListItem = {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
};

/**
 * Obtiene todos los centros de coste activos de la organización
 * (función ligera para selectores y listas)
 *
 * @returns Lista de centros de coste activos
 */
export async function getCostCenters(): Promise<{
  success: boolean;
  costCenters?: CostCenterListItem[];
  error?: string;
}> {
  try {
    // Permisivo: cualquier rol de gestión puede ver centros de coste
    const authResult = await safeAnyPermission(["view_cost_centers", "manage_organization", "view_time_tracking"]);
    if (!authResult.ok) {
      return { success: false, error: authResult.error };
    }
    const { session } = authResult;

    const costCenters = await prisma.costCenter.findMany({
      where: {
        orgId: session.user.orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      costCenters,
    };
  } catch (error) {
    return {
      success: false,
      error: getActionError(error, "Error al obtener centros de coste"),
    };
  }
}

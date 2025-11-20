"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server Actions para gestión de equipos
 */

export type TeamDetail = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  costCenterId: string | null;
  costCenter: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    employees: number; // Empleados asignados directamente al equipo
    areaResponsibles: number;
  };
};

/**
 * Obtiene un equipo por ID con información completa
 *
 * @param id ID del equipo
 * @returns Equipo con contadores de empleados y responsables
 */
export async function getTeamById(id: string): Promise<{
  success: boolean;
  team?: TeamDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const team = await prisma.team.findFirst({
      where: {
        id,
        orgId: session.user.orgId, // Multi-tenant security
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        costCenterId: true,
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            employees: true, // Empleados asignados directamente al equipo
            areaResponsibles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!team) {
      return {
        success: false,
        error: "Equipo no encontrado",
      };
    }

    return {
      success: true,
      team: team as TeamDetail,
    };
  } catch (error) {
    console.error("Error al obtener equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

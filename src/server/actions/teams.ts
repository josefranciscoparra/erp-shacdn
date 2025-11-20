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

export type TeamListItem = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  costCenter: {
    name: string;
    code: string | null;
  } | null;
  _count: {
    employees: number;
    areaResponsibles: number;
  };
};

/**
 * Obtiene todos los equipos de la organización
 *
 * @returns Lista de equipos con información básica
 */
export async function getTeams(): Promise<{
  success: boolean;
  teams?: TeamListItem[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const teams = await prisma.team.findMany({
      where: {
        orgId: session.user.orgId, // Multi-tenant security
      },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        costCenter: {
          select: {
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            employees: true,
            areaResponsibles: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return {
      success: true,
      teams: teams as TeamListItem[],
    };
  } catch (error) {
    console.error("Error al obtener equipos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export type CreateTeamInput = {
  name: string;
  code?: string | null;
  description?: string | null;
  costCenterId: string;
  isActive?: boolean;
};

/**
 * Crea un nuevo equipo
 *
 * @param data Datos del equipo a crear
 * @returns Equipo creado con información básica
 */
export async function createTeam(data: CreateTeamInput): Promise<{
  success: boolean;
  team?: TeamDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el nombre no esté vacío
    if (!data.name?.trim()) {
      return { success: false, error: "El nombre es obligatorio" };
    }

    // Verificar que el centro de coste existe y pertenece a la organización
    const costCenter = await prisma.costCenter.findFirst({
      where: {
        id: data.costCenterId,
        orgId: session.user.orgId,
      },
    });

    if (!costCenter) {
      return {
        success: false,
        error: "Centro de coste no encontrado",
      };
    }

    // Si se proporciona código, verificar que no exista
    if (data.code?.trim()) {
      const existingTeam = await prisma.team.findFirst({
        where: {
          code: data.code.trim(),
          orgId: session.user.orgId,
        },
      });

      if (existingTeam) {
        return {
          success: false,
          error: `Ya existe un equipo con el código "${data.code}"`,
        };
      }
    }

    // Crear el equipo
    const team = await prisma.team.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim() ?? null,
        description: data.description?.trim() ?? null,
        costCenterId: data.costCenterId,
        orgId: session.user.orgId,
        isActive: data.isActive ?? true,
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
            employees: true,
            areaResponsibles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      team: team as TeamDetail,
    };
  } catch (error) {
    console.error("Error al crear equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

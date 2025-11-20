"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server Actions para gestión del contexto activo del usuario
 *
 * Permite a usuarios con múltiples responsabilidades (ej: Responsable de Equipo A + Centro B)
 * elegir qué contexto ver en el dashboard, filtros y reportes.
 *
 * **Scopes disponibles:**
 * - `ALL`: Ver todo lo que el usuario tiene acceso (acumulativo)
 * - `ORGANIZATION`: Solo información de nivel organizacional
 * - `DEPARTMENT`: Solo información de un departamento específico
 * - `COST_CENTER`: Solo información de un centro de coste específico
 * - `TEAM`: Solo información de un equipo específico
 */

// ============================================================================
// TYPES
// ============================================================================

export type ActiveScope = "ALL" | "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM";

export type UserActiveContextData = {
  id: string;
  userId: string;
  orgId: string;
  activeScope: ActiveScope;
  activeDepartmentId: string | null;
  activeCostCenterId: string | null;
  activeTeamId: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  costCenter: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Obtiene el contexto activo del usuario
 *
 * Si el usuario no tiene contexto configurado, retorna `null`.
 * La primera vez que un usuario accede, debe configurar su contexto con `setActiveContext()`.
 *
 * @returns Contexto activo del usuario o null si no tiene configurado
 *
 * @example
 * const context = await getActiveContext();
 * if (!context) {
 *   // Usuario nuevo → mostrar selector de contexto
 * } else {
 *   // Filtrar dashboard según context.activeScope
 * }
 */
export async function getActiveContext(): Promise<UserActiveContextData | null> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    const context = await prisma.userActiveContext.findUnique({
      where: { userId: session.user.id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!context) {
      return null;
    }

    // Serializar fechas para Next.js
    return {
      ...context,
      createdAt: context.createdAt.toISOString(),
      updatedAt: context.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Error al obtener contexto activo:", error);
    throw error;
  }
}

/**
 * Establece el contexto activo del usuario
 *
 * Permite al usuario cambiar qué ámbito quiere ver en el dashboard.
 * El contexto se guarda en la base de datos (no en localStorage) para que
 * persista entre sesiones y dispositivos.
 *
 * **Validaciones:**
 * - Si `scope` es `DEPARTMENT`, `departmentId` es obligatorio
 * - Si `scope` es `COST_CENTER`, `costCenterId` es obligatorio
 * - Si `scope` es `TEAM`, `teamId` es obligatorio
 * - Si `scope` es `ALL` o `ORGANIZATION`, los IDs deben ser `null`
 * - Verifica que el departamento/centro/equipo pertenezcan a la organización del usuario
 *
 * @param scope Scope del contexto ("ALL" | "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM")
 * @param options Opciones con IDs de departamento, centro o equipo
 * @returns Contexto actualizado
 *
 * @example
 * // Ver todo
 * await setActiveContext("ALL");
 *
 * // Ver solo un equipo
 * await setActiveContext("TEAM", { teamId: "team123" });
 *
 * // Ver solo un centro
 * await setActiveContext("COST_CENTER", { costCenterId: "center456" });
 */
export async function setActiveContext(
  scope: ActiveScope,
  options?: {
    departmentId?: string | null;
    costCenterId?: string | null;
    teamId?: string | null;
  },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    // Validar que los IDs sean consistentes con el scope
    if (scope === "DEPARTMENT" && !options?.departmentId) {
      throw new Error("departmentId es obligatorio cuando scope es DEPARTMENT");
    }
    if (scope === "COST_CENTER" && !options?.costCenterId) {
      throw new Error("costCenterId es obligatorio cuando scope es COST_CENTER");
    }
    if (scope === "TEAM" && !options?.teamId) {
      throw new Error("teamId es obligatorio cuando scope es TEAM");
    }

    // Si scope es ALL u ORGANIZATION, limpiar IDs
    const activeDepartmentId = scope === "DEPARTMENT" ? (options?.departmentId ?? null) : null;
    const activeCostCenterId = scope === "COST_CENTER" ? (options?.costCenterId ?? null) : null;
    const activeTeamId = scope === "TEAM" ? (options?.teamId ?? null) : null;

    // Validar que el departamento/centro/equipo pertenezcan a la organización
    if (activeDepartmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: activeDepartmentId,
          orgId: session.user.orgId,
        },
      });
      if (!department) {
        throw new Error("Departamento no encontrado o no pertenece a tu organización");
      }
    }

    if (activeCostCenterId) {
      const costCenter = await prisma.costCenter.findFirst({
        where: {
          id: activeCostCenterId,
          orgId: session.user.orgId,
        },
      });
      if (!costCenter) {
        throw new Error("Centro de coste no encontrado o no pertenece a tu organización");
      }
    }

    if (activeTeamId) {
      const team = await prisma.team.findFirst({
        where: {
          id: activeTeamId,
          orgId: session.user.orgId,
        },
      });
      if (!team) {
        throw new Error("Equipo no encontrado o no pertenece a tu organización");
      }
    }

    // Crear o actualizar contexto
    const context = await prisma.userActiveContext.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        orgId: session.user.orgId,
        activeScope: scope,
        activeDepartmentId,
        activeCostCenterId,
        activeTeamId,
      },
      update: {
        activeScope: scope,
        activeDepartmentId,
        activeCostCenterId,
        activeTeamId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Serializar fechas para Next.js
    return {
      ...context,
      createdAt: context.createdAt.toISOString(),
      updatedAt: context.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Error al establecer contexto activo:", error);
    throw error;
  }
}

/**
 * Obtiene los ámbitos disponibles para el usuario según sus responsabilidades
 *
 * Permite generar un selector de contexto mostrando solo los ámbitos
 * a los que el usuario tiene acceso.
 *
 * @returns Lista de ámbitos disponibles con sus datos
 *
 * @example
 * const available = await getAvailableScopes();
 * // Retorna: { departments: [...], costCenters: [...], teams: [...] }
 */
export async function getAvailableScopes() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener responsabilidades activas del usuario
    const responsibilities = await prisma.areaResponsible.findMany({
      where: {
        userId: session.user.id,
        orgId: session.user.orgId,
        isActive: true,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
        costCenter: {
          select: { id: true, name: true, code: true },
        },
        team: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Extraer ámbitos únicos
    const departments = new Map();
    const costCenters = new Map();
    const teams = new Map();
    let hasOrganizationScope = false;

    responsibilities.forEach((resp) => {
      if (resp.scope === "ORGANIZATION") {
        hasOrganizationScope = true;
      }
      if (resp.scope === "DEPARTMENT" && resp.department) {
        departments.set(resp.department.id, resp.department);
      }
      if (resp.scope === "COST_CENTER" && resp.costCenter) {
        costCenters.set(resp.costCenter.id, resp.costCenter);
      }
      if (resp.scope === "TEAM" && resp.team) {
        teams.set(resp.team.id, resp.team);
      }
    });

    // ✅ Usuarios ADMIN y RRHH siempre tienen acceso a nivel ORGANIZATION
    // Esto permite que puedan suscribirse a alertas de toda la organización
    // sin necesidad de configurar AreaResponsible explícitamente
    if (session.user.role === "ADMIN" || session.user.role === "RRHH") {
      hasOrganizationScope = true;
    }

    return {
      hasOrganizationScope,
      departments: Array.from(departments.values()),
      costCenters: Array.from(costCenters.values()),
      teams: Array.from(teams.values()),
    };
  } catch (error) {
    console.error("Error al obtener ámbitos disponibles:", error);
    throw error;
  }
}

"use server";

import { auth } from "@/lib/auth";
import { validateScopeOwnership, type Permission, type Scope } from "@/lib/permissions/scope-helpers";
import { prisma } from "@/lib/prisma";

/**
 * Server Actions para gestión de responsabilidades de áreas
 *
 * **Diseño genérico y reutilizable:**
 * - Funciona con cualquier scope: ORGANIZATION, COST_CENTER, TEAM, DEPARTMENT (futuro)
 * - No hardcodea lógica específica por tipo de scope
 * - Reutilizable para centros, equipos, y cualquier ámbito futuro
 */

// ============================================================================
// TYPES
// ============================================================================

export type AreaResponsibilityData = {
  id: string;
  userId: string;
  scope: Scope;
  costCenterId: string | null;
  teamId: string | null;
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  costCenter?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  team?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
};

export type AssignResponsibilityInput = {
  userId: string;
  scope: Scope;
  scopeId: string | null; // costCenterId, teamId, o null para ORGANIZATION
  permissions: Permission[];
  createSubscription?: boolean; // Crear suscripción automática a alertas
};

export type UpdateResponsibilityInput = {
  permissions: Permission[];
};

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Asigna una responsabilidad a un usuario (GENÉRICO para cualquier scope)
 *
 * @param data Datos de la responsabilidad
 * @returns Responsabilidad creada
 *
 * @example
 * // Asignar responsable de centro
 * await assignResponsibility({
 *   userId: "user123",
 *   scope: "COST_CENTER",
 *   scopeId: "center456",
 *   permissions: ["VIEW_ALERTS", "RESOLVE_ALERTS"],
 *   createSubscription: true
 * });
 *
 * @example
 * // Asignar responsable de equipo
 * await assignResponsibility({
 *   userId: "user123",
 *   scope: "TEAM",
 *   scopeId: "team789",
 *   permissions: ["VIEW_EMPLOYEES", "MANAGE_SCHEDULES"],
 *   createSubscription: false
 * });
 *
 * @example
 * // Asignar RRHH global (organización completa)
 * await assignResponsibility({
 *   userId: "user123",
 *   scope: "ORGANIZATION",
 *   scopeId: null,
 *   permissions: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS"]
 * });
 */
export async function assignResponsibility(data: AssignResponsibilityInput): Promise<{
  success: boolean;
  responsibility?: AreaResponsibilityData;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Validar que solo ADMIN puede asignar responsabilidades
    if (session.user.role !== "ORG_ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "HR_ADMIN") {
      return {
        success: false,
        error: "No tienes permisos para asignar responsabilidades",
      };
    }

    // Validar que el usuario objetivo existe y pertenece a la organización
    const targetUser = await prisma.user.findFirst({
      where: {
        id: data.userId,
        orgId: session.user.orgId,
      },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return {
        success: false,
        error: "Usuario no encontrado o no pertenece a la organización",
      };
    }

    // Validar ownership del scope (multi-tenant security)
    if (data.scopeId) {
      const isValid = await validateScopeOwnership(session.user.orgId, data.scope, data.scopeId);

      if (!isValid) {
        return {
          success: false,
          error: `El ${data.scope === "COST_CENTER" ? "centro" : "equipo"} no pertenece a la organización`,
        };
      }
    }

    // Validar que no existe ya una responsabilidad activa para este usuario en este scope
    const whereClause: any = {
      userId: data.userId,
      orgId: session.user.orgId,
      scope: data.scope,
      isActive: true,
    };

    if (data.scope === "COST_CENTER") {
      whereClause.costCenterId = data.scopeId;
    } else if (data.scope === "TEAM") {
      whereClause.teamId = data.scopeId;
    }

    const existingResponsibility = await prisma.areaResponsible.findFirst({
      where: whereClause,
    });

    if (existingResponsibility) {
      return {
        success: false,
        error:
          "Este usuario ya es responsable de este ámbito. Edita los permisos existentes en lugar de crear uno nuevo.",
      };
    }

    // Preparar datos según el scope (genérico)
    const scopeData: any = {
      userId: data.userId,
      orgId: session.user.orgId,
      scope: data.scope,
      permissions: data.permissions,
      isActive: true,
    };

    // Asignar scopeId según el tipo de scope
    if (data.scope === "COST_CENTER") {
      scopeData.costCenterId = data.scopeId;
    } else if (data.scope === "TEAM") {
      scopeData.teamId = data.scopeId;
    }
    // ORGANIZATION no necesita scopeId

    // Crear responsabilidad
    const responsibility = await prisma.areaResponsible.create({
      data: scopeData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        costCenter: {
          select: { id: true, name: true, code: true },
        },
        team: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Crear suscripción automática si se solicita
    if (data.createSubscription) {
      const subscriptionData: any = {
        userId: data.userId,
        orgId: session.user.orgId,
        scope: data.scope,
        notifyInApp: true,
        notifyByEmail: false, // Por ahora solo in-app
        severityLevels: ["WARNING", "CRITICAL"], // Solo alertas importantes
        alertTypes: [], // Todos los tipos
        isActive: true,
      };

      // Asignar scopeId según el tipo de scope
      if (data.scope === "COST_CENTER") {
        subscriptionData.costCenterId = data.scopeId;
      } else if (data.scope === "TEAM") {
        subscriptionData.teamId = data.scopeId;
      }

      await prisma.alertSubscription.create({
        data: subscriptionData,
      });
    }

    return {
      success: true,
      responsibility: responsibility as AreaResponsibilityData,
    };
  } catch (error) {
    console.error("Error al asignar responsabilidad:", error);

    // Manejar error de constraint unique
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        success: false,
        error: "Este usuario ya es responsable de este ámbito",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Quita una responsabilidad (soft delete)
 *
 * @param responsibilityId ID de la responsabilidad
 * @returns Confirmación de eliminación
 */
export async function removeResponsibility(responsibilityId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Validar permisos
    if (session.user.role !== "ORG_ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "HR_ADMIN") {
      return {
        success: false,
        error: "No tienes permisos para quitar responsabilidades",
      };
    }

    // Verificar que la responsabilidad existe y pertenece a la organización
    const responsibility = await prisma.areaResponsible.findFirst({
      where: {
        id: responsibilityId,
        orgId: session.user.orgId,
      },
    });

    if (!responsibility) {
      return {
        success: false,
        error: "Responsabilidad no encontrada",
      };
    }

    // Soft delete (marcar como inactiva)
    await prisma.areaResponsible.update({
      where: { id: responsibilityId },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al quitar responsabilidad:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Actualiza los permisos de una responsabilidad
 *
 * @param responsibilityId ID de la responsabilidad
 * @param data Nuevos permisos
 * @returns Responsabilidad actualizada
 */
export async function updateResponsibility(
  responsibilityId: string,
  data: UpdateResponsibilityInput,
): Promise<{
  success: boolean;
  responsibility?: AreaResponsibilityData;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Validar permisos
    if (session.user.role !== "ORG_ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "HR_ADMIN") {
      return {
        success: false,
        error: "No tienes permisos para actualizar responsabilidades",
      };
    }

    // Verificar que la responsabilidad existe y pertenece a la organización
    const existing = await prisma.areaResponsible.findFirst({
      where: {
        id: responsibilityId,
        orgId: session.user.orgId,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Responsabilidad no encontrada",
      };
    }

    // Actualizar permisos
    const responsibility = await prisma.areaResponsible.update({
      where: { id: responsibilityId },
      data: { permissions: data.permissions },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        costCenter: {
          select: { id: true, name: true, code: true },
        },
        team: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return {
      success: true,
      responsibility: responsibility as AreaResponsibilityData,
    };
  } catch (error) {
    console.error("Error al actualizar responsabilidad:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene los responsables de un ámbito específico (GENÉRICO)
 *
 * @param scope Tipo de ámbito (ORGANIZATION, COST_CENTER, TEAM)
 * @param scopeId ID del ámbito (null para ORGANIZATION)
 * @returns Lista de responsables
 *
 * @example
 * // Obtener responsables de un centro
 * const { responsibles } = await getResponsiblesForArea("COST_CENTER", "center123");
 *
 * @example
 * // Obtener responsables de un equipo
 * const { responsibles } = await getResponsiblesForArea("TEAM", "team456");
 */
export async function getResponsiblesForArea(
  scope: Scope,
  scopeId: string | null,
): Promise<{
  success: boolean;
  responsibles?: AreaResponsibilityData[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Construir filtro según el scope (genérico)
    const where: any = {
      orgId: session.user.orgId,
      scope,
      isActive: true,
    };

    if (scope === "COST_CENTER") {
      where.costCenterId = scopeId;
    } else if (scope === "TEAM") {
      where.teamId = scopeId;
    }
    // ORGANIZATION no necesita filtro adicional

    const responsibles = await prisma.areaResponsible.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        costCenter: {
          select: { id: true, name: true, code: true },
        },
        team: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      responsibles: responsibles as AreaResponsibilityData[],
    };
  } catch (error) {
    console.error("Error al obtener responsables:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene todos los ámbitos de responsabilidad de un usuario
 *
 * @param userId ID del usuario (opcional, por defecto el usuario actual)
 * @returns Lista de responsabilidades del usuario
 *
 * @example
 * // Obtener responsabilidades del usuario actual
 * const { responsibilities } = await getUserResponsibilities();
 *
 * @example
 * // Obtener responsabilidades de otro usuario (solo ADMIN)
 * const { responsibilities } = await getUserResponsibilities("user123");
 */
export async function getUserResponsibilities(userId?: string): Promise<{
  success: boolean;
  responsibilities?: AreaResponsibilityData[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Si se proporciona userId, validar que sea ADMIN o el usuario actual
    const targetUserId = userId ?? session.user.id;

    if (targetUserId !== session.user.id) {
      if (
        session.user.role !== "ORG_ADMIN" &&
        session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "HR_ADMIN"
      ) {
        return {
          success: false,
          error: "No tienes permisos para ver responsabilidades de otros usuarios",
        };
      }
    }

    const responsibilities = await prisma.areaResponsible.findMany({
      where: {
        userId: targetUserId,
        orgId: session.user.orgId,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        costCenter: {
          select: { id: true, name: true, code: true },
        },
        team: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
    });

    return {
      success: true,
      responsibilities: responsibilities as AreaResponsibilityData[],
    };
  } catch (error) {
    console.error("Error al obtener responsabilidades del usuario:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Busca usuarios disponibles para asignar como responsables
 *
 * ⚠️ IMPORTANTE: Solo se pueden asignar como responsables usuarios con rol MANAGER o superior.
 * Esto garantiza que tengan los permisos necesarios para ver las secciones relevantes (ej: Alertas).
 *
 * 📝 FUTURO: Si se añaden nuevos roles (ej: TEAM_LEAD), añádelos al array de roles permitidos.
 *
 * @param searchTerm Término de búsqueda (nombre o email)
 * @returns Lista de usuarios que coinciden
 */
export async function searchUsersForResponsibility(searchTerm: string): Promise<{
  success: boolean;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Solo ADMIN puede buscar usuarios
    if (session.user.role !== "ORG_ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "HR_ADMIN") {
      return {
        success: false,
        error: "No tienes permisos para buscar usuarios",
      };
    }

    // 🎯 FILTRO DE ROLES: Solo MANAGER y superiores pueden ser responsables
    // Para añadir nuevos roles en el futuro (ej: "TEAM_LEAD"), añádelos aquí:
    const allowedRoles = ["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"];

    const users = await prisma.user.findMany({
      where: {
        orgId: session.user.orgId,
        active: true,
        role: { in: allowedRoles }, // ⭐ Filtro por rol
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      take: 20, // Limitar resultados
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      users,
    };
  } catch (error) {
    console.error("Error al buscar usuarios:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

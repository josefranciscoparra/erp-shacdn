"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAlert as resolveAlertEngine, dismissAlert as dismissAlertEngine } from "@/services/alerts";

/**
 * Server Actions para gestión de alertas
 *
 * Funciones para:
 * - Obtener alertas del usuario según sus suscripciones
 * - Gestionar suscripciones a alertas
 * - Resolver/descartar alertas
 * - Obtener estadísticas
 */

// ============================================================================
// TYPES
// ============================================================================

export type AlertFilters = {
  severity?: "INFO" | "WARNING" | "CRITICAL";
  type?: string;
  status?: "ACTIVE" | "RESOLVED" | "DISMISSED";
  dateFrom?: Date;
  dateTo?: Date;
  employeeId?: string;
  costCenterId?: string;
  departmentId?: string;
  teamId?: string;
};

export type AlertStats = {
  total: number;
  active: number;
  resolved: number;
  dismissed: number;
  bySeverity: Array<{ severity: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
};

// ============================================================================
// ALERT QUERIES
// ============================================================================

/**
 * Obtiene las alertas del usuario según sus suscripciones
 *
 * **Acumulativo:**
 * - Si tiene varias suscripciones (ORG + TEAM), ve TODAS las alertas sumadas
 * - Usa DISTINCT para evitar duplicados
 *
 * @param filters Filtros opcionales
 * @returns Lista de alertas
 *
 * @example
 * const alerts = await getMyAlerts({ severity: "CRITICAL", status: "ACTIVE" });
 */
export async function getMyAlerts(filters?: AlertFilters) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener suscripciones del usuario
    const subscriptions = await prisma.alertSubscription.findMany({
      where: {
        userId: session.user.id,
        orgId: session.user.orgId,
        isActive: true,
        notifyInApp: true,
      },
      select: {
        scope: true,
        departmentId: true,
        costCenterId: true,
        teamId: true,
        severityLevels: true,
        alertTypes: true,
      },
    });

    if (subscriptions.length === 0) {
      return []; // Sin suscripciones, no ve alertas
    }

    // Construir query acumulativa (OR de todas las suscripciones)
    const scopeFilters = subscriptions
      .map((sub) => {
        if (sub.scope === "ORGANIZATION") {
          // Ve TODAS las alertas de la org
          return { orgId: session.user.orgId };
        }
        if (sub.scope === "DEPARTMENT" && sub.departmentId) {
          return {
            orgId: session.user.orgId,
            departmentId: sub.departmentId,
          };
        }
        if (sub.scope === "COST_CENTER" && sub.costCenterId) {
          return {
            orgId: session.user.orgId,
            costCenterId: sub.costCenterId,
          };
        }
        if (sub.scope === "TEAM" && sub.teamId) {
          return {
            orgId: session.user.orgId,
            teamId: sub.teamId,
          };
        }
        return null;
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    // Construir where clause
    const whereClause: Record<string, unknown> = {
      OR: scopeFilters,
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.employeeId && { employeeId: filters.employeeId }),
      ...(filters?.costCenterId && { costCenterId: filters.costCenterId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
      ...(filters?.teamId && { teamId: filters.teamId }),
    };

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (filters?.dateFrom) {
      dateFilter.gte = filters.dateFrom;
    }
    if (filters?.dateTo) {
      dateFilter.lte = filters.dateTo;
    }
    if (Object.keys(dateFilter).length > 0) {
      whereClause.date = dateFilter;
    }

    // Query con filtrado por severidad y tipo de alerta
    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        costCenter: {
          select: {
            name: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
        team: {
          select: {
            name: true,
          },
        },
        resolver: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ severity: "desc" }, { date: "desc" }, { createdAt: "desc" }],
    });

    // Filtrar por severityLevels y alertTypes de las suscripciones
    const filteredAlerts = alerts.filter((alert) => {
      // Verificar que al menos una suscripción permite esta alerta
      return subscriptions.some((sub) => {
        // Filtrar por severidad si está configurada
        if (sub.severityLevels.length > 0) {
          if (!sub.severityLevels.includes(alert.severity)) {
            return false;
          }
        }

        // Filtrar por tipo si está configurado
        if (sub.alertTypes.length > 0) {
          if (!sub.alertTypes.includes(alert.type)) {
            return false;
          }
        }

        return true;
      });
    });

    // Serializar fechas
    return filteredAlerts.map((alert) => ({
      ...alert,
      date: alert.date.toISOString(),
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
      resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
    }));
  } catch (error) {
    console.error("Error al obtener alertas:", error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de alertas del usuario (respetando suscripciones) con filtros opcionales.
 */
export async function getMyAlertStats(filters?: AlertFilters): Promise<AlertStats> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    // Reutilizar lógica de getMyAlerts para obtener alertas del usuario
    const alerts = await getMyAlerts(filters);

    // Calcular estadísticas
    const total = alerts.length;
    const active = alerts.filter((a) => a.status === "ACTIVE").length;
    const resolved = alerts.filter((a) => a.status === "RESOLVED").length;
    const dismissed = alerts.filter((a) => a.status === "DISMISSED").length;

    // Agrupar por severidad
    const severityCounts: Record<string, number> = {};
    alerts.forEach((alert) => {
      severityCounts[alert.severity] = (severityCounts[alert.severity] ?? 0) + 1;
    });

    const bySeverity = Object.entries(severityCounts).map(([severity, count]) => ({
      severity,
      count,
    }));

    // Agrupar por tipo
    const typeCounts: Record<string, number> = {};
    alerts.forEach((alert) => {
      typeCounts[alert.type] = (typeCounts[alert.type] ?? 0) + 1;
    });

    const byType = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      total,
      active,
      resolved,
      dismissed,
      bySeverity,
      byType,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de alertas:", error);
    throw error;
  }
}

// ============================================================================
// ALERT SUBSCRIPTIONS
// ============================================================================

/**
 * Crea una nueva suscripción a alertas
 *
 * @param scope Scope de la suscripción (ORGANIZATION, DEPARTMENT, COST_CENTER, TEAM)
 * @param scopeId ID del ámbito (null para ORGANIZATION)
 * @param options Opciones de la suscripción
 * @returns Suscripción creada
 *
 * @example
 * await subscribeToAlerts("COST_CENTER", "center123", {
 *   severityLevels: ["WARNING", "CRITICAL"],
 *   notifyByEmail: true
 * });
 */
export async function subscribeToAlerts(
  scope: "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM",
  scopeId: string | null,
  options?: {
    severityLevels?: string[];
    alertTypes?: string[];
    notifyByEmail?: boolean;
  },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    const isAdmin =
      session.user.role === "SUPER_ADMIN" || session.user.role === "ORG_ADMIN" || session.user.role === "HR_ADMIN";

    if (!isAdmin) {
      const responsibilityWhere: Record<string, unknown> = {
        userId: session.user.id,
        orgId: session.user.orgId,
        isActive: true,
        scope,
        permissions: { has: "VIEW_ALERTS" },
      };

      if (scope === "DEPARTMENT") {
        responsibilityWhere.departmentId = scopeId;
      } else if (scope === "COST_CENTER") {
        responsibilityWhere.costCenterId = scopeId;
      } else if (scope === "TEAM") {
        responsibilityWhere.teamId = scopeId;
      }

      const responsibility = await prisma.areaResponsible.findFirst({
        where: responsibilityWhere,
        select: { id: true },
      });

      if (!responsibility) {
        throw new Error("No tienes permisos para suscribirte a este ámbito");
      }
    }

    // Validar que no exista ya una suscripción activa para este scope
    const whereClause: Record<string, unknown> = {
      userId: session.user.id,
      orgId: session.user.orgId,
      scope,
      isActive: true,
    };

    if (scope === "DEPARTMENT") {
      whereClause.departmentId = scopeId;
    } else if (scope === "COST_CENTER") {
      whereClause.costCenterId = scopeId;
    } else if (scope === "TEAM") {
      whereClause.teamId = scopeId;
    }

    const existing = await prisma.alertSubscription.findFirst({
      where: whereClause,
    });

    if (existing) {
      throw new Error("Ya tienes una suscripción activa para este ámbito");
    }

    // Crear suscripción
    const data: Record<string, unknown> = {
      userId: session.user.id,
      orgId: session.user.orgId,
      scope,
      notifyInApp: true,
      notifyByEmail: options?.notifyByEmail ?? false,
      severityLevels: options?.severityLevels ?? [],
      alertTypes: options?.alertTypes ?? [],
      isActive: true,
    };

    if (scope === "DEPARTMENT") {
      data.departmentId = scopeId;
    } else if (scope === "COST_CENTER") {
      data.costCenterId = scopeId;
    } else if (scope === "TEAM") {
      data.teamId = scopeId;
    }

    const subscription = await prisma.alertSubscription.create({
      data,
    });

    return subscription;
  } catch (error) {
    console.error("Error al crear suscripción:", error);
    throw error;
  }
}

/**
 * Elimina una suscripción a alertas (soft delete)
 *
 * @param subscriptionId ID de la suscripción
 * @returns Confirmación
 */
export async function unsubscribeFromAlerts(subscriptionId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que la suscripción pertenece al usuario
    const subscription = await prisma.alertSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId: session.user.id,
        orgId: session.user.orgId,
      },
    });

    if (!subscription) {
      throw new Error("Suscripción no encontrada");
    }

    // Soft delete
    await prisma.alertSubscription.update({
      where: { id: subscriptionId },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar suscripción:", error);
    throw error;
  }
}

/**
 * Actualiza una suscripción a alertas existente
 *
 * @param subscriptionId ID de la suscripción
 * @param options Nuevas opciones de la suscripción
 * @returns Suscripción actualizada
 *
 * @example
 * await updateAlertSubscription("sub123", {
 *   severityLevels: ["CRITICAL"],
 *   alertTypes: ["LATE_ARRIVAL"]
 * });
 */
export async function updateAlertSubscription(
  subscriptionId: string,
  options: {
    severityLevels?: string[];
    alertTypes?: string[];
  },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que la suscripción pertenece al usuario
    const subscription = await prisma.alertSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId: session.user.id,
        orgId: session.user.orgId,
      },
    });

    if (!subscription) {
      throw new Error("Suscripción no encontrada");
    }

    // Actualizar suscripción
    const updated = await prisma.alertSubscription.update({
      where: { id: subscriptionId },
      data: {
        severityLevels: options.severityLevels ?? [],
        alertTypes: options.alertTypes ?? [],
      },
    });

    return updated;
  } catch (error) {
    console.error("Error al actualizar suscripción:", error);
    throw error;
  }
}

/**
 * Obtiene las suscripciones activas del usuario
 *
 * @returns Lista de suscripciones
 */
export async function getMySubscriptions() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    const subscriptions = await prisma.alertSubscription.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return subscriptions;
  } catch (error) {
    console.error("Error al obtener suscripciones:", error);
    throw error;
  }
}

// ============================================================================
// ALERT ACTIONS
// ============================================================================

/**
 * Resuelve una alerta
 *
 * @param alertId ID de la alerta
 * @param resolution Comentario de resolución
 * @returns Confirmación
 */
export async function resolveAlertAction(alertId: string, resolution?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que la alerta pertenece a la organización
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        orgId: session.user.orgId,
      },
    });

    if (!alert) {
      throw new Error("Alerta no encontrada");
    }

    // Resolver usando el motor de alertas
    await resolveAlertEngine(alertId, session.user.id, resolution);

    return { success: true };
  } catch (error) {
    console.error("Error al resolver alerta:", error);
    throw error;
  }
}

/**
 * Descarta una alerta (falso positivo)
 *
 * @param alertId ID de la alerta
 * @param comment Comentario de por qué se descarta
 * @returns Confirmación
 */
export async function dismissAlertAction(alertId: string, comment?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que la alerta pertenece a la organización
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        orgId: session.user.orgId,
      },
    });

    if (!alert) {
      throw new Error("Alerta no encontrada");
    }

    // Descartar usando el motor de alertas
    await dismissAlertEngine(alertId, session.user.id, comment);

    return { success: true };
  } catch (error) {
    console.error("Error al descartar alerta:", error);
    throw error;
  }
}

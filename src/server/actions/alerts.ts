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
  search?: string;
};

export type AlertStats = {
  total: number;
  active: number;
  resolved: number;
  dismissed: number;
  bySeverity: Array<{ severity: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
};

type AlertSubscription = {
  scope: "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM";
  departmentId: string | null;
  costCenterId: string | null;
  teamId: string | null;
  severityLevels: string[];
  alertTypes: string[];
};

function buildMyAlertsWhere(orgId: string, subscriptions: AlertSubscription[], filters?: AlertFilters) {
  const scopeFilters = subscriptions
    .map((sub) => {
      const clause: Record<string, unknown> = {};

      if (sub.scope === "DEPARTMENT") {
        if (!sub.departmentId) return null;
        clause.departmentId = sub.departmentId;
      } else if (sub.scope === "COST_CENTER") {
        if (!sub.costCenterId) return null;
        clause.costCenterId = sub.costCenterId;
      } else if (sub.scope === "TEAM") {
        if (!sub.teamId) return null;
        clause.teamId = sub.teamId;
      }

      if (sub.severityLevels.length > 0) {
        clause.severity = { in: sub.severityLevels };
      }

      if (sub.alertTypes.length > 0) {
        clause.type = { in: sub.alertTypes };
      }

      return clause;
    })
    .filter((clause) => clause !== null);

  const whereClause: Record<string, unknown> = {
    orgId,
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

  const searchValue = filters?.search?.trim();
  if (searchValue) {
    whereClause.employee = {
      OR: [
        { firstName: { contains: searchValue, mode: "insensitive" } },
        { lastName: { contains: searchValue, mode: "insensitive" } },
        { email: { contains: searchValue, mode: "insensitive" } },
      ],
    };
  }

  return whereClause;
}

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

    const whereClause = buildMyAlertsWhere(session.user.orgId, subscriptions, filters);
    if (!whereClause.OR || (Array.isArray(whereClause.OR) && whereClause.OR.length === 0)) {
      return [];
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

    // Serializar fechas
    return alerts.map((alert) => ({
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
 * Obtiene alertas del usuario con paginación (según suscripciones).
 */
export async function getMyAlertsPage(filters?: AlertFilters, pageIndex = 0, pageSize = 10) {
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
      return { alerts: [], total: 0 };
    }

    const whereClause = buildMyAlertsWhere(session.user.orgId, subscriptions, filters);
    if (!whereClause.OR || (Array.isArray(whereClause.OR) && whereClause.OR.length === 0)) {
      return { alerts: [], total: 0 };
    }

    const safePageIndex = Math.max(0, pageIndex);
    const safePageSize = Math.max(1, pageSize);

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
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
        skip: safePageIndex * safePageSize,
        take: safePageSize,
      }),
      prisma.alert.count({ where: whereClause }),
    ]);

    return {
      alerts: alerts.map((alert) => ({
        ...alert,
        date: alert.date.toISOString(),
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
        resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
      })),
      total,
    };
  } catch (error) {
    console.error("Error al obtener alertas paginadas:", error);
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
      return {
        total: 0,
        active: 0,
        resolved: 0,
        dismissed: 0,
        bySeverity: [],
        byType: [],
      };
    }

    const whereClause = buildMyAlertsWhere(session.user.orgId, subscriptions, {
      ...filters,
      status: undefined,
    });

    if (!whereClause.OR || (Array.isArray(whereClause.OR) && whereClause.OR.length === 0)) {
      return {
        total: 0,
        active: 0,
        resolved: 0,
        dismissed: 0,
        bySeverity: [],
        byType: [],
      };
    }

    const [total, active, resolved, dismissed, bySeverity, byType] = await Promise.all([
      prisma.alert.count({ where: whereClause }),
      prisma.alert.count({ where: { ...whereClause, status: "ACTIVE" } }),
      prisma.alert.count({ where: { ...whereClause, status: "RESOLVED" } }),
      prisma.alert.count({ where: { ...whereClause, status: "DISMISSED" } }),
      prisma.alert.groupBy({
        by: ["severity"],
        where: whereClause,
        _count: true,
      }),
      prisma.alert.groupBy({
        by: ["type"],
        where: whereClause,
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      resolved,
      dismissed,
      bySeverity: bySeverity.map((item) => ({
        severity: item.severity,
        count: item._count,
      })),
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
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

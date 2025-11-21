"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server Actions para gestión de responsabilidades del usuario
 *
 * Permite a usuarios ver sus áreas de responsabilidad y gestionar
 * suscripciones a alertas por área de forma intuitiva.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ResponsibilityScope = "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM";

export type ResponsibilityWithSubscription = {
  // Datos de AreaResponsible
  id: string;
  scope: ResponsibilityScope;
  isActive: boolean;

  // Datos del área específica
  organization?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  costCenter?: { id: string; name: string; code: string | null } | null;
  team?: { id: string; name: string; code: string | null } | null;

  // Suscripción activa (si existe)
  subscription?: {
    id: string;
    severityLevels: string[];
    alertTypes: string[];
    notifyByEmail: boolean;
  } | null;

  // Metadatos
  employeesCount: number; // Cuántos empleados están bajo esta responsabilidad
  activeAlertsCount: number; // Alertas activas actualmente
};

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Obtiene todas las áreas de responsabilidad del usuario autenticado
 * con información de suscripciones activas y métricas relevantes
 *
 * @returns Lista de responsabilidades con suscripciones y métricas
 *
 * @example
 * const responsibilities = await getMyResponsibilities();
 * // Retorna: [
 * //   {
 * //     id: "resp1",
 * //     scope: "TEAM",
 * //     team: { id: "team1", name: "Frontend" },
 * //     subscription: { id: "sub1", ... },
 * //     employeesCount: 12,
 * //     activeAlertsCount: 3
 * //   }
 * // ]
 */
export async function getMyResponsibilities(): Promise<ResponsibilityWithSubscription[]> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado");
    }

    const { user } = session;

    // Obtener todas las responsabilidades activas del usuario
    const responsibilities = await prisma.areaResponsible.findMany({
      where: {
        userId: user.id,
        orgId: user.orgId,
        isActive: true,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
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

    // Obtener todas las suscripciones del usuario
    const subscriptions = await prisma.alertSubscription.findMany({
      where: {
        userId: user.id,
        orgId: user.orgId,
        isActive: true,
      },
    });

    // Mapear responsabilidades con suscripciones y métricas
    const result: ResponsibilityWithSubscription[] = await Promise.all(
      responsibilities.map(async (resp) => {
        // Encontrar suscripción correspondiente
        const subscription = subscriptions.find((sub) => {
          if (resp.scope === "ORGANIZATION") {
            return sub.scope === "ORGANIZATION";
          }
          if (resp.scope === "DEPARTMENT") {
            return sub.scope === "DEPARTMENT" && sub.departmentId === resp.departmentId;
          }
          if (resp.scope === "COST_CENTER") {
            return sub.scope === "COST_CENTER" && sub.costCenterId === resp.costCenterId;
          }
          if (resp.scope === "TEAM") {
            return sub.scope === "TEAM" && sub.teamId === resp.teamId;
          }
          return false;
        });

        // Calcular métricas (empleados y alertas)
        const { employeesCount, activeAlertsCount } = await calculateMetrics(
          resp.scope,
          user.orgId,
          resp.departmentId,
          resp.costCenterId,
          resp.teamId,
        );

        return {
          id: resp.id,
          scope: resp.scope as ResponsibilityScope,
          isActive: resp.isActive,
          organization: resp.organization,
          department: resp.department,
          costCenter: resp.costCenter,
          team: resp.team,
          subscription: subscription
            ? {
                id: subscription.id,
                severityLevels: subscription.severityLevels,
                alertTypes: subscription.alertTypes,
                notifyByEmail: subscription.notifyByEmail,
              }
            : null,
          employeesCount,
          activeAlertsCount,
        };
      }),
    );

    return result;
  } catch (error) {
    console.error("Error al obtener responsabilidades:", error);
    throw error;
  }
}

/**
 * Calcula métricas (empleados y alertas activas) para un área de responsabilidad
 */
async function calculateMetrics(
  scope: string,
  orgId: string,
  departmentId: string | null,
  costCenterId: string | null,
  teamId: string | null,
): Promise<{ employeesCount: number; activeAlertsCount: number }> {
  // Construir filtro base
  const employeeFilter: any = { orgId, active: true };
  const alertFilter: any = { orgId, status: "ACTIVE" };

  // Aplicar filtros según el scope
  if (scope === "DEPARTMENT") {
    // Empleados: todos los que están en contratos con ese departamento
    const contracts = await prisma.employmentContract.findMany({
      where: {
        departmentId,
        active: true,
      },
      select: { employeeId: true },
      distinct: ["employeeId"],
    });
    const employeeIds = contracts.map((c) => c.employeeId);

    employeeFilter.id = { in: employeeIds };
    alertFilter.employeeId = { in: employeeIds };
  } else if (scope === "COST_CENTER") {
    // Empleados: todos los que están en contratos con ese centro
    const contracts = await prisma.employmentContract.findMany({
      where: {
        costCenterId,
        active: true,
      },
      select: { employeeId: true },
      distinct: ["employeeId"],
    });
    const employeeIds = contracts.map((c) => c.employeeId);

    employeeFilter.id = { in: employeeIds };
    alertFilter.costCenterId = costCenterId;
  } else if (scope === "TEAM") {
    employeeFilter.teamId = teamId;
    alertFilter.teamId = teamId;
  }
  // ORGANIZATION: no aplicar filtros adicionales (ya tiene orgId)

  // Contar empleados y alertas en paralelo
  const [employeesCount, activeAlertsCount] = await Promise.all([
    prisma.employee.count({ where: employeeFilter }),
    prisma.alert.count({ where: alertFilter }),
  ]);

  return { employeesCount, activeAlertsCount };
}

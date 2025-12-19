import { prisma } from "@/lib/prisma";

/**
 * Tipos de permisos disponibles en el sistema
 */
export type Permission =
  | "VIEW_EMPLOYEES"
  | "MANAGE_EMPLOYEES"
  | "VIEW_TIME_ENTRIES"
  | "MANAGE_TIME_ENTRIES"
  | "VIEW_ALERTS"
  | "RESOLVE_ALERTS"
  | "VIEW_SCHEDULES"
  | "MANAGE_SCHEDULES"
  | "VIEW_PTO_REQUESTS"
  | "APPROVE_PTO_REQUESTS"
  | "APPROVE_EXPENSES";

/**
 * Tipos de scope disponibles
 */
export type Scope = "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM";

/**
 * Construye filtro de Prisma basado en los scopes del usuario
 *
 * Retorna un objeto que se puede usar en Prisma where clause para filtrar
 * recursos (empleados, alertas, etc.) según los ámbitos de responsabilidad del usuario.
 *
 * **ROLES GLOBALES**: ADMIN y RRHH bypasean la validación de AreaResponsible y tienen acceso total.
 *
 * @example
 * const filter = await buildScopeFilter(userId);
 * const alerts = await prisma.alert.findMany({
 *   where: {
 *     orgId: session.user.orgId,
 *     ...filter
 *   }
 * });
 */
export async function buildScopeFilter(userId: string) {
  // Obtener usuario con rol
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // BYPASS para roles globales (ADMIN, RRHH)
  if (user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN") {
    return {}; // Sin restricciones - acceso total
  }

  // Para otros roles, validar AreaResponsible
  const responsibilities = await prisma.areaResponsible.findMany({
    where: { userId, isActive: true },
    select: { scope: true, departmentId: true, costCenterId: true, teamId: true },
  });

  if (responsibilities.length === 0) {
    // Usuario sin responsabilidades: no ve nada
    return { id: "never" };
  }

  // Construir array de filtros (uno por cada responsabilidad)
  const filters = responsibilities.map((r) => {
    if (r.scope === "ORGANIZATION") {
      // Scope ORGANIZATION: ve todo (retornar objeto vacío = sin restricción)
      return {};
    }
    if (r.scope === "DEPARTMENT" && r.departmentId) {
      // Scope DEPARTMENT: filtra por departamento
      // NOTA: Employee NO tiene departmentId directo, se filtra por employmentContracts.department
      return {
        employmentContracts: {
          some: {
            departmentId: r.departmentId,
            active: true,
          },
        },
      };
    }
    if (r.scope === "COST_CENTER" && r.costCenterId) {
      // Scope COST_CENTER: filtra por centro de trabajo
      // NOTA: Employee NO tiene costCenterId directo, se filtra por employmentContracts
      return {
        employmentContracts: {
          some: {
            costCenterId: r.costCenterId,
            active: true,
          },
        },
      };
    }
    if (r.scope === "TEAM" && r.teamId) {
      // Scope TEAM: filtra por equipo (campo directo en Employee)
      return { teamId: r.teamId };
    }
    return {};
  });

  // Si algún filtro es vacío (ORGANIZATION), retornar sin restricciones
  if (filters.some((f) => Object.keys(f).length === 0)) {
    return {};
  }

  // Combinar filtros con OR
  return { OR: filters };
}

/**
 * Obtiene todos los scopes del usuario con detalles
 *
 * @example
 * const scopes = await getUserScopes(userId);
 * // [
 * //   { scope: "ORGANIZATION", ... },
 * //   { scope: "COST_CENTER", costCenter: { name: "Madrid" }, ... },
 * //   { scope: "TEAM", team: { name: "Equipo A" }, ... }
 * // ]
 */
export async function getUserScopes(userId: string) {
  return await prisma.areaResponsible.findMany({
    where: { userId, isActive: true },
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
    orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
  });
}

/**
 * Verifica si el usuario tiene un permiso específico
 *
 * Busca en todas las responsabilidades del usuario para ver si tiene el permiso solicitado.
 * Si se especifica resourceId, valida que el recurso pertenezca a algún scope del usuario.
 *
 * @param userId - ID del usuario
 * @param permission - Permiso a verificar
 * @param resourceId - ID del recurso (opcional, para validar acceso específico)
 *
 * @example
 * const canResolve = await hasPermission(userId, "RESOLVE_ALERTS");
 * const canResolveAlert = await hasPermission(userId, "RESOLVE_ALERTS", alertId);
 */
export async function hasPermission(userId: string, permission: Permission, resourceId?: string): Promise<boolean> {
  const responsibilities = await prisma.areaResponsible.findMany({
    where: {
      userId,
      isActive: true,
      permissions: { has: permission },
    },
    select: { scope: true, costCenterId: true, teamId: true },
  });

  if (responsibilities.length === 0) {
    return false;
  }

  // Si tiene permiso a nivel ORGANIZATION, retorna true inmediatamente
  if (responsibilities.some((r) => r.scope === "ORGANIZATION")) {
    return true;
  }

  // Si no se especifica resourceId, retornar true si tiene el permiso en algún scope
  if (!resourceId) {
    return true;
  }

  // TODO: Implementar validación de que el recurso pertenece a algún scope
  // Por ahora retornamos true si tiene el permiso (simplificado para MVP)
  return true;
}

/**
 * Obtiene suscripciones de alertas activas del usuario
 *
 * @example
 * const subscriptions = await getUserAlertSubscriptions(userId);
 */
export async function getUserAlertSubscriptions(userId: string) {
  return await prisma.alertSubscription.findMany({
    where: { userId, isActive: true },
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
}

/**
 * Valida que un scope pertenece a la organización especificada
 *
 * CRÍTICO para seguridad multi-tenant: SIEMPRE validar antes de asignar
 * responsabilidades o suscripciones.
 *
 * @param orgId - ID de la organización
 * @param scope - Tipo de scope
 * @param scopeId - ID del scope (costCenterId o teamId)
 *
 * @example
 * const isValid = await validateScopeOwnership(orgId, "COST_CENTER", centerId);
 * if (!isValid) throw new Error("Centro no pertenece a la organización");
 */
export async function validateScopeOwnership(orgId: string, scope: Scope, scopeId: string | null): Promise<boolean> {
  // Scope ORGANIZATION siempre es válido (no tiene scopeId)
  if (scope === "ORGANIZATION") {
    return true;
  }

  // Para DEPARTMENT, validar que el departamento pertenece a la org
  if (scope === "DEPARTMENT" && scopeId) {
    const department = await prisma.department.findUnique({
      where: { id: scopeId },
      select: { orgId: true },
    });
    return department?.orgId === orgId;
  }

  // Para COST_CENTER, validar que el centro pertenece a la org
  if (scope === "COST_CENTER" && scopeId) {
    const center = await prisma.costCenter.findUnique({
      where: { id: scopeId },
      select: { orgId: true },
    });
    return center?.orgId === orgId;
  }

  // Para TEAM, validar que el equipo pertenece a la org
  if (scope === "TEAM" && scopeId) {
    const team = await prisma.team.findUnique({
      where: { id: scopeId },
      select: { orgId: true },
    });
    return team?.orgId === orgId;
  }

  // Si llegamos aquí, es inválido
  return false;
}

/**
 * Obtiene los centros de coste a los que el usuario tiene acceso
 *
 * Útil para poblar dropdowns de filtros en UI.
 *
 * **ROLES GLOBALES**: ADMIN y RRHH ven todos los centros.
 *
 * @example
 * const centers = await getUserAccessibleCostCenters(userId, orgId);
 * // Usar en Select de filtro: "Todos los centros" | "Madrid" | "Barcelona"
 */
export async function getUserAccessibleCostCenters(userId: string, orgId: string) {
  // Obtener usuario con rol
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // BYPASS para roles globales (ADMIN, RRHH) - ven todos los centros
  if (user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN") {
    return await prisma.costCenter.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  // Para otros roles, validar AreaResponsible
  const responsibilities = await prisma.areaResponsible.findMany({
    where: { userId, isActive: true },
    select: { scope: true, costCenterId: true },
  });

  // Si tiene scope ORGANIZATION, retornar TODOS los centros
  if (responsibilities.some((r) => r.scope === "ORGANIZATION")) {
    return await prisma.costCenter.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  // Filtrar por centros específicos
  const centerIds = responsibilities
    .filter((r) => r.scope === "COST_CENTER" && r.costCenterId)
    .map((r) => r.costCenterId as string);

  if (centerIds.length === 0) {
    return [];
  }

  return await prisma.costCenter.findMany({
    where: { id: { in: centerIds }, active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Obtiene los equipos a los que el usuario tiene acceso
 *
 * Útil para poblar dropdowns de filtros en UI.
 *
 * **ROLES GLOBALES**: ADMIN y RRHH ven todos los equipos.
 *
 * @example
 * const teams = await getUserAccessibleTeams(userId, orgId);
 * // Usar en Combobox de filtro: "Todos los equipos" | "Equipo A" | "Equipo B"
 */
export async function getUserAccessibleTeams(userId: string, orgId: string) {
  // Obtener usuario con rol
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // BYPASS para roles globales (ADMIN, RRHH) - ven todos los equipos
  if (user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN") {
    return await prisma.team.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        costCenter: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  // Para otros roles, validar AreaResponsible
  const responsibilities = await prisma.areaResponsible.findMany({
    where: { userId, isActive: true },
    select: { scope: true, costCenterId: true, teamId: true },
  });

  // Si tiene scope ORGANIZATION, retornar TODOS los equipos
  if (responsibilities.some((r) => r.scope === "ORGANIZATION")) {
    return await prisma.team.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        costCenter: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  // Si tiene scope COST_CENTER, retornar equipos de esos centros
  const centerIds = responsibilities
    .filter((r) => r.scope === "COST_CENTER" && r.costCenterId)
    .map((r) => r.costCenterId as string);

  if (centerIds.length > 0) {
    return await prisma.team.findMany({
      where: {
        costCenterId: { in: centerIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        costCenter: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  // Si tiene scope TEAM, retornar solo esos equipos específicos
  const teamIds = responsibilities.filter((r) => r.scope === "TEAM" && r.teamId).map((r) => r.teamId as string);

  if (teamIds.length === 0) {
    return [];
  }

  return await prisma.team.findMany({
    where: { id: { in: teamIds }, isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      costCenter: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Obtiene los departamentos a los que el usuario tiene acceso
 *
 * Útil para poblar dropdowns de filtros en UI.
 *
 * **ROLES GLOBALES**: ADMIN y RRHH ven todos los departamentos.
 *
 * @example
 * const departments = await getUserAccessibleDepartments(userId, orgId);
 * // Usar en Select de filtro: "Todos los departamentos" | "Tecnología" | "Ventas"
 */
export async function getUserAccessibleDepartments(userId: string, orgId: string) {
  // Obtener usuario con rol
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // BYPASS para roles globales (ADMIN, RRHH) - ven todos los departamentos
  if (user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN") {
    return await prisma.department.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  // Para otros roles, validar AreaResponsible
  const responsibilities = await prisma.areaResponsible.findMany({
    where: { userId, isActive: true },
    select: { scope: true, departmentId: true },
  });

  // Si tiene scope ORGANIZATION, retornar TODOS los departamentos
  if (responsibilities.some((r) => r.scope === "ORGANIZATION")) {
    return await prisma.department.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  // Filtrar por departamentos específicos
  const departmentIds = responsibilities
    .filter((r) => r.scope === "DEPARTMENT" && r.departmentId)
    .map((r) => r.departmentId as string);

  if (departmentIds.length === 0) {
    return [];
  }

  return await prisma.department.findMany({
    where: { id: { in: departmentIds }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Verifica si el usuario debería recibir notificación de una alerta
 *
 * Chequea las suscripciones activas del usuario para determinar si debe
 * recibir notificación in-app de la alerta según scope, severidad y tipo.
 *
 * @param userId - ID del usuario
 * @param alert - Alerta a evaluar
 *
 * @example
 * const shouldNotify = await shouldReceiveAlertNotification(userId, alert);
 * if (shouldNotify) {
 *   await createNotification(userId, alert);
 * }
 */
export async function shouldReceiveAlertNotification(
  userId: string,
  alert: {
    type: string;
    severity: string;
    departmentId: string | null;
    costCenterId: string | null;
    teamId: string | null;
  },
): Promise<boolean> {
  const subscriptions = await prisma.alertSubscription.findMany({
    where: {
      userId,
      isActive: true,
      notifyInApp: true, // Solo suscripciones con notificaciones in-app activas
    },
  });

  if (subscriptions.length === 0) {
    return false;
  }

  // Verificar cada suscripción
  for (const sub of subscriptions) {
    // Verificar scope
    let scopeMatches = false;

    if (sub.scope === "ORGANIZATION") {
      scopeMatches = true; // Recibe todas las alertas
    } else if (sub.scope === "DEPARTMENT" && sub.departmentId === alert.departmentId) {
      scopeMatches = true;
    } else if (sub.scope === "COST_CENTER" && sub.costCenterId === alert.costCenterId) {
      scopeMatches = true;
    } else if (sub.scope === "TEAM" && sub.teamId === alert.teamId) {
      scopeMatches = true;
    }

    if (!scopeMatches) continue;

    // Verificar severidad (si está configurada)
    if (sub.severityLevels.length > 0) {
      if (!sub.severityLevels.includes(alert.severity)) {
        continue; // No coincide la severidad
      }
    }

    // Verificar tipo de alerta (si está configurado)
    if (sub.alertTypes.length > 0) {
      if (!sub.alertTypes.includes(alert.type)) {
        continue; // No coincide el tipo
      }
    }

    // Si llegamos aquí, la suscripción coincide
    return true;
  }

  return false;
}

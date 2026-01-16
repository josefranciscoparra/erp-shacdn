import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Definición de la visibilidad de un usuario
 */
export type UserScope = {
  isGlobal: boolean; // True si puede ver toda la organización
  departmentIds: string[]; // IDs de departamentos asignados
  costCenterIds: string[]; // IDs de centros de coste asignados
  teamIds: string[]; // IDs de equipos asignados
  managedEmployeeIds?: string[]; // IDs de empleados directos (si aplica lógica de manager directo)
};

/**
 * Roles que tienen visibilidad global por defecto
 */
const GLOBAL_ROLES: Role[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT"];

/**
 * Calcula el alcance de visibilidad de un usuario dentro de una organización.
 * Centraliza la lógica de "quién puede ver qué".
 *
 * @param userId ID del usuario
 * @param orgId ID de la organización
 * @returns Objeto UserScope con los IDs permitidos
 */
export async function getUserScope(userId: string, orgId: string): Promise<UserScope> {
  // 1. Obtener rol del usuario
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return { isGlobal: false, departmentIds: [], costCenterIds: [], teamIds: [] };
  }

  // 2. Si es rol global, devolver acceso total
  if (GLOBAL_ROLES.includes(user.role)) {
    return {
      isGlobal: true,
      departmentIds: [],
      costCenterIds: [],
      teamIds: [],
    };
  }

  // 3. Consultar responsabilidades asignadas (AreaResponsible)
  const responsibilities = await prisma.areaResponsible.findMany({
    where: {
      userId,
      orgId,
      isActive: true,
    },
    select: {
      scope: true,
      departmentId: true,
      costCenterId: true,
      teamId: true,
    },
  });

  // 4. Analizar scopes
  let isGlobal = false;
  const departmentIds: string[] = [];
  const costCenterIds: string[] = [];
  const teamIds: string[] = [];

  for (const resp of responsibilities) {
    if (resp.scope === "ORGANIZATION") {
      isGlobal = true;
      break; // Si tiene scope global, no necesitamos mirar más
    }

    if (resp.departmentId) departmentIds.push(resp.departmentId);
    if (resp.costCenterId) costCenterIds.push(resp.costCenterId);
    if (resp.teamId) teamIds.push(resp.teamId);
  }

  return {
    isGlobal,
    departmentIds,
    costCenterIds,
    teamIds,
  };
}

/**
 * Genera un filtro Prisma WhereInput compatible para proteger consultas.
 * Útil para injectar directamente en prisma.findMany()
 *
 * @param scope El scope calculado del usuario
 * @param fieldMap Mapeo opcional de nombres de campos (ej: si departmentId se llama 'deptId')
 */
export function getScopeFilter(
  scope: UserScope,
  fieldMap: { department?: string; costCenter?: string; team?: string } = {},
) {
  if (scope.isGlobal) {
    return {}; // No filtrar nada
  }

  const deptField = fieldMap.department ?? "departmentId";
  const ccField = fieldMap.costCenter ?? "costCenterId";
  const teamField = fieldMap.team ?? "teamId";

  // Construir condiciones OR
  const conditions: any[] = [];

  if (scope.departmentIds.length > 0) {
    conditions.push({ [deptField]: { in: scope.departmentIds } });
  }

  if (scope.costCenterIds.length > 0) {
    conditions.push({ [ccField]: { in: scope.costCenterIds } });
  }

  if (scope.teamIds.length > 0) {
    conditions.push({ [teamField]: { in: scope.teamIds } });
  }

  // Si no tiene ninguna responsabilidad asignada, bloquear acceso (condición imposible)
  if (conditions.length === 0) {
    // Usamos AND con condiciones contradictorias para garantizar 0 resultados
    return { AND: [{ id: { not: "" } }, { id: "" }] };
  }

  return { OR: conditions };
}

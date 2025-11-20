/**
 * Motor de Alertas con Idempotencia
 *
 * Sistema centralizado para crear, actualizar y gestionar alertas de fichajes
 * con idempotencia garantizada mediante constraint único (employeeId, date, type).
 *
 * **Características:**
 * - Idempotencia: Solo una alerta de cada tipo por empleado por día
 * - Suscripciones acumulativas: Usuarios con múltiples scopes ven todas las alertas
 * - Resolución automática: Si se corrige un fichaje, la alerta se marca como resuelta
 *
 * @module alert-engine
 */

import { prisma } from "@/lib/prisma";

// ============================================================================
// TYPES
// ============================================================================

export type AlertType =
  | "DAILY_SUMMARY"
  | "LATE_ARRIVAL"
  | "CRITICAL_LATE_ARRIVAL"
  | "EARLY_DEPARTURE"
  | "CRITICAL_EARLY_DEPARTURE"
  | "NON_WORKDAY_CLOCK_IN"
  | "MISSING_CLOCK_IN"
  | "MISSING_CLOCK_OUT"
  | "EXCESSIVE_HOURS";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type AlertStatus = "ACTIVE" | "RESOLVED" | "DISMISSED";

export interface CreateOrUpdateAlertParams {
  employeeId: string;
  date: Date;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  timeEntryId?: string;
  departmentId?: string;
  costCenterId?: string;
  teamId?: string;
  orgId: string;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Crea o actualiza una alerta (idempotente)
 *
 * Usa constraint único `@@unique([employeeId, date, type])` para garantizar
 * que solo existe una alerta de cada tipo por empleado por día.
 *
 * **Comportamiento:**
 * - Si no existe → Crea nueva alerta con `status="ACTIVE"`
 * - Si existe → Actualiza `severity`, `description`, `timeEntryId`, `updatedAt`
 *
 * **Casos de uso:**
 * - Primera entrada tardía → Crea alerta
 * - Segunda entrada tardía (mismo día) → Actualiza severidad si es mayor
 * - Fichaje corregido → Se resuelve con `resolveAlert()`
 *
 * @param params Datos de la alerta
 * @returns Alerta creada o actualizada
 *
 * @example
 * const alert = await createOrUpdateAlert({
 *   employeeId: "emp123",
 *   date: new Date("2025-11-20"),
 *   type: "LATE_ARRIVAL",
 *   severity: "WARNING",
 *   title: "Entrada tardía",
 *   description: "Llegó 15 minutos tarde",
 *   costCenterId: "center456",
 *   orgId: "org789"
 * });
 */
export async function createOrUpdateAlert(params: CreateOrUpdateAlertParams) {
  const normalizedDate = new Date(params.date);
  normalizedDate.setHours(0, 0, 0, 0);

  const alert = await prisma.alert.upsert({
    where: {
      employeeId_date_type: {
        employeeId: params.employeeId,
        date: normalizedDate,
        type: params.type,
      },
    },
    create: {
      orgId: params.orgId,
      employeeId: params.employeeId,
      type: params.type,
      severity: params.severity,
      title: params.title,
      description: params.description ?? null,
      date: normalizedDate,
      timeEntryId: params.timeEntryId ?? null,
      departmentId: params.departmentId ?? null,
      costCenterId: params.costCenterId ?? null,
      originalCostCenterId: params.costCenterId ?? null,
      teamId: params.teamId ?? null,
      status: "ACTIVE",
    },
    update: {
      severity: params.severity,
      title: params.title,
      description: params.description ?? null,
      timeEntryId: params.timeEntryId ?? null,
      updatedAt: new Date(),
    },
  });

  return alert;
}

/**
 * Obtiene todos los usuarios que deben recibir una alerta
 * basado en sus suscripciones activas (ACUMULATIVO)
 *
 * **Reglas:**
 * - Un usuario con múltiples suscripciones ve TODAS las alertas sumadas
 * - Ejemplo: `scope=ORG + scope=TEAM` → ve alertas de toda la org + las del equipo
 * - Se usa DISTINCT para evitar duplicados
 *
 * **Filtrado por scope:**
 * - `ORGANIZATION` → Recibe TODAS las alertas de la org
 * - `DEPARTMENT` → Recibe alertas del departamento especificado
 * - `COST_CENTER` → Recibe alertas del centro especificado
 * - `TEAM` → Recibe alertas del equipo especificado
 *
 * @param alert Alerta para la que buscar suscriptores
 * @returns Lista de usuarios que deben recibir la alerta
 *
 * @example
 * const subscribers = await getAlertSubscribers(alert);
 * // Retorna usuarios únicos con múltiples suscripciones combinadas
 */
export async function getAlertSubscribers(alert: {
  type: string;
  severity: string;
  departmentId: string | null;
  costCenterId: string | null;
  teamId: string | null;
  orgId: string;
}) {
  // Obtener todas las suscripciones que coincidan con la alerta
  const subscriptions = await prisma.alertSubscription.findMany({
    where: {
      orgId: alert.orgId,
      isActive: true,
      notifyInApp: true, // Solo suscripciones con notificaciones in-app
      OR: [
        // Suscripción a nivel ORGANIZATION (recibe TODAS)
        { scope: "ORGANIZATION" },
        // Suscripción a nivel DEPARTMENT (solo si coincide)
        {
          scope: "DEPARTMENT",
          departmentId: alert.departmentId ?? undefined,
        },
        // Suscripción a nivel COST_CENTER (solo si coincide)
        {
          scope: "COST_CENTER",
          costCenterId: alert.costCenterId ?? undefined,
        },
        // Suscripción a nivel TEAM (solo si coincide)
        {
          scope: "TEAM",
          teamId: alert.teamId ?? undefined,
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Filtrar por severidad y tipo de alerta (si está configurado)
  const filteredSubscriptions = subscriptions.filter((sub) => {
    // Filtrar por severidad si está configurada
    if (sub.severityLevels.length > 0) {
      if (!sub.severityLevels.includes(alert.severity)) {
        return false;
      }
    }

    // Filtrar por tipo de alerta si está configurado
    if (sub.alertTypes.length > 0) {
      if (!sub.alertTypes.includes(alert.type)) {
        return false;
      }
    }

    return true;
  });

  // Extraer usuarios únicos (eliminar duplicados por userId)
  const uniqueUsers = new Map();
  filteredSubscriptions.forEach((sub) => {
    if (!uniqueUsers.has(sub.user.id)) {
      uniqueUsers.set(sub.user.id, sub.user);
    }
  });

  return Array.from(uniqueUsers.values());
}

/**
 * Resuelve una alerta marcándola como resuelta
 *
 * **Uso:**
 * - Cuando se corrige un fichaje manualmente
 * - Cuando un responsable marca la alerta como resuelta
 * - Cuando el sistema detecta que el problema se solucionó
 *
 * @param alertId ID de la alerta
 * @param userId ID del usuario que resuelve
 * @param resolution Comentario de resolución
 * @returns Alerta actualizada
 *
 * @example
 * await resolveAlert("alert123", "user456", "Fichaje corregido manualmente");
 */
export async function resolveAlert(alertId: string, userId: string, resolution?: string) {
  const alert = await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolutionComment: resolution ?? null,
    },
  });

  return alert;
}

/**
 * Descarta una alerta (falso positivo o no relevante)
 *
 * Similar a `resolveAlert()` pero marca el estado como DISMISSED
 * en lugar de RESOLVED. Útil para alertas que no requieren acción.
 *
 * @param alertId ID de la alerta
 * @param userId ID del usuario que descarta
 * @param comment Comentario de por qué se descarta
 * @returns Alerta actualizada
 *
 * @example
 * await dismissAlert("alert123", "user456", "Permiso aprobado fuera del sistema");
 */
export async function dismissAlert(alertId: string, userId: string, comment?: string) {
  const alert = await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "DISMISSED",
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolutionComment: comment ?? null,
    },
  });

  return alert;
}

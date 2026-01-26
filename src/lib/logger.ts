import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const rawSensitiveAccessFlag = process.env.AUDIT_LOG_SENSITIVE_ACCESS;
const LOG_SENSITIVE_ACCESS =
  rawSensitiveAccessFlag === undefined ? true : rawSensitiveAccessFlag.trim().toLowerCase() !== "false";

const DEFAULT_SENSITIVE_THROTTLE_MS = 10 * 60 * 1000;
const parsedSensitiveThrottle = Number(process.env.AUDIT_LOG_SENSITIVE_ACCESS_THROTTLE_MS);
const SENSITIVE_ACCESS_THROTTLE_MS =
  Number.isFinite(parsedSensitiveThrottle) && parsedSensitiveThrottle > 0
    ? parsedSensitiveThrottle
    : DEFAULT_SENSITIVE_THROTTLE_MS;

const MAX_SENSITIVE_THROTTLE_ENTRIES = 2000;

const sensitiveAccessThrottle = new Map<string, number>();

export type AuditAction =
  | "ACCESS_DENIED"
  | "LOGIN_FAILED"
  | "SENSITIVE_DATA_ACCESS"
  | "PERMISSION_OVERRIDE"
  | "DELETE_RESOURCE"
  | "UPDATE_RESOURCE"
  | "CREATE_RESOURCE";

export type AuditCategory =
  | "SECURITY"
  | "AUTH"
  | "EMPLOYEE"
  | "USER"
  | "ORGANIZATION"
  | "PAYROLL"
  | "TIME_TRACKING"
  | "DOCUMENTS";

interface LogOptions {
  action: AuditAction;
  category: AuditCategory;
  description: string;
  entityId?: string;
  entityType?: string;
  entityData?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Servicio de Auditoría de Seguridad
 * Registra eventos críticos en la base de datos de forma asíncrona.
 */
export class SecurityLogger {
  /**
   * Registra un evento en el log de auditoría
   * No lanza excepciones para evitar interrumpir el flujo principal
   */
  static async log(options: LogOptions): Promise<void> {
    try {
      const session = await auth();

      // Si no hay sesión, intentamos registrar como "SYSTEM" o "ANONYMOUS"
      // pero requerimos orgId para la relación obligatoria.
      // Si no hay orgId en sesión, intentamos obtenerlo de los metadatos o fallamos silenciosamente.
      const orgId = session?.user?.orgId;

      if (!orgId) {
        // Por ahora solo logueamos si hay usuario autenticado con organización
        return;
      }

      if (options.action === "SENSITIVE_DATA_ACCESS") {
        if (!LOG_SENSITIVE_ACCESS) {
          return;
        }

        const userId = session.user.id ?? "system";
        const entityId = options.entityId ?? "unknown";
        const throttleKey = `${orgId}:${userId}:${entityId}`;
        const now = Date.now();
        const lastLoggedAt = sensitiveAccessThrottle.get(throttleKey);
        if (lastLoggedAt !== undefined && now - lastLoggedAt < SENSITIVE_ACCESS_THROTTLE_MS) {
          return;
        }
        sensitiveAccessThrottle.set(throttleKey, now);
        if (sensitiveAccessThrottle.size > MAX_SENSITIVE_THROTTLE_ENTRIES) {
          sensitiveAccessThrottle.clear();
        }
      }

      const headersList = await headers();
      const ipAddress = headersList.get("x-forwarded-for") ?? "unknown";
      const userAgent = headersList.get("user-agent") ?? "unknown";

      const logData = {
        action: options.action,
        category: options.category,
        description: options.description,
        entityId: options.entityId ?? "N/A",
        entityType: options.entityType ?? "N/A",
        entityData: options.entityData ? JSON.stringify(options.entityData) : undefined,
        performedById: session.user.id ?? "system",
        performedByName: session.user.name ?? "Unknown",
        performedByEmail: session.user.email ?? "unknown@example.com",
        performedByRole: session.user.role ?? "UNKNOWN",
        orgId: orgId,
        ipAddress: ipAddress,
        userAgent: userAgent,
      };

      if (options.action === "SENSITIVE_DATA_ACCESS") {
        void prisma.auditLog.create({ data: logData }).catch((error) => {
          if (process.env.NODE_ENV === "development") {
            console.error("[SecurityLogger] Error writing audit log:", error);
          }
        });
        return;
      }

      await prisma.auditLog.create({ data: logData });
    } catch (error) {
      // Fallo silencioso del logger para no afectar la UX
      // En desarrollo mostramos el error
      if (process.env.NODE_ENV === "development") {
        console.error("[SecurityLogger] Error writing audit log:", error);
      }
    }
  }

  /**
   * Registra un intento de acceso denegado
   */
  static async logAccessDenied(permission: string, resource?: string): Promise<void> {
    await this.log({
      action: "ACCESS_DENIED",
      category: "SECURITY",
      description: `Acceso denegado: Se requería permiso '${permission}'`,
      entityId: permission,
      entityType: "PERMISSION",
      metadata: { resource },
    });
  }

  /**
   * Registra acceso a datos sensibles
   */
  static async logSensitiveAccess(dataType: string, resourceId: string, description: string): Promise<void> {
    if (!LOG_SENSITIVE_ACCESS) {
      return;
    }

    await this.log({
      action: "SENSITIVE_DATA_ACCESS",
      category: "SECURITY",
      description: `Acceso a datos sensibles: ${description}`,
      entityId: resourceId,
      entityType: dataType,
    });
  }
}

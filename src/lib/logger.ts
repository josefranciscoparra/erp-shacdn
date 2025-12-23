import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        // TODO: Manejar logs de sistema/login sin orgId si el schema lo permite (actualmente orgId es obligatorio)
        // Por ahora solo logueamos si hay usuario autenticado con organización
        return;
      }

      const headersList = await headers();
      const ipAddress = headersList.get("x-forwarded-for") ?? "unknown";
      const userAgent = headersList.get("user-agent") ?? "unknown";

      // Ejecutamos la escritura en background sin await explícito si se desea,
      // pero en server actions es mejor await para asegurar que se guarde antes de cerrar lambda/proceso
      await prisma.auditLog.create({
        data: {
          action: options.action,
          category: options.category,
          description: options.description,
          entityId: options.entityId ?? "N/A",
          entityType: options.entityType ?? "N/A",
          entityData: options.entityData ? JSON.stringify(options.entityData) : undefined,
          performedById: session.user.id || "system",
          performedByName: session.user.name || "Unknown",
          performedByEmail: session.user.email || "unknown@example.com",
          performedByRole: session.user.role || "UNKNOWN",
          orgId: orgId,
          ipAddress: ipAddress,
          userAgent: userAgent,
        },
      });
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
    await this.log({
      action: "SENSITIVE_DATA_ACCESS",
      category: "SECURITY",
      description: `Acceso a datos sensibles: ${description}`,
      entityId: resourceId,
      entityType: dataType,
    });
  }
}

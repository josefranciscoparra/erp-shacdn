import * as Sentry from "@sentry/nextjs";

import { auth } from "@/lib/auth";

/**
 * Wrapper para Server Actions que añade tracking de Sentry automáticamente
 *
 * Características:
 * - Captura errores automáticamente
 * - Añade contexto de usuario (userId, orgId, role)
 * - Crea spans para performance monitoring
 * - Añade breadcrumbs de operaciones
 * - Detecta operaciones lentas (> 5s)
 *
 * @example
 * export const myAction = withSentryServerAction(
 *   "myAction",
 *   "HR",
 *   async (data: FormData) => {
 *     // Tu lógica aquí
 *     return { success: true };
 *   }
 * );
 */
export function withSentryServerAction<T extends(...args: any[]) => Promise<any>>(
  actionName: string,
  module: string,
  action: T,
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // Obtener sesión del usuario para contexto
    const session = await auth();

    // Configurar contexto de Sentry con información del usuario
    Sentry.setContext("user", {
      id: session?.user?.id,
      email: session?.user?.email,
      role: session?.user?.role,
      orgId: session?.user?.orgId,
    });

    // Añadir tags para mejor organización en Sentry
    Sentry.setTags({
      action: actionName,
      module,
      authenticated: !!session?.user,
    });

    // Crear span para performance monitoring
    return await Sentry.startSpan(
      {
        name: `server_action.${module}.${actionName}`,
        op: "function.server_action",
        attributes: {
          "server_action.name": actionName,
          "server_action.module": module,
          "user.id": session?.user?.id ?? "anonymous",
          "user.org_id": session?.user?.orgId ?? "none",
        },
      },
      async () => {
        try {
          // Añadir breadcrumb del inicio de la operación
          Sentry.addBreadcrumb({
            category: "server_action",
            message: `Executing ${actionName}`,
            level: "info",
            data: {
              module,
              userId: session?.user?.id,
              orgId: session?.user?.orgId,
            },
          });

          const startTime = Date.now();

          // Ejecutar la acción original
          const result = await action(...args);

          const duration = Date.now() - startTime;

          // Detectar operaciones lentas (> 5 segundos)
          if (duration > 5000) {
            Sentry.captureMessage(`Slow server action: ${actionName}`, {
              level: "warning",
              tags: {
                action: actionName,
                module,
                duration_ms: duration,
              },
            });
          }

          // Breadcrumb de éxito
          Sentry.addBreadcrumb({
            category: "server_action",
            message: `Completed ${actionName}`,
            level: "info",
            data: {
              module,
              duration_ms: duration,
            },
          });

          return result;
        } catch (error) {
          // Capturar error en Sentry
          Sentry.captureException(error, {
            tags: {
              action: actionName,
              module,
            },
            contexts: {
              action: {
                name: actionName,
                module,
                args: sanitizeArgs(args),
              },
            },
          });

          // Re-lanzar el error para que la aplicación lo maneje
          throw error;
        }
      },
    );
  }) as T;
}

/**
 * Sanitiza los argumentos para eliminar información sensible antes de enviar a Sentry
 */
function sanitizeArgs(args: any[]): any[] {
  return args.map((arg) => {
    if (arg instanceof FormData) {
      return "[FormData]";
    }

    if (typeof arg === "object" && arg !== null) {
      const sanitized: Record<string, any> = {};

      for (const [key, value] of Object.entries(arg)) {
        const lowerKey = key.toLowerCase();

        // Eliminar campos sensibles
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("token") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("credential")
        ) {
          sanitized[key] = "[REDACTED]";
        } else if (typeof value === "string" && value.length > 1000) {
          // Truncar strings muy largos (ej: imágenes base64)
          sanitized[key] = `[TRUNCATED: ${value.length} chars]`;
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return arg;
  });
}

/**
 * Captura operaciones críticas del ERP en Sentry
 * Útil para operaciones que no son server actions pero queremos trackear
 */
export function trackCriticalOperation(operationName: string, module: string, metadata?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category: "critical_operation",
    message: operationName,
    level: "info",
    data: {
      module,
      ...metadata,
    },
  });
}

/**
 * Marca un usuario en Sentry para tracking de sesiones
 * Llamar esto después del login
 */
export function identifySentryUser(userId: string, email: string, role: string, orgId: string) {
  Sentry.setUser({
    id: userId,
    email,
    role,
    orgId,
  });
}

/**
 * Limpia el usuario de Sentry
 * Llamar esto en logout
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

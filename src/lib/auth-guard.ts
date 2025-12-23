/**
 * Guard Central de Autorización
 *
 * Centraliza toda la lógica de autorización basada en PERMISOS (no roles).
 * Preparado para soportar overrides por organización en el futuro.
 *
 * @see /docs/PLAN_ROLES_PERMISOS.md para documentación completa
 */

import { Role } from "@prisma/client";
import { type Session } from "next-auth";

import { auth } from "@/lib/auth";
import { SecurityLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  isValidPermission,
  Permission,
  ROLE_PERMISSIONS,
  SENSITIVE_PERMISSIONS,
} from "@/services/permissions/permissions";

// ============================================
// TIPOS
// ============================================

/**
 * Scope de recurso para autorización granular (fase futura)
 * Permitirá verificar permisos sobre recursos específicos
 */
export type ResourceScope = {
  type: "DEPARTMENT" | "COST_CENTER" | "TEAM";
  id: string;
};

/**
 * Opciones para autorización
 * @property resource - Recurso específico (fase futura con AreaResponsible)
 */
export type AuthorizeOptions = {
  resource?: ResourceScope;
};

/**
 * Origen del permiso concedido
 * - ROLE: Permiso viene del rol base
 * - ORG_OVERRIDE: Permiso viene de override de organización (futuro)
 * - USER_OVERRIDE: Permiso viene de override de usuario (futuro)
 */
export type AuthSource = "ROLE" | "ORG_OVERRIDE" | "USER_OVERRIDE";

/**
 * Tipo de sesión de la aplicación
 * Usa el tipo Session de next-auth que está extendido en src/lib/auth.ts
 */
export type AppSession = Session | null;

/**
 * Resultado de autorización exitosa
 */
export type AuthSuccess = {
  ok: true;
  session: Session;
  source: AuthSource;
};

/**
 * Resultado de autorización fallida
 */
export type AuthFailure = {
  ok: false;
  code: "UNAUTHORIZED" | "FORBIDDEN";
  error: string;
};

/**
 * Resultado de safePermission / safeAnyPermission
 */
export type SafePermissionResult = AuthSuccess | AuthFailure;

// ============================================
// ERROR TIPADO
// ============================================

// Mensaje genérico para todos los errores de permisos
// Evita confusión con mensajes específicos que pueden no coincidir con la acción del usuario
function getPermissionErrorMessage(_permission: Permission): string {
  return "No tienes permisos para realizar esta acción.";
}

/**
 * Error de autorización con código tipado
 */
export class AuthError extends Error {
  constructor(
    public code: "UNAUTHORIZED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ============================================
// FUNCIONES DE AUTORIZACIÓN
// ============================================

/**
 * Obtiene la sesión actual o lanza error si no está autenticado
 *
 * @throws {AuthError} UNAUTHORIZED si no hay sesión o no tiene orgId
 * @returns Sesión validada con user y orgId garantizados
 */
export async function getSessionOrThrow(): Promise<Session> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED", "Usuario no autenticado");
  }

  if (!session.user.orgId) {
    throw new AuthError("UNAUTHORIZED", "Usuario sin organización asignada");
  }

  return session;
}

/**
 * Obtiene los permisos base de un rol
 *
 * @param role - Rol del usuario
 * @returns Array de permisos del rol
 */
export function computeRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Calcula los permisos efectivos del usuario
 *
 * Fórmula: effectivePermissions = roleBase + orgGrants - orgRevokes
 *
 * @param params.role - Rol del usuario
 * @param params.orgId - ID de organización activa
 * @param params.userId - ID del usuario (reservado para v2: overrides por usuario)
 * @returns Set de permisos efectivos
 */
export async function computeEffectivePermissions({
  role,
  orgId,
  userId: _userId,
}: {
  role: Role;
  orgId: string;
  userId: string;
}): Promise<Set<Permission>> {
  const base = new Set(computeRolePermissions(role));

  // Cargar override para este rol en esta organización
  const override = await prisma.orgRolePermissionOverride.findUnique({
    where: {
      orgId_role: { orgId, role },
    },
    select: {
      grantPermissions: true,
      revokePermissions: true,
    },
  });

  if (override) {
    // Añadir permisos concedidos (validando con isValidPermission)
    override.grantPermissions.forEach((p) => {
      if (isValidPermission(p)) {
        base.add(p);
      }
    });

    // Eliminar permisos revocados
    override.revokePermissions.forEach((p) => {
      if (isValidPermission(p)) {
        base.delete(p);
      }
    });
  }

  return base;
}

/**
 * Requiere un permiso específico, lanza error si no lo tiene
 *
 * @param permission - Permiso requerido
 * @param options - Opciones de autorización (resource para fase futura)
 * @throws {AuthError} UNAUTHORIZED si no autenticado, FORBIDDEN si no tiene permiso
 * @returns Sesión y origen del permiso
 */
export async function requirePermission(
  permission: Permission,
  _options?: AuthorizeOptions,
): Promise<{ session: Session; source: AuthSource }> {
  const session = await getSessionOrThrow();
  const { role, orgId, id: userId } = session.user;

  // Obtener permisos base del rol (para detectar source)
  const basePermissions = new Set(computeRolePermissions(role as Role));

  // Obtener permisos efectivos (con overrides aplicados)
  const effective = await computeEffectivePermissions({
    role: role as Role,
    orgId,
    userId,
  });

  if (!effective.has(permission)) {
    // 🚨 AUDITORÍA: Registrar intento de acceso fallido
    await SecurityLogger.logAccessDenied(permission, _options?.resource?.type);

    throw new AuthError("FORBIDDEN", getPermissionErrorMessage(permission));
  }

  // 🚨 AUDITORÍA: Si es un permiso sensible, registrar el acceso exitoso
  if (SENSITIVE_PERMISSIONS.includes(permission)) {
    await SecurityLogger.logSensitiveAccess(
      "PERMISSION",
      permission,
      `Acceso autorizado a función protegida por '${permission}'`,
    );
  }

  // Detectar origen del permiso
  const source: AuthSource = basePermissions.has(permission) ? "ROLE" : "ORG_OVERRIDE";

  return { session, source };
}

/**
 * Verifica un permiso de forma segura (sin lanzar excepciones)
 *
 * Uso recomendado en server actions:
 * ```typescript
 * const authz = await safePermission("manage_trash");
 * if (!authz.ok) {
 *   return { success: false, error: authz.error };
 * }
 * const { session } = authz;
 * ```
 *
 * @param permission - Permiso a verificar
 * @param options - Opciones de autorización
 * @returns Resultado con ok:true/false y datos correspondientes
 */
export async function safePermission(
  permission: Permission,
  options?: AuthorizeOptions,
): Promise<SafePermissionResult> {
  try {
    const result = await requirePermission(permission, options);
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, code: err.code, error: err.message };
    }
    return { ok: false, code: "UNAUTHORIZED", error: "Error de autorización" };
  }
}

/**
 * Verifica si tiene AL MENOS UNO de los permisos especificados (OR)
 *
 * Útil para acciones que pueden ser realizadas por usuarios con diferentes permisos.
 * Ejemplo: ver papelera requiere manage_trash O restore_trash
 *
 * Uso:
 * ```typescript
 * const authz = await safeAnyPermission(["manage_trash", "restore_trash"]);
 * if (!authz.ok) {
 *   return { success: false, error: authz.error };
 * }
 * ```
 *
 * @param permissions - Array de permisos (se requiere al menos uno)
 * @param options - Opciones de autorización
 * @returns Resultado de la primera autorización exitosa, o el último error
 */
export async function safeAnyPermission(
  permissions: Permission[],
  options?: AuthorizeOptions,
): Promise<SafePermissionResult> {
  let unauthorizedError: SafePermissionResult | null = null;

  for (const permission of permissions) {
    const result = await safePermission(permission, options);
    if (result.ok) {
      return result;
    }
    if (result.code === "UNAUTHORIZED" && !unauthorizedError) {
      unauthorizedError = result;
    }
  }

  if (unauthorizedError) {
    return unauthorizedError;
  }

  // 🚨 AUDITORÍA: Registrar fallo de permisos múltiples
  await SecurityLogger.logAccessDenied(permissions.join(" OR "), options?.resource?.type);

  return {
    ok: false,
    code: "FORBIDDEN",
    error: "No tienes permisos suficientes para realizar esta acción.",
  };
}

/**
 * Verifica que el usuario tiene acceso a una organización específica
 *
 * SUPER_ADMIN puede acceder a cualquier organización.
 * Otros roles solo pueden acceder a su organización actual.
 *
 * @param requestedOrgId - ID de organización a la que se quiere acceder
 * @throws {AuthError} FORBIDDEN si no tiene acceso
 */
export async function assertOrgAccess(requestedOrgId: string): Promise<void> {
  const session = await getSessionOrThrow();
  const { orgId, role } = session.user;

  if (role !== "SUPER_ADMIN" && orgId !== requestedOrgId) {
    throw new AuthError("FORBIDDEN", "Acceso denegado a esta organización");
  }
}

/**
 * Verifica acceso a organización de forma segura (sin lanzar excepciones)
 *
 * @param requestedOrgId - ID de organización a verificar
 * @returns Resultado con ok:true/false
 */
export async function safeOrgAccess(requestedOrgId: string): Promise<SafePermissionResult> {
  try {
    await assertOrgAccess(requestedOrgId);
    const session = await getSessionOrThrow();
    return { ok: true, session, source: "ROLE" };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, code: err.code, error: err.message };
    }
    return { ok: false, code: "UNAUTHORIZED", error: "Error de autorización" };
  }
}

/**
 * Helper para extraer mensaje de error en server actions
 *
 * Uso en catch de server actions:
 * ```typescript
 * } catch (error) {
 *   return { success: false, error: getActionError(error, "Error al crear plantilla") };
 * }
 * ```
 *
 * @param error - Error capturado
 * @param fallbackMessage - Mensaje por defecto si no es error de autorización
 * @returns Mensaje de error apropiado
 */
export function getActionError(error: unknown, fallbackMessage: string): string {
  if (error instanceof AuthError) {
    return error.message;
  }
  console.error(fallbackMessage, error);
  return fallbackMessage;
}

/**
 * Verifica si un error es de autorización (para logging condicional)
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

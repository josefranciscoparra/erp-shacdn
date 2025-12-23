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

const DEFAULT_EFFECTIVE_PERMISSIONS_CACHE_MS = 10 * 1000;
const rawEffectivePermissionsCacheMs = process.env.EFFECTIVE_PERMISSIONS_CACHE_MS;
const parsedEffectivePermissionsCacheMs = rawEffectivePermissionsCacheMs
  ? Number(rawEffectivePermissionsCacheMs)
  : Number.NaN;
const EFFECTIVE_PERMISSIONS_CACHE_MS =
  Number.isFinite(parsedEffectivePermissionsCacheMs) && parsedEffectivePermissionsCacheMs >= 0
    ? parsedEffectivePermissionsCacheMs
    : DEFAULT_EFFECTIVE_PERMISSIONS_CACHE_MS;

const MAX_EFFECTIVE_PERMISSIONS_CACHE_ENTRIES = 500;

type EffectivePermissionsCacheEntry = {
  permissions: Permission[];
  expiresAt: number;
};

const effectivePermissionsCache = new Map<string, EffectivePermissionsCacheEntry>();

function getEffectivePermissionsCacheKey(role: Role, orgId: string, userId: string): string {
  return `${orgId}:${userId}:${role}`;
}

async function loadEffectivePermissions(role: Role, orgId: string): Promise<Permission[]> {
  const base = new Set(computeRolePermissions(role));

  // Cargar override para este rol en esta organizacion
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
    // Anadir permisos concedidos (validando con isValidPermission)
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

  return Array.from(base);
}

async function getCachedEffectivePermissions(role: Role, orgId: string, userId: string): Promise<Permission[]> {
  if (EFFECTIVE_PERMISSIONS_CACHE_MS === 0) {
    return await loadEffectivePermissions(role, orgId);
  }

  const now = Date.now();
  const key = getEffectivePermissionsCacheKey(role, orgId, userId);
  const cached = effectivePermissionsCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.permissions;
  }

  if (cached) {
    effectivePermissionsCache.delete(key);
  }

  const permissions = await loadEffectivePermissions(role, orgId);

  if (effectivePermissionsCache.size > MAX_EFFECTIVE_PERMISSIONS_CACHE_ENTRIES) {
    effectivePermissionsCache.clear();
  }

  effectivePermissionsCache.set(key, {
    permissions,
    expiresAt: now + EFFECTIVE_PERMISSIONS_CACHE_MS,
  });

  return permissions;
}

export function clearEffectivePermissionsCache(orgId?: string, userId?: string): void {
  if (!orgId && !userId) {
    effectivePermissionsCache.clear();
    return;
  }

  for (const key of effectivePermissionsCache.keys()) {
    const [keyOrgId, keyUserId] = key.split(":", 3);
    if (orgId && keyOrgId !== orgId) {
      continue;
    }
    if (userId && keyUserId !== userId) {
      continue;
    }
    effectivePermissionsCache.delete(key);
  }
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
  userId,
}: {
  role: Role;
  orgId: string;
  userId: string;
}): Promise<Set<Permission>> {
  const permissions = await getCachedEffectivePermissions(role, orgId, userId);
  return new Set(permissions);
}

/**
 * Verifica un permiso sin loguear (uso interno)
 * @internal
 */
async function checkPermissionInternal(
  permission: Permission,
  options?: { session?: Session },
): Promise<
  { ok: true; session: Session; source: AuthSource } | { ok: false; code: "UNAUTHORIZED" | "FORBIDDEN"; error: string }
> {
  try {
    const session = options?.session ?? (await getSessionOrThrow());
    const { role, orgId, id: userId } = session.user;

    const basePermissions = new Set(computeRolePermissions(role as Role));
    const effective = await computeEffectivePermissions({
      role: role as Role,
      orgId,
      userId,
    });

    if (!effective.has(permission)) {
      return { ok: false, code: "FORBIDDEN", error: getPermissionErrorMessage(permission) };
    }

    const source: AuthSource = basePermissions.has(permission) ? "ROLE" : "ORG_OVERRIDE";
    return { ok: true, session, source };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, code: err.code, error: err.message };
    }
    return { ok: false, code: "UNAUTHORIZED", error: "Error de autorización" };
  }
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
  const result = await checkPermissionInternal(permission);

  if (!result.ok) {
    // 🚨 AUDITORÍA: Registrar intento de acceso fallido
    await SecurityLogger.logAccessDenied(permission, _options?.resource?.type);
    throw new AuthError(result.code, result.error);
  }

  // 🚨 AUDITORÍA: Si es un permiso sensible, registrar el acceso exitoso
  if (SENSITIVE_PERMISSIONS.includes(permission)) {
    await SecurityLogger.logSensitiveAccess(
      "PERMISSION",
      permission,
      `Acceso autorizado a función protegida por '${permission}'`,
    );
  }

  return { session: result.session, source: result.source };
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
  try {
    const session = await getSessionOrThrow();
    const { role, orgId, id: userId } = session.user;

    const basePermissions = new Set(computeRolePermissions(role as Role));
    const effective = await computeEffectivePermissions({
      role: role as Role,
      orgId,
      userId,
    });

    for (const permission of permissions) {
      if (effective.has(permission)) {
        if (SENSITIVE_PERMISSIONS.includes(permission)) {
          await SecurityLogger.logSensitiveAccess(
            "PERMISSION",
            permission,
            `Acceso autorizado a función protegida por '${permission}'`,
          );
        }
        const source: AuthSource = basePermissions.has(permission) ? "ROLE" : "ORG_OVERRIDE";
        return { ok: true, session, source };
      }
    }

    await SecurityLogger.logAccessDenied(permissions.join(" OR "), options?.resource?.type);

    return {
      ok: false,
      code: "FORBIDDEN",
      error: "No tienes permisos suficientes para realizar esta acción.",
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, code: err.code, error: err.message };
    }
    return { ok: false, code: "UNAUTHORIZED", error: "Error de autorización" };
  }
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

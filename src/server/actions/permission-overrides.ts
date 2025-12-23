"use server";

/**
 * Server Actions para gestión de Overrides de Permisos por Organización (Enterprise v1)
 *
 * Control de acceso: requiere permiso `manage_permission_overrides`
 * (SUPER_ADMIN, ORG_ADMIN, HR_ADMIN por defecto)
 *
 * Fórmula: effectivePermissions = roleBase + grants - revokes
 */

import { revalidatePath } from "next/cache";

import { Role } from "@prisma/client";

import { AuthError, computeEffectivePermissions, getSessionOrThrow, requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { isValidPermission, Permission, ROLE_PERMISSIONS } from "@/services/permissions/permissions";

// ============================================
// TIPOS
// ============================================

export type OverrideData = {
  role: Role;
  grantPermissions: string[];
  revokePermissions: string[];
  basePermissions: string[];
  effectivePermissions: string[];
  hasOverride: boolean;
  updatedAt?: Date;
  updatedById?: string | null;
};

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

// ============================================
// CONTROL DE ACCESO (via permiso, no roles hardcoded)
// ============================================

async function assertCanManageOverrides(): Promise<{ orgId: string; userId: string }> {
  // Usa el sistema de permisos propio
  const { session } = await requirePermission("manage_permission_overrides");
  return { orgId: session.user.orgId, userId: session.user.id };
}

// ============================================
// HELPERS
// ============================================

/**
 * Calcula permisos efectivos: base + grants - revokes
 */
function calculateEffectivePermissions(
  basePermissions: Permission[],
  grants: string[],
  revokes: string[],
): Permission[] {
  const effective = new Set<Permission>(basePermissions);

  grants.forEach((p) => {
    if (isValidPermission(p)) effective.add(p);
  });

  revokes.forEach((p) => {
    if (isValidPermission(p)) effective.delete(p);
  });

  return Array.from(effective).sort();
}

/**
 * Normaliza arrays: valida, elimina duplicados, ordena
 */
function normalizePermissions(permissions: string[]): Permission[] {
  return [...new Set(permissions)].filter(isValidPermission).sort();
}

// ============================================
// ACCIONES
// ============================================

/**
 * Obtiene todos los overrides de la organización actual
 * Incluye datos para cada rol (incluso sin override)
 */
export async function getOrgRoleOverrides(): Promise<ActionResult<OverrideData[]>> {
  try {
    const { orgId } = await assertCanManageOverrides();

    const overrides = await prisma.orgRolePermissionOverride.findMany({
      where: { orgId },
    });

    // Roles editables (excluye SUPER_ADMIN)
    const editableRoles: Role[] = ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"];

    const result: OverrideData[] = editableRoles.map((role) => {
      const override = overrides.find((o) => o.role === role);
      const basePermissions = ROLE_PERMISSIONS[role];
      const grants = override?.grantPermissions ?? [];
      const revokes = override?.revokePermissions ?? [];

      return {
        role,
        grantPermissions: grants,
        revokePermissions: revokes,
        basePermissions,
        effectivePermissions: calculateEffectivePermissions(basePermissions, grants, revokes),
        hasOverride: override !== undefined && (grants.length > 0 || revokes.length > 0),
        updatedAt: override?.updatedAt,
        updatedById: override?.updatedById,
      };
    });

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    console.error("Error obteniendo overrides:", err);
    return { success: false, error: "Error interno" };
  }
}

/**
 * Obtiene el override de un rol específico
 */
export async function getOrgRoleOverride(role: Role): Promise<ActionResult<OverrideData>> {
  try {
    const { orgId } = await assertCanManageOverrides();

    // No permitir consultar SUPER_ADMIN
    if (role === "SUPER_ADMIN") {
      return { success: false, error: "No se puede consultar el rol SUPER_ADMIN" };
    }

    const override = await prisma.orgRolePermissionOverride.findUnique({
      where: { orgId_role: { orgId, role } },
    });

    const basePermissions = ROLE_PERMISSIONS[role];
    const grants = override?.grantPermissions ?? [];
    const revokes = override?.revokePermissions ?? [];

    return {
      success: true,
      data: {
        role,
        grantPermissions: grants,
        revokePermissions: revokes,
        basePermissions,
        effectivePermissions: calculateEffectivePermissions(basePermissions, grants, revokes),
        hasOverride: override !== undefined && (grants.length > 0 || revokes.length > 0),
        updatedAt: override?.updatedAt,
        updatedById: override?.updatedById,
      },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Error interno" };
  }
}

/**
 * Guarda o actualiza el override de un rol
 */
export async function upsertOrgRoleOverride(
  role: Role,
  grantPermissions: string[],
  revokePermissions: string[],
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await assertCanManageOverrides();

    // Validación: no permitir modificar SUPER_ADMIN
    if (role === "SUPER_ADMIN") {
      return { success: false, error: "No se puede modificar el rol SUPER_ADMIN" };
    }

    // Normalizar arrays: validar, eliminar duplicados, ordenar
    const normalizedGrants = normalizePermissions(grantPermissions);
    const normalizedRevokes = normalizePermissions(revokePermissions);

    // Validación: no permitir mismo permiso en grants y revokes
    const overlap = normalizedGrants.filter((p) => normalizedRevokes.includes(p));
    if (overlap.length > 0) {
      return {
        success: false,
        error: `Permiso(s) en conflicto (no pueden estar en grants y revokes a la vez): ${overlap.join(", ")}`,
      };
    }

    // Si ambos arrays están vacíos, eliminar el override
    if (normalizedGrants.length === 0 && normalizedRevokes.length === 0) {
      await prisma.orgRolePermissionOverride
        .delete({
          where: { orgId_role: { orgId, role } },
        })
        .catch(() => {
          // Ignorar si no existe
        });
    } else {
      await prisma.orgRolePermissionOverride.upsert({
        where: { orgId_role: { orgId, role } },
        create: {
          orgId,
          role,
          grantPermissions: normalizedGrants,
          revokePermissions: normalizedRevokes,
          createdById: userId,
          updatedById: userId,
        },
        update: {
          grantPermissions: normalizedGrants,
          revokePermissions: normalizedRevokes,
          updatedById: userId,
        },
      });
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    console.error("Error guardando override:", err);
    return { success: false, error: "Error al guardar" };
  }
}

/**
 * Elimina el override de un rol (vuelve a permisos base)
 */
export async function resetOrgRoleOverride(role: Role): Promise<ActionResult> {
  try {
    const { orgId } = await assertCanManageOverrides();

    // Validación: no permitir modificar SUPER_ADMIN
    if (role === "SUPER_ADMIN") {
      return { success: false, error: "No se puede modificar el rol SUPER_ADMIN" };
    }

    await prisma.orgRolePermissionOverride
      .delete({
        where: { orgId_role: { orgId, role } },
      })
      .catch(() => {
        // Ignorar si no existe
      });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Error al restablecer" };
  }
}

// ============================================
// PERMISOS EFECTIVOS DEL USUARIO ACTUAL
// ============================================

/**
 * Obtiene los permisos efectivos del usuario actual (con overrides aplicados)
 * Cualquier usuario autenticado puede llamar esta función para conocer sus permisos
 */
export async function getMyEffectivePermissions(): Promise<ActionResult<Permission[]>> {
  try {
    const session = await getSessionOrThrow();
    const { role, orgId, id: userId } = session.user;

    const effectivePermissions = await computeEffectivePermissions({
      role: role as Role,
      orgId,
      userId,
    });

    return {
      success: true,
      data: Array.from(effectivePermissions).sort(),
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Error al obtener permisos" };
  }
}

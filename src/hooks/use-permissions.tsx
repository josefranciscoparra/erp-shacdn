"use client";

import { useCallback, useEffect, useState } from "react";

import { Role } from "@prisma/client";
import { useSession } from "next-auth/react";

import { getMyEffectivePermissions } from "@/server/actions/permission-overrides";
import { canAccessPage, type Permission } from "@/services/permissions";

/**
 * Hook para verificar permisos del usuario actual
 *
 * IMPORTANTE: Este hook carga los permisos EFECTIVOS desde el servidor,
 * incluyendo los overrides configurados por organización.
 *
 * Fórmula: effectivePermissions = roleBase + grants - revokes
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  const userRole = session?.user.role as Role | undefined;

  // Estado para permisos efectivos (cargados del servidor)
  const [effectivePermissions, setEffectivePermissions] = useState<Set<Permission>>(new Set());
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  // Cargar permisos efectivos cuando hay sesión
  useEffect(() => {
    async function loadPermissions() {
      if (status === "loading") return;

      if (!session?.user?.id) {
        setEffectivePermissions(new Set());
        setIsLoadingPermissions(false);
        return;
      }

      try {
        const result = await getMyEffectivePermissions();
        if (result.success && result.data) {
          setEffectivePermissions(new Set(result.data));
        }
      } catch {
        console.error("Error cargando permisos efectivos");
      } finally {
        setIsLoadingPermissions(false);
      }
    }

    loadPermissions();
  }, [session?.user?.id, session?.user?.orgId, status]);

  const hasPermission = useCallback(
    (permission: Permission) => {
      // Caso especial: has_employee_profile se verifica por sesión
      if (permission === "has_employee_profile") {
        return !!session?.user.employeeId;
      }

      // Si aún está cargando, denegar por defecto (seguridad)
      if (isLoadingPermissions) return false;

      // Verificar en permisos efectivos (incluye overrides)
      return effectivePermissions.has(permission);
    },
    [session?.user.employeeId, effectivePermissions, isLoadingPermissions],
  );

  const hasAllPermissions = useCallback(
    (permissions: Permission[]) => {
      if (isLoadingPermissions) return false;
      return permissions.every((p) => effectivePermissions.has(p));
    },
    [effectivePermissions, isLoadingPermissions],
  );

  const hasAnyPermission = useCallback(
    (permissions: Permission[]) => {
      if (isLoadingPermissions) return false;
      return permissions.some((p) => effectivePermissions.has(p));
    },
    [effectivePermissions, isLoadingPermissions],
  );

  // canAccessPage todavía usa el rol base (para navegación inicial)
  const canAccessPageFn = useCallback(
    (page: string) => {
      if (!userRole) return false;
      return canAccessPage(userRole, page);
    },
    [userRole],
  );

  const hasEmployeeProfile = useCallback(() => {
    return !!session?.user.employeeId;
  }, [session?.user.employeeId]);

  // Función para recargar permisos (útil después de cambios en overrides)
  const refreshPermissions = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoadingPermissions(true);
    try {
      const result = await getMyEffectivePermissions();
      if (result.success && result.data) {
        setEffectivePermissions(new Set(result.data));
      }
    } catch {
      console.error("Error recargando permisos");
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [session?.user?.id]);

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canAccessPage: canAccessPageFn,
    hasEmployeeProfile,
    refreshPermissions,
    userRole,
    isAuthenticated: !!session,
    isLoadingPermissions,
    // Exponer permisos efectivos para debug/inspección
    effectivePermissions: Array.from(effectivePermissions),
  };
}

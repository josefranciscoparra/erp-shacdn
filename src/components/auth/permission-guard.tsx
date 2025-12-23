"use client";

import { ReactNode } from "react";

import { Loader2 } from "lucide-react";

import { usePermissions } from "@/hooks/use-permissions";
import { type Permission } from "@/services/permissions";

interface PermissionGuardProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  mode?: "any" | "all";
  fallback?: ReactNode;
  /** Mostrar loader mientras se cargan permisos (default: true) */
  showLoader?: boolean;
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  mode = "any",
  fallback = null,
  showLoader = true,
}: PermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions, isAuthenticated, isLoadingPermissions } = usePermissions();

  if (!isAuthenticated) {
    return fallback;
  }

  // Mientras se cargan los permisos, mostrar loader para evitar flicker
  if (isLoadingPermissions) {
    if (showLoader) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      );
    }
    return null;
  }

  const permissionsToCheck = permission ? [permission] : (permissions ?? []);
  const hasAccess = mode === "all" ? hasAllPermissions(permissionsToCheck) : hasAnyPermission(permissionsToCheck);

  if (!hasAccess) {
    return fallback;
  }

  return <>{children}</>;
}

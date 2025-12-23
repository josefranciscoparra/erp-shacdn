"use client";

import { ReactNode } from "react";

import { Loader2 } from "lucide-react";

import { usePermissions } from "@/hooks/use-permissions";
import { type Permission } from "@/services/permissions";

interface PermissionGuardProps {
  children: ReactNode;
  permission: Permission;
  fallback?: ReactNode;
  /** Mostrar loader mientras se cargan permisos (default: true) */
  showLoader?: boolean;
}

export function PermissionGuard({ children, permission, fallback = null, showLoader = true }: PermissionGuardProps) {
  const { hasPermission, isAuthenticated, isLoadingPermissions } = usePermissions();

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

  if (!hasPermission(permission)) {
    return fallback;
  }

  return <>{children}</>;
}

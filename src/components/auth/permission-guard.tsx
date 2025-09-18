"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { type Permission } from "@/lib/permissions";

interface PermissionGuardProps {
  children: ReactNode;
  permission: Permission;
  fallback?: ReactNode;
}

export function PermissionGuard({ children, permission, fallback = null }: PermissionGuardProps) {
  const { hasPermission, isAuthenticated } = usePermissions();

  if (!isAuthenticated) {
    return fallback;
  }

  if (!hasPermission(permission)) {
    return fallback;
  }

  return <>{children}</>;
}

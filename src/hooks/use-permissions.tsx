"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { hasPermission, hasAllPermissions, hasAnyPermission, canAccessPage, type Permission } from "@/lib/permissions";

export function usePermissions() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as Role | undefined;

  return {
    hasPermission: (permission: Permission) => {
      if (!userRole) return false;
      return hasPermission(userRole, permission);
    },
    hasAllPermissions: (permissions: Permission[]) => {
      if (!userRole) return false;
      return hasAllPermissions(userRole, permissions);
    },
    hasAnyPermission: (permissions: Permission[]) => {
      if (!userRole) return false;
      return hasAnyPermission(userRole, permissions);
    },
    canAccessPage: (page: string) => {
      if (!userRole) return false;
      return canAccessPage(userRole, page);
    },
    userRole,
    isAuthenticated: !!session,
  };
}

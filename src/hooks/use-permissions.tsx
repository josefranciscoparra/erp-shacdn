"use client";

import { Role } from "@prisma/client";
import { useSession } from "next-auth/react";

import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  canAccessPage,
  type Permission,
} from "@/services/permissions";

export function usePermissions() {
  const { data: session } = useSession();
  const userRole = session?.user.role as Role | undefined;

  return {
    hasPermission: (permission: Permission) => {
      if (permission === "has_employee_profile") {
        return !!session?.user.employeeId;
      }
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
    hasEmployeeProfile: () => {
      return !!session?.user.employeeId;
    },
    userRole,
    isAuthenticated: !!session,
  };
}

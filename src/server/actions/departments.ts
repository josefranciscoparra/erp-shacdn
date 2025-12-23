"use server";

import { getActionError, safeAnyPermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getScopeFilter, getUserScope } from "@/services/scopes";

export type DepartmentListItem = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  costCenterId: string | null;
  costCenter?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  _count: {
    employmentContracts: number;
  };
};

export async function getDepartments(): Promise<{
  success: boolean;
  departments?: DepartmentListItem[];
  error?: string;
}> {
  try {
    // Permisivo: cualquier rol de gestión puede ver departamentos
    const authResult = await safeAnyPermission(["view_departments", "manage_organization", "view_time_tracking"]);
    if (!authResult.ok) {
      return { success: false, error: authResult.error };
    }
    const { session } = authResult;

    // Obtener alcance de visibilidad del usuario
    const userScope = await getUserScope(session.user.id, session.user.orgId);

    // Generar filtro de seguridad (solo ve departamentos asignados o de sus centros asignados)
    const scopeFilter = getScopeFilter(userScope, {
      department: "id", // El campo en Department es 'id'
      costCenter: "costCenterId", // El campo en Department es 'costCenterId'
    });

    const departments = await prisma.department.findMany({
      where: {
        orgId: session.user.orgId,
        active: true,
        ...scopeFilter,
      },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        costCenterId: true,
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            employmentContracts: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, departments };
  } catch (error) {
    return { success: false, error: getActionError(error, "Error al cargar departamentos") };
  }
}

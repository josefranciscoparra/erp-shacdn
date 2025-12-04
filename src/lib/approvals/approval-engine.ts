import { TimeBankApprovalFlow } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { Permission } from "@/services/permissions";

/**
 * Tipos de solicitud que requieren aprobación
 */
export type ApprovalRequestType =
  | "PTO" // Vacaciones y ausencias
  | "MANUAL_TIME_ENTRY" // Fichajes manuales
  | "EXPENSE"; // Gastos

/**
 * Datos mínimos de un aprobador autorizado
 */
export type AuthorizedApprover = {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  source: "DIRECT_MANAGER" | "TEAM_LEAD" | "DEPARTMENT_MANAGER" | "COST_CENTER_MANAGER" | "HR_ADMIN" | "ORG_ADMIN";
  level: number; // 1=Directo, 2=Equipo, 3=Depto, 4=Centro, 5=HR/Admin
};

async function getOrgApprovalFlow(orgId: string): Promise<TimeBankApprovalFlow> {
  const settings = await prisma.timeBankSettings.findUnique({
    where: { orgId },
    select: { approvalFlow: true },
  });

  return settings?.approvalFlow ?? "MIRROR_PTO";
}

async function getHrApprovers(orgId: string): Promise<AuthorizedApprover[]> {
  const hrUsers = await prisma.user.findMany({
    where: {
      orgId,
      active: true,
      role: { in: ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return hrUsers.map((user) => ({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    source: user.role === "HR_ADMIN" ? "HR_ADMIN" : "ORG_ADMIN",
    level: 5,
  }));
}

/**
 * Devuelve la lista de aprobadores según el flujo configurado para la organización.
 * - MIRROR_PTO: jerarquía (manager > equipo > centro > HR/Admin)
 * - HR_ONLY: siempre HR/Admin (ignora jerarquía)
 */
export async function resolveApproverUsers(employeeId: string, orgId: string): Promise<AuthorizedApprover[]> {
  const flow = await getOrgApprovalFlow(orgId);

  if (flow === "HR_ONLY") {
    const hrOnly = await getHrApprovers(orgId);
    if (hrOnly.length > 0) {
      return hrOnly;
    }
  }

  const approvers = await getAuthorizedApprovers(employeeId, "PTO");
  if (approvers.length > 0) {
    return approvers;
  }

  const fallback = await getHrApprovers(orgId);
  return fallback;
}

/**
 * Mapeo de tipos de solicitud a permisos requeridos
 */
export const APPROVAL_PERMISSIONS: Record<ApprovalRequestType, Permission> = {
  PTO: "APPROVE_PTO_REQUESTS",
  MANUAL_TIME_ENTRY: "MANAGE_TIME_ENTRIES",
  EXPENSE: "MANAGE_EMPLOYEES", // Temporal, debería ser APPROVE_EXPENSES si existiera
};

/**
 * Obtiene los aprobadores autorizados para un empleado y tipo de solicitud específicos.
 * Sigue la jerarquía: Contrato -> Equipo -> Depto -> Centro -> Admin
 *
 * @param employeeId ID del empleado que hace la solicitud
 * @param requestType Tipo de solicitud (PTO, Gasto, etc.)
 * @returns Lista de aprobadores autorizados ordenados por cercanía (nivel 1 primero)
 */
export async function getAuthorizedApprovers(
  employeeId: string,
  requestType: ApprovalRequestType,
): Promise<AuthorizedApprover[]> {
  // 1. Obtener datos completos del empleado y su contrato activo
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }, // Incluimos user solo si existe
      team: true,
      employmentContracts: {
        where: { active: true },
        include: {
          manager: {
            include: { user: true },
          },
          department: true,
          costCenter: true,
        },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  const orgId = employee.orgId; // Usamos orgId del empleado, que es obligatorio
  const contract = employee.employmentContracts[0];
  const approvers: AuthorizedApprover[] = [];
  const addedUserIds = new Set<string>();

  const requiredPermission = APPROVAL_PERMISSIONS[requestType];

  // Helper para añadir aprobador si no existe ya
  const addApprover = (
    user: { id: string; name: string | null; email: string; role: string },
    source: AuthorizedApprover["source"],
    level: number,
  ) => {
    if (!addedUserIds.has(user.id)) {
      approvers.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        source,
        level,
      });
      addedUserIds.add(user.id);
    }
  };

  // ========================================================================
  // NIVEL 1: RESPONSABLE DIRECTO (Por Contrato)
  // ========================================================================
  // Si el contrato tiene un manager asignado explícitamente, es el primer aprobador.
  if (contract?.manager?.user) {
    addApprover(contract.manager.user, "DIRECT_MANAGER", 1);
  }

  // ========================================================================
  // NIVEL 2: RESPONSABLE DE EQUIPO (Team Lead)
  // ========================================================================
  // Si el empleado pertenece a un equipo, buscamos los responsables de ese equipo
  // que tengan el permiso requerido.
  if (employee.teamId) {
    const teamResponsibles = await prisma.areaResponsible.findMany({
      where: {
        orgId,
        scope: "TEAM",
        teamId: employee.teamId,
        isActive: true,
        permissions: { has: requiredPermission },
      },
      include: { user: true },
    });

    for (const resp of teamResponsibles) {
      addApprover(resp.user, "TEAM_LEAD", 2);
    }
  }

  // ========================================================================
  // NIVEL 3: RESPONSABLE DE DEPARTAMENTO
  // ========================================================================
  // Si el contrato tiene departamento, buscamos responsables de ese departamento.
  if (contract?.departmentId) {
    const deptResponsibles = await prisma.areaResponsible.findMany({
      where: {
        orgId,
        scope: "DEPARTMENT",
        departmentId: contract.departmentId,
        isActive: true,
        permissions: { has: requiredPermission },
      },
      include: { user: true },
    });

    for (const resp of deptResponsibles) {
      addApprover(resp.user, "DEPARTMENT_MANAGER", 3);
    }
  }

  // ========================================================================
  // NIVEL 4: RESPONSABLE DE CENTRO DE COSTE
  // ========================================================================
  // Si el contrato tiene centro de coste, buscamos responsables de ese centro.
  // NOTA: Team y Dept suelen estar en el mismo centro, pero validamos por si acaso.
  if (contract?.costCenterId) {
    const centerResponsibles = await prisma.areaResponsible.findMany({
      where: {
        orgId,
        scope: "COST_CENTER",
        costCenterId: contract.costCenterId,
        isActive: true,
        permissions: { has: requiredPermission },
      },
      include: { user: true },
    });

    for (const resp of centerResponsibles) {
      addApprover(resp.user, "COST_CENTER_MANAGER", 4);
    }
  }

  // ========================================================================
  // NIVEL 5: ADMINS y RRHH (Fallback Global)
  // ========================================================================
  // Si no se ha encontrado ningún aprobador en la jerarquía (o como red de seguridad),
  // añadimos a los administradores y RRHH de la organización.
  // OJO: Normalmente solo se añaden si la lista está vacía, pero en algunos sistemas
  // siempre pueden aprobar. Aquí aplicamos: "Si lista vacía -> Fallback".
  if (approvers.length === 0) {
    const admins = await prisma.user.findMany({
      where: {
        orgId,
        active: true,
        role: { in: ["ORG_ADMIN", "SUPER_ADMIN", "HR_ADMIN"] },
      },
    });

    for (const admin of admins) {
      const source = admin.role === "HR_ADMIN" ? "HR_ADMIN" : "ORG_ADMIN";
      addApprover(admin, source, 5);
    }
  }

  return approvers.sort((a, b) => a.level - b.level);
}

/**
 * Verifica si un usuario específico puede aprobar una solicitud de un empleado.
 */
export async function canUserApprove(
  approverUserId: string,
  employeeId: string,
  requestType: ApprovalRequestType,
): Promise<boolean> {
  // 1. Shortcut: Admins siempre pueden
  const approver = await prisma.user.findUnique({
    where: { id: approverUserId },
    select: { role: true },
  });

  if (approver?.role === "ORG_ADMIN" || approver?.role === "SUPER_ADMIN" || approver?.role === "HR_ADMIN") {
    return true;
  }

  // 2. Verificar jerarquía
  const authorizedApprovers = await getAuthorizedApprovers(employeeId, requestType);
  return authorizedApprovers.some((a) => a.userId === approverUserId);
}

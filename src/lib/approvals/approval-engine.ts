import { prisma } from "@/lib/prisma";
import { type Permission as ScopePermission } from "@/services/permissions/scope-helpers";

import {
  type ApprovalRequestType,
  type ApprovalCriterion,
  DEFAULT_APPROVAL_SETTINGS,
  normalizeApprovalSettings,
} from "./approval-settings";

/**
 * Datos mínimos de un aprobador autorizado
 */
export type AuthorizedApprover = {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  source:
    | "DIRECT_MANAGER"
    | "TEAM_RESPONSIBLE"
    | "DEPARTMENT_RESPONSIBLE"
    | "COST_CENTER_RESPONSIBLE"
    | "APPROVER_LIST"
    | "GROUP_HR"
    | "HR_ADMIN"
    | "ORG_ADMIN";
  level: number;
};

type EmployeeApprovalContext = {
  orgId: string;
  teamId: string | null;
  contract: {
    managerUser?: {
      id: string;
      name: string | null;
      email: string;
      role: string;
      active: boolean;
    } | null;
    departmentId?: string | null;
    costCenterId?: string | null;
  } | null;
};

/**
 * Mapeo de tipos de solicitud a permisos requeridos en responsables de area.
 */
export const APPROVAL_PERMISSIONS: Record<ApprovalRequestType, ScopePermission> = {
  PTO: "APPROVE_PTO_REQUESTS",
  MANUAL_TIME_ENTRY: "MANAGE_TIME_ENTRIES",
  TIME_BANK: "APPROVE_PTO_REQUESTS",
  EXPENSE: "APPROVE_EXPENSES",
};

const HR_APPROVER_ROLES = ["HR_ADMIN", "HR_ASSISTANT"] as const;

const mergeApprovers = (primary: AuthorizedApprover[], secondary: AuthorizedApprover[]) => {
  const unique = new Map<string, AuthorizedApprover>();
  primary.forEach((approver) => unique.set(approver.userId, approver));
  secondary.forEach((approver) => {
    if (!unique.has(approver.userId)) {
      unique.set(approver.userId, approver);
    }
  });
  return Array.from(unique.values());
};

async function getGroupHrApprovalsEnabled(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { groupHrApprovalsEnabled: true },
  });

  if (!org) {
    return true;
  }

  return org.groupHrApprovalsEnabled;
}

async function getApprovalSettingsForOrg(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { approvalSettings: true },
  });

  return normalizeApprovalSettings(org?.approvalSettings ?? DEFAULT_APPROVAL_SETTINGS);
}

async function getEmployeeApprovalContext(employeeId: string): Promise<EmployeeApprovalContext> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      orgId: true,
      teamId: true,
      employmentContracts: {
        where: { active: true },
        take: 1,
        orderBy: { startDate: "desc" },
        select: {
          manager: {
            select: {
              user: {
                select: { id: true, name: true, email: true, role: true, active: true },
              },
            },
          },
          departmentId: true,
          costCenterId: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  const contract = employee.employmentContracts[0];
  const managerUser = contract?.manager?.user ?? null;

  return {
    orgId: employee.orgId,
    teamId: employee.teamId ?? null,
    contract: contract
      ? {
          managerUser: managerUser ?? null,
          departmentId: contract.departmentId,
          costCenterId: contract.costCenterId,
        }
      : null,
  };
}

async function getRoleApprovers(orgId: string, roles: Array<"HR_ADMIN" | "HR_ASSISTANT" | "ORG_ADMIN">) {
  const source = roles.some((role) => role === "HR_ADMIN" || role === "HR_ASSISTANT") ? "HR_ADMIN" : "ORG_ADMIN";

  const memberships = await prisma.userOrganization.findMany({
    where: {
      orgId,
      isActive: true,
      role: { in: roles },
      user: { active: true, role: { not: "SUPER_ADMIN" } },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const approversFromMembership = memberships
    .filter((membership) => membership.user)
    .map((membership) => ({
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      source,
      level: 5,
    }));

  const legacyUsers = await prisma.user.findMany({
    where: {
      orgId,
      active: true,
      role: { in: roles },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  const approversFromLegacy = legacyUsers.map((user) => ({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    source,
    level: 5,
  }));

  return mergeApprovers(approversFromMembership, approversFromLegacy);
}

async function getLocalHrApprovers(orgId: string): Promise<AuthorizedApprover[]> {
  return await getRoleApprovers(orgId, Array.from(HR_APPROVER_ROLES));
}

async function getGroupHrApprovers(orgId: string): Promise<AuthorizedApprover[]> {
  const isEnabled = await getGroupHrApprovalsEnabled(orgId);
  if (!isEnabled) {
    return [];
  }

  const groupMemberships = await prisma.organizationGroupOrganization.findMany({
    where: {
      organizationId: orgId,
      status: "ACTIVE",
      group: { isActive: true },
    },
    select: { groupId: true },
  });

  if (groupMemberships.length === 0) {
    return [];
  }

  const groupIds = groupMemberships.map((membership) => membership.groupId);

  const memberships = await prisma.userOrganization.findMany({
    where: {
      orgId,
      isActive: true,
      role: { in: HR_APPROVER_ROLES },
      user: {
        active: true,
        role: { not: "SUPER_ADMIN" },
        orgId: { not: orgId },
        organizationGroupMemberships: {
          some: {
            groupId: { in: groupIds },
            isActive: true,
            role: { in: HR_APPROVER_ROLES },
          },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return memberships
    .filter((membership) => membership.user)
    .map((membership) => ({
      userId: membership.user!.id,
      name: membership.user!.name,
      email: membership.user!.email,
      role: membership.role,
      source: "GROUP_HR",
      level: 5,
    }));
}

async function getFallbackApprovers(orgId: string): Promise<AuthorizedApprover[]> {
  const localHr = await getLocalHrApprovers(orgId);
  if (localHr.length > 0) {
    return localHr;
  }

  const groupHr = await getGroupHrApprovers(orgId);
  if (groupHr.length > 0) {
    return groupHr;
  }

  return await getRoleApprovers(orgId, ["ORG_ADMIN"]);
}

async function getListApprovers(orgId: string, approverList: string[]): Promise<AuthorizedApprover[]> {
  if (approverList.length === 0) {
    return [];
  }

  const memberships = await prisma.userOrganization.findMany({
    where: {
      orgId,
      isActive: true,
      userId: { in: approverList },
      user: {
        active: true,
        role: { not: "SUPER_ADMIN" },
      },
    },
    select: {
      role: true,
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  const membershipMap = new Map(
    memberships
      .filter((membership) => membership.user)
      .map((membership) => [
        membership.user.id,
        {
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          role: membership.role,
        },
      ]),
  );

  const missingUserIds = approverList.filter((id) => !membershipMap.has(id));
  const legacyUsers =
    missingUserIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: missingUserIds },
            orgId,
            active: true,
            role: { not: "SUPER_ADMIN" },
          },
          select: { id: true, name: true, email: true, role: true },
        })
      : [];

  legacyUsers.forEach((user) => {
    membershipMap.set(user.id, user);
  });

  const ordered = approverList
    .map((id) => membershipMap.get(id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user));

  return ordered.map((user) => ({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    source: "APPROVER_LIST",
    level: 1,
  }));
}

async function hasActiveOrgMembership(userId: string, orgId: string): Promise<boolean> {
  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId,
      orgId,
      isActive: true,
      user: { active: true, role: { not: "SUPER_ADMIN" } },
    },
    select: { id: true },
  });

  if (membership) {
    return true;
  }

  const legacyUser = await prisma.user.findFirst({
    where: {
      id: userId,
      orgId,
      active: true,
      role: { not: "SUPER_ADMIN" },
    },
    select: { id: true },
  });

  return !!legacyUser;
}

async function hasLocalHrMembership(userId: string, orgId: string): Promise<boolean> {
  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId,
      orgId,
      isActive: true,
      role: { in: HR_APPROVER_ROLES },
      user: { active: true, role: { not: "SUPER_ADMIN" } },
    },
    select: { id: true },
  });

  if (membership) {
    return true;
  }

  const legacyUser = await prisma.user.findFirst({
    where: {
      id: userId,
      orgId,
      active: true,
      role: { in: HR_APPROVER_ROLES },
    },
    select: { id: true },
  });

  return !!legacyUser;
}

async function hasGroupHrMembership(userId: string, orgId: string): Promise<boolean> {
  const isEnabled = await getGroupHrApprovalsEnabled(orgId);
  if (!isEnabled) {
    return false;
  }

  const groupMemberships = await prisma.organizationGroupOrganization.findMany({
    where: {
      organizationId: orgId,
      status: "ACTIVE",
      group: { isActive: true },
    },
    select: { groupId: true },
  });

  if (groupMemberships.length === 0) {
    return false;
  }

  const groupIds = groupMemberships.map((membership) => membership.groupId);

  const membership = await prisma.organizationGroupUser.findFirst({
    where: {
      userId,
      isActive: true,
      role: { in: HR_APPROVER_ROLES },
      groupId: { in: groupIds },
      user: { active: true, role: { not: "SUPER_ADMIN" } },
    },
    select: { id: true },
  });

  return !!membership;
}

export async function hasHrApprovalAccess(userId: string, orgId: string): Promise<boolean> {
  const hasLocalHr = await hasLocalHrMembership(userId, orgId);
  if (hasLocalHr) {
    return true;
  }

  const hasMembership = await hasActiveOrgMembership(userId, orgId);
  if (!hasMembership) {
    return false;
  }

  return await hasGroupHrMembership(userId, orgId);
}

async function getResponsibleApprovers(
  orgId: string,
  scope: "TEAM" | "DEPARTMENT" | "COST_CENTER",
  scopeId: string | null,
  permission: ScopePermission,
  source: AuthorizedApprover["source"],
): Promise<AuthorizedApprover[]> {
  if (!scopeId) {
    return [];
  }

  const responsibles = await prisma.areaResponsible.findMany({
    where: {
      orgId,
      scope,
      isActive: true,
      permissions: { has: permission },
      ...(scope === "TEAM" ? { teamId: scopeId } : {}),
      ...(scope === "DEPARTMENT" ? { departmentId: scopeId } : {}),
      ...(scope === "COST_CENTER" ? { costCenterId: scopeId } : {}),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, active: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return responsibles
    .filter((responsible) => responsible.user?.active)
    .map((responsible) => ({
      userId: responsible.userId,
      name: responsible.user?.name ?? null,
      email: responsible.user?.email ?? "",
      role: responsible.user?.role ?? "EMPLOYEE",
      source,
      level: 1,
    }));
}

async function resolveCandidatesByCriterion(
  context: EmployeeApprovalContext,
  criterion: ApprovalCriterion,
  permission: ScopePermission,
): Promise<AuthorizedApprover[]> {
  const contract = context.contract;

  switch (criterion) {
    case "DIRECT_MANAGER":
      if (contract?.managerUser && contract.managerUser.active) {
        return [
          {
            userId: contract.managerUser.id,
            name: contract.managerUser.name,
            email: contract.managerUser.email,
            role: contract.managerUser.role,
            source: "DIRECT_MANAGER",
            level: 1,
          },
        ];
      }
      return [];
    case "TEAM_RESPONSIBLE":
      return await getResponsibleApprovers(context.orgId, "TEAM", context.teamId, permission, "TEAM_RESPONSIBLE");
    case "DEPARTMENT_RESPONSIBLE":
      return await getResponsibleApprovers(
        context.orgId,
        "DEPARTMENT",
        contract?.departmentId ?? null,
        permission,
        "DEPARTMENT_RESPONSIBLE",
      );
    case "COST_CENTER_RESPONSIBLE":
      return await getResponsibleApprovers(
        context.orgId,
        "COST_CENTER",
        contract?.costCenterId ?? null,
        permission,
        "COST_CENTER_RESPONSIBLE",
      );
    case "HR_ADMIN":
      return await getLocalHrApprovers(context.orgId);
    case "GROUP_HR":
      return await getGroupHrApprovers(context.orgId);
    default:
      return [];
  }
}

/**
 * Devuelve la lista de aprobadores según el flujo configurado para la organizacion.
 * Se detiene en el primer criterio que tenga aprobadores.
 */
export async function resolveApproverUsers(
  employeeId: string,
  orgId: string,
  requestType: ApprovalRequestType,
): Promise<AuthorizedApprover[]> {
  const settings = await getApprovalSettingsForOrg(orgId);
  const workflow = settings.workflows[requestType] ?? DEFAULT_APPROVAL_SETTINGS.workflows[requestType];

  if (workflow.mode === "LIST") {
    const listApprovers = await getListApprovers(orgId, workflow.approverList);
    if (listApprovers.length > 0) {
      return listApprovers;
    }
  }

  const context = await getEmployeeApprovalContext(employeeId);
  const permission = APPROVAL_PERMISSIONS[requestType];

  for (const criterion of workflow.criteriaOrder) {
    const candidates = await resolveCandidatesByCriterion(context, criterion, permission);
    if (candidates.length > 0) {
      return candidates;
    }
  }

  const fallback = await getFallbackApprovers(orgId);
  if (fallback.length > 0) {
    return fallback;
  }

  return [];
}

/**
 * Obtiene los aprobadores autorizados para un empleado y tipo de solicitud.
 */
export async function getAuthorizedApprovers(
  employeeId: string,
  requestType: ApprovalRequestType,
): Promise<AuthorizedApprover[]> {
  const context = await getEmployeeApprovalContext(employeeId);
  return await resolveApproverUsers(employeeId, context.orgId, requestType);
}

/**
 * Verifica si un usuario especifico puede aprobar una solicitud de un empleado.
 */
export async function canUserApprove(
  approverUserId: string,
  employeeId: string,
  requestType: ApprovalRequestType,
): Promise<boolean> {
  const context = await getEmployeeApprovalContext(employeeId);
  const hasHrAccess = await hasHrApprovalAccess(approverUserId, context.orgId);
  if (hasHrAccess) {
    return true;
  }

  const approvers = await getAuthorizedApprovers(employeeId, requestType);
  return approvers.some((approver) => approver.userId === approverUserId);
}

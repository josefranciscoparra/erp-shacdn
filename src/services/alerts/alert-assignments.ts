import { prisma } from "@/lib/prisma";

export type AlertAssignmentSource =
  | "DIRECT_MANAGER"
  | "TEAM_RESPONSIBLE"
  | "DEPARTMENT_RESPONSIBLE"
  | "COST_CENTER_RESPONSIBLE"
  | "ORG_RESPONSIBLE"
  | "HR_FALLBACK"
  | "MANUAL";

type AssignmentCandidate = {
  userId: string;
  source: AlertAssignmentSource;
};

type AlertAssignmentContext = {
  orgId: string;
  teamId: string | null;
  contract: {
    managerUser?: {
      id: string;
      active: boolean;
    } | null;
    departmentId?: string | null;
    costCenterId?: string | null;
  } | null;
};

async function getAssignmentContext(employeeId: string): Promise<AlertAssignmentContext> {
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
                select: { id: true, active: true },
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
          managerUser,
          departmentId: contract.departmentId,
          costCenterId: contract.costCenterId,
        }
      : null,
  };
}

async function getScopeResponsibles(
  orgId: string,
  scope: "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM",
  scopeId: string | null,
  source: AlertAssignmentSource,
): Promise<AssignmentCandidate[]> {
  const responsibles = await prisma.areaResponsible.findMany({
    where: {
      orgId,
      scope,
      isActive: true,
      permissions: { has: "RESOLVE_ALERTS" },
      ...(scope === "TEAM" && scopeId ? { teamId: scopeId } : {}),
      ...(scope === "DEPARTMENT" && scopeId ? { departmentId: scopeId } : {}),
      ...(scope === "COST_CENTER" && scopeId ? { costCenterId: scopeId } : {}),
    },
    include: {
      user: { select: { id: true, active: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return responsibles
    .filter((responsible) => responsible.user?.active)
    .map((responsible) => ({
      userId: responsible.userId,
      source,
    }));
}

async function getRoleFallback(orgId: string, roles: Array<"HR_ADMIN" | "ORG_ADMIN" | "SUPER_ADMIN">) {
  const memberships = await prisma.userOrganization.findMany({
    where: {
      orgId,
      isActive: true,
      role: { in: roles },
      user: { active: true },
    },
    select: {
      userId: true,
    },
  });

  return memberships.map((membership) => membership.userId);
}

export async function resolveAlertAssignees(employeeId: string): Promise<AssignmentCandidate[]> {
  const context = await getAssignmentContext(employeeId);
  const contract = context.contract;

  if (contract?.managerUser?.active) {
    return [
      {
        userId: contract.managerUser.id,
        source: "DIRECT_MANAGER",
      },
    ];
  }

  const teamResponsibles = await getScopeResponsibles(context.orgId, "TEAM", context.teamId, "TEAM_RESPONSIBLE");
  if (teamResponsibles.length > 0) return teamResponsibles;

  const departmentResponsibles = await getScopeResponsibles(
    context.orgId,
    "DEPARTMENT",
    contract?.departmentId ?? null,
    "DEPARTMENT_RESPONSIBLE",
  );
  if (departmentResponsibles.length > 0) return departmentResponsibles;

  const costCenterResponsibles = await getScopeResponsibles(
    context.orgId,
    "COST_CENTER",
    contract?.costCenterId ?? null,
    "COST_CENTER_RESPONSIBLE",
  );
  if (costCenterResponsibles.length > 0) return costCenterResponsibles;

  const organizationResponsibles = await getScopeResponsibles(context.orgId, "ORGANIZATION", null, "ORG_RESPONSIBLE");
  if (organizationResponsibles.length > 0) return organizationResponsibles;

  const hrFallback = await getRoleFallback(context.orgId, ["HR_ADMIN"]);
  if (hrFallback.length > 0) {
    return hrFallback.map((userId) => ({ userId, source: "HR_FALLBACK" }));
  }

  const adminFallback = await getRoleFallback(context.orgId, ["ORG_ADMIN", "SUPER_ADMIN"]);
  return adminFallback.map((userId) => ({ userId, source: "HR_FALLBACK" }));
}

export async function ensureAlertAssignments(alertId: string, employeeId: string) {
  const existing = await prisma.alertAssignment.count({
    where: { alertId },
  });

  if (existing > 0) {
    return;
  }

  const assignees = await resolveAlertAssignees(employeeId);
  if (assignees.length === 0) {
    return;
  }

  await prisma.alertAssignment.createMany({
    data: assignees.map((assignee) => ({
      alertId,
      userId: assignee.userId,
      source: assignee.source,
    })),
    skipDuplicates: true,
  });
}

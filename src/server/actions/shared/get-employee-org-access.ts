import { auth } from "@/lib/auth";
import { getCurrentOrgId } from "@/lib/context/org";
import { prisma } from "@/lib/prisma";

type AccessReason = "OK" | "WRONG_ORG" | "NO_EMPLOYEE" | "UNAUTHENTICATED";

interface OrgSummary {
  id: string;
  name: string;
}

export interface EmployeeOrgAccessState {
  canAccess: boolean;
  reason: AccessReason;
  employeeId: string | null;
  employeeOrg: OrgSummary | null;
  activeOrg: OrgSummary | null;
  userRole: string | null;
}

export async function getEmployeeOrgAccessState(): Promise<EmployeeOrgAccessState> {
  const session = await auth();

  if (!session?.user) {
    return {
      canAccess: false,
      reason: "UNAUTHENTICATED",
      employeeId: null,
      employeeOrg: null,
      activeOrg: null,
      userRole: null,
    };
  }

  const activeOrgId = await getCurrentOrgId(session);

  const [activeOrgRecord, employee] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        orgId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  if (!employee) {
    return {
      canAccess: false,
      reason: "NO_EMPLOYEE",
      employeeId: null,
      employeeOrg: null,
      activeOrg: activeOrgRecord ?? null,
      userRole: session.user.role,
    };
  }

  const isSameOrg = employee.orgId === activeOrgId;

  return {
    canAccess: isSameOrg,
    reason: isSameOrg ? "OK" : "WRONG_ORG",
    employeeId: employee.id,
    employeeOrg: employee.organization ?? null,
    activeOrg: activeOrgRecord ?? null,
    userRole: session.user.role,
  };
}

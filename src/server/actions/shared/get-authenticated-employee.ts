"use server";

import type { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getCurrentOrgId } from "@/lib/context/org";
import { isEmployeePausedNow } from "@/lib/contracts/discontinuous-utils";
import { prisma } from "@/lib/prisma";

export interface GetAuthenticatedEmployeeOptions {
  /**
   * Additional relations to include on the employee record. `employmentContracts` is managed internally
   * and will be ignored if provided.
   */
  employeeInclude?: Omit<Prisma.EmployeeInclude, "employmentContracts">;
  /**
   * Additional relations to include on the active employment contract (if any).
   */
  contractInclude?: Prisma.EmploymentContractInclude;
  /**
   * Whether to throw if the employee has no active contract. Defaults to `false`.
   */
  requireActiveContract?: boolean;
  /**
   * Weekly hours fallback when there is no active contract. Defaults to 40h.
   */
  defaultWeeklyHours?: number;
}

// Tipado intencionalmente laxo porque el include es dinámico según las opciones.
export interface AuthenticatedEmployeeResult {
  userId: string;
  employeeId: string;
  orgId: string;
  employee: any;
  activeContract: any;
  hasActiveContract: boolean;
  hasProvisionalContract: boolean;
  weeklyHours: number;
  dailyHours: number;
}

/**
 * Obtiene el usuario autenticado actual sin requerir que tenga un empleado asociado.
 * Útil para acciones administrativas donde el usuario puede ser SUPER_ADMIN u ORG_ADMIN sin empleado.
 */
export async function getAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const activeOrgId = await getCurrentOrgId(session);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      employee: {
        include: {
          employmentContracts: {
            where: {
              active: true,
            },
            orderBy: {
              startDate: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return {
    userId: user.id,
    orgId: activeOrgId,
    role: user.role,
    email: user.email,
    name: user.name,
    employee: user.employee ?? null, // Puede ser null para admins sin empleado
  };
}

/**
 * Resultado de la verificación del contexto de organización para fichajes.
 */
export interface EmployeeOrgContextResult {
  canClock: boolean;
  reason: "OK" | "WRONG_ORG" | "NO_EMPLOYEE" | "CONTRACT_PAUSED" | null;
  employeeOrgId: string | null;
  activeOrgId: string | null;
  message?: string | null;
}

/**
 * Verifica si el usuario puede fichar (está viendo su propia organización).
 * Útil para el widget de fichaje rápido y otros componentes que requieren
 * que el usuario esté en su propia organización.
 */
export async function checkEmployeeOrgContext(): Promise<EmployeeOrgContextResult> {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();

    // orgId viene de activeOrgId ?? session.user.orgId
    // employee.orgId es la org real del empleado
    const isInOwnOrg = employee.orgId === orgId;

    if (!isInOwnOrg) {
      return {
        canClock: false,
        reason: "WRONG_ORG",
        employeeOrgId: employee.orgId,
        activeOrgId: orgId,
        message: "Cambia a tu organización de empleado para fichar.",
      };
    }

    const isPaused = await isEmployeePausedNow(employee.id, orgId);
    if (isPaused) {
      return {
        canClock: false,
        reason: "CONTRACT_PAUSED",
        employeeOrgId: employee.orgId,
        activeOrgId: orgId,
        message: "Tu contrato fijo discontinuo está pausado.",
      };
    }

    return {
      canClock: true,
      reason: "OK",
      employeeOrgId: employee.orgId,
      activeOrgId: orgId,
      message: null,
    };
  } catch (error) {
    if ((error as Error & { code?: string }).code === "WRONG_ORG") {
      return {
        canClock: false,
        reason: "WRONG_ORG",
        employeeOrgId: null,
        activeOrgId: null,
        message: "Cambia a tu organización de empleado para fichar.",
      };
    }
    // Si falla por no tener empleado, o cualquier otro motivo
    return {
      canClock: false,
      reason: "NO_EMPLOYEE",
      employeeOrgId: null,
      activeOrgId: null,
      message: "Este usuario no tiene una ficha de empleado.",
    };
  }
}

export async function getAuthenticatedEmployee(
  options: GetAuthenticatedEmployeeOptions = {},
): Promise<AuthenticatedEmployeeResult> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const activeOrgId = await getCurrentOrgId(session);

  // Si el usuario tiene sesión con employeeOrgId, usarlo como atajo
  const employeeOrgFromSession = session.user.employeeOrgId ?? null;
  if (employeeOrgFromSession && employeeOrgFromSession !== activeOrgId) {
    const error = new Error("Empleado no pertenece a la organización activa");
    (error as Error & { code?: string }).code = "WRONG_ORG";
    throw error;
  }

  const { employeeInclude, contractInclude, requireActiveContract = false, defaultWeeklyHours = 40 } = options;

  const { employmentContracts: _ignoredContracts, ...remainingEmployeeInclude } = employeeInclude ?? {};

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      employee: {
        include: {
          ...remainingEmployeeInclude,
          employmentContracts: {
            where: {
              active: true,
            },
            include: contractInclude,
            orderBy: {
              startDate: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!user?.employee) {
    throw new Error("Usuario no tiene un empleado asociado");
  }
  if (user.employee.orgId !== activeOrgId) {
    const error = new Error("Empleado no pertenece a la organización activa");
    (error as Error & { code?: string }).code = "WRONG_ORG";
    throw error;
  }

  const foundContract = user.employee.employmentContracts[0] ?? null;
  const contractWeeklyHours = foundContract?.weeklyHours ? Number(foundContract.weeklyHours) : 0;
  let activeContract = foundContract && contractWeeklyHours > 0 ? foundContract : null;

  activeContract ??= await prisma.employmentContract.findFirst({
    where: {
      employeeId: user.employee.id,
      orgId: activeOrgId,
      active: true,
      weeklyHours: {
        gt: 0,
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  const hasProvisionalContract = Boolean(foundContract) && contractWeeklyHours <= 0;

  if (requireActiveContract && !activeContract) {
    throw new Error("Empleado sin contrato activo");
  }

  const weeklyHours = activeContract?.weeklyHours ? Number(activeContract.weeklyHours) : defaultWeeklyHours;
  const workingDaysPerWeek = activeContract?.workingDaysPerWeek ? Number(activeContract.workingDaysPerWeek) : 5;
  const dailyHours = weeklyHours / workingDaysPerWeek;

  return {
    userId: user.id,
    employeeId: user.employee.id,
    orgId: activeOrgId,
    employee: user.employee,
    activeContract,
    hasActiveContract: Boolean(activeContract),
    hasProvisionalContract,
    weeklyHours,
    dailyHours,
  };
}

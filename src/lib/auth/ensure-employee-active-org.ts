import type { Session } from "next-auth";

import { prisma } from "@/lib/prisma";

export type EmployeeOrgGuardErrorCode = "NO_EMPLOYEE" | "WRONG_ORG";

export class EmployeeOrgGuardError extends Error {
  code: EmployeeOrgGuardErrorCode;

  constructor(code: EmployeeOrgGuardErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "EmployeeOrgGuardError";
  }
}

export interface EmployeeOrgGuardResult {
  employeeId: string;
  activeOrgId: string;
}

/**
 * Verifica que el empleado autenticado pertenece a la organización activa.
 * Lanza EmployeeOrgGuardError con code:
 * - "NO_EMPLOYEE": el usuario no tiene ficha de empleado.
 * - "WRONG_ORG": el empleado no pertenece a la organización activa.
 */
export async function ensureEmployeeHasAccessToActiveOrg(session: Session): Promise<EmployeeOrgGuardResult> {
  if (!session.user?.id || !session.user.orgId) {
    throw new EmployeeOrgGuardError("NO_EMPLOYEE", "Usuario no autenticado o sin organización activa.");
  }

  if (!session.user.employeeId) {
    throw new EmployeeOrgGuardError("NO_EMPLOYEE", "Este usuario no tiene ficha de empleado.");
  }

  const activeOrgId = session.user.orgId;
  const employeeOrgId = session.user.employeeOrgId ?? null;

  if (employeeOrgId) {
    if (employeeOrgId !== activeOrgId) {
      throw new EmployeeOrgGuardError("WRONG_ORG", "El empleado no pertenece a la organización activa seleccionada.");
    }

    return {
      employeeId: session.user.employeeId,
      activeOrgId,
    };
  }

  // Fallback: consultar la organización real del empleado por si la sesión no tiene employeeOrgId
  const employee = await prisma.employee.findUnique({
    where: { id: session.user.employeeId },
    select: { orgId: true },
  });

  if (!employee) {
    throw new EmployeeOrgGuardError("NO_EMPLOYEE", "Este usuario no tiene ficha de empleado.");
  }

  if (employee.orgId !== activeOrgId) {
    throw new EmployeeOrgGuardError("WRONG_ORG", "El empleado no pertenece a la organización activa seleccionada.");
  }

  return {
    employeeId: session.user.employeeId,
    activeOrgId,
  };
}

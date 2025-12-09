import type { SecondSignerRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Resultado de la resolución del segundo firmante
 */
export interface SecondSignerResolution {
  /** ID del usuario que será el segundo firmante */
  userId: string | null;
  /** ID del empleado que será el segundo firmante */
  employeeId: string | null;
  /** true si no se pudo encontrar un segundo firmante válido */
  missing: boolean;
  /** Razón por la que falta el segundo firmante */
  missingReason?: string;
}

/**
 * Resuelve el segundo firmante para un empleado dado según el rol configurado.
 *
 * @param employeeId - ID del empleado que es el primer firmante
 * @param role - Rol del segundo firmante (MANAGER, HR, SPECIFIC_USER)
 * @param specificUserId - ID del usuario específico (solo si role = SPECIFIC_USER)
 * @param orgId - ID de la organización para validación multi-tenant
 * @returns Información del segundo firmante o indicador de que falta
 */
export async function resolveSecondSigner(
  employeeId: string,
  role: SecondSignerRole,
  specificUserId: string | undefined,
  orgId: string,
): Promise<SecondSignerResolution> {
  switch (role) {
    case "MANAGER":
      return resolveManagerSigner(employeeId, orgId);

    case "HR":
      return resolveHRSigner(orgId);

    case "SPECIFIC_USER":
      return resolveSpecificUserSigner(specificUserId, orgId);

    default:
      return {
        userId: null,
        employeeId: null,
        missing: true,
        missingReason: "Rol de segundo firmante no reconocido",
      };
  }
}

/**
 * Resuelve el manager directo del empleado como segundo firmante.
 * Busca primero el manager del empleado, si no existe, busca el manager del departamento.
 */
async function resolveManagerSigner(employeeId: string, orgId: string): Promise<SecondSignerResolution> {
  // Usamos el contrato activo para determinar manager directo y/o del departamento
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      orgId,
      active: true,
    },
    include: {
      manager: {
        include: {
          user: true,
        },
      },
      department: {
        include: {
          manager: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  if (!contract) {
    return {
      userId: null,
      employeeId: null,
      missing: true,
      missingReason: "No se encontró un contrato activo para el empleado",
    };
  }

  // Prioridad 1: Manager directo definido en el contrato
  if (contract.manager?.user) {
    return {
      userId: contract.manager.user.id,
      employeeId: contract.manager.id,
      missing: false,
    };
  }

  // Prioridad 2: Manager del departamento asociado al contrato
  if (contract.department?.manager?.user) {
    return {
      userId: contract.department.manager.user.id,
      employeeId: contract.department.manager.id,
      missing: false,
    };
  }

  return {
    userId: null,
    employeeId: null,
    missing: true,
    missingReason: "El empleado no tiene manager asignado ni departamento con responsable",
  };
}

/**
 * Resuelve un usuario con rol HR de la organización como segundo firmante.
 * Selecciona el primer usuario HR activo que encuentre.
 */
async function resolveHRSigner(orgId: string): Promise<SecondSignerResolution> {
  // Buscar usuarios con rol HR en la organización
  const hrUser = await prisma.user.findFirst({
    where: {
      orgId,
      role: { in: ["HR_ADMIN", "ORG_ADMIN"] },
      active: true,
    },
    include: {
      employee: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!hrUser) {
    return {
      userId: null,
      employeeId: null,
      missing: true,
      missingReason: "No hay usuarios con rol HR activos en la organización",
    };
  }

  if (!hrUser.employee) {
    return {
      userId: null,
      employeeId: null,
      missing: true,
      missingReason: "El usuario HR no tiene un empleado asociado",
    };
  }

  return {
    userId: hrUser.id,
    employeeId: hrUser.employee.id,
    missing: false,
  };
}

/**
 * Resuelve un usuario específico como segundo firmante.
 * Valida que el usuario pertenezca a la misma organización.
 */
async function resolveSpecificUserSigner(
  specificUserId: string | undefined,
  orgId: string,
): Promise<SecondSignerResolution> {
  if (!specificUserId) {
    return {
      userId: null,
      employeeId: null,
      missing: true,
      missingReason: "No se especificó un usuario como segundo firmante",
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: specificUserId,
      orgId, // Validación multi-tenant
      active: true,
    },
    include: {
      employee: true,
    },
  });

  if (!user) {
    return {
      userId: null,
      employeeId: null,
      missing: true,
      missingReason: "El usuario especificado no existe o no pertenece a la organización",
    };
  }

  if (!user.employee) {
    return {
      userId: null,
      employeeId: null,
      missing: true,
      missingReason: "El usuario especificado no tiene empleado asociado",
    };
  }

  return {
    userId: user.id,
    employeeId: user.employee.id,
    missing: false,
  };
}

/**
 * Obtiene el empleado y usuario asociado para un employeeId.
 * Útil para crear el primer firmante (el empleado destinatario).
 */
export async function getEmployeeWithUser(
  employeeId: string,
  orgId: string,
): Promise<{ employee: { id: string; firstName: string; lastName: string }; userId: string } | null> {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      orgId,
    },
    include: {
      user: true,
    },
  });

  if (!employee?.user) {
    return null;
  }

  return {
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
    },
    userId: employee.user.id,
  };
}

/**
 * Obtiene todos los empleados para un lote de firma.
 * Puede filtrar por departamento, rol, o lista manual.
 */
export async function getRecipientEmployees(
  orgId: string,
  employeeIds: string[],
): Promise<
  Array<{
    id: string;
    firstName: string;
    lastName: string;
    userId: string;
  }>
> {
  const employees = await prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
      orgId,
      user: { isNot: null }, // Solo empleados con usuario asociado
    },
    include: {
      user: true,
    },
  });

  return employees
    .filter((emp) => emp.user !== null)
    .map((emp) => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      userId: emp.user!.id,
    }));
}

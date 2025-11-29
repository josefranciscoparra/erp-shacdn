"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server Actions para gestión de equipos
 */

export type TeamDetail = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  departmentId: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  costCenterId: string | null;
  costCenter: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    employees: number; // Empleados asignados directamente al equipo
    areaResponsibles: number;
  };
};

/**
 * Obtiene un equipo por ID con información completa
 *
 * @param id ID del equipo
 * @returns Equipo con contadores de empleados y responsables
 */
export async function getTeamById(id: string): Promise<{
  success: boolean;
  team?: TeamDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const team = await prisma.team.findFirst({
      where: {
        id,
        orgId: session.user.orgId, // Multi-tenant security
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        costCenterId: true,
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            employees: true, // Empleados asignados directamente al equipo
            areaResponsibles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!team) {
      return {
        success: false,
        error: "Equipo no encontrado",
      };
    }

    return {
      success: true,
      team: team as TeamDetail,
    };
  } catch (error) {
    console.error("Error al obtener equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export type TeamListItem = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  costCenter: {
    name: string;
    code: string | null;
  } | null;
  _count: {
    employees: number;
    areaResponsibles: number;
  };
};

/**
 * Obtiene todos los equipos de la organización
 *
 * @returns Lista de equipos con información básica
 */
export async function getTeams(): Promise<{
  success: boolean;
  teams?: TeamListItem[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const teams = await prisma.team.findMany({
      where: {
        orgId: session.user.orgId, // Multi-tenant security
      },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        costCenter: {
          select: {
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            employees: true,
            areaResponsibles: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return {
      success: true,
      teams: teams as TeamListItem[],
    };
  } catch (error) {
    console.error("Error al obtener equipos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export type CreateTeamInput = {
  name: string;
  code?: string | null;
  description?: string | null;
  departmentId?: string | null;
  costCenterId: string;
  isActive?: boolean;
};

/**
 * Crea un nuevo equipo
 *
 * @param data Datos del equipo a crear
 * @returns Equipo creado con información básica
 */
export async function createTeam(data: CreateTeamInput): Promise<{
  success: boolean;
  team?: TeamDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el nombre no esté vacío
    if (!data.name?.trim()) {
      return { success: false, error: "El nombre es obligatorio" };
    }

    // Verificar que el centro de coste existe y pertenece a la organización
    const costCenter = await prisma.costCenter.findFirst({
      where: {
        id: data.costCenterId,
        orgId: session.user.orgId,
      },
    });

    if (!costCenter) {
      return {
        success: false,
        error: "Centro de coste no encontrado",
      };
    }

    // Si se proporciona departmentId, validar que existe, pertenece a la org y su costCenterId coincide
    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: data.departmentId,
          orgId: session.user.orgId,
        },
        select: {
          id: true,
          costCenterId: true,
        },
      });

      if (!department) {
        return {
          success: false,
          error: "Departamento no encontrado",
        };
      }

      // VALIDACIÓN: department.costCenterId debe coincidir con team.costCenterId
      if (department.costCenterId !== data.costCenterId) {
        return {
          success: false,
          error: "El departamento no pertenece al centro de coste seleccionado",
        };
      }
    }

    // Si se proporciona código, verificar que no exista
    if (data.code?.trim()) {
      const existingTeam = await prisma.team.findFirst({
        where: {
          code: data.code.trim(),
          orgId: session.user.orgId,
        },
      });

      if (existingTeam) {
        return {
          success: false,
          error: `Ya existe un equipo con el código "${data.code}"`,
        };
      }
    }

    // Crear el equipo
    const team = await prisma.team.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim() ?? null,
        description: data.description?.trim() ?? null,
        departmentId: data.departmentId ?? null,
        costCenterId: data.costCenterId,
        orgId: session.user.orgId,
        isActive: data.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        costCenterId: true,
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            employees: true,
            areaResponsibles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      team: team as TeamDetail,
    };
  } catch (error) {
    console.error("Error al crear equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export type UpdateTeamInput = {
  name?: string;
  code?: string | null;
  description?: string | null;
  departmentId?: string | null;
  costCenterId?: string;
  isActive?: boolean;
};

/**
 * Actualiza un equipo existente
 *
 * @param id ID del equipo a actualizar
 * @param data Datos a actualizar
 * @returns Equipo actualizado
 */
export async function updateTeam(
  id: string,
  data: UpdateTeamInput,
): Promise<{
  success: boolean;
  team?: TeamDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el equipo existe y pertenece a la organización
    const existingTeam = await prisma.team.findFirst({
      where: {
        id,
        orgId: session.user.orgId,
      },
    });

    if (!existingTeam) {
      return { success: false, error: "Equipo no encontrado" };
    }

    // Si se proporciona nombre, verificar que no esté vacío
    if (data.name !== undefined && !data.name?.trim()) {
      return { success: false, error: "El nombre es obligatorio" };
    }

    // Si se proporciona costCenterId, verificar que existe
    if (data.costCenterId) {
      const costCenter = await prisma.costCenter.findFirst({
        where: {
          id: data.costCenterId,
          orgId: session.user.orgId,
        },
      });

      if (!costCenter) {
        return { success: false, error: "Centro de coste no encontrado" };
      }
    }

    // Determinar el costCenterId final
    const finalCostCenterId = data.costCenterId ?? existingTeam.costCenterId;

    // Si se proporciona departmentId, validar
    if (data.departmentId !== undefined && data.departmentId !== null) {
      const department = await prisma.department.findFirst({
        where: {
          id: data.departmentId,
          orgId: session.user.orgId,
        },
        select: {
          id: true,
          costCenterId: true,
        },
      });

      if (!department) {
        return { success: false, error: "Departamento no encontrado" };
      }

      // Validar que el departamento pertenece al mismo centro de coste
      if (department.costCenterId !== finalCostCenterId) {
        return {
          success: false,
          error: "El departamento no pertenece al centro de coste seleccionado",
        };
      }
    }

    // Si se proporciona código, verificar que no exista (excluyendo el actual)
    if (data.code !== undefined && data.code?.trim()) {
      const existingWithCode = await prisma.team.findFirst({
        where: {
          code: data.code.trim(),
          orgId: session.user.orgId,
          id: { not: id },
        },
      });

      if (existingWithCode) {
        return {
          success: false,
          error: `Ya existe un equipo con el código "${data.code}"`,
        };
      }
    }

    // Actualizar el equipo
    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.code !== undefined && { code: data.code?.trim() ?? null }),
        ...(data.description !== undefined && {
          description: data.description?.trim() ?? null,
        }),
        ...(data.departmentId !== undefined && {
          departmentId: data.departmentId,
        }),
        ...(data.costCenterId !== undefined && {
          costCenterId: data.costCenterId,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        costCenterId: true,
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            employees: true,
            areaResponsibles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      team: team as TeamDetail,
    };
  } catch (error) {
    console.error("Error al actualizar equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Elimina un equipo
 * Solo se puede eliminar si no tiene empleados asignados
 *
 * @param id ID del equipo a eliminar
 * @returns Resultado de la operación
 */
export async function deleteTeam(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el equipo existe
    const team = await prisma.team.findFirst({
      where: {
        id,
        orgId: session.user.orgId,
      },
      select: {
        id: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    if (!team) {
      return { success: false, error: "Equipo no encontrado" };
    }

    // Verificar que no tiene empleados asignados
    if (team._count.employees > 0) {
      return {
        success: false,
        error: `No se puede eliminar el equipo porque tiene ${team._count.employees} empleado(s) asignado(s). Primero desasigna los empleados del equipo.`,
      };
    }

    // Eliminar el equipo
    await prisma.team.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Cambia el estado activo/inactivo de un equipo
 *
 * @param id ID del equipo
 * @returns Equipo actualizado
 */
export async function toggleTeamStatus(id: string): Promise<{
  success: boolean;
  team?: TeamDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Obtener el estado actual
    const existingTeam = await prisma.team.findFirst({
      where: {
        id,
        orgId: session.user.orgId,
      },
      select: {
        isActive: true,
      },
    });

    if (!existingTeam) {
      return { success: false, error: "Equipo no encontrado" };
    }

    // Cambiar el estado
    const team = await prisma.team.update({
      where: { id },
      data: {
        isActive: !existingTeam.isActive,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        costCenterId: true,
        costCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            employees: true,
            areaResponsibles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      team: team as TeamDetail,
    };
  } catch (error) {
    console.error("Error al cambiar estado del equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export type TeamEmployee = {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  isActive: boolean;
  jobTitle: string | null;
};

/**
 * Obtiene los empleados asignados a un equipo
 *
 * @param teamId ID del equipo
 * @returns Lista de empleados del equipo
 */
export async function getTeamEmployees(teamId: string): Promise<{
  success: boolean;
  employees?: TeamEmployee[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el equipo existe
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        orgId: session.user.orgId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      return { success: false, error: "Equipo no encontrado" };
    }

    // Obtener los empleados asignados usando el modelo de Employee para poder mapear el puesto
    const employees = await prisma.employee.findMany({
      where: {
        orgId: session.user.orgId,
        teamId,
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        active: true,
        employmentContracts: {
          where: { active: true },
          select: {
            position: {
              select: {
                title: true,
              },
            },
          },
          orderBy: { startDate: "desc" },
          take: 1,
        },
      },
      orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    });

    return {
      success: true,
      employees: employees.map(
        (employee) =>
          ({
            id: employee.id,
            employeeNumber: employee.employeeNumber,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            isActive: employee.active,
            jobTitle: employee.employmentContracts[0]?.position?.title ?? null,
          }) satisfies TeamEmployee,
      ),
    };
  } catch (error) {
    console.error("Error al obtener empleados del equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene empleados disponibles para asignar a un equipo
 * (empleados sin equipo o de otros equipos)
 *
 * @param excludeTeamId Excluir empleados de este equipo (opcional)
 * @returns Lista de empleados disponibles
 */
export async function getAvailableEmployeesForTeam(excludeTeamId?: string): Promise<{
  success: boolean;
  employees?: (TeamEmployee & { currentTeam?: { id: string; name: string } | null })[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Obtener empleados activos
    const employees = await prisma.employee.findMany({
      where: {
        orgId: session.user.orgId,
        active: true,
        ...(excludeTeamId && { teamId: { not: excludeTeamId } }),
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        active: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        employmentContracts: {
          where: { active: true },
          select: {
            position: {
              select: {
                title: true,
              },
            },
          },
          orderBy: { startDate: "desc" },
          take: 1,
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return {
      success: true,
      employees: employees.map((emp) => ({
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        isActive: emp.active,
        jobTitle: emp.employmentContracts[0]?.position?.title ?? null,
        currentTeam: emp.team,
      })),
    };
  } catch (error) {
    console.error("Error al obtener empleados disponibles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Asigna un empleado a un equipo
 *
 * @param teamId ID del equipo
 * @param employeeId ID del empleado
 * @returns Resultado de la operación
 */
export async function addEmployeeToTeam(
  teamId: string,
  employeeId: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el equipo existe
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        orgId: session.user.orgId,
      },
    });

    if (!team) {
      return { success: false, error: "Equipo no encontrado" };
    }

    // Verificar que el empleado existe
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        orgId: session.user.orgId,
      },
    });

    if (!employee) {
      return { success: false, error: "Empleado no encontrado" };
    }

    // Asignar el empleado al equipo
    await prisma.employee.update({
      where: { id: employeeId },
      data: { teamId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al asignar empleado al equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Quita un empleado de su equipo actual
 *
 * @param employeeId ID del empleado
 * @returns Resultado de la operación
 */
export async function removeEmployeeFromTeam(employeeId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el empleado existe
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        orgId: session.user.orgId,
      },
    });

    if (!employee) {
      return { success: false, error: "Empleado no encontrado" };
    }

    // Quitar el empleado del equipo
    await prisma.employee.update({
      where: { id: employeeId },
      data: { teamId: null },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al quitar empleado del equipo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

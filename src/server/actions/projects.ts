"use server";

import { ProjectAccessType } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server Actions para gestión de proyectos (Mejora 4)
 */

// ============================================
// TIPOS
// ============================================

export type ProjectDetail = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  color: string | null;
  accessType: ProjectAccessType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    assignments: number;
    timeEntries: number;
  };
};

export type ProjectListItem = {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  accessType: ProjectAccessType;
  isActive: boolean;
  _count: {
    assignments: number;
    timeEntries: number;
  };
};

export type ProjectAssignmentDetail = {
  id: string;
  role: string | null;
  assignedAt: Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string | null;
  };
};

export type CreateProjectInput = {
  name: string;
  code?: string | null;
  description?: string | null;
  color?: string | null;
  accessType?: ProjectAccessType;
};

export type UpdateProjectInput = {
  name?: string;
  code?: string | null;
  description?: string | null;
  color?: string | null;
  accessType?: ProjectAccessType;
};

// ============================================
// CRUD DE PROYECTOS
// ============================================

/**
 * Obtiene todos los proyectos de la organización
 */
export async function getProjects(): Promise<{
  success: boolean;
  projects?: ProjectListItem[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const projects = await prisma.project.findMany({
      where: {
        orgId: session.user.orgId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        color: true,
        accessType: true,
        isActive: true,
        _count: {
          select: {
            assignments: true,
            timeEntries: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, projects };
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene un proyecto por ID con información completa
 */
export async function getProjectById(id: string): Promise<{
  success: boolean;
  project?: ProjectDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        orgId: session.user.orgId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        color: true,
        accessType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignments: true,
            timeEntries: true,
          },
        },
      },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    return { success: true, project };
  } catch (error) {
    console.error("Error al obtener proyecto:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Crea un nuevo proyecto
 */
export async function createProject(data: CreateProjectInput): Promise<{
  success: boolean;
  project?: ProjectDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Validar nombre
    if (!data.name?.trim()) {
      return { success: false, error: "El nombre es obligatorio" };
    }

    // Verificar nombre único en la organización
    const existingByName = await prisma.project.findFirst({
      where: {
        orgId: session.user.orgId,
        name: data.name.trim(),
      },
    });

    if (existingByName) {
      return { success: false, error: "Ya existe un proyecto con ese nombre" };
    }

    // Verificar código único si se proporciona
    if (data.code?.trim()) {
      const existingByCode = await prisma.project.findFirst({
        where: {
          orgId: session.user.orgId,
          code: data.code.trim(),
        },
      });

      if (existingByCode) {
        return { success: false, error: "Ya existe un proyecto con ese código" };
      }
    }

    const project = await prisma.project.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim() ?? null,
        description: data.description?.trim() ?? null,
        color: data.color ?? null,
        accessType: data.accessType ?? "OPEN",
        orgId: session.user.orgId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        color: true,
        accessType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignments: true,
            timeEntries: true,
          },
        },
      },
    });

    return { success: true, project };
  } catch (error) {
    console.error("Error al crear proyecto:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Actualiza un proyecto existente
 */
export async function updateProject(
  id: string,
  data: UpdateProjectInput,
): Promise<{
  success: boolean;
  project?: ProjectDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el proyecto existe y pertenece a la org
    const existing = await prisma.project.findFirst({
      where: {
        id,
        orgId: session.user.orgId,
      },
    });

    if (!existing) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    // Validar nombre único si se está actualizando
    if (data.name?.trim() && data.name.trim() !== existing.name) {
      const existingByName = await prisma.project.findFirst({
        where: {
          orgId: session.user.orgId,
          name: data.name.trim(),
          id: { not: id },
        },
      });

      if (existingByName) {
        return { success: false, error: "Ya existe un proyecto con ese nombre" };
      }
    }

    // Validar código único si se está actualizando
    if (data.code !== undefined) {
      const codeValue = data.code?.trim() ?? null;
      if (codeValue && codeValue !== existing.code) {
        const existingByCode = await prisma.project.findFirst({
          where: {
            orgId: session.user.orgId,
            code: codeValue,
            id: { not: id },
          },
        });

        if (existingByCode) {
          return { success: false, error: "Ya existe un proyecto con ese código" };
        }
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.code !== undefined && { code: data.code?.trim() ?? null }),
        ...(data.description !== undefined && {
          description: data.description?.trim() ?? null,
        }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.accessType !== undefined && { accessType: data.accessType }),
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        color: true,
        accessType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignments: true,
            timeEntries: true,
          },
        },
      },
    });

    return { success: true, project };
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Activa o desactiva un proyecto
 * NOTA: Proyecto desactivado no permite nuevos fichajes pero aparece en históricos
 */
export async function toggleProjectStatus(id: string): Promise<{
  success: boolean;
  project?: ProjectDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const existing = await prisma.project.findFirst({
      where: {
        id,
        orgId: session.user.orgId,
      },
    });

    if (!existing) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    const project = await prisma.project.update({
      where: { id },
      data: { isActive: !existing.isActive },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        color: true,
        accessType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignments: true,
            timeEntries: true,
          },
        },
      },
    });

    return { success: true, project };
  } catch (error) {
    console.error("Error al cambiar estado del proyecto:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Elimina un proyecto (solo si no tiene fichajes asociados)
 */
export async function deleteProject(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const existing = await prisma.project.findFirst({
      where: {
        id,
        orgId: session.user.orgId,
      },
      include: {
        _count: {
          select: {
            timeEntries: true,
          },
        },
      },
    });

    if (!existing) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    if (existing._count.timeEntries > 0) {
      return {
        success: false,
        error: `No se puede eliminar: tiene ${existing._count.timeEntries} fichajes asociados. Desactívalo en su lugar.`,
      };
    }

    await prisma.project.delete({ where: { id } });

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar proyecto:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ============================================
// ASIGNACIÓN DE EMPLEADOS
// ============================================

/**
 * Obtiene los empleados asignados a un proyecto
 */
export async function getProjectAssignments(projectId: string): Promise<{
  success: boolean;
  assignments?: ProjectAssignmentDetail[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el proyecto existe y pertenece a la org
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: session.user.orgId,
      },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId },
      select: {
        id: true,
        role: true,
        assignedAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: { employee: { lastName: "asc" } },
    });

    return { success: true, assignments };
  } catch (error) {
    console.error("Error al obtener asignaciones:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Asigna empleados a un proyecto
 */
export async function assignEmployeesToProject(
  projectId: string,
  employeeIds: string[],
  role?: string,
): Promise<{
  success: boolean;
  assignedCount?: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el proyecto existe y pertenece a la org
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: session.user.orgId,
      },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    // Verificar que los empleados existen y pertenecen a la org
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        orgId: session.user.orgId,
      },
    });

    if (employees.length !== employeeIds.length) {
      return { success: false, error: "Algunos empleados no son válidos" };
    }

    // Crear asignaciones (ignorar duplicados)
    const result = await prisma.projectAssignment.createMany({
      data: employeeIds.map((employeeId) => ({
        projectId,
        employeeId,
        role: role ?? null,
      })),
      skipDuplicates: true,
    });

    return { success: true, assignedCount: result.count };
  } catch (error) {
    console.error("Error al asignar empleados:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Desasigna un empleado de un proyecto
 */
export async function removeEmployeeFromProject(
  projectId: string,
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

    // Verificar que el proyecto existe y pertenece a la org
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: session.user.orgId,
      },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    await prisma.projectAssignment.deleteMany({
      where: {
        projectId,
        employeeId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al desasignar empleado:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ============================================
// FUNCIONES PARA FICHAJE
// ============================================

export type AvailableProject = {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  accessType: ProjectAccessType;
};

/**
 * Obtiene los proyectos disponibles para el empleado actual (para selector de fichaje)
 * Reglas:
 * - Solo proyectos con isActive=true
 * - Solo proyectos de la misma org
 * - Si accessType=OPEN → incluir
 * - Si accessType=ASSIGNED → solo si existe ProjectAssignment del empleado
 */
export async function getAvailableProjects(): Promise<{
  success: boolean;
  projects?: AvailableProject[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Obtener el employeeId del usuario actual
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: true },
    });

    if (!user?.employee) {
      return { success: false, error: "Usuario sin perfil de empleado" };
    }

    const employeeId = user.employee.id;

    // Obtener proyectos disponibles
    const projects = await prisma.project.findMany({
      where: {
        orgId: session.user.orgId,
        isActive: true,
        OR: [
          { accessType: "OPEN" },
          {
            accessType: "ASSIGNED",
            assignments: {
              some: { employeeId },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        color: true,
        accessType: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, projects };
  } catch (error) {
    console.error("Error al obtener proyectos disponibles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Valida si un proyecto es válido para un empleado (para clockIn y changeProject)
 * Reglas:
 * - El proyecto debe existir
 * - El proyecto debe estar activo
 * - El proyecto debe pertenecer a la misma organización
 * - Si accessType=ASSIGNED, el empleado debe estar asignado
 */
export async function validateProjectForEmployee(
  projectId: string,
  employeeId: string,
  orgId: string,
): Promise<{
  valid: boolean;
  error?: string;
  project?: {
    id: string;
    name: string;
    code: string | null;
  };
}> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { assignments: true },
    });

    if (!project) {
      return { valid: false, error: "Proyecto no encontrado" };
    }

    if (!project.isActive) {
      return { valid: false, error: "El proyecto no está activo" };
    }

    if (project.orgId !== orgId) {
      return { valid: false, error: "Proyecto no pertenece a tu organización" };
    }

    if (project.accessType === "ASSIGNED") {
      const isAssigned = project.assignments.some((a) => a.employeeId === employeeId);
      if (!isAssigned) {
        return { valid: false, error: "No estás asignado a este proyecto" };
      }
    }

    return {
      valid: true,
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
      },
    };
  } catch (error) {
    console.error("Error al validar proyecto:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Error de validación",
    };
  }
}

/**
 * Obtiene empleados disponibles para asignar a un proyecto
 * (empleados que NO están ya asignados)
 */
export async function getAvailableEmployeesForProject(projectId: string): Promise<{
  success: boolean;
  employees?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string | null;
  }[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el proyecto existe y pertenece a la org
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: session.user.orgId,
      },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    // Obtener IDs de empleados ya asignados
    const assignedEmployeeIds = await prisma.projectAssignment.findMany({
      where: { projectId },
      select: { employeeId: true },
    });

    const excludeIds = assignedEmployeeIds.map((a) => a.employeeId);

    // Obtener empleados NO asignados
    const employees = await prisma.employee.findMany({
      where: {
        orgId: session.user.orgId,
        active: true,
        id: { notIn: excludeIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return { success: true, employees };
  } catch (error) {
    console.error("Error al obtener empleados disponibles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ============================================
// INFORMES DE PROYECTO (Mejora 4 - Paso 11)
// ============================================

export type ProjectTimeReport = {
  projectId: string;
  projectName: string;
  projectCode: string | null;
  projectColor: string | null;
  totalMinutes: number;
  totalHours: number;
  entriesCount: number;
  employeesCount: number;
  period: {
    startDate: string;
    endDate: string;
  };
};

export type EmployeeProjectHours = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  totalMinutes: number;
  totalHours: number;
  entriesCount: number;
};

export type DailyProjectHours = {
  date: string;
  totalMinutes: number;
  totalHours: number;
  entriesCount: number;
};

/**
 * Obtiene un resumen de horas del proyecto en un rango de fechas
 */
export async function getProjectTimeReport(
  projectId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  success: boolean;
  report?: ProjectTimeReport;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el proyecto existe y pertenece a la org
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: session.user.orgId,
      },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    // Obtener todos los TimeEntry CLOCK_IN de este proyecto en el rango
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        projectId,
        entryType: "CLOCK_IN",
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Calcular minutos trabajados por proyecto
    // La lógica es: cada CLOCK_IN con projectId marca el inicio de un tramo
    // El tramo termina con el siguiente CLOCK_IN (cambio de proyecto), CLOCK_OUT, o BREAK_START
    let totalMinutes = 0;
    const uniqueEmployees = new Set<string>();

    // Agrupar por empleado y día para calcular correctamente
    const entriesByEmployeeDay = new Map<string, typeof timeEntries>();

    for (const entry of timeEntries) {
      const dayKey = `${entry.employeeId}-${new Date(entry.timestamp).toISOString().split("T")[0]}`;
      if (!entriesByEmployeeDay.has(dayKey)) {
        entriesByEmployeeDay.set(dayKey, []);
      }
      entriesByEmployeeDay.get(dayKey)!.push(entry);
      uniqueEmployees.add(entry.employeeId);
    }

    // Para cada empleado-día, obtener todas las entradas y calcular el tiempo
    for (const [dayKey, projectEntries] of entriesByEmployeeDay) {
      const [employeeId, dateStr] = dayKey.split("-", 2);
      const dayStart = new Date(dateStr + "T00:00:00");
      const dayEnd = new Date(dateStr + "T23:59:59.999");

      // Obtener TODAS las entradas del empleado ese día
      const allDayEntries = await prisma.timeEntry.findMany({
        where: {
          employeeId,
          timestamp: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        orderBy: { timestamp: "asc" },
      });

      // Para cada entrada del proyecto, calcular cuánto tiempo duró hasta la siguiente entrada
      for (const projectEntry of projectEntries) {
        const entryIndex = allDayEntries.findIndex((e) => e.id === projectEntry.id);
        if (entryIndex === -1) continue;

        // Buscar cuándo termina este tramo
        let endTime: Date | null = null;
        for (let i = entryIndex + 1; i < allDayEntries.length; i++) {
          const nextEntry = allDayEntries[i];
          // El tramo termina con cualquier entrada posterior
          if (
            nextEntry.entryType === "CLOCK_OUT" ||
            nextEntry.entryType === "CLOCK_IN" ||
            nextEntry.entryType === "BREAK_START"
          ) {
            endTime = nextEntry.timestamp;
            break;
          }
        }

        if (endTime) {
          const minutes = Math.floor(
            (endTime.getTime() - projectEntry.timestamp.getTime()) / (1000 * 60),
          );
          totalMinutes += Math.max(0, minutes);
        }
      }
    }

    const report: ProjectTimeReport = {
      projectId: project.id,
      projectName: project.name,
      projectCode: project.code,
      projectColor: project.color,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      entriesCount: timeEntries.length,
      employeesCount: uniqueEmployees.size,
      period: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
    };

    return { success: true, report };
  } catch (error) {
    console.error("Error al obtener informe del proyecto:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene las horas trabajadas por empleado en un proyecto
 */
export async function getProjectEmployeeHours(
  projectId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  success: boolean;
  employees?: EmployeeProjectHours[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el proyecto existe y pertenece a la org
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: session.user.orgId,
      },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    // Obtener entradas agrupadas por empleado
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        projectId,
        entryType: "CLOCK_IN",
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Agrupar por empleado
    const employeeMap = new Map<
      string,
      {
        employee: (typeof timeEntries)[0]["employee"];
        entries: typeof timeEntries;
      }
    >();

    for (const entry of timeEntries) {
      if (!employeeMap.has(entry.employeeId)) {
        employeeMap.set(entry.employeeId, {
          employee: entry.employee,
          entries: [],
        });
      }
      employeeMap.get(entry.employeeId)!.entries.push(entry);
    }

    // Calcular horas por empleado
    const employees: EmployeeProjectHours[] = [];

    for (const [employeeId, data] of employeeMap) {
      let totalMinutes = 0;

      // Agrupar por día
      const entriesByDay = new Map<string, typeof timeEntries>();
      for (const entry of data.entries) {
        const dayKey = new Date(entry.timestamp).toISOString().split("T")[0];
        if (!entriesByDay.has(dayKey)) {
          entriesByDay.set(dayKey, []);
        }
        entriesByDay.get(dayKey)!.push(entry);
      }

      // Para cada día, calcular tiempo
      for (const [dateStr, projectEntries] of entriesByDay) {
        const dayStart = new Date(dateStr + "T00:00:00");
        const dayEnd = new Date(dateStr + "T23:59:59.999");

        const allDayEntries = await prisma.timeEntry.findMany({
          where: {
            employeeId,
            timestamp: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          orderBy: { timestamp: "asc" },
        });

        for (const projectEntry of projectEntries) {
          const entryIndex = allDayEntries.findIndex((e) => e.id === projectEntry.id);
          if (entryIndex === -1) continue;

          let endTime: Date | null = null;
          for (let i = entryIndex + 1; i < allDayEntries.length; i++) {
            const nextEntry = allDayEntries[i];
            if (
              nextEntry.entryType === "CLOCK_OUT" ||
              nextEntry.entryType === "CLOCK_IN" ||
              nextEntry.entryType === "BREAK_START"
            ) {
              endTime = nextEntry.timestamp;
              break;
            }
          }

          if (endTime) {
            const minutes = Math.floor(
              (endTime.getTime() - projectEntry.timestamp.getTime()) / (1000 * 60),
            );
            totalMinutes += Math.max(0, minutes);
          }
        }
      }

      employees.push({
        employeeId,
        employeeName: `${data.employee.firstName} ${data.employee.lastName}`,
        employeeNumber: data.employee.employeeNumber,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        entriesCount: data.entries.length,
      });
    }

    // Ordenar por horas descendente
    employees.sort((a, b) => b.totalMinutes - a.totalMinutes);

    return { success: true, employees };
  } catch (error) {
    console.error("Error al obtener horas por empleado:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene las horas trabajadas por día en un proyecto
 */
export async function getProjectDailyHours(
  projectId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  success: boolean;
  days?: DailyProjectHours[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que el proyecto existe y pertenece a la org
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: session.user.orgId,
      },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    // Obtener entradas del proyecto
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        projectId,
        entryType: "CLOCK_IN",
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Agrupar por día
    const dayMap = new Map<string, typeof timeEntries>();
    for (const entry of timeEntries) {
      const dayKey = new Date(entry.timestamp).toISOString().split("T")[0];
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }
      dayMap.get(dayKey)!.push(entry);
    }

    // Calcular horas por día
    const days: DailyProjectHours[] = [];

    for (const [dateStr, projectEntries] of dayMap) {
      let totalMinutes = 0;

      const dayStart = new Date(dateStr + "T00:00:00");
      const dayEnd = new Date(dateStr + "T23:59:59.999");

      // Obtener empleados únicos del día
      const employeeIds = [...new Set(projectEntries.map((e) => e.employeeId))];

      for (const employeeId of employeeIds) {
        const employeeProjectEntries = projectEntries.filter((e) => e.employeeId === employeeId);

        const allDayEntries = await prisma.timeEntry.findMany({
          where: {
            employeeId,
            timestamp: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          orderBy: { timestamp: "asc" },
        });

        for (const projectEntry of employeeProjectEntries) {
          const entryIndex = allDayEntries.findIndex((e) => e.id === projectEntry.id);
          if (entryIndex === -1) continue;

          let endTime: Date | null = null;
          for (let i = entryIndex + 1; i < allDayEntries.length; i++) {
            const nextEntry = allDayEntries[i];
            if (
              nextEntry.entryType === "CLOCK_OUT" ||
              nextEntry.entryType === "CLOCK_IN" ||
              nextEntry.entryType === "BREAK_START"
            ) {
              endTime = nextEntry.timestamp;
              break;
            }
          }

          if (endTime) {
            const minutes = Math.floor(
              (endTime.getTime() - projectEntry.timestamp.getTime()) / (1000 * 60),
            );
            totalMinutes += Math.max(0, minutes);
          }
        }
      }

      days.push({
        date: dateStr,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        entriesCount: projectEntries.length,
      });
    }

    // Ordenar por fecha ascendente
    days.sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, days };
  } catch (error) {
    console.error("Error al obtener horas por día:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

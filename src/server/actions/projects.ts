"use server";

import { ProjectAccessType } from "@prisma/client";
import { endOfDay } from "date-fns";

import { safePermission } from "@/lib/auth-guard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Permission } from "@/services/permissions";

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

type AuthorizedProjectContext = {
  session: NonNullable<Awaited<ReturnType<typeof auth>>>;
  orgId: string;
};

async function requireProjectPermission(
  permission: Permission,
): Promise<{ ok: true; context: AuthorizedProjectContext } | { ok: false; error: string }> {
  const authz = await safePermission(permission);
  if (!authz.ok) {
    const actionLabel = permission === "view_projects" ? "ver" : "gestionar";
    return { ok: false, error: `No tienes permisos para ${actionLabel} proyectos` };
  }

  return {
    ok: true,
    context: {
      session: authz.session,
      orgId: authz.session.user.orgId,
    },
  };
}

async function ensureProjectInOrg(projectId: string, orgId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      orgId,
    },
  });

  if (!project) {
    return { ok: false as const, error: "Proyecto no encontrado" };
  }

  return { ok: true as const, project };
}

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
    const permission = await requireProjectPermission("view_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const {
      context: { orgId },
    } = permission;

    const projects = await prisma.project.findMany({
      where: {
        orgId,
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
    const permission = await requireProjectPermission("view_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        orgId: permission.context.orgId,
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
    const permission = await requireProjectPermission("manage_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const {
      context: { orgId },
    } = permission;

    // Validar nombre
    if (!data.name?.trim()) {
      return { success: false, error: "El nombre es obligatorio" };
    }

    // Verificar nombre único en la organización
    const existingByName = await prisma.project.findFirst({
      where: {
        orgId,
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
          orgId,
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
        orgId,
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
    const permission = await requireProjectPermission("manage_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const {
      context: { orgId },
    } = permission;

    const existingResult = await ensureProjectInOrg(id, orgId);
    if (!existingResult.ok) {
      return { success: false, error: existingResult.error };
    }

    const existing = existingResult.project;

    // Validar nombre único si se está actualizando
    if (data.name?.trim() && data.name.trim() !== existing.name) {
      const existingByName = await prisma.project.findFirst({
        where: {
          orgId,
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
            orgId,
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
    const permission = await requireProjectPermission("manage_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const existingResult = await ensureProjectInOrg(id, permission.context.orgId);
    if (!existingResult.ok) {
      return { success: false, error: existingResult.error };
    }
    const existing = existingResult.project;

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
    const permission = await requireProjectPermission("manage_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const existing = await prisma.project.findFirst({
      where: {
        id,
        orgId: permission.context.orgId,
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
    const permission = await requireProjectPermission("manage_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: permission.context.orgId,
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
    const permission = await requireProjectPermission("manage_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: permission.context.orgId,
      },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    // Verificar que los empleados existen y pertenecen a la org
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        orgId: permission.context.orgId,
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
    const permission = await requireProjectPermission("manage_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: permission.context.orgId,
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
    const permission = await requireProjectPermission("manage_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: permission.context.orgId,
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
        orgId: permission.context.orgId,
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

type EmployeeInfo = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
};

type ProjectWorkStats = {
  totalMinutes: number;
  entriesCount: number;
  uniqueEmployeeIds: string[];
  employeeMinutes: Map<string, number>;
  employeeEntryCounts: Map<string, number>;
  employeeInfo: Map<string, EmployeeInfo>;
  dailyMinutes: Map<string, number>;
  dailyEntryCounts: Map<string, number>;
};

async function computeProjectWorkStats(
  projectId: string,
  orgId: string,
  startDate: Date,
  endDate: Date,
): Promise<ProjectWorkStats> {
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);

  const projectEntries = await prisma.timeEntry.findMany({
    where: {
      orgId,
      projectId,
      isCancelled: false,
      entryType: {
        in: ["CLOCK_IN", "PROJECT_SWITCH"],
      },
      timestamp: {
        gte: rangeStart,
        lte: rangeEnd,
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

  const employeeInfo = new Map<string, EmployeeInfo>();
  const employeeEntryCounts = new Map<string, number>();
  const dailyEntryCounts = new Map<string, number>();
  const employeeIds = new Set<string>();

  for (const entry of projectEntries) {
    employeeIds.add(entry.employeeId);
    employeeInfo.set(entry.employeeId, entry.employee);
    employeeEntryCounts.set(entry.employeeId, (employeeEntryCounts.get(entry.employeeId) ?? 0) + 1);
    const dayKey = entry.timestamp.toISOString().split("T")[0];
    dailyEntryCounts.set(dayKey, (dailyEntryCounts.get(dayKey) ?? 0) + 1);
  }

  if (employeeIds.size === 0) {
    return {
      totalMinutes: 0,
      entriesCount: 0,
      uniqueEmployeeIds: [],
      employeeMinutes: new Map(),
      employeeEntryCounts,
      employeeInfo,
      dailyMinutes: new Map(),
      dailyEntryCounts,
    };
  }

  const employeeEntries = await prisma.timeEntry.findMany({
    where: {
      orgId,
      employeeId: { in: Array.from(employeeIds) },
      isCancelled: false,
      timestamp: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    select: {
      id: true,
      employeeId: true,
      entryType: true,
      timestamp: true,
      projectId: true,
    },
    orderBy: [{ employeeId: "asc" }, { timestamp: "asc" }],
  });

  const entriesByEmployee = new Map<string, typeof employeeEntries>();
  for (const entry of employeeEntries) {
    if (!entriesByEmployee.has(entry.employeeId)) {
      entriesByEmployee.set(entry.employeeId, []);
    }
    entriesByEmployee.get(entry.employeeId)!.push(entry);
  }

  const dailyMinutes = new Map<string, number>();
  const employeeMinutes = new Map<string, number>();
  let totalMinutes = 0;

  for (const [employeeId, entries] of entriesByEmployee.entries()) {
    let lastWorkStart: Date | null = null;
    let activeProjectId: string | null = null;

    const registerSegment = (endTime: Date) => {
      if (!lastWorkStart || activeProjectId !== projectId) {
        return;
      }

      const startMs = Math.max(rangeStart.getTime(), lastWorkStart.getTime());
      const endMs = Math.min(rangeEnd.getTime(), endTime.getTime());

      if (endMs <= startMs) {
        return;
      }

      const minutes = (endMs - startMs) / 60000;
      if (minutes <= 0) {
        return;
      }

      totalMinutes += minutes;
      employeeMinutes.set(employeeId, (employeeMinutes.get(employeeId) ?? 0) + minutes);

      let cursorMs = startMs;
      while (cursorMs < endMs) {
        const cursorDate = new Date(cursorMs);
        const cursorDayEnd = endOfDay(cursorDate).getTime();
        const nextBoundary = Math.min(endMs, cursorDayEnd);
        const minutesInDay = (nextBoundary - cursorMs) / 60000;
        const dayKey = cursorDate.toISOString().split("T")[0];
        dailyMinutes.set(dayKey, (dailyMinutes.get(dayKey) ?? 0) + minutesInDay);
        cursorMs = nextBoundary;
      }
    };

    for (const entry of entries) {
      switch (entry.entryType) {
        case "CLOCK_IN":
          lastWorkStart = entry.timestamp;
          activeProjectId = entry.projectId;
          break;
        case "PROJECT_SWITCH":
          registerSegment(entry.timestamp);
          lastWorkStart = entry.timestamp;
          activeProjectId = entry.projectId;
          break;
        case "BREAK_START":
          registerSegment(entry.timestamp);
          lastWorkStart = null;
          break;
        case "BREAK_END":
          lastWorkStart = entry.timestamp;
          break;
        case "CLOCK_OUT":
          registerSegment(entry.timestamp);
          lastWorkStart = null;
          activeProjectId = null;
          break;
        default:
          break;
      }
    }

    if (lastWorkStart) {
      const fallbackEndTime = rangeEnd.getTime() > Date.now() ? new Date() : rangeEnd;
      registerSegment(fallbackEndTime);
    }
  }

  return {
    totalMinutes,
    entriesCount: projectEntries.length,
    uniqueEmployeeIds: Array.from(employeeIds),
    employeeMinutes,
    employeeEntryCounts,
    employeeInfo,
    dailyMinutes,
    dailyEntryCounts,
  };
}

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
    const permission = await requireProjectPermission("view_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const {
      context: { orgId },
    } = permission;

    const projectResult = await ensureProjectInOrg(projectId, orgId);
    if (!projectResult.ok) {
      return { success: false, error: projectResult.error };
    }

    const stats = await computeProjectWorkStats(projectId, orgId, startDate, endDate);
    const totalMinutes = Math.round(stats.totalMinutes);

    const report: ProjectTimeReport = {
      projectId: projectResult.project.id,
      projectName: projectResult.project.name,
      projectCode: projectResult.project.code,
      projectColor: projectResult.project.color,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      entriesCount: stats.entriesCount,
      employeesCount: stats.uniqueEmployeeIds.length,
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
    const permission = await requireProjectPermission("view_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const {
      context: { orgId },
    } = permission;

    const projectResult = await ensureProjectInOrg(projectId, orgId);
    if (!projectResult.ok) {
      return { success: false, error: projectResult.error };
    }

    const stats = await computeProjectWorkStats(projectId, orgId, startDate, endDate);

    const employees: EmployeeProjectHours[] = stats.uniqueEmployeeIds.map((employeeId) => {
      const minutes = Math.round(stats.employeeMinutes.get(employeeId) ?? 0);
      const info = stats.employeeInfo.get(employeeId);
      const displayName = info
        ? [info.firstName, info.lastName].filter(Boolean).join(" ") || info.firstName || info.lastName || "Empleado"
        : "Empleado";

      return {
        employeeId,
        employeeName: displayName,
        employeeNumber: info?.employeeNumber ?? null,
        totalMinutes: minutes,
        totalHours: Math.round((minutes / 60) * 100) / 100,
        entriesCount: stats.employeeEntryCounts.get(employeeId) ?? 0,
      };
    });

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
    const permission = await requireProjectPermission("view_projects");
    if (!permission.ok) {
      return { success: false, error: permission.error };
    }

    const {
      context: { orgId },
    } = permission;

    const projectResult = await ensureProjectInOrg(projectId, orgId);
    if (!projectResult.ok) {
      return { success: false, error: projectResult.error };
    }

    const stats = await computeProjectWorkStats(projectId, orgId, startDate, endDate);
    const dayKeys = new Set<string>([...stats.dailyMinutes.keys(), ...stats.dailyEntryCounts.keys()]);

    const days: DailyProjectHours[] = Array.from(dayKeys)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => {
        const minutes = Math.round(stats.dailyMinutes.get(date) ?? 0);
        return {
          date,
          totalMinutes: minutes,
          totalHours: Math.round((minutes / 60) * 100) / 100,
          entriesCount: stats.dailyEntryCounts.get(date) ?? 0,
        };
      });

    return { success: true, days };
  } catch (error) {
    console.error("Error al obtener horas por día:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

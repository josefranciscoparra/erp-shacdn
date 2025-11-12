"use server";

import type {
  ShiftConfiguration,
  ShiftPlanner,
  ShiftTemplate,
  Shift,
  ShiftAssignment,
  ShiftStatus,
  ShiftType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { validateShiftTimes, calculateDurationMinutes, validateShift } from "@/lib/shifts/validations";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";
import { canUserPlanShifts, canUserApproveShifts } from "./shift-permissions";

// ==================== CONFIGURACIÓN ====================

/**
 * Tipo serializado de configuración (Decimals convertidos a números)
 */
export type SerializedShiftConfiguration = {
  id: string;
  orgId: string;
  planningGranularityMinutes: number;
  weekStartDay: number;
  maxDailyHours: number | null;
  maxWeeklyHours: number | null;
  minRestBetweenShiftsHours: number | null;
  complementaryHoursEnabled: boolean;
  complementaryHoursLimitPercent: number | null;
  complementaryHoursMonthlyCap: number | null;
  publishRequiresApproval: boolean;
  minAdvancePublishDays: number;
  allowEditAfterPublish: boolean;
  enforceMinimumCoverage: boolean;
  blockPublishIfUncovered: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Serializar configuración convirtiendo Decimals a números
 */
function serializeShiftConfig(config: any): SerializedShiftConfiguration | null {
  if (!config) return null;

  return {
    id: config.id,
    orgId: config.orgId,
    planningGranularityMinutes: config.planningGranularityMinutes,
    weekStartDay: config.weekStartDay,
    maxDailyHours: config.maxDailyHours ? Number(config.maxDailyHours) : null,
    maxWeeklyHours: config.maxWeeklyHours ? Number(config.maxWeeklyHours) : null,
    minRestBetweenShiftsHours: config.minRestBetweenShiftsHours ? Number(config.minRestBetweenShiftsHours) : null,
    complementaryHoursEnabled: config.complementaryHoursEnabled,
    complementaryHoursLimitPercent: config.complementaryHoursLimitPercent
      ? Number(config.complementaryHoursLimitPercent)
      : null,
    complementaryHoursMonthlyCap: config.complementaryHoursMonthlyCap
      ? Number(config.complementaryHoursMonthlyCap)
      : null,
    publishRequiresApproval: config.publishRequiresApproval,
    minAdvancePublishDays: config.minAdvancePublishDays,
    allowEditAfterPublish: config.allowEditAfterPublish,
    enforceMinimumCoverage: config.enforceMinimumCoverage,
    blockPublishIfUncovered: config.blockPublishIfUncovered,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

/**
 * Obtener configuración de turnos de la organización
 */
export async function getShiftConfiguration(): Promise<SerializedShiftConfiguration | null> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  const config = await prisma.shiftConfiguration.findUnique({
    where: { orgId: user.orgId },
  });

  return serializeShiftConfig(config);
}

/**
 * Actualizar configuración de turnos
 */
export async function updateShiftConfiguration(
  data: Partial<Omit<ShiftConfiguration, "id" | "orgId" | "createdAt" | "updatedAt">>,
): Promise<SerializedShiftConfiguration | null> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Solo admin puede modificar configuración
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(user.role)) {
    throw new Error("No autorizado");
  }

  // Verificar si existe configuración
  const existing = await prisma.shiftConfiguration.findUnique({
    where: { orgId: user.orgId },
  });

  let config;
  if (existing) {
    config = await prisma.shiftConfiguration.update({
      where: { orgId: user.orgId },
      data,
    });
  } else {
    config = await prisma.shiftConfiguration.create({
      data: {
        ...data,
        orgId: user.orgId,
      },
    });
  }

  return serializeShiftConfig(config);
}

/**
 * Obtener planificadores de turnos
 */
export async function getShiftPlanners(filters?: { costCenterId?: string }): Promise<ShiftPlanner[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  return await prisma.shiftPlanner.findMany({
    where: {
      orgId: user.orgId,
      ...(filters?.costCenterId && { costCenterId: filters.costCenterId }),
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
      costCenter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Añadir planificador de turnos
 */
export async function addShiftPlanner(
  targetUserId: string,
  costCenterId?: string,
  isGlobal?: boolean,
  canApprove?: boolean,
): Promise<ShiftPlanner> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Solo admin puede gestionar planificadores
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(user.role)) {
    throw new Error("No autorizado");
  }

  // Verificar que el usuario target existe y es de la misma organización
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      orgId: user.orgId,
    },
  });

  if (!targetUser) {
    throw new Error("Usuario no encontrado en la organización");
  }

  // Crear planificador
  return await prisma.shiftPlanner.create({
    data: {
      userId: targetUserId,
      orgId: user.orgId,
      costCenterId: isGlobal ? null : costCenterId,
      isGlobal: isGlobal ?? false,
      canApprove: canApprove ?? false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      costCenter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Eliminar planificador de turnos
 */
export async function removeShiftPlanner(plannerId: string): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Solo admin puede gestionar planificadores
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(user.role)) {
    throw new Error("No autorizado");
  }

  // Verificar que el planificador pertenece a la organización
  const planner = await prisma.shiftPlanner.findFirst({
    where: {
      id: plannerId,
      orgId: user.orgId,
    },
  });

  if (!planner) {
    throw new Error("Planificador no encontrado");
  }

  await prisma.shiftPlanner.delete({
    where: { id: plannerId },
  });
}

/**
 * Actualizar permisos de planificador
 */
export async function updateShiftPlanner(
  plannerId: string,
  data: { canApprove?: boolean; isGlobal?: boolean; costCenterId?: string | null },
): Promise<ShiftPlanner> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Solo admin puede modificar planificadores
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(user.role)) {
    throw new Error("No autorizado");
  }

  return await prisma.shiftPlanner.update({
    where: { id: plannerId },
    data,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      costCenter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

// ==================== PLANTILLAS ====================

/**
 * Obtener plantillas de turnos
 */
export async function getShiftTemplates(filters?: {
  costCenterId?: string;
  positionId?: string;
  active?: boolean;
}): Promise<ShiftTemplate[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  return await prisma.shiftTemplate.findMany({
    where: {
      orgId: user.orgId,
      ...(filters?.costCenterId && { costCenterId: filters.costCenterId }),
      ...(filters?.positionId && { positionId: filters.positionId }),
      ...(filters?.active !== undefined && { active: filters.active }),
    },
    include: {
      position: {
        select: {
          id: true,
          title: true,
        },
      },
      costCenter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

/**
 * Obtener plantilla por ID
 */
export async function getShiftTemplateById(id: string): Promise<ShiftTemplate | null> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  return await prisma.shiftTemplate.findFirst({
    where: {
      id,
      orgId: user.orgId,
    },
    include: {
      position: true,
      costCenter: true,
    },
  });
}

/**
 * Crear plantilla de turno
 */
export async function createShiftTemplate(data: {
  name: string;
  description?: string;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultRequiredHeadcount?: number;
  positionId?: string;
  costCenterId?: string;
  color?: string;
}): Promise<ShiftTemplate> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, data.costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para crear plantillas en este centro");
  }

  // Calcular duración en minutos
  const durationMinutes = calculateDurationMinutes(data.defaultStartTime, data.defaultEndTime);

  return await prisma.shiftTemplate.create({
    data: {
      ...data,
      durationMinutes,
      orgId: user.orgId,
    },
    include: {
      position: true,
      costCenter: true,
    },
  });
}

/**
 * Actualizar plantilla de turno
 */
export async function updateShiftTemplate(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    defaultStartTime: string;
    defaultEndTime: string;
    defaultRequiredHeadcount: number;
    positionId: string | null;
    costCenterId: string | null;
    color: string;
    active: boolean;
  }>,
): Promise<ShiftTemplate> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar que la plantilla existe y es de la organización
  const template = await prisma.shiftTemplate.findFirst({
    where: {
      id,
      orgId: user.orgId,
    },
  });

  if (!template) {
    throw new Error("Plantilla no encontrada");
  }

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.id, data.costCenterId ?? template.costCenterId ?? undefined);
  if (!canPlan) {
    throw new Error("No autorizado para editar esta plantilla");
  }

  // Recalcular duración si cambió el horario
  const updateData: typeof data & { durationMinutes?: number } = { ...data };
  if (data.defaultStartTime || data.defaultEndTime) {
    updateData.durationMinutes = calculateDurationMinutes(
      data.defaultStartTime ?? template.defaultStartTime,
      data.defaultEndTime ?? template.defaultEndTime,
    );
  }

  return await prisma.shiftTemplate.update({
    where: { id },
    data: updateData,
    include: {
      position: true,
      costCenter: true,
    },
  });
}

/**
 * Eliminar plantilla de turno
 */
export async function deleteShiftTemplate(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar que la plantilla existe y es de la organización
  const template = await prisma.shiftTemplate.findFirst({
    where: {
      id,
      orgId: user.orgId,
    },
  });

  if (!template) {
    throw new Error("Plantilla no encontrada");
  }

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.id, template.costCenterId ?? undefined);
  if (!canPlan) {
    throw new Error("No autorizado para eliminar esta plantilla");
  }

  // Verificar que no hay turnos activos usando esta plantilla
  const activeShiftsCount = await prisma.shift.count({
    where: {
      templateId: id,
      status: {
        in: ["DRAFT", "PENDING_APPROVAL", "PUBLISHED"],
      },
    },
  });

  if (activeShiftsCount > 0) {
    throw new Error("No se puede eliminar la plantilla porque hay turnos activos que la utilizan");
  }

  await prisma.shiftTemplate.delete({
    where: { id },
  });
}

// ==================== TURNOS (CRUD) ====================

/**
 * Obtener turnos con filtros
 */
export async function getShifts(filters: {
  costCenterId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: ShiftStatus;
  positionId?: string;
  shiftType?: ShiftType;
}) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  return await prisma.shift.findMany({
    where: {
      orgId: user.orgId,
      ...(filters.costCenterId && { costCenterId: filters.costCenterId }),
      ...(filters.dateFrom && { date: { gte: filters.dateFrom } }),
      ...(filters.dateTo && { date: { lte: filters.dateTo } }),
      ...(filters.status && { status: filters.status }),
      ...(filters.positionId && { positionId: filters.positionId }),
      ...(filters.shiftType && { shiftType: filters.shiftType }),
    },
    include: {
      position: {
        select: {
          id: true,
          title: true,
        },
      },
      costCenter: {
        select: {
          id: true,
          name: true,
        },
      },
      template: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      assignments: {
        select: {
          id: true,
          employeeId: true,
          status: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

/**
 * Obtener turno por ID
 */
export async function getShiftById(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  return await prisma.shift.findFirst({
    where: {
      id,
      orgId: user.orgId,
    },
    include: {
      position: true,
      costCenter: true,
      template: true,
      assignments: {
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
      },
    },
  });
}

/**
 * Crear turno
 */
export async function createShift(data: {
  date: Date;
  startTime: string;
  endTime: string;
  costCenterId: string;
  requiredHeadcount?: number;
  positionId?: string;
  shiftType?: ShiftType;
  templateId?: string;
  notes?: string;
}) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, data.costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para crear turnos en este centro");
  }

  // Validar formato de horas
  const timeValidation = validateShiftTimes(data.startTime, data.endTime);
  if (!timeValidation.valid) {
    throw new Error(timeValidation.errors.join(", "));
  }

  // Calcular duración
  const durationMinutes = calculateDurationMinutes(data.startTime, data.endTime);

  // Obtener configuración para validaciones
  const config = await prisma.shiftConfiguration.findUnique({
    where: { orgId: user.orgId },
  });

  if (config) {
    // TODO: Obtener turnos existentes del empleado para validar
    // Por ahora solo validamos límites sin considerar turnos existentes
    // En Sprint 2.7 implementaremos validación completa cuando asignemos empleados

    // Validar que la duración no exceda límite diario
    if (config.maxDailyHours && durationMinutes > Number(config.maxDailyHours) * 60) {
      throw new Error(`El turno excede el límite de ${Number(config.maxDailyHours)}h diarias`);
    }
  }

  return await prisma.shift.create({
    data: {
      ...data,
      durationMinutes,
      orgId: user.orgId,
      createdById: user.userId,
      requiredHeadcount: data.requiredHeadcount ?? 1,
      shiftType: data.shiftType ?? "REGULAR",
    },
    include: {
      position: true,
      costCenter: true,
      template: true,
      assignments: true,
    },
  });
}

/**
 * Crear turnos desde plantilla
 */
export async function createShiftsFromTemplate(
  templateId: string,
  dateRange: { start: Date; end: Date },
  costCenterId: string,
) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para crear turnos en este centro");
  }

  // Obtener plantilla
  const template = await prisma.shiftTemplate.findFirst({
    where: {
      id: templateId,
      orgId: user.orgId,
    },
  });

  if (!template) {
    throw new Error("Plantilla no encontrada");
  }

  // Generar turnos para cada día en el rango
  const shifts = [];
  const currentDate = new Date(dateRange.start);

  while (currentDate <= dateRange.end) {
    shifts.push({
      date: new Date(currentDate),
      startTime: template.defaultStartTime,
      endTime: template.defaultEndTime,
      durationMinutes: template.durationMinutes,
      requiredHeadcount: template.defaultRequiredHeadcount,
      positionId: template.positionId,
      costCenterId,
      templateId: template.id,
      orgId: user.orgId,
      createdById: user.userId,
      shiftType: "REGULAR" as ShiftType,
      status: "DRAFT" as ShiftStatus,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Crear todos los turnos
  await prisma.shift.createMany({ data: shifts });

  // Retornar los turnos creados
  return await getShifts({
    costCenterId,
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
  });
}

/**
 * Actualizar turno
 */
export async function updateShift(
  id: string,
  data: Partial<{
    date: Date;
    startTime: string;
    endTime: string;
    requiredHeadcount: number;
    positionId: string | null;
    shiftType: ShiftType;
    notes: string | null;
  }>,
) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar que el turno existe
  const shift = await prisma.shift.findFirst({
    where: {
      id,
      orgId: user.orgId,
    },
  });

  if (!shift) {
    throw new Error("Turno no encontrado");
  }

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, shift.costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para editar este turno");
  }

  // No permitir editar turnos cerrados
  if (shift.status === "CLOSED") {
    throw new Error("No se puede editar un turno cerrado");
  }

  // Validar horarios si se modifican
  const startTime = data.startTime ?? shift.startTime;
  const endTime = data.endTime ?? shift.endTime;

  const timeValidation = validateShiftTimes(startTime, endTime);
  if (!timeValidation.valid) {
    throw new Error(timeValidation.errors.join(", "));
  }

  // Recalcular duración si cambió el horario
  const updateData: typeof data & { durationMinutes?: number } = { ...data };
  if (data.startTime || data.endTime) {
    updateData.durationMinutes = calculateDurationMinutes(startTime, endTime);
  }

  // Validar límites de configuración
  if (updateData.durationMinutes) {
    const config = await prisma.shiftConfiguration.findUnique({
      where: { orgId: user.orgId },
    });

    if (config?.maxDailyHours && updateData.durationMinutes > Number(config.maxDailyHours) * 60) {
      throw new Error(`El turno excede el límite de ${Number(config.maxDailyHours)}h diarias`);
    }
  }

  return await prisma.shift.update({
    where: { id },
    data: updateData,
    include: {
      position: true,
      costCenter: true,
      template: true,
      assignments: true,
    },
  });
}

/**
 * Eliminar turno
 */
export async function deleteShift(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar que el turno existe
  const shift = await prisma.shift.findFirst({
    where: {
      id,
      orgId: user.orgId,
    },
  });

  if (!shift) {
    throw new Error("Turno no encontrado");
  }

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, shift.costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para eliminar este turno");
  }

  // No permitir eliminar turnos publicados o cerrados
  if (shift.status === "PUBLISHED" || shift.status === "CLOSED") {
    throw new Error("No se puede eliminar un turno publicado o cerrado");
  }

  await prisma.shift.delete({
    where: { id },
  });
}

/**
 * Duplicar turno a nueva fecha
 */
export async function duplicateShift(id: string, newDate: Date) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Obtener turno original
  const originalShift = await prisma.shift.findFirst({
    where: {
      id,
      orgId: user.orgId,
    },
  });

  if (!originalShift) {
    throw new Error("Turno no encontrado");
  }

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, originalShift.costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para duplicar este turno");
  }

  // Crear nuevo turno
  return await prisma.shift.create({
    data: {
      date: newDate,
      startTime: originalShift.startTime,
      endTime: originalShift.endTime,
      durationMinutes: originalShift.durationMinutes,
      requiredHeadcount: originalShift.requiredHeadcount,
      positionId: originalShift.positionId,
      costCenterId: originalShift.costCenterId,
      templateId: originalShift.templateId,
      shiftType: originalShift.shiftType,
      notes: originalShift.notes,
      orgId: user.orgId,
      createdById: user.userId,
    },
    include: {
      position: true,
      costCenter: true,
      template: true,
    },
  });
}

/**
 * Copiar todos los turnos de una semana a otra
 */
export async function copyWeekShifts(fromWeek: Date, toWeek: Date, costCenterId: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para copiar turnos en este centro");
  }

  // Calcular rango de fechas de la semana origen (lunes a domingo)
  const startOfWeek = new Date(fromWeek);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Lunes
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6); // Domingo

  // Obtener turnos de la semana origen
  const originalShifts = await prisma.shift.findMany({
    where: {
      orgId: user.orgId,
      costCenterId,
      date: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
  });

  if (originalShifts.length === 0) {
    throw new Error("No hay turnos en la semana origen");
  }

  // Calcular diferencia de días entre semanas
  const daysDiff = Math.floor((toWeek.getTime() - fromWeek.getTime()) / (1000 * 60 * 60 * 24));

  // Crear nuevos turnos
  const newShifts = originalShifts.map((shift) => {
    const newDate = new Date(shift.date);
    newDate.setDate(newDate.getDate() + daysDiff);

    return {
      date: newDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      durationMinutes: shift.durationMinutes,
      requiredHeadcount: shift.requiredHeadcount,
      positionId: shift.positionId,
      costCenterId: shift.costCenterId,
      templateId: shift.templateId,
      shiftType: shift.shiftType,
      notes: shift.notes,
      orgId: user.orgId,
      createdById: user.userId,
      status: "DRAFT" as ShiftStatus,
    };
  });

  await prisma.shift.createMany({ data: newShifts });

  return newShifts.length;
}

// ==================== ASIGNACIONES ====================

/**
 * Obtener asignaciones de turnos
 */
export async function getShiftAssignments(filters: {
  shiftId?: string;
  employeeId?: string;
  costCenterId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  return await prisma.shiftAssignment.findMany({
    where: {
      shift: {
        orgId: user.orgId,
        ...(filters.costCenterId && { costCenterId: filters.costCenterId }),
        ...(filters.dateFrom && { date: { gte: filters.dateFrom } }),
        ...(filters.dateTo && { date: { lte: filters.dateTo } }),
      },
      ...(filters.shiftId && { shiftId: filters.shiftId }),
      ...(filters.employeeId && { employeeId: filters.employeeId }),
    },
    include: {
      shift: {
        include: {
          costCenter: true,
          position: true,
        },
      },
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Asignar empleado a turno
 */
export async function assignEmployeeToShift(shiftId: string, employeeId: string, notes?: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar que el turno existe
  const shift = await prisma.shift.findFirst({
    where: {
      id: shiftId,
      orgId: user.orgId,
    },
  });

  if (!shift) {
    throw new Error("Turno no encontrado");
  }

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, shift.costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para asignar empleados en este centro");
  }

  // Verificar que el empleado existe y es de la organización
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      orgId: user.orgId,
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  // Verificar que no está ya asignado
  const existing = await prisma.shiftAssignment.findUnique({
    where: {
      shiftId_employeeId: {
        shiftId,
        employeeId,
      },
    },
  });

  if (existing) {
    throw new Error("El empleado ya está asignado a este turno");
  }

  // TODO: Validaciones de Sprint 2.6 (solapes, descansos, límites)

  return await prisma.shiftAssignment.create({
    data: {
      shiftId,
      employeeId,
      notes,
      assignedById: user.userId,
    },
    include: {
      shift: true,
      employee: true,
    },
  });
}

/**
 * Desasignar empleado de turno
 */
export async function unassignEmployeeFromShift(assignmentId: string): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar que la asignación existe
  const assignment = await prisma.shiftAssignment.findFirst({
    where: {
      id: assignmentId,
    },
    include: {
      shift: true,
    },
  });

  if (!assignment) {
    throw new Error("Asignación no encontrada");
  }

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, assignment.shift.costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para desasignar empleados en este centro");
  }

  // No permitir desasignar de turnos cerrados
  if (assignment.shift.status === "CLOSED") {
    throw new Error("No se puede desasignar de un turno cerrado");
  }

  await prisma.shiftAssignment.delete({
    where: { id: assignmentId },
  });
}

/**
 * Asignación masiva de empleados a múltiples turnos
 */
export async function bulkAssignEmployees(shiftIds: string[], employeeIds: string[]) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  const assignments = [];

  for (const shiftId of shiftIds) {
    for (const employeeId of employeeIds) {
      // Verificar que no existe ya
      const existing = await prisma.shiftAssignment.findUnique({
        where: {
          shiftId_employeeId: {
            shiftId,
            employeeId,
          },
        },
      });

      if (!existing) {
        assignments.push({
          shiftId,
          employeeId,
          assignedById: user.id,
        });
      }
    }
  }

  if (assignments.length === 0) {
    return [];
  }

  await prisma.shiftAssignment.createMany({ data: assignments });

  return assignments;
}

/**
 * Obtener empleados disponibles para asignar a un turno
 * Retorna empleados del centro de coste del turno que están activos
 */
export async function getAvailableEmployeesForShift(costCenterId: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos
  const canPlan = await canUserPlanShifts(user.userId, costCenterId);
  if (!canPlan) {
    throw new Error("No autorizado para ver empleados de este centro");
  }

  // Obtener empleados del centro con contrato activo
  const employees = await prisma.employee.findMany({
    where: {
      orgId: user.orgId,
      active: true,
      employmentContracts: {
        some: {
          active: true,
          costCenterId,
        },
      },
    },
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      secondLastName: true,
      email: true,
      photoUrl: true,
      employmentContracts: {
        where: {
          active: true,
          costCenterId,
        },
        select: {
          position: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Formatear respuesta
  return employees.map((emp) => ({
    id: emp.id,
    employeeNumber: emp.employeeNumber,
    firstName: emp.firstName,
    lastName: emp.lastName,
    secondLastName: emp.secondLastName,
    email: emp.email,
    photoUrl: emp.photoUrl,
    position: emp.employmentContracts[0]?.position ?? null,
  }));
}

// ==================== HELPERS ====================

// Función calculateDurationMinutes ahora se importa desde @/lib/shifts/validations

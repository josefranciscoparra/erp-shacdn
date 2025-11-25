"use server";

/**
 * Sistema de Horarios V2.0 - Server Actions
 *
 * Lógica de negocio para el nuevo sistema flexible de horarios:
 * - Resolución de horario efectivo (prioridades)
 * - CRUD de plantillas, períodos, patrones
 * - Asignación a empleados
 * - Cálculo de horarios semanales
 */

import {
  startOfWeek,
  endOfWeek,
  addDays,
  isBefore,
  isAfter,
  isWithinInterval,
  differenceInDays,
  differenceInMinutes,
} from "date-fns";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { minutesToHours } from "@/lib/schedule-helpers";
import type {
  EffectiveSchedule,
  EffectiveTimeSlot,
  WeekSchedule,
  ActionResponse,
  CreateScheduleTemplateInput,
  CreateSchedulePeriodInput,
  UpdateWorkDayPatternInput,
  CreateEmployeeScheduleAssignmentInput,
  ScheduleTemplateFilters,
  CreateManualShiftAssignmentInput,
  CreateShiftRotationPatternInput,
  CreateShiftRotationStepInput,
  ManualShiftStatus,
  ScheduleValidationConflict,
} from "@/types/schedule";

// ============================================================================
// Helpers Internos
// ============================================================================

/**
 * Obtiene la sesión actual o lanza error
 */
async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }
  return session;
}

/**
 * Verifica que el usuario pertenezca a una organización
 */
async function requireOrg() {
  const session = await requireAuth();
  if (!session.user.orgId) {
    throw new Error("Usuario sin organización");
  }
  return { session, orgId: session.user.orgId };
}

// ============================================================================
// RESOLUCIÓN DE HORARIO EFECTIVO (Core Logic)
// ============================================================================

/**
 * Obtiene el horario efectivo de un empleado para un día específico
 *
 * Aplica la lógica de prioridades:
 * 1. Ausencias (vacaciones/permisos) → No trabaja
 * 2. Excepciones de día específico
 * 3. Período activo (SPECIAL > INTENSIVE > REGULAR por fechas)
 * 4. Plantilla base
 *
 * @param employeeId ID del empleado
 * @param date Fecha a consultar
 * @returns Horario efectivo para ese día
 */
export async function getEffectiveSchedule(employeeId: string, date: Date): Promise<EffectiveSchedule> {
  const { orgId } = await requireOrg();

  // 1. Verificar ausencias (vacaciones, permisos)
  const absence = await prisma.ptoRequest.findFirst({
    where: {
      employeeId,
      orgId,
      status: "APPROVED",
      startDate: { lte: date },
      endDate: { gte: date },
    },
    include: {
      absenceType: true,
    },
  });

  if (absence) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "ABSENCE",
      absence: {
        type: absence.absenceType.name,
        reason: absence.reason ?? undefined,
      },
    };
  }

  // 2. Buscar excepción de día
  const exception = await prisma.exceptionDayOverride.findFirst({
    where: {
      OR: [
        { employeeId, date }, // Excepción específica del empleado
        { employeeId: null, date }, // Excepción general para todos
      ],
      orgId,
    },
    include: {
      overrideSlots: true,
    },
  });

  if (exception) {
    const timeSlots: EffectiveTimeSlot[] = exception.overrideSlots.map((slot) => ({
      startMinutes: slot.startTimeMinutes,
      endMinutes: slot.endTimeMinutes,
      slotType: slot.slotType,
      presenceType: slot.presenceType,
      isMandatory: slot.presenceType === "MANDATORY",
      description: slot.description ?? undefined,
    }));

    const expectedMinutes = timeSlots
      .filter((slot) => slot.slotType === "WORK")
      .reduce((sum, slot) => sum + (slot.endMinutes - slot.startMinutes), 0);

    return {
      date,
      isWorkingDay: timeSlots.length > 0,
      expectedMinutes,
      timeSlots,
      source: "EXCEPTION",
      periodName: exception.reason ?? "Día excepcional",
    };
  }

  // 3. Obtener asignación activa del empleado
  const assignment = await prisma.employeeScheduleAssignment.findFirst({
    where: {
      employeeId,
      isActive: true,
      validFrom: { lte: date },
      OR: [{ validTo: null }, { validTo: { gte: date } }],
    },
    include: {
      scheduleTemplate: {
        include: {
          periods: {
            include: {
              workDayPatterns: {
                include: {
                  timeSlots: true,
                },
              },
            },
          },
        },
      },
      rotationPattern: {
        include: {
          steps: {
            include: {
              scheduleTemplate: {
                include: {
                  periods: {
                    include: {
                      workDayPatterns: {
                        include: {
                          timeSlots: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              stepOrder: "asc",
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "NO_ASSIGNMENT",
    };
  }

  // 4. Si es rotación, calcular qué step toca
  let template = assignment.scheduleTemplate;

  if (assignment.assignmentType === "ROTATION" && assignment.rotationPattern && assignment.rotationStartDate) {
    const daysSinceStart = differenceInDays(date, assignment.rotationStartDate);

    // Calcular en qué step de la rotación estamos
    let accumulatedDays = 0;
    let currentStep = assignment.rotationPattern.steps[0];

    for (const step of assignment.rotationPattern.steps) {
      if (daysSinceStart < accumulatedDays + step.durationDays) {
        currentStep = step;
        break;
      }
      accumulatedDays += step.durationDays;
    }

    // Si llegamos al final de la rotación, reiniciar
    const totalRotationDays = assignment.rotationPattern.steps.reduce((sum, step) => sum + step.durationDays, 0);
    const dayInRotation = daysSinceStart % totalRotationDays;

    accumulatedDays = 0;
    for (const step of assignment.rotationPattern.steps) {
      if (dayInRotation < accumulatedDays + step.durationDays) {
        currentStep = step;
        break;
      }
      accumulatedDays += step.durationDays;
    }

    template = currentStep?.scheduleTemplate ?? null;
  }

  if (!template) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "NO_ASSIGNMENT",
    };
  }

  // 5. Buscar periodo activo (SPECIAL > INTENSIVE > REGULAR)
  const activePeriods = template.periods.filter((period) => {
    const validFrom = period.validFrom ?? new Date("1900-01-01");
    const validTo = period.validTo ?? new Date("2100-12-31");
    return isWithinInterval(date, { start: validFrom, end: validTo });
  });

  // Ordenar por prioridad: SPECIAL > INTENSIVE > REGULAR
  const periodPriority = { SPECIAL: 3, INTENSIVE: 2, REGULAR: 1 };
  activePeriods.sort((a, b) => periodPriority[b.periodType] - periodPriority[a.periodType]);

  const period = activePeriods[0];

  if (!period) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "TEMPLATE",
    };
  }

  // 6. Obtener patrón del día de semana
  const dayOfWeek = date.getDay();
  const pattern = period.workDayPatterns.find((p) => p.dayOfWeek === dayOfWeek);

  if (!pattern || !pattern.isWorkingDay) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "PERIOD",
      periodName: period.name ?? period.periodType,
    };
  }

  // 7. Obtener time slots
  const timeSlots: EffectiveTimeSlot[] = pattern.timeSlots.map((slot) => ({
    startMinutes: slot.startTimeMinutes,
    endMinutes: slot.endTimeMinutes,
    slotType: slot.slotType,
    presenceType: slot.presenceType,
    isMandatory: slot.presenceType === "MANDATORY",
    description: slot.description ?? undefined,
  }));

  const expectedMinutes = timeSlots
    .filter((slot) => slot.slotType === "WORK")
    .reduce((sum, slot) => sum + (slot.endMinutes - slot.startMinutes), 0);

  return {
    date,
    isWorkingDay: true,
    expectedMinutes,
    timeSlots,
    source: "PERIOD",
    periodName: period.name ?? period.periodType,
  };
}

/**
 * Obtiene el horario semanal completo de un empleado
 *
 * @param employeeId ID del empleado
 * @param weekStart Inicio de la semana (lunes)
 * @returns Horario completo de la semana (7 días)
 */
export async function getWeekSchedule(employeeId: string, weekStart: Date): Promise<WeekSchedule> {
  await requireOrg();

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days: EffectiveSchedule[] = [];

  // Generar horario para cada día de la semana
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const schedule = await getEffectiveSchedule(employeeId, date);
    days.push(schedule);
  }

  const totalExpectedMinutes = days.reduce((sum, day) => sum + day.expectedMinutes, 0);

  return {
    weekStart,
    weekEnd,
    days,
    totalExpectedMinutes,
    totalExpectedHours: minutesToHours(totalExpectedMinutes),
  };
}

// ============================================================================
// CRUD de ScheduleTemplate
// ============================================================================

/**
 * Crea una nueva plantilla de horario
 */
export async function createScheduleTemplate(
  data: CreateScheduleTemplateInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { orgId } = await requireOrg();

    const template = await prisma.scheduleTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        templateType: data.templateType,
        orgId,
      },
    });

    return { success: true, data: { id: template.id } };
  } catch (error) {
    console.error("Error creating schedule template:", error);
    return {
      success: false,
      error: "Error al crear plantilla de horario",
    };
  }
}

/**
 * Actualiza una plantilla de horario existente
 */
export async function updateScheduleTemplate(
  id: string,
  data: Partial<CreateScheduleTemplateInput>,
): Promise<ActionResponse> {
  try {
    const { orgId } = await requireOrg();

    await prisma.scheduleTemplate.update({
      where: { id, orgId },
      data: {
        name: data.name,
        description: data.description,
        templateType: data.templateType,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating schedule template:", error);
    return {
      success: false,
      error: "Error al actualizar plantilla de horario",
    };
  }
}

/**
 * Elimina una plantilla de horario
 */
export async function deleteScheduleTemplate(id: string): Promise<ActionResponse> {
  try {
    const { orgId } = await requireOrg();

    // Verificar que no esté asignada a ningún empleado
    const assignmentsCount = await prisma.employeeScheduleAssignment.count({
      where: {
        scheduleTemplateId: id,
        isActive: true,
      },
    });

    if (assignmentsCount > 0) {
      return {
        success: false,
        error: `No se puede eliminar: ${assignmentsCount} empleado(s) tienen esta plantilla asignada`,
      };
    }

    await prisma.scheduleTemplate.delete({
      where: { id, orgId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting schedule template:", error);
    return {
      success: false,
      error: "Error al eliminar plantilla de horario",
    };
  }
}

/**
 * Duplica una plantilla de horario existente
 */
export async function duplicateScheduleTemplate(id: string, newName: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const { orgId } = await requireOrg();

    // Obtener plantilla original con toda su estructura
    const original = await prisma.scheduleTemplate.findUnique({
      where: { id, orgId },
      include: {
        periods: {
          include: {
            workDayPatterns: {
              include: {
                timeSlots: true,
              },
            },
          },
        },
      },
    });

    if (!original) {
      return { success: false, error: "Plantilla no encontrada" };
    }

    // Crear duplicado con toda la estructura
    const duplicate = await prisma.scheduleTemplate.create({
      data: {
        name: newName,
        description: original.description,
        templateType: original.templateType,
        orgId,
        periods: {
          create: original.periods.map((period) => ({
            periodType: period.periodType,
            name: period.name,
            validFrom: period.validFrom,
            validTo: period.validTo,
            workDayPatterns: {
              create: period.workDayPatterns.map((pattern) => ({
                dayOfWeek: pattern.dayOfWeek,
                isWorkingDay: pattern.isWorkingDay,
                timeSlots: {
                  create: pattern.timeSlots.map((slot) => ({
                    startTimeMinutes: slot.startTimeMinutes,
                    endTimeMinutes: slot.endTimeMinutes,
                    slotType: slot.slotType,
                    presenceType: slot.presenceType,
                    description: slot.description,
                  })),
                },
              })),
            },
          })),
        },
      },
    });

    return { success: true, data: { id: duplicate.id } };
  } catch (error) {
    console.error("Error duplicating schedule template:", error);
    return {
      success: false,
      error: "Error al duplicar plantilla de horario",
    };
  }
}

/**
 * Obtiene todas las plantillas de horario de la organización
 */
export async function getScheduleTemplates(filters?: ScheduleTemplateFilters) {
  const { orgId } = await requireOrg();

  const templates = await prisma.scheduleTemplate.findMany({
    where: {
      orgId,
      templateType: filters?.templateType,
      isActive: filters?.isActive,
      name: filters?.search ? { contains: filters.search, mode: "insensitive" } : undefined,
    },
    include: {
      periods: {
        include: {
          workDayPatterns: {
            include: {
              timeSlots: true,
            },
          },
        },
      },
      _count: {
        select: {
          employeeAssignments: {
            where: { isActive: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return templates;
}

/**
 * Obtiene una plantilla específica por ID
 */
export async function getScheduleTemplateById(id: string) {
  const { orgId } = await requireOrg();

  const template = await prisma.scheduleTemplate.findUnique({
    where: { id, orgId },
    include: {
      periods: {
        include: {
          workDayPatterns: {
            include: {
              timeSlots: true,
            },
            orderBy: { dayOfWeek: "asc" },
          },
        },
        orderBy: { periodType: "asc" },
      },
      employeeAssignments: {
        where: { isActive: true },
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
      _count: {
        select: {
          employeeAssignments: {
            where: { isActive: true },
          },
          periods: true,
        },
      },
    },
  });

  if (!template) return null;

  // Serializar Decimals a números para Next.js
  return {
    ...template,
    periods: template.periods.map((period) => ({
      ...period,
      workDayPatterns: period.workDayPatterns.map((pattern) => ({
        ...pattern,
        timeSlots: pattern.timeSlots.map((slot) => ({
          ...slot,
          startTimeMinutes: Number(slot.startTimeMinutes),
          endTimeMinutes: Number(slot.endTimeMinutes),
        })),
      })),
    })),
  };
}

// ============================================================================
// Gestión de SchedulePeriod
// ============================================================================

/**
 * Crea un nuevo período en una plantilla
 */
export async function createSchedulePeriod(data: CreateSchedulePeriodInput): Promise<ActionResponse<{ id: string }>> {
  try {
    const { orgId } = await requireOrg();

    // Verificar que la plantilla existe y pertenece a la org
    const template = await prisma.scheduleTemplate.findUnique({
      where: { id: data.scheduleTemplateId, orgId },
    });

    if (!template) {
      return { success: false, error: "Plantilla no encontrada" };
    }

    const period = await prisma.schedulePeriod.create({
      data: {
        scheduleTemplateId: data.scheduleTemplateId,
        periodType: data.periodType,
        name: data.name,
        validFrom: data.validFrom,
        validTo: data.validTo,
      },
    });

    return { success: true, data: { id: period.id } };
  } catch (error) {
    console.error("Error creating schedule period:", error);
    return { success: false, error: "Error al crear período" };
  }
}

/**
 * Actualiza un período existente
 */
export async function updateSchedulePeriod(
  id: string,
  data: Partial<CreateSchedulePeriodInput>,
): Promise<ActionResponse> {
  try {
    await requireOrg();

    await prisma.schedulePeriod.update({
      where: { id },
      data: {
        periodType: data.periodType,
        name: data.name,
        validFrom: data.validFrom,
        validTo: data.validTo,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating schedule period:", error);
    return { success: false, error: "Error al actualizar período" };
  }
}

/**
 * Elimina un período
 */
export async function deleteSchedulePeriod(id: string): Promise<ActionResponse> {
  try {
    await requireOrg();

    await prisma.schedulePeriod.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting schedule period:", error);
    return { success: false, error: "Error al eliminar período" };
  }
}

// ============================================================================
// Gestión de WorkDayPattern + TimeSlot
// ============================================================================

/**
 * Actualiza el patrón de un día de la semana en un período
 * Reemplaza completamente los time slots del día
 */
export async function updateWorkDayPattern(
  periodId: string,
  dayOfWeek: number,
  data: UpdateWorkDayPatternInput,
): Promise<ActionResponse> {
  try {
    await requireOrg();

    // Buscar o crear el patrón del día
    let pattern = await prisma.workDayPattern.findFirst({
      where: {
        schedulePeriodId: periodId,
        dayOfWeek,
      },
    });

    if (!pattern) {
      pattern = await prisma.workDayPattern.create({
        data: {
          schedulePeriodId: periodId,
          dayOfWeek,
          isWorkingDay: data.isWorkingDay,
        },
      });
    } else {
      // Actualizar workingDay flag
      pattern = await prisma.workDayPattern.update({
        where: { id: pattern.id },
        data: { isWorkingDay: data.isWorkingDay },
      });
    }

    // Eliminar todos los time slots existentes
    await prisma.timeSlot.deleteMany({
      where: { workDayPatternId: pattern.id },
    });

    // Crear los nuevos time slots
    if (data.timeSlots.length > 0) {
      await prisma.timeSlot.createMany({
        data: data.timeSlots.map((slot) => ({
          workDayPatternId: pattern.id,
          startTimeMinutes: slot.startTimeMinutes,
          endTimeMinutes: slot.endTimeMinutes,
          slotType: slot.slotType,
          presenceType: slot.presenceType,
          description: slot.description,
        })),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating work day pattern:", error);
    return { success: false, error: "Error al actualizar patrón del día" };
  }
}

/**
 * Copia el patrón de un día a otros días de la semana
 */
export async function copyWorkDayPattern(
  periodId: string,
  sourceDayOfWeek: number,
  targetDaysOfWeek: number[],
): Promise<ActionResponse> {
  try {
    await requireOrg();

    // Obtener patrón fuente
    const sourcePattern = await prisma.workDayPattern.findFirst({
      where: {
        schedulePeriodId: periodId,
        dayOfWeek: sourceDayOfWeek,
      },
      include: {
        timeSlots: true,
      },
    });

    if (!sourcePattern) {
      return { success: false, error: "Patrón fuente no encontrado" };
    }

    // Copiar a cada día destino
    for (const targetDay of targetDaysOfWeek) {
      await updateWorkDayPattern(periodId, targetDay, {
        isWorkingDay: sourcePattern.isWorkingDay,
        timeSlots: sourcePattern.timeSlots.map((slot) => ({
          startTimeMinutes: slot.startTimeMinutes,
          endTimeMinutes: slot.endTimeMinutes,
          slotType: slot.slotType,
          presenceType: slot.presenceType,
          description: slot.description ?? undefined,
        })),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error copying work day pattern:", error);
    return { success: false, error: "Error al copiar patrón" };
  }
}

// ============================================================================
// Gestión de EmployeeScheduleAssignment
// ============================================================================

/**
 * Asigna un horario a un empleado
 */
export async function assignScheduleToEmployee(
  data: CreateEmployeeScheduleAssignmentInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { orgId } = await requireOrg();

    // Verificar que el empleado existe y pertenece a la org
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId, orgId },
    });

    if (!employee) {
      return { success: false, error: "Empleado no encontrado" };
    }

    // Si se está asignando una plantilla, inferir el assignmentType del templateType
    let assignmentType = data.assignmentType;
    if (data.scheduleTemplateId && !assignmentType) {
      const template = await prisma.scheduleTemplate.findUnique({
        where: { id: data.scheduleTemplateId },
        select: { templateType: true },
      });
      if (template) {
        // Mapear templateType a assignmentType (son iguales en este caso)
        assignmentType = template.templateType as any;
      }
    }

    // Si aún no hay assignmentType, usar FIXED como default
    if (!assignmentType) {
      assignmentType = "FIXED" as any;
    }

    // Cerrar fecha de asignaciones anteriores que se solapen
    // En lugar de desactivarlas (isActive: false), ajustamos su validTo
    // al día anterior del nuevo horario para mantener el historial correcto
    const dayBeforeNew = new Date(data.validFrom);
    dayBeforeNew.setDate(dayBeforeNew.getDate() - 1);
    dayBeforeNew.setHours(23, 59, 59, 999);

    await prisma.employeeScheduleAssignment.updateMany({
      where: {
        employeeId: data.employeeId,
        isActive: true,
        OR: [
          {
            validFrom: { lte: data.validTo ?? new Date("2100-12-31") },
            validTo: { gte: data.validFrom },
          },
          {
            validFrom: { lte: data.validTo ?? new Date("2100-12-31") },
            validTo: null,
          },
        ],
      },
      data: {
        validTo: dayBeforeNew,
        // Mantenemos isActive: true para que las consultas históricas funcionen
      },
    });

    // Crear nueva asignación
    const assignment = await prisma.employeeScheduleAssignment.create({
      data: {
        employeeId: data.employeeId,
        assignmentType: assignmentType,
        scheduleTemplateId: data.scheduleTemplateId,
        rotationPatternId: data.rotationPatternId,
        rotationStartDate: data.rotationStartDate,
        validFrom: data.validFrom,
        validTo: data.validTo,
        isActive: true,
      },
    });

    return { success: true, data: { id: assignment.id } };
  } catch (error) {
    console.error("Error assigning schedule to employee:", error);
    return { success: false, error: "Error al asignar horario" };
  }
}

/**
 * Obtiene el horario asignado actualmente a un empleado
 */
export async function getEmployeeCurrentAssignment(employeeId: string) {
  const { orgId } = await requireOrg();

  const assignment = await prisma.employeeScheduleAssignment.findFirst({
    where: {
      employeeId,
      isActive: true,
      validFrom: { lte: new Date() },
      OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
    },
    include: {
      scheduleTemplate: {
        include: {
          periods: {
            include: {
              workDayPatterns: {
                include: {
                  timeSlots: true,
                },
                orderBy: { dayOfWeek: "asc" },
              },
            },
          },
        },
      },
      rotationPattern: {
        include: {
          steps: {
            include: {
              scheduleTemplate: true,
            },
            orderBy: { stepOrder: "asc" },
          },
        },
      },
    },
  });

  return assignment;
}

/**
 * Obtiene el historial de asignaciones de un empleado
 */
export async function getEmployeeAssignmentHistory(employeeId: string) {
  const { orgId } = await requireOrg();

  const assignments = await prisma.employeeScheduleAssignment.findMany({
    where: { employeeId },
    include: {
      scheduleTemplate: true,
      rotationPattern: true,
    },
    orderBy: { validFrom: "desc" },
  });

  return assignments;
}

/**
 * Termina la asignación actual de un empleado
 */
export async function endEmployeeAssignment(assignmentId: string, endDate: Date): Promise<ActionResponse> {
  try {
    await requireOrg();

    await prisma.employeeScheduleAssignment.update({
      where: { id: assignmentId },
      data: {
        validTo: endDate,
        isActive: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error ending employee assignment:", error);
    return { success: false, error: "Error al finalizar asignación" };
  }
}

/**
 * Obtiene los empleados asignados a una plantilla de horario
 */
export async function getTemplateAssignedEmployees(templateId: string) {
  try {
    const { orgId } = await requireOrg();

    const assignments = await prisma.employeeScheduleAssignment.findMany({
      where: {
        scheduleTemplateId: templateId,
        isActive: true,
      },
      include: {
        employee: {
          include: {
            employmentContracts: {
              where: { active: true },
              take: 1,
              select: {
                department: {
                  select: { name: true },
                },
              },
              orderBy: { startDate: "desc" },
            },
          },
        },
      },
      orderBy: {
        employee: {
          lastName: "asc",
        },
      },
    });

    return assignments.map((assignment) => ({
      id: assignment.id,
      employeeId: assignment.employeeId,
      employeeNumber: assignment.employee.employeeNumber ?? "Sin número",
      fullName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
      email: assignment.employee.email ?? "",
      department: assignment.employee.employmentContracts[0]?.department?.name ?? "Sin departamento",
      validFrom: assignment.validFrom,
      validTo: assignment.validTo,
      isActive: assignment.isActive,
    }));
  } catch (error) {
    console.error("Error getting assigned employees:", error);
    return [];
  }
}

/**
 * Obtiene los empleados disponibles para asignar a una plantilla
 * (empleados que no tienen asignación activa a esta plantilla)
 */
export async function getAvailableEmployeesForTemplate(templateId: string) {
  try {
    const { orgId } = await requireOrg();

    console.log("🔍 [getAvailableEmployeesForTemplate] orgId:", orgId);
    console.log("🔍 [getAvailableEmployeesForTemplate] templateId:", templateId);

    // Obtener IDs de empleados ya asignados
    const assignedEmployeeIds = await prisma.employeeScheduleAssignment.findMany({
      where: {
        scheduleTemplateId: templateId,
        isActive: true,
      },
      select: {
        employeeId: true,
      },
    });

    const assignedIds = assignedEmployeeIds.map((a) => a.employeeId);
    console.log("🔍 [getAvailableEmployeesForTemplate] assignedIds:", assignedIds);

    // Primero verificar cuántos empleados activos hay en total
    const totalActive = await prisma.employee.count({
      where: {
        orgId,
        active: true,
      },
    });
    console.log("🔍 [getAvailableEmployeesForTemplate] Total empleados activos:", totalActive);

    // Obtener empleados NO asignados
    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        active: true,
        ...(assignedIds.length > 0 && {
          id: {
            notIn: assignedIds,
          },
        }),
      },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
          select: {
            department: {
              select: { name: true },
            },
          },
          orderBy: { startDate: "desc" },
        },
      },
      orderBy: {
        employeeNumber: "asc",
      },
    });

    console.log("🔍 [getAvailableEmployeesForTemplate] Empleados encontrados:", employees.length);
    console.log("🔍 [getAvailableEmployeesForTemplate] Primer empleado:", employees[0]);

    return employees.map((employee) => ({
      id: employee.id,
      employeeNumber: employee.employeeNumber ?? "Sin número",
      fullName: `${employee.firstName} ${employee.lastName}`,
      email: employee.email ?? "",
      department: employee.employmentContracts[0]?.department?.name ?? "Sin departamento",
    }));
  } catch (error) {
    console.error("❌ Error getting available employees:");
    console.error(error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return [];
  }
}

// ============================================================================
// Asignación Masiva de Horarios
// ============================================================================

/**
 * Interfaz para filtros de asignación masiva
 */
export interface BulkAssignmentFilters {
  departmentIds?: string[];
  costCenterIds?: string[];
  contractType?: string;
  hasActiveContract?: boolean;
}

/**
 * Obtiene empleados disponibles para asignación masiva según filtros
 */
export async function getEmployeesForBulkAssignment(templateId: string, filters?: BulkAssignmentFilters) {
  try {
    const { orgId } = await requireOrg();

    // Obtener IDs de empleados ya asignados a esta plantilla
    const assignedEmployeeIds = await prisma.employeeScheduleAssignment.findMany({
      where: {
        scheduleTemplateId: templateId,
        isActive: true,
      },
      select: {
        employeeId: true,
      },
    });

    const assignedIds = assignedEmployeeIds.map((a) => a.employeeId);

    // Construir where clause según filtros
    const where: any = {
      orgId,
      active: true,
      ...(assignedIds.length > 0 && {
        id: {
          notIn: assignedIds,
        },
      }),
    };

    // Filtrar por departamento y/o centro de coste
    if (
      (filters?.departmentIds && filters.departmentIds.length > 0) ||
      (filters?.costCenterIds && filters.costCenterIds.length > 0)
    ) {
      const contractFilters: any = {
        active: true,
      };

      if (filters?.departmentIds && filters.departmentIds.length > 0) {
        contractFilters.departmentId = { in: filters.departmentIds };
      }

      if (filters?.costCenterIds && filters.costCenterIds.length > 0) {
        contractFilters.costCenterId = { in: filters.costCenterIds };
      }

      if (filters?.contractType) {
        contractFilters.contractType = filters.contractType;
      }

      where.employmentContracts = {
        some: contractFilters,
      };
    } else if (filters?.contractType) {
      // Si solo hay filtro de tipo de contrato
      where.employmentContracts = {
        some: {
          active: true,
          contractType: filters.contractType,
        },
      };
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
          select: {
            department: {
              select: { id: true, name: true },
            },
            contractType: true,
          },
          orderBy: { startDate: "desc" },
        },
      },
      orderBy: {
        employeeNumber: "asc",
      },
    });

    return employees.map((employee) => ({
      id: employee.id,
      employeeNumber: employee.employeeNumber ?? "Sin número",
      fullName: `${employee.firstName} ${employee.lastName}`,
      email: employee.email ?? "",
      department: employee.employmentContracts[0]?.department?.name ?? "Sin departamento",
      departmentId: employee.employmentContracts[0]?.department?.id ?? null,
      contractType: employee.employmentContracts[0]?.contractType ?? null,
    }));
  } catch (error) {
    console.error("❌ Error getting employees for bulk assignment:");
    console.error(error);
    return [];
  }
}

/**
 * Asigna un horario a múltiples empleados de forma masiva
 *
 * @param employeeIds Lista de IDs de empleados
 * @param scheduleTemplateId ID de la plantilla a asignar
 * @param validFrom Fecha de inicio de vigencia
 * @param validTo Fecha de fin de vigencia (opcional)
 * @returns Resultado de la operación con estadísticas
 */
export async function bulkAssignScheduleToEmployees(
  employeeIds: string[],
  scheduleTemplateId: string,
  validFrom: Date,
  validTo?: Date | null,
): Promise<ActionResponse<{ successCount: number; errorCount: number; errors: string[] }>> {
  try {
    const { orgId } = await requireOrg();

    // Validar que la plantilla existe
    const template = await prisma.scheduleTemplate.findUnique({
      where: { id: scheduleTemplateId, orgId },
      select: { id: true, name: true, templateType: true },
    });

    if (!template) {
      return { success: false, error: "Plantilla no encontrada" };
    }

    // Validar que todos los empleados existen y pertenecen a la org
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        orgId,
      },
      select: { id: true },
    });

    if (employees.length !== employeeIds.length) {
      return {
        success: false,
        error: `Solo se encontraron ${employees.length} de ${employeeIds.length} empleados`,
      };
    }

    // Asignar horario a cada empleado
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const employeeId of employeeIds) {
      try {
        const result = await assignScheduleToEmployee({
          employeeId,
          scheduleTemplateId,
          assignmentType: template.templateType as any, // Usar el tipo de la plantilla
          validFrom,
          validTo: validTo ?? undefined,
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`${employeeId}: ${result.error ?? "Error desconocido"}`);
        }
      } catch (error) {
        errorCount++;
        errors.push(`${employeeId}: ${error instanceof Error ? error.message : "Error desconocido"}`);
      }
    }

    return {
      success: successCount > 0,
      data: {
        successCount,
        errorCount,
        errors,
      },
    };
  } catch (error) {
    console.error("Error in bulk assignment:", error);
    return {
      success: false,
      error: "Error al asignar horarios masivamente",
    };
  }
}

/**
 * Obtiene todos los departamentos de la organización para filtros
 */
export async function getDepartmentsForFilters() {
  try {
    const { orgId } = await requireOrg();

    const departments = await prisma.department.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            employmentContracts: {
              where: { active: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      employeeCount: dept._count.employmentContracts,
    }));
  } catch (error) {
    console.error("Error getting departments:", error);
    return [];
  }
}

/**
 * Obtiene todos los centros de coste de la organización para filtros
 */
export async function getCostCentersForFilters() {
  try {
    const { orgId } = await requireOrg();

    const costCenters = await prisma.costCenter.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: {
            employmentContracts: {
              where: { active: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return costCenters.map((cc) => ({
      id: cc.id,
      name: cc.name,
      code: cc.code ?? undefined,
      employeeCount: cc._count.employmentContracts,
    }));
  } catch (error) {
    console.error("Error getting cost centers:", error);
    return [];
  }
}

// ============================================================================
// SISTEMA DE EXCEPCIONES DE HORARIOS (FASE 7)
// ============================================================================

/**
 * Tipos de excepciones disponibles
 */
export type ExceptionTypeEnum =
  | "HOLIDAY"
  | "REDUCED_HOURS"
  | "SPECIAL_SCHEDULE"
  | "TRAINING"
  | "EARLY_CLOSURE"
  | "CUSTOM";

/**
 * Input para crear una excepción de horario
 */
export interface CreateExceptionDayInput {
  // Target (XOR: solo uno de estos puede estar activo)
  employeeId?: string; // 1. Empleado específico
  scheduleTemplateId?: string; // 2. Plantilla de horario
  isGlobal?: boolean; // 3. Toda la organización
  departmentId?: string; // 4. Por departamento
  costCenterId?: string; // 5. Por centro de costes

  // Fechas
  date: Date;
  endDate?: Date; // Para rangos de fechas

  // Metadata
  exceptionType: ExceptionTypeEnum;
  reason?: string;
  isRecurring?: boolean; // Excepción anual

  // Time slots personalizados
  timeSlots?: Array<{
    startTimeMinutes: number;
    endTimeMinutes: number;
    slotType: "WORK" | "BREAK" | "ON_CALL" | "OTHER";
    presenceType: "MANDATORY" | "FLEXIBLE";
  }>;
}

/**
 * Validación de time slots
 */
function validateTimeSlots(slots: Array<{ startTimeMinutes: number; endTimeMinutes: number }>): {
  valid: boolean;
  error?: string;
} {
  if (slots.length === 0) {
    return { valid: true }; // Día sin slots (festivo completo) es válido
  }

  // 1. Validar rangos válidos (0-1439)
  for (const slot of slots) {
    if (slot.startTimeMinutes < 0 || slot.startTimeMinutes > 1439) {
      return { valid: false, error: "Hora de inicio debe estar entre 0 y 1439 minutos" };
    }
    if (slot.endTimeMinutes < 0 || slot.endTimeMinutes > 1439) {
      return { valid: false, error: "Hora de fin debe estar entre 0 y 1439 minutos" };
    }
    if (slot.startTimeMinutes >= slot.endTimeMinutes) {
      return { valid: false, error: "Hora de inicio debe ser menor que hora de fin" };
    }
  }

  // 2. Validar que no se solapan
  const sorted = [...slots].sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current && next && current.endTimeMinutes > next.startTimeMinutes) {
      return { valid: false, error: "Los horarios no pueden solaparse" };
    }
  }

  return { valid: true };
}

/**
 * Crea una excepción de horario
 */
export async function createExceptionDay(input: CreateExceptionDayInput): Promise<ActionResponse<void>> {
  try {
    const { session, orgId } = await requireOrg();

    // Validación XOR: solo uno de los targets puede estar activo
    const targets = [
      input.employeeId,
      input.scheduleTemplateId,
      input.isGlobal,
      input.departmentId,
      input.costCenterId,
    ].filter(Boolean);

    if (targets.length === 0) {
      return {
        success: false,
        error: "Debe especificar un alcance: empleado, plantilla, global, departamento o centro de costes",
      };
    }
    if (targets.length > 1) {
      return {
        success: false,
        error: "Solo puede especificar un alcance a la vez",
      };
    }

    // Validar que el empleado/plantilla/departamento/centro existe y pertenece a la org
    if (input.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: input.employeeId },
        select: { orgId: true },
      });

      if (!employee || employee.orgId !== orgId) {
        return {
          success: false,
          error: "Empleado no encontrado o no pertenece a tu organización",
        };
      }
    }

    if (input.scheduleTemplateId) {
      const template = await prisma.scheduleTemplate.findUnique({
        where: { id: input.scheduleTemplateId },
        select: { orgId: true },
      });

      if (!template || template.orgId !== orgId) {
        return {
          success: false,
          error: "Plantilla no encontrada o no pertenece a tu organización",
        };
      }
    }

    if (input.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: input.departmentId },
        select: { orgId: true },
      });

      if (!department || department.orgId !== orgId) {
        return {
          success: false,
          error: "Departamento no encontrado o no pertenece a tu organización",
        };
      }
    }

    if (input.costCenterId) {
      const costCenter = await prisma.costCenter.findUnique({
        where: { id: input.costCenterId },
        select: { orgId: true },
      });

      if (!costCenter || costCenter.orgId !== orgId) {
        return {
          success: false,
          error: "Centro de costes no encontrado o no pertenece a tu organización",
        };
      }
    }

    // Validar time slots si existen
    if (input.timeSlots && input.timeSlots.length > 0) {
      const validation = validateTimeSlots(input.timeSlots);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }
    }

    // Validar fechas pasadas (avisar si es fecha pasada)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exceptionDate = new Date(input.date);
    exceptionDate.setHours(0, 0, 0, 0);

    if (exceptionDate < now) {
      // Permitimos fechas pasadas pero advertimos en logs
      console.warn(`Creando excepción para fecha pasada: ${exceptionDate.toISOString()}`);
    }

    // Validar que no exista ya una excepción para la misma fecha y target
    const existing = await prisma.exceptionDayOverride.findFirst({
      where: {
        orgId,
        employeeId: input.employeeId ?? null,
        scheduleTemplateId: input.scheduleTemplateId ?? null,
        isGlobal: input.isGlobal ?? false,
        departmentId: input.departmentId ?? null,
        costCenterId: input.costCenterId ?? null,
        date: {
          gte: input.date,
          lte: input.endDate ?? input.date,
        },
        deletedAt: null, // Solo activas
      },
    });

    if (existing) {
      return {
        success: false,
        error: "Ya existe una excepción para esta fecha y alcance",
      };
    }

    // Crear la excepción
    await prisma.exceptionDayOverride.create({
      data: {
        orgId,
        employeeId: input.employeeId,
        scheduleTemplateId: input.scheduleTemplateId,
        isGlobal: input.isGlobal ?? false,
        departmentId: input.departmentId,
        costCenterId: input.costCenterId,
        date: input.date,
        endDate: input.endDate,
        reason: input.reason,
        exceptionType: input.exceptionType,
        isRecurring: input.isRecurring ?? false,
        createdBy: session.user.id,
        overrideSlots: input.timeSlots
          ? {
              create: input.timeSlots.map((slot) => ({
                startTimeMinutes: slot.startTimeMinutes,
                endTimeMinutes: slot.endTimeMinutes,
                slotType: slot.slotType,
                presenceType: slot.presenceType,
              })),
            }
          : undefined,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating exception day:", error);
    return {
      success: false,
      error: "Error al crear la excepción de horario",
    };
  }
}

/**
 * Actualiza una excepción de horario existente
 */
export async function updateExceptionDay(
  input: Omit<CreateExceptionDayInput, "employeeId" | "scheduleTemplateId"> & { id: string },
): Promise<ActionResponse<void>> {
  try {
    const { session, orgId } = await requireOrg();

    // Verificar que la excepción existe y pertenece a la org
    const exception = await prisma.exceptionDayOverride.findUnique({
      where: { id: input.id },
      select: { orgId: true, deletedAt: true },
    });

    if (!exception || exception.orgId !== orgId) {
      return {
        success: false,
        error: "Excepción no encontrada o no pertenece a tu organización",
      };
    }

    if (exception.deletedAt) {
      return {
        success: false,
        error: "No se puede actualizar una excepción eliminada",
      };
    }

    // Validar time slots si existen
    if (input.timeSlots && input.timeSlots.length > 0) {
      const validation = validateTimeSlots(input.timeSlots);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }
    }

    // Actualizar la excepción
    await prisma.exceptionDayOverride.update({
      where: { id: input.id },
      data: {
        date: input.date,
        endDate: input.endDate,
        reason: input.reason,
        exceptionType: input.exceptionType,
        isRecurring: input.isRecurring ?? false,
        isGlobal: input.isGlobal ?? false,
        departmentId: input.departmentId ?? null,
        costCenterId: input.costCenterId ?? null,
        // Eliminar slots existentes y crear nuevos
        overrideSlots: {
          deleteMany: {},
          create: input.timeSlots?.map((slot) => ({
            startTimeMinutes: slot.startTimeMinutes,
            endTimeMinutes: slot.endTimeMinutes,
            slotType: slot.slotType,
            presenceType: slot.presenceType,
          })),
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating exception day:", error);
    return {
      success: false,
      error: "Error al actualizar la excepción de horario",
    };
  }
}

/**
 * Elimina (soft delete) una excepción de horario
 */
export async function deleteExceptionDay(exceptionId: string): Promise<ActionResponse<void>> {
  try {
    const { session, orgId } = await requireOrg();

    // Verificar que la excepción existe y pertenece a la org
    const exception = await prisma.exceptionDayOverride.findUnique({
      where: { id: exceptionId },
      select: { orgId: true, deletedAt: true },
    });

    if (!exception || exception.orgId !== orgId) {
      return {
        success: false,
        error: "Excepción no encontrada o no pertenece a tu organización",
      };
    }

    if (exception.deletedAt) {
      return {
        success: false,
        error: "La excepción ya está eliminada",
      };
    }

    // Soft delete
    await prisma.exceptionDayOverride.update({
      where: { id: exceptionId },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting exception day:", error);
    return {
      success: false,
      error: "Error al eliminar la excepción de horario",
    };
  }
}

/**
 * Obtiene todas las excepciones de una plantilla de horario
 */
export async function getExceptionDaysForTemplate(templateId: string) {
  try {
    const { orgId } = await requireOrg();

    // Verificar que la plantilla existe y pertenece a la org
    const template = await prisma.scheduleTemplate.findUnique({
      where: { id: templateId },
      select: { orgId: true },
    });

    if (!template || template.orgId !== orgId) {
      return [];
    }

    const exceptions = await prisma.exceptionDayOverride.findMany({
      where: {
        scheduleTemplateId: templateId,
        deletedAt: null,
      },
      include: {
        overrideSlots: {
          orderBy: { startTimeMinutes: "asc" },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    return exceptions;
  } catch (error) {
    console.error("Error getting exceptions for template:", error);
    return [];
  }
}

/**
 * Obtiene todas las excepciones de un empleado específico
 */
export async function getExceptionDaysForEmployee(employeeId: string) {
  try {
    const { orgId } = await requireOrg();

    // Verificar que el empleado existe y pertenece a la org
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { orgId: true },
    });

    if (!employee || employee.orgId !== orgId) {
      return [];
    }

    const exceptions = await prisma.exceptionDayOverride.findMany({
      where: {
        employeeId,
        deletedAt: null,
      },
      include: {
        overrideSlots: {
          orderBy: { startTimeMinutes: "asc" },
        },
        scheduleTemplate: {
          select: {
            name: true,
          },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    return exceptions;
  } catch (error) {
    console.error("Error getting exceptions for employee:", error);
    return [];
  }
}

/**
 * Obtiene todas las excepciones globales (organización, departamentos, centros de costes)
 */
export async function getAllGlobalExceptions() {
  try {
    const { orgId } = await requireOrg();

    const exceptions = await prisma.exceptionDayOverride.findMany({
      where: {
        orgId,
        deletedAt: null,
        OR: [{ isGlobal: true }, { departmentId: { not: null } }, { costCenterId: { not: null } }],
      },
      include: {
        overrideSlots: {
          orderBy: { startTimeMinutes: "asc" },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        costCenter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    return exceptions;
  } catch (error) {
    console.error("Error getting global exceptions:", error);
    return [];
  }
}

/**
 * Obtiene todos los departamentos activos de la organización
 */
export async function getDepartments() {
  try {
    const { orgId } = await requireOrg();

    const departments = await prisma.department.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return departments;
  } catch (error) {
    console.error("Error getting departments:", error);
    return [];
  }
}

/**
 * Obtiene todos los centros de costes activos de la organización
 */
export async function getCostCenters() {
  try {
    const { orgId } = await requireOrg();

    const costCenters = await prisma.costCenter.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return costCenters;
  } catch (error) {
    console.error("Error getting cost centers:", error);
    return [];
  }
}

// ============================================================================
// GESTIÓN DE ROTACIONES (Fase 8)
// ============================================================================

export async function createShiftRotationPattern(
  input: CreateShiftRotationPatternInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { orgId } = await requireOrg();

    const pattern = await prisma.shiftRotationPattern.create({
      data: {
        orgId,
        name: input.name,
        description: input.description,
        steps: {
          create: input.steps.map((step) => ({
            stepOrder: step.stepOrder,
            durationDays: step.durationDays,
            scheduleTemplateId: step.scheduleTemplateId,
          })),
        },
      },
    });

    return { success: true, data: { id: pattern.id } };
  } catch (error) {
    console.error("Error creating rotation pattern:", error);
    return { success: false, error: "Error al crear patrón de rotación" };
  }
}

export async function updateShiftRotationPattern(
  id: string,
  input: Partial<CreateShiftRotationPatternInput>,
): Promise<ActionResponse> {
  try {
    const { orgId } = await requireOrg();

    // Check ownership
    const existing = await prisma.shiftRotationPattern.findUnique({
      where: { id, orgId },
    });
    if (!existing) return { success: false, error: "Patrón no encontrado" };

    // Update
    await prisma.shiftRotationPattern.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
      },
    });

    // If steps provided, replace them (complex update)
    if (input.steps) {
      // Transaction to replace steps safely
      await prisma.$transaction(async (tx) => {
        await tx.shiftRotationStep.deleteMany({ where: { rotationPatternId: id } });
        await tx.shiftRotationStep.createMany({
          data: input.steps!.map((step) => ({
            rotationPatternId: id,
            stepOrder: step.stepOrder,
            durationDays: step.durationDays,
            scheduleTemplateId: step.scheduleTemplateId,
          })),
        });
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating rotation pattern:", error);
    return { success: false, error: "Error al actualizar patrón de rotación" };
  }
}

export async function deleteShiftRotationPattern(id: string): Promise<ActionResponse> {
  try {
    const { orgId } = await requireOrg();

    // Check usage in assignments
    const count = await prisma.employeeScheduleAssignment.count({
      where: { rotationPatternId: id, isActive: true },
    });

    if (count > 0) return { success: false, error: "No se puede eliminar: en uso por empleados activos" };

    await prisma.shiftRotationPattern.delete({
      where: { id, orgId },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting rotation pattern:", error);
    return { success: false, error: "Error al eliminar patrón de rotación" };
  }
}

export async function getShiftRotationPatterns() {
  try {
    const { orgId } = await requireOrg();
    return await prisma.shiftRotationPattern.findMany({
      where: { orgId },
      include: {
        steps: {
          include: { scheduleTemplate: { select: { id: true, name: true } } },
          orderBy: { stepOrder: "asc" },
        },
        _count: { select: { employeeAssignments: { where: { isActive: true } } } },
      },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Error getting rotation patterns:", error);
    return [];
  }
}

// ============================================================================
// GESTIÓN DE ASIGNACIONES MANUALES (Rostering / Planificación)
// ============================================================================

const DEFAULT_MIN_REST_MINUTES = 12 * 60; // 12h

type ManualAssignmentValidationParams = {
  orgId: string;
  employeeId: string;
  date: Date;
  startTimeMinutes?: number | null;
  endTimeMinutes?: number | null;
  scheduleTemplateId?: string | null;
  excludeAssignmentId?: string;
  minRestMinutes: number;
};

async function getOrgShiftValidationConfig(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { shiftMinRestMinutes: true },
  });

  return {
    minRestMinutes: org?.shiftMinRestMinutes ?? DEFAULT_MIN_REST_MINUTES,
  };
}

function combineDateAndMinutes(baseDate: Date, minutes?: number | null): Date | null {
  if (minutes === null || minutes === undefined) return null;
  const date = new Date(baseDate);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date;
}

function getAssignmentDateRange(
  date: Date,
  startMinutes?: number | null,
  endMinutes?: number | null,
): { start: Date; end: Date } | null {
  const start = combineDateAndMinutes(date, startMinutes);
  let end = combineDateAndMinutes(date, endMinutes);
  if (!start || !end) return null;
  if (end <= start) {
    end = addDays(end, 1);
  }
  return { start, end };
}

async function validateManualAssignmentInput(
  params: ManualAssignmentValidationParams,
): Promise<ScheduleValidationConflict[]> {
  const conflicts: ScheduleValidationConflict[] = [];
  const normalizedDate = normalizeAssignmentDate(params.date);
  const newRange = getAssignmentDateRange(normalizedDate, params.startTimeMinutes, params.endTimeMinutes);

  // 1. Validar unicidad por día (Schema Constraint: un solo turno por empleado y día)
  const existingOnDate = await prisma.manualShiftAssignment.findFirst({
    where: {
      orgId: params.orgId,
      employeeId: params.employeeId,
      date: normalizedDate,
      ...(params.excludeAssignmentId ? { id: { not: params.excludeAssignmentId } } : {}),
    },
    select: { id: true },
  });

  if (existingOnDate) {
    conflicts.push({
      type: "overlap",
      severity: "error",
      message: "El empleado ya tiene un turno asignado en esta fecha.",
      relatedAssignmentId: existingOnDate.id,
    });
  }

  // 2. Descanso mínimo (prev/next)
  if (newRange) {
    const prevAssignment = await prisma.manualShiftAssignment.findFirst({
      where: {
        orgId: params.orgId,
        employeeId: params.employeeId,
        date: { lt: normalizedDate },
        ...(params.excludeAssignmentId ? { id: { not: params.excludeAssignmentId } } : {}),
      },
      orderBy: { date: "desc" },
    });

    if (prevAssignment) {
      const prevRange = getAssignmentDateRange(
        normalizeAssignmentDate(prevAssignment.date),
        prevAssignment.startTimeMinutes,
        prevAssignment.endTimeMinutes,
      );
      if (prevRange) {
        const diffMinutes = differenceInMinutes(newRange.start, prevRange.end);
        if (diffMinutes < params.minRestMinutes) {
          conflicts.push({
            type: "min_rest",
            severity: "warning",
            message: `Descanso insuficiente (${diffMinutes} minutos) respecto al turno anterior. Mínimo requerido: ${params.minRestMinutes} minutos.`,
            relatedAssignmentId: prevAssignment.id,
          });
        }
      }
    }

    const nextAssignment = await prisma.manualShiftAssignment.findFirst({
      where: {
        orgId: params.orgId,
        employeeId: params.employeeId,
        date: { gt: normalizedDate },
        ...(params.excludeAssignmentId ? { id: { not: params.excludeAssignmentId } } : {}),
      },
      orderBy: { date: "asc" },
    });

    if (nextAssignment) {
      const nextRange = getAssignmentDateRange(
        normalizeAssignmentDate(nextAssignment.date),
        nextAssignment.startTimeMinutes,
        nextAssignment.endTimeMinutes,
      );
      if (nextRange) {
        const diffMinutes = differenceInMinutes(nextRange.start, newRange.end);
        if (diffMinutes < params.minRestMinutes) {
          conflicts.push({
            type: "min_rest",
            severity: "warning",
            message: `Descanso insuficiente (${diffMinutes} minutos) respecto al turno siguiente. Mínimo requerido: ${params.minRestMinutes} minutos.`,
            relatedAssignmentId: nextAssignment.id,
          });
        }
      }
    }
  }

  // 3. PTO / ausencias
  const absence = await prisma.ptoRequest.findFirst({
    where: {
      orgId: params.orgId,
      employeeId: params.employeeId,
      status: "APPROVED",
      startDate: { lte: normalizedDate },
      endDate: { gte: normalizedDate },
    },
    include: {
      absenceType: { select: { name: true } },
    },
  });

  if (absence) {
    conflicts.push({
      type: "absence",
      severity: "error",
      message: `El empleado está ausente (${absence.absenceType?.name ?? "Ausencia"}) en esta fecha.`,
    });
  }

  return conflicts;
}

type ManualShiftFilters = {
  employeeIds?: string[];
  costCenterId?: string;
  workZoneId?: string;
  statuses?: ManualShiftStatus[];
};

function normalizeAssignmentDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(12, 0, 0, 0);
  return normalized;
}

function getRangeBoundary(date: Date, isEnd = false): Date {
  const normalized = new Date(date);
  if (isEnd) {
    normalized.setUTCHours(23, 59, 59, 999);
  } else {
    normalized.setUTCHours(0, 0, 0, 0);
  }
  return normalized;
}

function buildManualAssignmentWhere(orgId: string, start: Date, end: Date, filters?: ManualShiftFilters) {
  const where: any = {
    orgId,
    date: {
      gte: start,
      lte: end,
    },
  };

  if (filters?.employeeIds && filters.employeeIds.length > 0) {
    where.employeeId = { in: filters.employeeIds };
  }

  if (filters?.costCenterId) {
    where.costCenterId = filters.costCenterId;
  }

  if (filters?.workZoneId) {
    where.workZoneId = filters.workZoneId;
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    where.status = { in: filters.statuses };
  }

  return where;
}

function resolveStatus(status?: ManualShiftStatus) {
  if (!status) {
    return { status: "DRAFT" as ManualShiftStatus, publishedAt: null };
  }

  return {
    status,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
  };
}

export async function createManualShiftAssignment(
  input: CreateManualShiftAssignmentInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { orgId } = await requireOrg();
    const normalizedDate = normalizeAssignmentDate(input.date);
    const { status, publishedAt } = resolveStatus(input.status);

    const { minRestMinutes } = await getOrgShiftValidationConfig(orgId);

    const validationConflicts = await validateManualAssignmentInput({
      orgId,
      employeeId: input.employeeId,
      date: normalizedDate,
      startTimeMinutes: input.startTimeMinutes,
      endTimeMinutes: input.endTimeMinutes,
      scheduleTemplateId: input.scheduleTemplateId ?? null,
      minRestMinutes,
    });

    if (validationConflicts.some((conflict) => conflict.severity === "error")) {
      return {
        success: false,
        error: "Se detectaron conflictos al crear el turno",
        validation: { conflicts: validationConflicts },
      };
    }

    const assignment = await prisma.manualShiftAssignment.upsert({
      where: {
        employeeId_date: {
          employeeId: input.employeeId,
          date: normalizedDate,
        },
      },
      update: {
        scheduleTemplateId: input.scheduleTemplateId ?? null,
        startTimeMinutes: input.startTimeMinutes,
        endTimeMinutes: input.endTimeMinutes,
        costCenterId: input.costCenterId,
        workZoneId: input.workZoneId,
        breakMinutes: input.breakMinutes,
        customRole: input.customRole,
        notes: input.notes,
        status,
        publishedAt,
      },
      create: {
        orgId,
        employeeId: input.employeeId,
        date: normalizedDate,
        scheduleTemplateId: input.scheduleTemplateId ?? null,
        startTimeMinutes: input.startTimeMinutes,
        endTimeMinutes: input.endTimeMinutes,
        costCenterId: input.costCenterId,
        workZoneId: input.workZoneId,
        breakMinutes: input.breakMinutes,
        customRole: input.customRole,
        notes: input.notes,
        status,
        publishedAt,
      },
    });

    return { success: true, data: { id: assignment.id }, validation: { conflicts: validationConflicts } };
  } catch (error) {
    console.error("Error creating manual assignment:", error);
    return { success: false, error: "Error al crear asignación manual" };
  }
}

export async function updateManualShiftAssignment(
  id: string,
  data: Partial<
    CreateManualShiftAssignmentInput & {
      employeeId: string;
      date: Date;
    }
  >,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { orgId } = await requireOrg();
    const existing = await prisma.manualShiftAssignment.findUnique({
      where: { id, orgId },
    });
    if (!existing) {
      return { success: false, error: "Turno no encontrado" };
    }

    // Validar y normalizar fecha
    const targetDate = data.date ? normalizeAssignmentDate(new Date(data.date)) : existing.date;

    const finalEmployeeId = data.employeeId ?? existing.employeeId;
    const finalStartMinutes = data.startTimeMinutes ?? existing.startTimeMinutes ?? undefined;
    const finalEndMinutes = data.endTimeMinutes ?? existing.endTimeMinutes ?? undefined;
    const finalTemplateId = data.scheduleTemplateId ?? existing.scheduleTemplateId ?? null;

    const { minRestMinutes } = await getOrgShiftValidationConfig(orgId);

    const validationConflicts = await validateManualAssignmentInput({
      orgId,
      employeeId: finalEmployeeId,
      date: targetDate,
      startTimeMinutes: finalStartMinutes,
      endTimeMinutes: finalEndMinutes,
      scheduleTemplateId: finalTemplateId,
      excludeAssignmentId: id,
      minRestMinutes,
    });

    if (validationConflicts.some((conflict) => conflict.severity === "error")) {
      return {
        success: false,
        error: "Se detectaron conflictos al actualizar el turno",
        validation: { conflicts: validationConflicts },
      };
    }

    const payload: any = {};

    if (data.employeeId) payload.employeeId = data.employeeId;
    if (data.date) payload.date = targetDate;
    if (data.scheduleTemplateId !== undefined) payload.scheduleTemplateId = data.scheduleTemplateId;
    if (data.startTimeMinutes !== undefined) payload.startTimeMinutes = data.startTimeMinutes;
    if (data.endTimeMinutes !== undefined) payload.endTimeMinutes = data.endTimeMinutes;
    if (data.costCenterId !== undefined) payload.costCenterId = data.costCenterId;
    if (data.workZoneId !== undefined) payload.workZoneId = data.workZoneId;
    if (data.breakMinutes !== undefined) payload.breakMinutes = data.breakMinutes;
    if (data.customRole !== undefined) payload.customRole = data.customRole;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.status) {
      const resolved = resolveStatus(data.status);
      payload.status = resolved.status;
      payload.publishedAt = resolved.publishedAt;
    }

    const assignment = await prisma.manualShiftAssignment.update({
      where: { id, orgId },
      data: payload,
    });

    return { success: true, data: { id: assignment.id }, validation: { conflicts: validationConflicts } };
  } catch (error: any) {
    console.error("[updateManualShiftAssignment] Error:", error?.message ?? error);
    return { success: false, error: "Error al actualizar asignación manual" };
  }
}

export async function getManualShiftAssignmentById(id: string) {
  try {
    const { orgId } = await requireOrg();
    return await prisma.manualShiftAssignment.findUnique({
      where: { id, orgId },
      include: {
        scheduleTemplate: { select: { id: true, name: true } },
        workZone: true,
      },
    });
  } catch (error) {
    console.error("Error getting manual assignment by id:", error);
    return null;
  }
}

export async function deleteManualShiftAssignment(employeeId: string, date: Date): Promise<ActionResponse> {
  try {
    const { orgId } = await requireOrg();
    const normalizedDate = normalizeAssignmentDate(date);

    await prisma.manualShiftAssignment.deleteMany({
      where: {
        orgId,
        employeeId,
        date: normalizedDate,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting manual assignment:", error);
    return { success: false, error: "Error al eliminar asignación manual" };
  }
}

export async function deleteManualShiftAssignmentById(id: string): Promise<ActionResponse> {
  try {
    const { orgId } = await requireOrg();

    await prisma.manualShiftAssignment.delete({
      where: { id, orgId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting manual assignment by ID:", error);
    return { success: false, error: "Error al eliminar asignación manual" };
  }
}

export async function getManualShiftAssignmentsForRange(
  employeeIds: string[] | undefined,
  startDate: Date,
  endDate: Date,
  filters?: Omit<ManualShiftFilters, "employeeIds">,
) {
  try {
    const { orgId } = await requireOrg();
    const start = getRangeBoundary(startDate);
    const end = getRangeBoundary(endDate, true);

    const where = buildManualAssignmentWhere(orgId, start, end, {
      employeeIds,
      costCenterId: filters?.costCenterId,
      workZoneId: filters?.workZoneId,
      statuses: filters?.statuses,
    });

    const assignments = await prisma.manualShiftAssignment.findMany({
      where,
      include: {
        scheduleTemplate: { select: { id: true, name: true } },
        workZone: true,
      },
      orderBy: [{ date: "asc" }],
    });

    return assignments;
  } catch (error) {
    console.error("Error getting manual assignments:", error);
    return [];
  }
}

export async function copyManualShiftAssignmentsFromWeek(
  sourceWeekStart: Date,
  targetWeekStart: Date,
  filters?: Omit<ManualShiftFilters, "statuses"> & { shouldOverwrite?: boolean },
): Promise<ActionResponse<{ copied: number; skipped: number }>> {
  try {
    const { orgId } = await requireOrg();
    const { minRestMinutes } = await getOrgShiftValidationConfig(orgId);
    const sourceStart = getRangeBoundary(sourceWeekStart);
    const sourceEnd = getRangeBoundary(addDays(sourceWeekStart, 6), true);
    const targetStart = getRangeBoundary(targetWeekStart);
    const targetEnd = getRangeBoundary(addDays(targetWeekStart, 6), true);
    const diff = differenceInDays(targetStart, sourceStart);

    const assignments = await getManualShiftAssignmentsForRange(filters?.employeeIds, sourceStart, sourceEnd, {
      costCenterId: filters?.costCenterId,
      workZoneId: filters?.workZoneId,
    });

    if (assignments.length === 0) {
      return { success: true, data: { copied: 0 } };
    }

    const operations: Array<any> = [];

    // 1. Si se solicita sobreescribir, añadir operación de borrado al principio
    if (filters?.shouldOverwrite) {
      const deleteWhere = buildManualAssignmentWhere(orgId, targetStart, targetEnd, {
        employeeIds: filters?.employeeIds,
        costCenterId: filters?.costCenterId,
        workZoneId: filters?.workZoneId,
      });
      operations.push(prisma.manualShiftAssignment.deleteMany({ where: deleteWhere }));
    }

    let skipped = 0;
    const validationConflicts: ScheduleValidationConflict[] = [];

    for (const assignment of assignments) {
      const targetDate = normalizeAssignmentDate(addDays(assignment.date, diff));
      const conflicts = await validateManualAssignmentInput({
        orgId,
        employeeId: assignment.employeeId,
        date: targetDate,
        startTimeMinutes: assignment.startTimeMinutes ?? undefined,
        endTimeMinutes: assignment.endTimeMinutes ?? undefined,
        scheduleTemplateId: assignment.scheduleTemplateId,
        minRestMinutes,
      });

      if (conflicts.some((conflict) => conflict.severity === "error")) {
        skipped += 1;
        validationConflicts.push(...conflicts);
        continue;
      }

      operations.push(
        prisma.manualShiftAssignment.upsert({
          where: {
            employeeId_date: {
              employeeId: assignment.employeeId,
              date: targetDate,
            },
          },
          update: {
            scheduleTemplateId: assignment.scheduleTemplateId,
            startTimeMinutes: assignment.startTimeMinutes,
            endTimeMinutes: assignment.endTimeMinutes,
            costCenterId: assignment.costCenterId,
            workZoneId: assignment.workZoneId,
            breakMinutes: assignment.breakMinutes,
            customRole: assignment.customRole,
            notes: assignment.notes,
            status: "DRAFT",
            publishedAt: null,
          },
          create: {
            orgId,
            employeeId: assignment.employeeId,
            date: targetDate,
            scheduleTemplateId: assignment.scheduleTemplateId,
            startTimeMinutes: assignment.startTimeMinutes,
            endTimeMinutes: assignment.endTimeMinutes,
            costCenterId: assignment.costCenterId,
            workZoneId: assignment.workZoneId,
            breakMinutes: assignment.breakMinutes,
            customRole: assignment.customRole,
            notes: assignment.notes,
            status: "DRAFT",
            publishedAt: null,
          },
        }),
      );
    }

    if (operations.length === 0) {
      return { success: true, data: { copied: 0, skipped } };
    }

    const results = await prisma.$transaction(operations);

    // Ajustar el conteo si hubo operación de borrado (el primer resultado es el deleteMany)
    const copiedCount = filters?.shouldOverwrite ? results.length - 1 : results.length;

    return {
      success: true,
      data: { copied: copiedCount, skipped },
      ...(validationConflicts.length > 0 ? { validation: { conflicts: validationConflicts } } : {}),
    };
  } catch (error) {
    console.error("Error copying manual assignments:", error);
    return { success: false, error: "Error al copiar turnos" };
  }
}

/**
 * Restaura un conjunto de turnos (Para funcionalidad Deshacer)
 * Primero limpia el rango de fechas afectado y luego recrea los turnos.
 */
export async function restoreManualShiftAssignments(shifts: any[]): Promise<ActionResponse> {
  try {
    const { orgId } = await requireOrg();

    if (shifts.length === 0) return { success: true };

    // Identificar rango de fechas para limpiar antes de restaurar
    const dates = shifts.map((s) => new Date(s.date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    // Normalizar límites
    const start = getRangeBoundary(startDate);
    const end = getRangeBoundary(endDate, true);

    await prisma.$transaction(async (tx) => {
      // 1. Limpiar el rango
      await tx.manualShiftAssignment.deleteMany({
        where: {
          orgId,
          date: { gte: start, lte: end },
        },
      });

      // 2. Recrear los turnos
      for (const shift of shifts) {
        // Convertir string dates a Date objects si es necesario
        const shiftDate = typeof shift.date === "string" ? new Date(shift.date) : shift.date;
        const normalizedDate = normalizeAssignmentDate(shiftDate);

        await tx.manualShiftAssignment.create({
          data: {
            orgId,
            employeeId: shift.employeeId,
            date: normalizedDate,
            startTimeMinutes: shift.startTimeMinutes,
            endTimeMinutes: shift.endTimeMinutes,
            scheduleTemplateId: shift.scheduleTemplateId,
            costCenterId: shift.costCenterId,
            workZoneId: shift.workZoneId,
            breakMinutes: shift.breakMinutes,
            customRole: shift.customRole,
            notes: shift.notes,
            status: shift.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT", // Mantener estado original si es posible
            publishedAt: shift.publishedAt ? new Date(shift.publishedAt) : null,
          },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error restoring assignments:", error);
    return { success: false, error: "Error al restaurar turnos" };
  }
}

export async function publishManualShiftAssignments(
  dateFrom: Date,
  dateTo: Date,
  filters?: ManualShiftFilters,
): Promise<ActionResponse<{ published: number }>> {
  try {
    const { orgId } = await requireOrg();
    const start = getRangeBoundary(dateFrom);
    const end = getRangeBoundary(dateTo, true);

    const where = buildManualAssignmentWhere(orgId, start, end, {
      employeeIds: filters?.employeeIds,
      costCenterId: filters?.costCenterId,
      workZoneId: filters?.workZoneId,
      statuses: filters?.statuses ?? ["DRAFT"],
    });

    const assignments = await prisma.manualShiftAssignment.findMany({ where, select: { id: true } });
    if (assignments.length === 0) {
      return { success: true, data: { published: 0 } };
    }

    const now = new Date();
    await prisma.manualShiftAssignment.updateMany({
      where: { id: { in: assignments.map((a) => a.id) } },
      data: { status: "PUBLISHED", publishedAt: now },
    });

    return { success: true, data: { published: assignments.length } };
  } catch (error) {
    console.error("Error publishing manual assignments:", error);
    return { success: false, error: "Error al publicar turnos" };
  }
}

export async function deleteMultipleManualShiftAssignments(ids: string[]): Promise<number> {
  try {
    const { orgId } = await requireOrg();
    const result = await prisma.manualShiftAssignment.deleteMany({
      where: { id: { in: ids }, orgId },
    });

    return result.count;
  } catch (error) {
    console.error("Error deleting manual assignments:", error);
    return 0;
  }
}

// ============================================================================
// Plantillas manuales de turnos (ShiftTemplate UI)
// ============================================================================

interface ManualShiftTemplateInput {
  name: string;
  description?: string;
  pattern: string[];
  shiftDurationMinutes: number;
  color?: string;
  isActive?: boolean;
}

interface ApplyManualShiftTemplateInput {
  templateId: string;
  employeeIds: string[];
  dateFrom: Date;
  dateTo: Date;
  costCenterId: string;
  workZoneId?: string;
  initialGroup?: number;
}

export async function getManualShiftTemplates() {
  try {
    const { orgId } = await requireOrg();
    return await prisma.manualShiftTemplate.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Error getting manual shift templates:", error);
    return [];
  }
}

export async function createManualShiftTemplate(data: ManualShiftTemplateInput) {
  try {
    const { orgId } = await requireOrg();
    const template = await prisma.manualShiftTemplate.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        pattern: data.pattern,
        shiftDurationMinutes: data.shiftDurationMinutes,
        color: data.color,
        isActive: data.isActive ?? true,
      },
    });

    return template;
  } catch (error) {
    console.error("Error creating manual shift template:", error);
    throw new Error("Error al crear plantilla manual");
  }
}

export async function updateManualShiftTemplate(id: string, data: Partial<ManualShiftTemplateInput>) {
  try {
    const { orgId } = await requireOrg();
    const template = await prisma.manualShiftTemplate.update({
      where: { id, orgId },
      data: {
        name: data.name,
        description: data.description,
        pattern: data.pattern,
        shiftDurationMinutes: data.shiftDurationMinutes,
        color: data.color,
        isActive: data.isActive,
      },
    });

    return template;
  } catch (error) {
    console.error("Error updating manual shift template:", error);
    throw new Error("Error al actualizar plantilla manual");
  }
}

export async function deleteManualShiftTemplate(id: string) {
  try {
    const { orgId } = await requireOrg();
    await prisma.manualShiftTemplate.delete({ where: { id, orgId } });
    return { success: true };
  } catch (error) {
    console.error("Error deleting manual shift template:", error);
    return { success: false, error: "Error al eliminar plantilla" };
  }
}

export async function applyManualShiftTemplate(input: ApplyManualShiftTemplateInput) {
  try {
    const { orgId } = await requireOrg();
    const { minRestMinutes } = await getOrgShiftValidationConfig(orgId);
    const template = await prisma.manualShiftTemplate.findUnique({
      where: { id: input.templateId, orgId },
    });

    if (!template) {
      return { success: false, error: "Plantilla no encontrada" };
    }

    if (template.pattern.length === 0) {
      return { success: false, error: "La plantilla no tiene patrón definido" };
    }

    if (input.employeeIds.length === 0) {
      return { success: false, error: "Debes seleccionar al menos un empleado" };
    }

    const operations: Array<ReturnType<typeof prisma.manualShiftAssignment.upsert>> = [];
    const totalDays = differenceInDays(input.dateTo, input.dateFrom) + 1;
    const offset = input.initialGroup ?? 0;
    let skipped = 0;
    const validationConflicts: ScheduleValidationConflict[] = [];

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
      const patternIndex = (dayIndex + offset) % template.pattern.length;
      const shiftType = template.pattern[patternIndex];
      const window = getShiftTypeWindow(shiftType, template.shiftDurationMinutes);

      if (!window) {
        continue;
      }

      const targetDate = normalizeAssignmentDate(addDays(input.dateFrom, dayIndex));

      for (const employeeId of input.employeeIds) {
        const conflicts = await validateManualAssignmentInput({
          orgId,
          employeeId,
          date: targetDate,
          startTimeMinutes: window.startMinutes,
          endTimeMinutes: window.endMinutes,
          scheduleTemplateId: null,
          minRestMinutes,
        });

        if (conflicts.some((conflict) => conflict.severity === "error")) {
          skipped += 1;
          validationConflicts.push(...conflicts);
          continue;
        }

        operations.push(
          prisma.manualShiftAssignment.upsert({
            where: {
              employeeId_date: {
                employeeId,
                date: targetDate,
              },
            },
            update: {
              scheduleTemplateId: null,
              startTimeMinutes: window.startMinutes,
              endTimeMinutes: window.endMinutes,
              costCenterId: input.costCenterId,
              workZoneId: input.workZoneId,
              breakMinutes: 0,
              customRole: `${template.name} (${shiftType})`,
              notes: template.description,
              status: "DRAFT",
              publishedAt: null,
            },
            create: {
              orgId,
              employeeId,
              date: targetDate,
              scheduleTemplateId: null,
              startTimeMinutes: window.startMinutes,
              endTimeMinutes: window.endMinutes,
              costCenterId: input.costCenterId,
              workZoneId: input.workZoneId,
              breakMinutes: 0,
              customRole: `${template.name} (${shiftType})`,
              notes: template.description,
              status: "DRAFT",
              publishedAt: null,
            },
          }),
        );
      }
    }

    if (operations.length === 0) {
      return {
        success: true,
        created: 0,
        skipped,
        conflicts: validationConflicts,
      };
    }

    await prisma.$transaction(operations);
    return {
      success: true,
      created: operations.length,
      skipped,
      conflicts: validationConflicts,
    };
  } catch (error) {
    console.error("Error applying manual shift template:", error);
    return { success: false, error: "Error al aplicar plantilla manual" };
  }
}

function getShiftTypeWindow(shiftType: string, durationMinutes: number) {
  if (shiftType === "off") {
    return null;
  }

  const starts: Record<string, number> = {
    morning: 8 * 60,
    afternoon: 16 * 60,
    night: 0,
    saturday: 9 * 60,
    sunday: 9 * 60,
    custom: 8 * 60,
  };

  const startMinutes = starts[shiftType] ?? 8 * 60;
  const endMinutes = (startMinutes + durationMinutes) % (24 * 60);

  return {
    startMinutes,
    endMinutes,
  };
}
// ============================================================================
// GESTIÓN DE ZONAS (ÁREAS)
// ============================================================================

export async function getWorkZones(costCenterId?: string) {
  try {
    const { orgId } = await requireOrg();

    const zones = await prisma.workZone.findMany({
      where: {
        orgId,
        ...(costCenterId ? { costCenterId } : {}),
      },
      orderBy: { name: "asc" },
    });

    return zones;
  } catch (error) {
    console.error("Error fetching zones:", error);
    return [];
  }
}

export async function createWorkZone(data: { name: string; costCenterId: string; requiredCoverage?: any }) {
  try {
    const { orgId } = await requireOrg();

    const zone = await prisma.workZone.create({
      data: {
        orgId,
        name: data.name,
        costCenterId: data.costCenterId,
        requiredCoverage: data.requiredCoverage ?? {},
      },
    });

    return zone;
  } catch (error) {
    console.error("Error creating zone:", error);
    throw new Error("Error creating zone");
  }
}

export async function updateWorkZone(
  id: string,
  data: {
    name?: string;
    isActive?: boolean;
    requiredCoverage?: any;
  },
) {
  try {
    const { orgId } = await requireOrg();

    const zone = await prisma.workZone.update({
      where: { id, orgId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.requiredCoverage && { requiredCoverage: data.requiredCoverage }),
      },
    });

    return zone;
  } catch (error) {
    console.error("Error updating zone:", error);
    throw new Error("Error updating zone");
  }
}

export async function deleteWorkZone(id: string) {
  try {
    const { orgId } = await requireOrg();

    await prisma.workZone.delete({
      where: { id, orgId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting zone:", error);
    return { success: false, error: "Error deleting zone" };
  }
}

// ============================================================================
// UTILIDADES DE BÚSQUEDA
// ============================================================================

/**
 * Busca empleados para autocompletado (nombre, email, puesto)
 */
export async function searchEmployees(term: string) {
  try {
    const { orgId } = await requireOrg();

    if (!term || term.length < 2) return [];

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        active: true,
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        photoUrl: true, // Si existe en el modelo
        employmentContracts: {
          where: { active: true },
          take: 1,
          orderBy: { startDate: "desc" },
          select: {
            position: { select: { title: true } },
            department: { select: { name: true } },
            weeklyHours: true,
          },
        },
      },
    });

    return employees.map((emp) => ({
      id: emp.id,
      fullName: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      position: emp.employmentContracts[0]?.position?.title,
      department: emp.employmentContracts[0]?.department?.name,
      weeklyHours: emp.employmentContracts[0]?.weeklyHours?.toString(),
      avatar: emp.photoUrl,
    }));
  } catch (error) {
    console.error("Error searching employees:", error);
    return [];
  }
}

export async function getShiftEmployeesPaginated(
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    costCenterId?: string;
    query?: string;
  },
) {
  try {
    const { orgId } = await requireOrg();
    const skip = (page - 1) * pageSize;

    const where: any = {
      orgId,
      active: true,
      ...(filters?.query && {
        OR: [
          { firstName: { contains: filters.query, mode: "insensitive" } },
          { lastName: { contains: filters.query, mode: "insensitive" } },
        ],
      }),
      ...(filters?.costCenterId && {
        employmentContracts: {
          some: {
            active: true,
            costCenterId: filters.costCenterId,
          },
        },
      }),
    };

    const [employees, total] = await prisma.$transaction([
      prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { lastName: "asc" },
        include: {
          employmentContracts: {
            where: { active: true },
            take: 1,
            orderBy: { startDate: "desc" },
            include: {
              costCenter: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      data: employees.map((emp) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        contractHours: Number(emp.employmentContracts[0]?.weeklyHours || 40),
        costCenterId: emp.employmentContracts[0]?.costCenterId,
        costCenterName: emp.employmentContracts[0]?.costCenter?.name,
        usesShiftSystem: true, // TODO: Add field to DB
        absences: [], // TODO: Populate if needed
      })),
      metadata: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("Error fetching paginated employees:", error);
    return { data: [], metadata: { total: 0, page: 1, pageSize, totalPages: 0 } };
  }
}

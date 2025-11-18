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

import { startOfWeek, endOfWeek, addDays, isBefore, isAfter, isWithinInterval, differenceInDays } from "date-fns";

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

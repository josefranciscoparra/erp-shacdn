/**
 * Motor de Cálculo de Horarios V2.0
 *
 * Sistema que resuelve el horario efectivo de un empleado en cualquier fecha,
 * aplicando lógica de prioridades y soportando TODOS los tipos de horarios:
 * - FIXED: Horarios fijos (oficina L-V 9-18h)
 * - SHIFT: Turnos (mañana, tarde, noche)
 * - ROTATION: Rotaciones (policía 6x6, bomberos 24x72)
 * - FLEXIBLE: Horarios flexibles
 *
 * Lógica de Prioridades (mayor a menor):
 * 1. AbsenceRequest (vacaciones/permisos) → No trabaja
 * 2. ExceptionDayOverride (días específicos)
 * 3. SchedulePeriod activo (SPECIAL > INTENSIVE > REGULAR)
 * 4. ScheduleTemplate base (REGULAR)
 */

import type { ScheduleTemplate, SchedulePeriod, WorkDayPattern, TimeSlot } from "@prisma/client";
import { differenceInDays, startOfWeek, endOfWeek, addDays, differenceInMinutes } from "date-fns";

import { prisma } from "@/lib/prisma";
import type {
  EffectiveSchedule,
  EffectiveTimeSlot,
  WeekSchedule,
  ValidationResult,
  PeriodChange,
} from "@/types/schedule";

// ============================================================================
// Función Principal: Obtener Horario Efectivo
// ============================================================================

/**
 * Obtiene el horario efectivo de un empleado para una fecha específica.
 *
 * Esta es la función PRINCIPAL del motor. Aplica toda la lógica de prioridades
 * y funciona con CUALQUIER tipo de horario (FIXED, SHIFT, ROTATION, FLEXIBLE).
 *
 * @param employeeId - ID del empleado
 * @param date - Fecha para la cual obtener el horario
 * @returns Horario efectivo con franjas horarias, minutos esperados, etc.
 *
 * @example
 * const horario = await getEffectiveSchedule("emp_123", new Date("2025-01-15"))
 * console.log(horario.expectedMinutes) // 480 (8 horas)
 * console.log(horario.timeSlots) // [{ startMinutes: 540, endMinutes: 1020, ... }]
 */
export async function getEffectiveSchedule(employeeId: string, date: Date): Promise<EffectiveSchedule> {
  // 1. PRIORIDAD MÁXIMA: Verificar ausencias (vacaciones, permisos, bajas)
  const absence = await getAbsenceForDate(employeeId, date);

  // Si la ausencia es de DÍA COMPLETO (no parcial), marcar como no laborable
  if (absence && !absence.isPartial) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "ABSENCE",
      absence: {
        type: absence.type,
        reason: absence.reason ?? undefined,
      },
    };
  }

  // Si la ausencia es PARCIAL, continuar para obtener el horario y luego ajustarlo
  // (se procesará al final de la función)

  // 2. PRIORIDAD ALTA: Buscar excepciones de día (días específicos con horario especial)
  const exception = await getExceptionForDate(employeeId, date);
  if (exception) {
    return buildScheduleFromException(exception, date);
  }

  // 3. PRIORIDAD MEDIA: Obtener asignación activa del empleado
  const assignment = await getActiveAssignment(employeeId, date);
  console.log("🔍 [GET_EFFECTIVE_SCHEDULE] Assignment obtenido:", {
    hasAssignment: !!assignment,
    assignmentType: assignment?.assignmentType,
  });

  if (!assignment) {
    console.log("❌ [GET_EFFECTIVE_SCHEDULE] No hay asignación activa");
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "NO_ASSIGNMENT",
    };
  }

  // 4. RESOLUCIÓN DE PLANTILLA: Obtener la plantilla correcta según el tipo
  let template: ScheduleTemplate;

  if (assignment.assignmentType === "ROTATION") {
    // ROTACIONES: Calcular qué step de la rotación toca en esta fecha
    if (!assignment.rotationPattern || !assignment.rotationStartDate) {
      throw new Error(`Assignment ${assignment.id} is ROTATION but missing rotationPattern or rotationStartDate`);
    }

    const rotationStep = calculateRotationStep(assignment.rotationPattern, assignment.rotationStartDate, date);

    template = rotationStep.scheduleTemplate as typeof template;
  } else {
    // FIXED, SHIFT, FLEXIBLE: Usar la plantilla asignada directamente
    if (!assignment.scheduleTemplate) {
      throw new Error(`Assignment ${assignment.id} is ${assignment.assignmentType} but missing scheduleTemplate`);
    }

    template = assignment.scheduleTemplate;
  }

  // 5. BUSCAR PERÍODO ACTIVO: SPECIAL > INTENSIVE > REGULAR (por fechas)
  const period = await getActivePeriod(template, date);

  if (!period) {
    // No hay período configurado para esta plantilla (error de configuración)
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "NO_ASSIGNMENT",
    };
  }

  // 6. OBTENER PATRÓN DEL DÍA DE LA SEMANA (0=Domingo, 1=Lunes, ..., 6=Sábado)
  const dayOfWeek = date.getDay();
  console.log("🔍 [GET_EFFECTIVE_SCHEDULE] Buscando patrón del día:", {
    date: date.toISOString(),
    dayOfWeek,
    dayName: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][dayOfWeek],
    availablePatterns: period.workDayPatterns.map((p) => ({
      dayOfWeek: p.dayOfWeek,
      isWorkingDay: p.isWorkingDay,
      slots: p.timeSlots.length,
    })),
  });

  const pattern = period.workDayPatterns.find((p) => p.dayOfWeek === dayOfWeek);

  console.log("📋 [GET_EFFECTIVE_SCHEDULE] Pattern encontrado:", {
    found: !!pattern,
    isWorkingDay: pattern?.isWorkingDay,
    slotsCount: pattern?.timeSlots.length,
  });

  if (!pattern || !pattern.isWorkingDay) {
    console.log("❌ [GET_EFFECTIVE_SCHEDULE] Sin patrón o día no laborable, retornando schedule vacío");
    // Día no laboral (fin de semana, etc.)
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "PERIOD",
      periodName: period.name ?? period.periodType,
    };
  }

  // 7. CONSTRUIR HORARIO EFECTIVO CON LOS TIME SLOTS
  const effectiveSlots: EffectiveTimeSlot[] = pattern.timeSlots.map((slot) => ({
    startMinutes: Number(slot.startTimeMinutes),
    endMinutes: Number(slot.endTimeMinutes),
    slotType: slot.slotType,
    presenceType: slot.presenceType,
    isMandatory: slot.presenceType === "MANDATORY",
    description: slot.description ?? undefined,
  }));

  // Calcular minutos esperados (suma de slots que NO sean descanso)
  let expectedMinutes = 0;
  for (const slot of effectiveSlots) {
    if (slot.slotType !== "BREAK") {
      expectedMinutes += slot.endMinutes - slot.startMinutes;
    }
  }
  // 🆕 Si hay ausencia PARCIAL, reducir los minutos esperados
  if (absence && absence.isPartial && absence.durationMinutes) {
    expectedMinutes = Math.max(0, expectedMinutes - absence.durationMinutes);
  }

  return {
    date,
    isWorkingDay: true,
    expectedMinutes,
    timeSlots: effectiveSlots,
    source: "PERIOD",
    periodName: period.name ?? period.periodType,
    // 🆕 Si hay ausencia parcial, incluir la información
    ...(absence && absence.isPartial
      ? {
          absence: {
            type: absence.type,
            reason: absence.reason,
            isPartial: true,
            startTime: absence.startTime,
            endTime: absence.endTime,
            durationMinutes: absence.durationMinutes,
          },
        }
      : {}),
  };
}

// ============================================================================
// Funciones Auxiliares: Lógica de Prioridades
// ============================================================================

/**
 * Busca una ausencia (vacación, permiso, baja) para una fecha específica.
 * Ahora soporta ausencias parciales (con startTime/endTime).
 */
async function getAbsenceForDate(employeeId: string, date: Date) {
  return await prisma.ptoRequest
    .findFirst({
      where: {
        employeeId,
        status: "APPROVED",
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: {
        id: true,
        absenceType: {
          select: {
            name: true,
            allowPartialDays: true,
          },
        },
        reason: true,
        startTime: true, // 🆕 En minutos desde medianoche
        endTime: true, // 🆕 En minutos desde medianoche
        durationMinutes: true, // 🆕 Duración total de la ausencia
      },
    })
    .then((absence) => {
      if (!absence) return null;
      return {
        type: absence.absenceType.name,
        reason: absence.reason ?? undefined,
        isPartial:
          absence.absenceType.allowPartialDays &&
          absence.startTime !== null &&
          absence.endTime !== null &&
          absence.durationMinutes !== null,
        startTime: absence.startTime ? Number(absence.startTime) : undefined,
        endTime: absence.endTime ? Number(absence.endTime) : undefined,
        durationMinutes: absence.durationMinutes ? Number(absence.durationMinutes) : undefined,
      };
    });
}

/**
 * Busca una excepción de día (día con horario especial) para un empleado.
 *
 * Prioridad de excepciones (mayor a menor):
 * 1. Empleado específico (employeeId)
 * 2. Por plantilla de horario (scheduleTemplateId)
 * 3. Por departamento (departmentId)
 * 4. Por centro de costes (costCenterId)
 * 5. Global (isGlobal = true)
 */
async function getExceptionForDate(employeeId: string, date: Date) {
  // Obtener información del empleado con su contrato activo (departamento, centro de costes)
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      orgId: true,
      employmentContracts: {
        where: { active: true },
        select: {
          departmentId: true,
          costCenterId: true,
        },
        take: 1,
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!employee) return null;

  // Obtener departmentId y costCenterId del contrato activo
  const activeContract = employee.employmentContracts[0];
  const departmentId = activeContract?.departmentId ?? null;
  const costCenterId = activeContract?.costCenterId ?? null;

  // Obtener asignación activa para saber la plantilla
  const assignment = await getActiveAssignment(employeeId, date);
  const scheduleTemplateId = assignment?.scheduleTemplate?.id;

  // Normalizar fecha a medianoche
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  // Buscar excepciones aplicables con prioridad
  // Buscamos TODAS las excepciones que podrían aplicar y luego seleccionamos por prioridad
  const exceptions = await prisma.exceptionDayOverride.findMany({
    where: {
      orgId: employee.orgId,
      deletedAt: null,
      OR: [
        // 1. Coincide con la fecha exacta
        {
          date: {
            gte: dateStart,
            lte: dateEnd,
          },
        },
        // 2. Está en un rango de fechas
        {
          AND: [
            { date: { lte: dateEnd } },
            {
              OR: [
                { endDate: null }, // Sin fecha de fin (un solo día)
                { endDate: { gte: dateStart } }, // Rango que incluye esta fecha
              ],
            },
          ],
        },
        // 3. Recurrente anual (mismo mes y día)
        {
          isRecurring: true,
          // Para esto necesitamos filtrar manualmente después
        },
      ],
      // Solo las que aplican a este empleado según scope
      AND: [
        {
          OR: [
            // 1. Empleado específico
            { employeeId },
            // 2. Por plantilla
            ...(scheduleTemplateId ? [{ scheduleTemplateId }] : []),
            // 3. Por departamento
            ...(departmentId ? [{ departmentId }] : []),
            // 4. Por centro de costes
            ...(costCenterId ? [{ costCenterId }] : []),
            // 5. Global
            { isGlobal: true },
          ],
        },
      ],
    },
    include: {
      overrideSlots: {
        orderBy: { startTimeMinutes: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (exceptions.length === 0) return null;

  // Filtrar excepciones recurrentes manualmente (mismo mes y día)
  const validExceptions = exceptions.filter((exception) => {
    // Si no es recurrente, validar fechas normalmente
    if (!exception.isRecurring) {
      const exceptionDate = new Date(exception.date);
      exceptionDate.setHours(0, 0, 0, 0);

      // Verificar si la fecha está en el rango
      if (exception.endDate) {
        const exceptionEndDate = new Date(exception.endDate);
        exceptionEndDate.setHours(23, 59, 59, 999);
        return dateStart >= exceptionDate && dateStart <= exceptionEndDate;
      } else {
        return dateStart.getTime() === exceptionDate.getTime();
      }
    }

    // Si es recurrente, verificar mes y día
    const exceptionDate = new Date(exception.date);
    return date.getMonth() === exceptionDate.getMonth() && date.getDate() === exceptionDate.getDate();
  });

  if (validExceptions.length === 0) return null;

  // Seleccionar por prioridad (empleado > plantilla > departamento > centro costes > global)
  const prioritized =
    validExceptions.find((e) => e.employeeId === employeeId) ??
    validExceptions.find((e) => e.scheduleTemplateId === scheduleTemplateId) ??
    validExceptions.find((e) => e.departmentId === employee.departmentId) ??
    validExceptions.find((e) => e.costCenterId === employee.costCenterId) ??
    validExceptions.find((e) => e.isGlobal);

  return prioritized ?? null;
}

/**
 * Construye un horario efectivo desde una excepción de día.
 *
 * Existen dos casos principales:
 * 1. Excepción con slots personalizados (overrideSlots): Usa esos slots
 * 2. Excepción de tipo HOLIDAY: Marca como día no laboral
 * 3. Excepción sin slots: Marca como día no laboral por defecto
 */
function buildScheduleFromException(exception: any, date: Date): EffectiveSchedule {
  // Si tiene slots personalizados, usarlos
  if (exception.overrideSlots && exception.overrideSlots.length > 0) {
    const effectiveSlots: EffectiveTimeSlot[] = exception.overrideSlots.map((slot: any) => ({
      startMinutes: Number(slot.startTimeMinutes),
      endMinutes: Number(slot.endTimeMinutes),
      slotType: slot.slotType,
      presenceType: slot.presenceType,
      isMandatory: slot.presenceType === "MANDATORY",
      description: slot.description ?? undefined,
    }));

    // Calcular minutos esperados (suma de slots tipo WORK)
    const expectedMinutes = effectiveSlots
      .filter((slot) => slot.slotType === "WORK")
      .reduce((sum, slot) => sum + (slot.endMinutes - slot.startMinutes), 0);

    return {
      date,
      isWorkingDay: expectedMinutes > 0,
      expectedMinutes,
      timeSlots: effectiveSlots,
      source: "EXCEPTION",
      exceptionType: exception.exceptionType,
      exceptionReason: exception.reason ?? undefined,
    };
  }

  // Si es un festivo o no tiene slots, marcar como no laboral
  if (exception.exceptionType === "HOLIDAY" || !exception.overrideSlots || exception.overrideSlots.length === 0) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "EXCEPTION",
      exceptionType: exception.exceptionType,
      exceptionReason: exception.reason ?? undefined,
    };
  }

  // Fallback: día no laboral por defecto
  return {
    date,
    isWorkingDay: false,
    expectedMinutes: 0,
    timeSlots: [],
    source: "EXCEPTION",
    exceptionType: exception.exceptionType,
    exceptionReason: exception.reason ?? undefined,
  };
}

/**
 * Obtiene la asignación activa de un empleado para una fecha.
 * Incluye la plantilla, el patrón de rotación (si aplica), etc.
 */
async function getActiveAssignment(employeeId: string, date: Date) {
  // Normalizar la fecha a medianoche para comparación solo de día (sin horas)
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  console.log("🔍 [GET_ASSIGNMENT] Buscando asignación:", {
    employeeId,
    date: date.toISOString(),
    dateStart: dateStart.toISOString(),
    dateEnd: dateEnd.toISOString(),
  });

  const assignment = await prisma.employeeScheduleAssignment.findFirst({
    where: {
      employeeId,
      isActive: true,
      validFrom: { lte: dateEnd }, // Incluye si empezó en cualquier momento del día
      OR: [{ validTo: null }, { validTo: { gte: dateStart } }], // Incluye si termina en o después del día
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

  if (assignment?.scheduleTemplate) {
    console.log("📋 [GET_ASSIGNMENT] Template encontrado:", {
      templateId: assignment.scheduleTemplate.id,
      templateName: assignment.scheduleTemplate.name,
      templateType: assignment.scheduleTemplate.templateType,
      periodsArray: assignment.scheduleTemplate.periods,
      periodsCount: assignment.scheduleTemplate.periods?.length,
      firstPeriod: assignment.scheduleTemplate.periods?.[0],
    });
  } else {
    console.log("❌ [GET_ASSIGNMENT] Template NO cargado a pesar de tener scheduleTemplateId");
  }

  return assignment;
}

// ============================================================================
// ROTACIONES: Cálculo de Step Activo
// ============================================================================

/**
 * Calcula qué step de una rotación toca en una fecha específica.
 *
 * Ejemplo Bomberos 24x72:
 * - Step 1: 1 día trabajo (orden=1, duration=1)
 * - Step 2: 3 días descanso (orden=2, duration=3)
 * - Ciclo total: 4 días
 * - Si rotationStartDate = 2025-01-01 y date = 2025-01-05:
 *   → días transcurridos = 4
 *   → posición en ciclo = 4 % 4 = 0 → Step 1 (trabajo)
 *
 * Ejemplo Policía 6x6:
 * - Step 1: 6 días mañana
 * - Step 2: 6 días descanso
 * - Ciclo total: 12 días
 *
 * @param rotationPattern - Patrón de rotación con sus steps
 * @param rotationStartDate - Fecha de inicio de la rotación
 * @param date - Fecha para la cual calcular el step
 * @returns El step activo en esa fecha
 */
function calculateRotationStep(rotationPattern: any, rotationStartDate: Date, date: Date) {
  const daysSinceStart = differenceInDays(date, rotationStartDate);

  // Calcular duración total del ciclo (suma de durationDays de todos los steps)
  const cycleDuration = rotationPattern.steps.reduce((sum: number, step: any) => sum + step.durationDays, 0);

  if (cycleDuration === 0) {
    throw new Error(`Rotation pattern ${rotationPattern.id} has cycle duration = 0`);
  }

  // Posición en el ciclo actual (0 a cycleDuration-1)
  const positionInCycle = daysSinceStart % cycleDuration;

  // Encontrar qué step corresponde
  let accumulatedDays = 0;
  for (const step of rotationPattern.steps) {
    if (positionInCycle < accumulatedDays + step.durationDays) {
      return step;
    }
    accumulatedDays += step.durationDays;
  }

  // Fallback (no debería llegar aquí si cycleDuration está bien calculado)
  return rotationPattern.steps[0];
}

// ============================================================================
// Períodos: Selección por Prioridad y Fechas
// ============================================================================

/**
 * Obtiene el período activo para una plantilla en una fecha específica.
 * Prioridad: SPECIAL > INTENSIVE > REGULAR (por fechas de vigencia).
 *
 * @param template - Plantilla de horario
 * @param date - Fecha para la cual buscar el período
 * @returns El período activo (o null si no hay ninguno configurado)
 */
async function getActivePeriod(
  template: ScheduleTemplate & {
    periods: (SchedulePeriod & {
      workDayPatterns: (WorkDayPattern & { timeSlots: TimeSlot[] })[];
    })[];
  },
  date: Date,
) {
  console.log("🔍 [GET_ACTIVE_PERIOD] Buscando período activo:", {
    templateId: template.id,
    templateName: template.name,
    date: date.toISOString(),
    periodsCount: template.periods.length,
    periods: template.periods.map((p) => ({
      id: p.id,
      type: p.periodType,
      validFrom: p.validFrom?.toISOString(),
      validTo: p.validTo?.toISOString(),
      patternsCount: p.workDayPatterns.length,
    })),
  });

  // Filtrar períodos cuyas fechas incluyan la fecha solicitada
  const applicablePeriods = template.periods.filter((period) => {
    const startDate = period.validFrom;
    const endDate = period.validTo;

    // Si startDate es null, el período aplica desde siempre
    if (startDate && date < startDate) return false;

    // Si endDate es null, el período aplica hasta siempre
    if (endDate && date > endDate) return false;

    return true;
  });

  console.log("📋 [GET_ACTIVE_PERIOD] Períodos aplicables:", applicablePeriods.length);

  if (applicablePeriods.length === 0) {
    console.log("❌ [GET_ACTIVE_PERIOD] No se encontraron períodos aplicables");
    return null;
  }

  // Ordenar por prioridad: SPECIAL > INTENSIVE > REGULAR
  const priorityOrder = { SPECIAL: 3, INTENSIVE: 2, REGULAR: 1 };
  applicablePeriods.sort((a, b) => {
    const priorityA = priorityOrder[a.periodType] ?? 0;
    const priorityB = priorityOrder[b.periodType] ?? 0;
    return priorityB - priorityA; // Descendente (mayor prioridad primero)
  });

  return applicablePeriods[0];
}

// ============================================================================
// Funciones Complementarias: Cálculos y Validaciones
// ============================================================================

/**
 * Calcula las horas esperadas para un empleado en un rango de fechas.
 *
 * @param employeeId - ID del empleado
 * @param from - Fecha de inicio
 * @param to - Fecha de fin
 * @returns Total de minutos esperados en el rango
 */
export async function calculateExpectedHours(employeeId: string, from: Date, to: Date): Promise<number> {
  let totalMinutes = 0;
  let currentDate = new Date(from);

  while (currentDate <= to) {
    const schedule = await getEffectiveSchedule(employeeId, currentDate);
    totalMinutes += schedule.expectedMinutes;
    currentDate = addDays(currentDate, 1);
  }

  return totalMinutes;
}

/**
 * Obtiene el horario de una semana completa (lunes a domingo).
 *
 * @param employeeId - ID del empleado
 * @param weekStart - Inicio de la semana (cualquier día de la semana)
 * @returns Horario completo de la semana con 7 días
 */
export async function getWeekSchedule(employeeId: string, weekStart: Date): Promise<WeekSchedule> {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Lunes
  const end = endOfWeek(weekStart, { weekStartsOn: 1 }); // Domingo

  const days: EffectiveSchedule[] = [];
  let totalExpectedMinutes = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const schedule = await getEffectiveSchedule(employeeId, date);
    days.push(schedule);
    totalExpectedMinutes += schedule.expectedMinutes;
  }

  return {
    weekStart: start,
    weekEnd: end,
    days,
    totalExpectedMinutes,
    totalExpectedHours: totalExpectedMinutes / 60,
  };
}

/**
 * Valida si un fichaje cumple con el horario esperado.
 *
 * @param employeeId - ID del empleado
 * @param timestamp - Fecha y hora del fichaje
 * @param entryType - Tipo de fichaje (CLOCK_IN, CLOCK_OUT, etc.)
 * @returns Resultado de la validación con warnings y errors
 */
export async function validateTimeEntry(
  employeeId: string,
  timestamp: Date,
  entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END",
): Promise<ValidationResult> {
  // Obtener configuración de validaciones de la organización
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      orgId: true,
      organization: {
        select: {
          clockInToleranceMinutes: true,
          clockOutToleranceMinutes: true,
          earlyClockInToleranceMinutes: true,
          lateClockOutToleranceMinutes: true,
          nonWorkdayClockInAllowed: true,
          nonWorkdayClockInWarning: true,
        },
      },
    },
  });

  if (!employee) {
    return {
      isValid: false,
      warnings: [],
      errors: ["Empleado no encontrado"],
    };
  }

  const orgConfig = employee.organization;
  const schedule = await getEffectiveSchedule(employeeId, timestamp);

  if (!schedule.isWorkingDay) {
    // Verificar configuración de fichajes en días no laborables
    if (!orgConfig.nonWorkdayClockInAllowed) {
      return {
        isValid: false,
        warnings: [],
        errors: ["No está permitido fichar en días no laborables"],
      };
    }

    // Si está permitido pero hay warning activado
    if (orgConfig.nonWorkdayClockInWarning) {
      return {
        isValid: true,
        warnings: ["Fichaje en día no laboral"],
        errors: [],
      };
    }

    // Permitido sin warning
    return {
      isValid: true,
      warnings: [],
      errors: [],
    };
  }

  // Convertir timestamp a minutos desde medianoche
  const hours = timestamp.getHours();
  const minutes = timestamp.getMinutes();
  const timestampMinutes = hours * 60 + minutes;

  // Buscar el slot esperado según el tipo de entrada
  let expectedSlot: EffectiveTimeSlot | undefined;

  if (entryType === "CLOCK_IN") {
    // Buscar primer slot de WORK
    expectedSlot = schedule.timeSlots.find((slot) => slot.slotType === "WORK");
  } else if (entryType === "CLOCK_OUT") {
    // Buscar último slot de WORK
    const workSlots = schedule.timeSlots.filter((slot) => slot.slotType === "WORK");
    expectedSlot = workSlots[workSlots.length - 1];
  }

  if (!expectedSlot) {
    return {
      isValid: true,
      warnings: ["No se pudo determinar el slot esperado para este fichaje"],
      errors: [],
    };
  }

  // Calcular desviación
  const expectedMinutes = entryType === "CLOCK_IN" ? expectedSlot.startMinutes : expectedSlot.endMinutes;
  const deviationMinutes = timestampMinutes - expectedMinutes;

  const warnings: string[] = [];

  // Aplicar tolerancias según configuración de la organización
  if (entryType === "CLOCK_IN") {
    // Para fichajes de entrada
    if (deviationMinutes > orgConfig.clockInToleranceMinutes) {
      // Fichaje tardío
      warnings.push(`Fichaje tardío: ${deviationMinutes} minutos de retraso`);
    } else if (deviationMinutes < -orgConfig.earlyClockInToleranceMinutes) {
      // Fichaje muy anticipado
      warnings.push(`Fichaje muy anticipado: ${Math.abs(deviationMinutes)} minutos antes de lo esperado`);
    }
  } else if (entryType === "CLOCK_OUT") {
    // Para fichajes de salida
    if (deviationMinutes < -orgConfig.clockOutToleranceMinutes) {
      // Salida anticipada
      warnings.push(`Salida anticipada: ${Math.abs(deviationMinutes)} minutos antes de lo esperado`);
    } else if (deviationMinutes > orgConfig.lateClockOutToleranceMinutes) {
      // Salida muy tardía
      warnings.push(`Salida muy tardía: ${deviationMinutes} minutos después de lo esperado`);
    }
  }

  return {
    isValid: true,
    warnings,
    errors: [],
    expectedSlot,
    actualSlot: {
      startMinutes: timestampMinutes,
      endMinutes: timestampMinutes,
    },
    deviationMinutes,
  };
}

/**
 * Obtiene el próximo cambio de período (ej: de verano a regular).
 *
 * @param employeeId - ID del empleado
 * @param fromDate - Fecha desde la cual buscar
 * @returns Información del cambio de período (o null si no hay cambios próximos)
 */
export async function getNextPeriodChange(employeeId: string, fromDate: Date): Promise<PeriodChange | null> {
  const assignment = await getActiveAssignment(employeeId, fromDate);
  if (!assignment || !assignment.scheduleTemplate) return null;

  const template = assignment.scheduleTemplate;

  // Buscar el siguiente período que empiece después de fromDate
  const futurePeriods = template.periods
    .filter((p) => p.validFrom && p.validFrom > fromDate)
    .sort((a, b) => {
      if (!a.validFrom || !b.validFrom) return 0;
      return a.validFrom.getTime() - b.validFrom.getTime();
    });

  if (futurePeriods.length === 0) return null;

  const currentPeriod = await getActivePeriod(template, fromDate);
  const nextPeriod = futurePeriods[0];

  if (!currentPeriod || !nextPeriod.validFrom) return null;

  return {
    fromPeriod: {
      type: currentPeriod.periodType,
      name: currentPeriod.name ?? undefined,
      endDate: currentPeriod.validTo ?? nextPeriod.validFrom,
    },
    toPeriod: {
      type: nextPeriod.periodType,
      name: nextPeriod.name ?? undefined,
      startDate: nextPeriod.validFrom,
    },
  };
}

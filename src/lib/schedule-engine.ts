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
  if (absence) {
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

  // 2. PRIORIDAD ALTA: Buscar excepciones de día (días específicos con horario especial)
  const exception = await getExceptionForDate(employeeId, date);
  if (exception) {
    return buildScheduleFromException(exception, date);
  }

  // 3. PRIORIDAD MEDIA: Obtener asignación activa del empleado
  const assignment = await getActiveAssignment(employeeId, date);
  if (!assignment) {
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
  const pattern = period.workDayPatterns.find((p) => p.dayOfWeek === dayOfWeek);

  if (!pattern || !pattern.isWorkingDay) {
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

  // Calcular minutos esperados (suma de slots tipo WORK)
  const expectedMinutes = effectiveSlots
    .filter((slot) => slot.slotType === "WORK")
    .reduce((sum, slot) => sum + (slot.endMinutes - slot.startMinutes), 0);

  return {
    date,
    isWorkingDay: true,
    expectedMinutes,
    timeSlots: effectiveSlots,
    source: "PERIOD",
    periodName: period.name ?? period.periodType,
  };
}

// ============================================================================
// Funciones Auxiliares: Lógica de Prioridades
// ============================================================================

/**
 * Busca una ausencia (vacación, permiso, baja) para una fecha específica.
 */
async function getAbsenceForDate(employeeId: string, date: Date) {
  return await prisma.absenceRequest
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
          },
        },
        reason: true,
      },
    })
    .then((absence) => {
      if (!absence) return null;
      return {
        type: absence.absenceType.name,
        reason: absence.reason,
      };
    });
}

/**
 * Busca una excepción de día (día con horario especial) para un empleado.
 */
async function getExceptionForDate(employeeId: string, date: Date) {
  // TODO: Implementar cuando se añada el modelo ExceptionDayOverride
  // Por ahora retornar null (no hay excepciones)
  return null;
}

/**
 * Construye un horario efectivo desde una excepción de día.
 */
function buildScheduleFromException(exception: any, date: Date): EffectiveSchedule {
  // TODO: Implementar cuando se añada el modelo ExceptionDayOverride
  return {
    date,
    isWorkingDay: true,
    expectedMinutes: 0,
    timeSlots: [],
    source: "EXCEPTION",
  };
}

/**
 * Obtiene la asignación activa de un empleado para una fecha.
 * Incluye la plantilla, el patrón de rotación (si aplica), etc.
 */
async function getActiveAssignment(employeeId: string, date: Date) {
  return await prisma.employeeScheduleAssignment.findFirst({
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

  if (applicablePeriods.length === 0) return null;

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
  const schedule = await getEffectiveSchedule(employeeId, timestamp);

  if (!schedule.isWorkingDay) {
    return {
      isValid: false,
      warnings: [],
      errors: ["Este día no es laboral según el horario asignado"],
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

  // Tolerancia: ±15 minutos = warning, >15 minutos = error
  if (Math.abs(deviationMinutes) > 15) {
    if (deviationMinutes > 0) {
      warnings.push(`Fichaje tardío: ${deviationMinutes} minutos de retraso`);
    } else {
      warnings.push(`Fichaje anticipado: ${Math.abs(deviationMinutes)} minutos antes de lo esperado`);
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

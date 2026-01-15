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

import type { ScheduleTemplate, SchedulePeriod, WorkDayPattern, TimeSlot, ManualShiftAssignment } from "@prisma/client";
import { differenceInDays, startOfWeek, endOfWeek, addDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import type {
  EffectiveSchedule,
  EffectiveTimeSlot,
  WeekSchedule,
  ValidationResult,
  PeriodChange,
} from "@/types/schedule";

// ============================================================================
// Debug Logger - Solo activo en desarrollo con DEBUG_SCHEDULE=true
// ============================================================================

/**
 * Logger condicional para debugging del motor de horarios.
 * Solo se activa si:
 * - NODE_ENV === 'development' Y
 * - DEBUG_SCHEDULE === 'true'
 *
 * Uso: DEBUG_SCHEDULE=true npm run dev
 */
const DEBUG_SCHEDULE = process.env.NODE_ENV === "development" && process.env.DEBUG_SCHEDULE === "true";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
const scheduleLog = DEBUG_SCHEDULE ? console.log.bind(console) : (..._args: any[]) => {};

/**
 * Calcula minutos esperados sin doble contaje cuando hay solapes de slots de trabajo.
 * Usa el factor máximo activo en cada tramo para ponderar nocturnidad/festivos.
 */
function computeExpectedMinutesForSlots(slots: EffectiveTimeSlot[]): number {
  type Event = { time: number; factor: number; type: "start" | "end" };
  const events: Event[] = [];

  for (const slot of slots) {
    const typeStr = String(slot.slotType).trim().toUpperCase();
    if (typeStr === "BREAK" && slot.countsAsWork !== true) continue;
    if (slot.countsAsWork === false) continue;

    const factor = slot.compensationFactor ?? 1.0;
    events.push({ time: slot.startMinutes, factor, type: "start" });
    events.push({ time: slot.endMinutes, factor, type: "end" });
  }

  if (events.length === 0) {
    return 0;
  }

  events.sort((a, b) => {
    if (a.time === b.time) {
      // Procesar los inicios antes que los finales en el mismo minuto
      if (a.type === b.type) return 0;
      return a.type === "start" ? -1 : 1;
    }
    return a.time - b.time;
  });

  const activeFactors: number[] = [];
  let lastTime: number | null = null;
  let totalMinutes = 0;

  for (const event of events) {
    if (lastTime !== null && activeFactors.length > 0 && event.time > lastTime) {
      const duration = event.time - lastTime;
      const maxFactor = Math.max(...activeFactors);
      totalMinutes += duration * maxFactor;
    }

    if (event.type === "start") {
      activeFactors.push(event.factor);
    } else {
      const idx = activeFactors.indexOf(event.factor);
      if (idx !== -1) {
        activeFactors.splice(idx, 1);
      } else {
        activeFactors.shift(); // fallback defensivo
      }
    }

    lastTime = event.time;
  }

  return totalMinutes;
}

// ============================================================================
// FASE 2.4: Helpers de Normalización UTC
// ============================================================================

/**
 * Normaliza una fecha a medianoche UTC (00:00:00.000)
 * Usado para comparaciones de fechas sin problemas de timezone
 *
 * @param date Fecha a normalizar
 * @returns Nueva fecha con hora 00:00:00.000 UTC
 */
export function normalizeToUTCMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Normaliza una fecha al final del día UTC (23:59:59.999)
 * Usado para comparaciones inclusivas de fechas
 *
 * @param date Fecha a normalizar
 * @returns Nueva fecha con hora 23:59:59.999 UTC
 */
export function normalizeToUTCEndOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(23, 59, 59, 999);
  return normalized;
}

/**
 * Compara dos fechas ignorando la hora (solo día, mes, año en UTC)
 * Devuelve true si son el mismo día UTC
 *
 * @param date1 Primera fecha
 * @param date2 Segunda fecha
 * @returns true si son el mismo día UTC
 */
export function isSameUTCDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Verifica si una fecha está dentro de un rango (inclusive) usando UTC
 * Normaliza ambas fechas del rango a medianoche y fin de día para comparación precisa
 *
 * @param date Fecha a verificar
 * @param startDate Inicio del rango (puede ser null = sin límite inferior)
 * @param endDate Fin del rango (puede ser null = sin límite superior)
 * @returns true si la fecha está dentro del rango
 */
export function isDateInUTCRange(date: Date, startDate: Date | null, endDate: Date | null): boolean {
  const normalizedDate = normalizeToUTCMidnight(date);

  // Si no hay fecha de inicio, solo verificamos el fin
  if (!startDate) {
    if (!endDate) return true; // Sin límites
    return normalizedDate <= normalizeToUTCEndOfDay(endDate);
  }

  // Si no hay fecha de fin, solo verificamos el inicio
  if (!endDate) {
    return normalizedDate >= normalizeToUTCMidnight(startDate);
  }

  // Ambos límites definidos
  return normalizedDate >= normalizeToUTCMidnight(startDate) && normalizedDate <= normalizeToUTCEndOfDay(endDate);
}

/**
 * Obtiene el día de la semana en UTC (0 = domingo, 6 = sábado)
 * Evita problemas cuando la fecha local difiere del día UTC
 *
 * @param date Fecha
 * @returns Día de la semana en UTC (0-6)
 */
export function getUTCDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

// ============================================================================
// Función Principal: Obtener Horario Efectivo (Rango) - OPTIMIZADA
// ============================================================================

/**
 * Obtiene el horario efectivo de un empleado para un rango de fechas.
 * Realiza consultas en lote para optimizar el rendimiento (1 query por entidad vs N queries por día).
 */
export async function getEffectiveScheduleForRange(
  employeeId: string,
  startDate: Date,
  endDate: Date,
  options: { includeDrafts?: boolean } = {},
): Promise<EffectiveSchedule[]> {
  // 1. Normalizar fechas
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // 2. Obtener datos del empleado para scope de excepciones
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      orgId: true,
      employmentContracts: {
        where: { active: true },
        orderBy: { startDate: "desc" },
        take: 1,
        select: {
          departmentId: true,
          costCenterId: true,
          weeklyHours: true,
          workingDaysPerWeek: true,
          workScheduleType: true,
        },
      },
    },
  });

  if (!employee) {
    return [];
  }

  const contract = employee.employmentContracts[0];
  const departmentId = contract?.departmentId;
  const costCenterId = contract?.costCenterId;
  const contractIsFlexTotal = contract?.workScheduleType === "FLEXIBLE";

  // 3. Obtener datos en lote (Bulk Fetching)
  const [absences, manualAssignments, assignments, exceptions] = await Promise.all([
    // Absences
    prisma.ptoRequest.findMany({
      where: {
        employeeId,
        status: "APPROVED",
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
      },
      include: {
        absenceType: { select: { name: true, allowPartialDays: true } },
      },
    }),
    // Manual Assignments
    prisma.manualShiftAssignment.findMany({
      where: {
        employeeId,
        date: { gte: start, lte: end },
        ...(options.includeDrafts ? {} : { status: "PUBLISHED" }),
      },
    }),
    // Active Assignments (Templates)
    prisma.employeeScheduleAssignment.findMany({
      where: {
        employeeId,
        isActive: true,
        validFrom: { lte: end },
        OR: [{ validTo: null }, { validTo: { gte: start } }],
      },
      include: {
        scheduleTemplate: {
          include: {
            periods: {
              include: {
                workDayPatterns: {
                  include: { timeSlots: true },
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
                          include: { timeSlots: true },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { stepOrder: "asc" },
            },
          },
        },
      },
    }),
    // Exceptions (Fetch potentially relevant ones)
    prisma.exceptionDayOverride.findMany({
      where: {
        orgId: employee.orgId,
        deletedAt: null,
        OR: [
          // Rango de fechas
          { date: { gte: start, lte: end } },
          // Recurrentes (mismo mes/día, comprobar en memoria)
          { isRecurring: true },
        ],
        // Scope: empleado, plantilla, departamento, centro o global
        OR: [
          { employeeId },
          { scheduleTemplateId: { not: null } },
          { departmentId },
          { costCenterId },
          { isGlobal: true },
        ],
      },
    }),
  ]);

  const flexWeeklyExceptionCache = new Map<string, any | null>();

  function isRecurringExceptionInWeek(exceptionDate: Date, weekStart: Date): boolean {
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(weekStart, i);
      if (day.getMonth() === exceptionDate.getMonth() && day.getDate() === exceptionDate.getDate()) {
        return true;
      }
    }
    return false;
  }

  function getFlexWeeklyExceptionForDate(date: Date, templateId?: string | null) {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const cacheKey = `${weekStart.toISOString()}_${templateId ?? "none"}`;
    const cached = flexWeeklyExceptionCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

    const validExceptions = exceptions.filter((exception) => {
      if (exception.weeklyHours === null || exception.weeklyHours === undefined) return false;

      // Check if exception matches any scope (employee, template, department, cost center, or global)
      const matchesEmployee = Boolean(exception.employeeId && exception.employeeId === employeeId);
      const matchesTemplate = Boolean(templateId && exception.scheduleTemplateId === templateId);
      const matchesDepartment = Boolean(departmentId && exception.departmentId === departmentId);
      const matchesCostCenter = Boolean(costCenterId && exception.costCenterId === costCenterId);
      const matchesScope =
        matchesEmployee || matchesTemplate || matchesDepartment || matchesCostCenter || exception.isGlobal;

      if (!matchesScope) return false;

      if (exception.isRecurring) {
        return isRecurringExceptionInWeek(new Date(exception.date), weekStart);
      }

      const exceptionStart = new Date(exception.date);
      exceptionStart.setHours(0, 0, 0, 0);
      const exceptionEnd = exception.endDate ? new Date(exception.endDate) : new Date(exception.date);
      exceptionEnd.setHours(23, 59, 59, 999);

      return exceptionStart <= weekEnd && exceptionEnd >= weekStart;
    });

    const prioritized =
      validExceptions.find((e) => e.employeeId === employeeId) ??
      validExceptions.find((e) => templateId && e.scheduleTemplateId === templateId) ??
      validExceptions.find((e) => departmentId && e.departmentId === departmentId) ??
      validExceptions.find((e) => costCenterId && e.costCenterId === costCenterId) ??
      validExceptions.find((e) => e.isGlobal);

    flexWeeklyExceptionCache.set(cacheKey, prioritized ?? null);
    return prioritized ?? null;
  }

  // 4. Iterar sobre cada día del rango
  const schedules: EffectiveSchedule[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const currentDayStart = new Date(currentDate);
    currentDayStart.setHours(0, 0, 0, 0);

    // 4.1 Buscar ausencia para este día
    let absenceData: any = null;
    for (const absence of absences) {
      const absStart = new Date(absence.startDate);
      absStart.setHours(0, 0, 0, 0);
      const absEnd = new Date(absence.endDate);
      absEnd.setHours(23, 59, 59, 999);

      if (currentDayStart >= absStart && currentDayStart <= absEnd) {
        const isPartial = absence.startTime !== null && absence.endTime !== null;
        absenceData = {
          type: absence.absenceType?.name ?? "Ausencia",
          reason: absence.reason,
          isPartial,
          startTime: absence.startTime,
          endTime: absence.endTime,
          durationMinutes: isPartial ? absence.durationMinutes : null,
        };
        break;
      }
    }

    // 4.2 Buscar asignación activa (template o rotación)
    const assignment = assignments.find((a) => {
      const vFrom = new Date(a.validFrom);
      vFrom.setHours(0, 0, 0, 0);
      const vTo = a.validTo ? new Date(a.validTo) : null;
      if (vTo) vTo.setHours(23, 59, 59, 999);
      return currentDayStart >= vFrom && (!vTo || currentDayStart <= vTo);
    });

    let template: any = assignment?.scheduleTemplate;
    let templateId = template?.id;

    // Si es rotación, calcular el paso actual
    if (assignment?.rotationPattern && assignment.rotationStartDate) {
      const rotationStep = calculateRotationStep(assignment.rotationPattern, assignment.rotationStartDate, currentDate);
      template = rotationStep.scheduleTemplate;
      templateId = template?.id;
    }

    const isFlexTotal =
      assignment?.assignmentType === "FLEXIBLE" ||
      template?.templateType === "FLEXIBLE" ||
      (!assignment && contractIsFlexTotal);

    if (absenceData && !absenceData.isPartial) {
      schedules.push({
        date: new Date(currentDate),
        isWorkingDay: false,
        expectedMinutes: 0,
        timeSlots: [],
        source: "ABSENCE",
        absence: absenceData,
      });
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    if (isFlexTotal) {
      const flexWeeklyException = getFlexWeeklyExceptionForDate(currentDate, templateId);
      const applicablePeriods = template?.periods.filter((period: any) => {
        const pStart = period.validFrom;
        const pEnd = period.validTo;
        if (pStart && currentDate < pStart) return false;
        if (pEnd && currentDate > pEnd) return false;
        return true;
      });
      const priorityOrder: any = { SPECIAL: 3, INTENSIVE: 2, REGULAR: 1 };
      applicablePeriods?.sort(
        (a: any, b: any) => (priorityOrder[b.periodType] ?? 0) - (priorityOrder[a.periodType] ?? 0),
      );
      const flexPeriod = applicablePeriods ? applicablePeriods[0] : null;
      const exceptionWeeklyHours = flexWeeklyException?.weeklyHours ? Number(flexWeeklyException.weeklyHours) : null;
      const periodWeeklyHours = flexPeriod?.weeklyHours ? Number(flexPeriod.weeklyHours) : null;
      const templateWeeklyHours = template?.weeklyHours ? Number(template.weeklyHours) : null;
      const weeklyHours = exceptionWeeklyHours ?? periodWeeklyHours ?? templateWeeklyHours ?? 0;
      const weeklyTargetMinutes = Math.round(weeklyHours * 60);

      schedules.push({
        date: new Date(currentDate),
        isWorkingDay: true,
        expectedMinutes: 0,
        timeSlots: [],
        source: flexWeeklyException ? "EXCEPTION" : assignment ? "TEMPLATE" : "CONTRACT",
        scheduleMode: "FLEX_TOTAL",
        weeklyTargetMinutes,
        periodName: flexPeriod?.name ?? flexPeriod?.periodType,
        exceptionType: flexWeeklyException?.exceptionType,
        exceptionReason: flexWeeklyException?.reason ?? undefined,
        ...(absenceData && absenceData.isPartial ? { absence: absenceData } : {}),
      });
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // 4.3 Buscar asignación manual para este día
    const manualAssignment = manualAssignments.find((m) => {
      const mDate = new Date(m.date);
      mDate.setHours(0, 0, 0, 0);
      return mDate.getTime() === currentDayStart.getTime();
    });

    if (manualAssignment) {
      const schedule = await buildScheduleFromManual(manualAssignment, new Date(currentDate));
      if (absenceData && absenceData.isPartial && absenceData.durationMinutes) {
        schedule.expectedMinutes = Math.max(0, schedule.expectedMinutes - absenceData.durationMinutes);
        schedule.absence = absenceData;
      }
      schedules.push(schedule);
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // 4.4 Buscar excepción para este día
    const validExceptions = exceptions.filter((e) => {
      let matchesDate = false;
      if (e.isRecurring) {
        const eDate = new Date(e.date);
        matchesDate = eDate.getMonth() === currentDate.getMonth() && eDate.getDate() === currentDate.getDate();
      } else {
        const eStart = new Date(e.date);
        eStart.setHours(0, 0, 0, 0);
        if (e.endDate) {
          const eEnd = new Date(e.endDate);
          eEnd.setHours(23, 59, 59, 999);
          matchesDate = currentDayStart >= eStart && currentDayStart <= eEnd;
        } else {
          matchesDate = currentDayStart.getTime() === eStart.getTime();
        }
      }
      if (!matchesDate) return false;

      // Validar scope
      if (e.employeeId && e.employeeId === employeeId) return true;
      if (e.scheduleTemplateId && e.scheduleTemplateId === templateId) return true;
      if (e.departmentId && e.departmentId === departmentId) return true;
      if (e.costCenterId && e.costCenterId === costCenterId) return true;
      if (e.isGlobal && e.orgId === employee.orgId) return true;
      return false;
    });

    // Elegir excepción por prioridad
    const prioritizedException =
      validExceptions.find((e) => e.employeeId === employeeId) ??
      validExceptions.find((e) => e.scheduleTemplateId === templateId) ??
      validExceptions.find((e) => e.departmentId === departmentId) ??
      validExceptions.find((e) => e.costCenterId === costCenterId) ??
      validExceptions.find((e) => e.isGlobal);

    if (prioritizedException) {
      if (absenceData && !absenceData.isPartial) {
        schedules.push({
          date: new Date(currentDate),
          isWorkingDay: false,
          expectedMinutes: 0,
          timeSlots: [],
          source: "ABSENCE",
          absence: absenceData,
        });
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const schedule = buildScheduleFromException(prioritizedException, new Date(currentDate));
      if (absenceData && absenceData.isPartial && absenceData.durationMinutes) {
        schedule.expectedMinutes = Math.max(0, schedule.expectedMinutes - absenceData.durationMinutes);
        schedule.absence = absenceData;
      }
      schedules.push(schedule);
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // 4.6 Template Resolution
    if (template) {
      const applicablePeriods = template.periods.filter((period: any) => {
        const pStart = period.validFrom;
        const pEnd = period.validTo;
        if (pStart && currentDate < pStart) return false;
        if (pEnd && currentDate > pEnd) return false;
        return true;
      });
      const priorityOrder: any = { SPECIAL: 3, INTENSIVE: 2, REGULAR: 1 };
      applicablePeriods.sort(
        (a: any, b: any) => (priorityOrder[b.periodType] ?? 0) - (priorityOrder[a.periodType] ?? 0),
      );
      const period = applicablePeriods[0];

      if (period) {
        const dayOfWeek = currentDate.getDay();
        const pattern = period.workDayPatterns.find((p: any) => p.dayOfWeek === dayOfWeek);

        /* eslint-disable max-depth -- el motor de horarios requiere esta profundidad de anidamiento */
        if (pattern && pattern.isWorkingDay) {
          const effectiveSlots: EffectiveTimeSlot[] = pattern.timeSlots.map((slot: any) => ({
            startMinutes: Number(slot.startTimeMinutes),
            endMinutes: Number(slot.endTimeMinutes),
            slotType: slot.slotType,
            presenceType: slot.presenceType,
            isMandatory: slot.presenceType === "MANDATORY",
            description: slot.description ?? undefined,
            countsAsWork: slot.countsAsWork ?? true,
            compensationFactor: slot.compensationFactor ? Number(slot.compensationFactor) : 1.0,
            // Pausas Automáticas (Mejora 6)
            isAutomatic: slot.isAutomatic ?? false,
            timeSlotId: slot.id,
          }));

          let expectedMinutes = computeExpectedMinutesForSlots(effectiveSlots);

          if (absenceData && absenceData.isPartial && absenceData.durationMinutes) {
            expectedMinutes = Math.max(0, expectedMinutes - absenceData.durationMinutes);
          }

          schedules.push({
            date: new Date(currentDate),
            isWorkingDay: true,
            expectedMinutes,
            timeSlots: effectiveSlots,
            source: "PERIOD",
            periodName: period.name ?? period.periodType,
            ...(absenceData && absenceData.isPartial ? { absence: absenceData } : {}),
          });
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        } else {
          // Patrón existe pero no laborable
          schedules.push({
            date: new Date(currentDate),
            isWorkingDay: false,
            expectedMinutes: 0,
            timeSlots: [],
            source: "PERIOD",
            periodName: period.name ?? period.periodType,
          });
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
        /* eslint-enable max-depth */
      }
    }

    // 4.7 Fallback Contract
    const contractSchedule = await getContractBasedSchedule(employeeId, new Date(currentDate));
    schedules.push(contractSchedule);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return schedules;
}

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
 * @param options - Opciones adicionales (ej: incluir borradores)
 * @returns Horario efectivo con franjas horarias, minutos esperados, etc.
 *
 * @example
 * const horario = await getEffectiveSchedule("emp_123", new Date("2025-01-15"))
 * console.log(horario.expectedMinutes) // 480 (8 horas)
 * console.log(horario.timeSlots) // [{ startMinutes: 540, endMinutes: 1020, ... }]
 */
export async function getEffectiveSchedule(
  employeeId: string,
  date: Date,
  options: { includeDrafts?: boolean } = {},
): Promise<EffectiveSchedule> {
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

  // 2. PRIORIDAD MEDIA: Obtener asignación activa del empleado
  const assignment = await getActiveAssignment(employeeId, date);
  scheduleLog("🔍 [GET_EFFECTIVE_SCHEDULE] Assignment obtenido:", {
    hasAssignment: !!assignment,
    assignmentType: assignment?.assignmentType,
  });

  // 2.1 Resolver plantilla si hay asignación (para detectar FLEX_TOTAL temprano)
  let template: ScheduleTemplate | null = null;

  if (assignment) {
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
  }

  const isFlexTotal = assignment?.assignmentType === "FLEXIBLE" || template?.templateType === "FLEXIBLE";

  if (isFlexTotal) {
    const flexWeeklyException = await getFlexWeeklyExceptionForWeek(employeeId, date, template?.id);
    const flexPeriod = template ? await getActivePeriod(template, date) : null;
    const exceptionWeeklyHours = flexWeeklyException?.weeklyHours ? Number(flexWeeklyException.weeklyHours) : null;
    const periodWeeklyHours = flexPeriod?.weeklyHours ? Number(flexPeriod.weeklyHours) : null;
    const templateWeeklyHours = template?.weeklyHours ? Number(template.weeklyHours) : null;
    const weeklyHours = exceptionWeeklyHours ?? periodWeeklyHours ?? templateWeeklyHours ?? 0;
    const weeklyTargetMinutes = Math.round(weeklyHours * 60);
    return {
      date,
      isWorkingDay: true,
      expectedMinutes: 0,
      timeSlots: [],
      source: flexWeeklyException ? "EXCEPTION" : "TEMPLATE",
      scheduleMode: "FLEX_TOTAL",
      weeklyTargetMinutes,
      periodName: flexPeriod?.name ?? flexPeriod?.periodType,
      exceptionType: flexWeeklyException?.exceptionType,
      exceptionReason: flexWeeklyException?.reason ?? undefined,
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

  let contractFallback: EffectiveSchedule | null = null;
  if (!assignment) {
    scheduleLog("🔍 [GET_EFFECTIVE_SCHEDULE] Sin asignación explícita, consultando contrato...");
    contractFallback = await getContractBasedSchedule(employeeId, date);
    if (contractFallback.scheduleMode === "FLEX_TOTAL") {
      return contractFallback;
    }
  }

  // 3. PRIORIDAD CRÍTICA: Asignación Manual (Rostering / Planificación Semanal)
  // Sobrescribe excepciones, rotaciones y horarios fijos.
  const manualAssignment = await getManualAssignmentForDate(employeeId, date, options);
  if (manualAssignment) {
    // Si hay ausencia parcial, se ajustará al final
    const schedule = await buildScheduleFromManual(manualAssignment, date);

    // Aplicar ajuste de ausencia parcial si existe
    if (absence && absence.isPartial && absence.durationMinutes) {
      schedule.expectedMinutes = Math.max(0, schedule.expectedMinutes - absence.durationMinutes);
      schedule.absence = {
        type: absence.type,
        reason: absence.reason,
        isPartial: true,
        startTime: absence.startTime,
        endTime: absence.endTime,
        durationMinutes: absence.durationMinutes,
      };
    }
    return schedule;
  }

  // 4. PRIORIDAD ALTA: Buscar excepciones de día (días específicos con horario especial)
  const exception = await getExceptionForDate(employeeId, date);
  if (exception) {
    const schedule = buildScheduleFromException(exception, date);

    // Aplicar ajuste de ausencia parcial si existe
    if (absence && absence.isPartial && absence.durationMinutes) {
      schedule.expectedMinutes = Math.max(0, schedule.expectedMinutes - absence.durationMinutes);
      schedule.absence = {
        type: absence.type,
        reason: absence.reason,
        isPartial: true,
        startTime: absence.startTime,
        endTime: absence.endTime,
        durationMinutes: absence.durationMinutes,
      };
    }
    return schedule;
  }

  if (!assignment) {
    return contractFallback ?? (await getContractBasedSchedule(employeeId, date));
  }

  // 5. BUSCAR PERÍODO ACTIVO: SPECIAL > INTENSIVE > REGULAR (por fechas)
  const period = await getActivePeriod(template, date);

  if (!period) {
    // No hay período configurado para esta plantilla (error de configuración)
    // FASE 2.2: Marcar como CONFIGURATION_ERROR en lugar de retornar 0 silenciosamente
    console.warn(
      `[SCHEDULE_ENGINE] Template "${template.name}" (${template.id}) no tiene períodos configurados para la fecha ${date.toISOString()}`,
    );
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "CONFIGURATION_ERROR",
      configurationError: `Plantilla "${template.name}" sin períodos configurados para esta fecha`,
    };
  }

  // 6. OBTENER PATRÓN DEL DÍA DE LA SEMANA (0=Domingo, 1=Lunes, ..., 6=Sábado)
  const dayOfWeek = date.getDay();
  scheduleLog("🔍 [GET_EFFECTIVE_SCHEDULE] Buscando patrón del día:", {
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

  scheduleLog("📋 [GET_EFFECTIVE_SCHEDULE] Pattern encontrado:", {
    found: !!pattern,
    isWorkingDay: pattern?.isWorkingDay,
    slotsCount: pattern?.timeSlots.length,
  });

  if (!pattern || !pattern.isWorkingDay) {
    scheduleLog("❌ [GET_EFFECTIVE_SCHEDULE] Sin patrón o día no laborable, retornando schedule vacío");
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
    countsAsWork: slot.countsAsWork ?? true,
    compensationFactor: slot.compensationFactor ? Number(slot.compensationFactor) : 1.0,
    // Pausas Automáticas (Mejora 6)
    isAutomatic: slot.isAutomatic ?? false,
    timeSlotId: slot.id,
  }));

  // Calcular minutos esperados usando configuración de cada slot
  // ⚠️ NOTA: La lógica ahora es configurable por slot:
  // - BREAK solo cuenta si countsAsWork=true
  // - countsAsWork=false permite excluir ON_CALL si corresponde al sector
  // - compensationFactor aplica multiplicador (1.5 nocturno, 1.75 festivo, etc.)
  let expectedMinutes = computeExpectedMinutesForSlots(effectiveSlots);
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
 *
 * IMPORTANTE: Normaliza las fechas para comparación consistente.
 * Usa el mismo patrón que getEffectiveScheduleForRange() para evitar
 * problemas con horas (ej: endDate 00:00 vs date 12:00).
 */
async function getAbsenceForDate(employeeId: string, date: Date) {
  // Normalizar fecha a inicio y fin del día para comparación inclusiva
  // Esto evita el bug donde endDate=00:00:00 no matchea con date=12:00:00
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  return await prisma.ptoRequest
    .findFirst({
      where: {
        employeeId,
        status: "APPROVED",
        // Si la ausencia empieza antes del fin de hoy Y termina después del inicio de hoy
        startDate: { lte: dateEnd },
        endDate: { gte: dateStart },
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
        durationMinutes: absence.durationMinutes
          ? Number(absence.durationMinutes)
          : absence.startTime !== null && absence.endTime !== null
            ? Number(absence.endTime) - Number(absence.startTime)
            : undefined,
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
 * Busca una excepción semanal (FLEX_TOTAL) que aplique a la semana de una fecha.
 * Solo considera excepciones con weeklyHours definidas.
 */
async function getFlexWeeklyExceptionForWeek(employeeId: string, date: Date, scheduleTemplateId?: string | null) {
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

  const activeContract = employee.employmentContracts[0];
  const departmentId = activeContract?.departmentId ?? null;
  const costCenterId = activeContract?.costCenterId ?? null;

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  const exceptions = await prisma.exceptionDayOverride.findMany({
    where: {
      orgId: employee.orgId,
      deletedAt: null,
      weeklyHours: { not: null },
      OR: [
        { date: { gte: weekStart, lte: weekEnd } },
        {
          AND: [{ date: { lte: weekEnd } }, { OR: [{ endDate: null }, { endDate: { gte: weekStart } }] }],
        },
        { isRecurring: true },
      ],
      AND: [
        {
          OR: [
            { employeeId },
            ...(scheduleTemplateId ? [{ scheduleTemplateId }] : []),
            ...(departmentId ? [{ departmentId }] : []),
            ...(costCenterId ? [{ costCenterId }] : []),
            { isGlobal: true },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (exceptions.length === 0) return null;

  const validExceptions = exceptions.filter((exception) => {
    if (exception.isRecurring) {
      for (let i = 0; i < 7; i += 1) {
        const day = addDays(weekStart, i);
        if (day.getMonth() === exception.date.getMonth() && day.getDate() === exception.date.getDate()) {
          return true;
        }
      }
      return false;
    }

    const exceptionStart = new Date(exception.date);
    exceptionStart.setHours(0, 0, 0, 0);
    const exceptionEnd = exception.endDate ? new Date(exception.endDate) : new Date(exception.date);
    exceptionEnd.setHours(23, 59, 59, 999);
    return exceptionStart <= weekEnd && exceptionEnd >= weekStart;
  });

  if (validExceptions.length === 0) return null;

  const prioritized =
    validExceptions.find((e) => e.employeeId === employeeId) ??
    validExceptions.find((e) => scheduleTemplateId && e.scheduleTemplateId === scheduleTemplateId) ??
    validExceptions.find((e) => departmentId && e.departmentId === departmentId) ??
    validExceptions.find((e) => costCenterId && e.costCenterId === costCenterId) ??
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
      // Pausas Automáticas (Mejora 6)
      isAutomatic: slot.isAutomatic ?? false,
      timeSlotId: slot.id,
    }));

    // Calcular minutos esperados (suma de slots tipo WORK)
    // ⚠️ NOTA IMPORTANTE: En EXCEPCIONES usamos === "WORK" intencionalmente
    // para EXCLUIR slots ON_CALL de días festivos/especiales.
    // Esto es diferente a horarios normales donde usamos !== "BREAK"
    // para INCLUIR ON_CALL como tiempo computado.
    // NO CAMBIAR esta lógica - afectaría cálculos históricos de vacaciones y banco de horas.
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

  scheduleLog("🔍 [GET_ASSIGNMENT] Buscando asignación:", {
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
    scheduleLog("📋 [GET_ASSIGNMENT] Template encontrado:", {
      templateId: assignment.scheduleTemplate.id,
      templateName: assignment.scheduleTemplate.name,
      templateType: assignment.scheduleTemplate.templateType,
      periodsArray: assignment.scheduleTemplate.periods,
      periodsCount: assignment.scheduleTemplate.periods?.length,
      firstPeriod: assignment.scheduleTemplate.periods?.[0],
    });
  } else {
    scheduleLog("❌ [GET_ASSIGNMENT] Template NO cargado a pesar de tener scheduleTemplateId");
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
  // CORREGIDO: Usar módulo positivo para manejar fechas anteriores al inicio de la rotación
  // En JavaScript, (-5) % 4 = -1, pero necesitamos resultado positivo
  // Fórmula: ((n % m) + m) % m garantiza resultado positivo
  const positionInCycle = ((daysSinceStart % cycleDuration) + cycleDuration) % cycleDuration;

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
  scheduleLog("🔍 [GET_ACTIVE_PERIOD] Buscando período activo:", {
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

  scheduleLog("📋 [GET_ACTIVE_PERIOD] Períodos aplicables:", applicablePeriods.length);

  if (applicablePeriods.length === 0) {
    scheduleLog("❌ [GET_ACTIVE_PERIOD] No se encontraron períodos aplicables");
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
 * @param options - Opciones adicionales
 * @returns Horario completo de la semana con 7 días
 */
export async function getWeekSchedule(
  employeeId: string,
  weekStart: Date,
  options: { includeDrafts?: boolean } = {},
): Promise<WeekSchedule> {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Lunes
  const end = endOfWeek(weekStart, { weekStartsOn: 1 }); // Domingo

  const days: EffectiveSchedule[] = [];
  let totalExpectedMinutes = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const schedule = await getEffectiveSchedule(employeeId, date, options);
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
  // 1. Obtener ID de organización del empleado
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      orgId: true,
    },
  });

  if (!employee) {
    return {
      isValid: false,
      warnings: [],
      errors: ["Empleado no encontrado"],
    };
  }

  // 2. Obtener configuración de validaciones de la organización directamente
  const orgConfig = await prisma.organization.findUnique({
    where: { id: employee.orgId },
    select: {
      clockInToleranceMinutes: true,
      clockOutToleranceMinutes: true,
      earlyClockInToleranceMinutes: true,
      lateClockOutToleranceMinutes: true,
      nonWorkdayClockInAllowed: true,
      nonWorkdayClockInWarning: true,
    },
  });

  if (!orgConfig) {
    return {
      isValid: false,
      warnings: [],
      errors: ["Configuración de organización no encontrada"],
    };
  }

  const schedule = await getEffectiveSchedule(employeeId, timestamp);

  if (schedule.scheduleMode === "FLEX_TOTAL") {
    return {
      isValid: true,
      warnings: [],
      errors: [],
    };
  }

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

// ============================================================================
// Asignaciones Manuales (Planificación / Rostering)
// ============================================================================

/**
 * Busca una asignación manual para una fecha específica.
 */
async function getManualAssignmentForDate(employeeId: string, date: Date, options: { includeDrafts?: boolean } = {}) {
  // Normalizar fecha
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const dateStart = new Date(dateStr);

  // Construir filtro
  const where: any = {
    employeeId,
    date: dateStart,
  };

  // Si NO se piden borradores, filtrar solo los publicados
  // NOTA: Status CONFLICT tampoco se considera "Efectivo" para el empleado
  if (!options.includeDrafts) {
    where.status = "PUBLISHED";
  }

  return await prisma.manualShiftAssignment.findFirst({
    where,
  });
}

/**
 * Construye el horario efectivo basado en una asignación manual.
 */
async function buildScheduleFromManual(assignment: ManualShiftAssignment, date: Date): Promise<EffectiveSchedule> {
  // 1. Si hay overrides explícitos de hora, usarlos (Prioridad máxima dentro de manual)
  if (assignment.startTimeMinutes !== null && assignment.endTimeMinutes !== null) {
    const duration = assignment.endTimeMinutes - assignment.startTimeMinutes;
    const effectiveSlots: EffectiveTimeSlot[] = [
      {
        startMinutes: assignment.startTimeMinutes,
        endMinutes: assignment.endTimeMinutes,
        slotType: "WORK",
        presenceType: "MANDATORY",
        isMandatory: true,
        description: "Planificación Manual",
      },
    ];

    return {
      date,
      isWorkingDay: true,
      expectedMinutes: duration,
      timeSlots: effectiveSlots,
      source: "MANUAL",
      manualAssignment: {
        id: assignment.id,
        scheduleTemplateId: assignment.scheduleTemplateId,
        costCenterId: assignment.costCenterId,
        startTimeMinutes: assignment.startTimeMinutes,
        endTimeMinutes: assignment.endTimeMinutes,
      },
    };
  }

  // 2. Si no hay overrides, usar la plantilla referenciada
  // Necesitamos cargar la plantilla completa con sus patrones
  if (!assignment.scheduleTemplateId) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "MANUAL",
    };
  }

  const template = await prisma.scheduleTemplate.findUnique({
    where: { id: assignment.scheduleTemplateId },
    include: {
      periods: {
        include: {
          workDayPatterns: {
            include: { timeSlots: true },
          },
        },
      },
    },
  });

  if (!template) {
    console.error(`[MANUAL_SCHEDULE] Template ${assignment.scheduleTemplateId} not found`);
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "MANUAL", // Or ERROR
    };
  }

  // Usar la lógica de período activo para determinar qué patrón aplica
  // (Por si la plantilla de turno tiene versiones de verano/invierno)
  const period = await getActivePeriod(template, date);

  if (!period) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "MANUAL",
    };
  }

  const dayOfWeek = date.getDay();
  const pattern = period.workDayPatterns.find((p) => p.dayOfWeek === dayOfWeek);

  if (!pattern || !pattern.isWorkingDay) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "MANUAL",
    };
  }

  const effectiveSlots: EffectiveTimeSlot[] = pattern.timeSlots.map((slot) => ({
    startMinutes: slot.startTimeMinutes,
    endMinutes: slot.endTimeMinutes,
    slotType: slot.slotType,
    presenceType: slot.presenceType,
    isMandatory: slot.presenceType === "MANDATORY",
    description: slot.description ?? undefined,
    countsAsWork: slot.countsAsWork ?? true,
    compensationFactor: slot.compensationFactor ? Number(slot.compensationFactor) : 1.0,
    // Pausas Automáticas (Mejora 6)
    isAutomatic: slot.isAutomatic ?? false,
    timeSlotId: slot.id,
  }));

  // Calcular minutos esperados
  const expectedMinutes = computeExpectedMinutesForSlots(effectiveSlots);

  return {
    date,
    isWorkingDay: true,
    expectedMinutes,
    timeSlots: effectiveSlots,
    source: "MANUAL",
    periodName: period.name ?? period.periodType,
    manualAssignment: {
      id: assignment.id,
      scheduleTemplateId: assignment.scheduleTemplateId,
      costCenterId: assignment.costCenterId,
    },
  };
}

/**
 * Obtiene el horario efectivo basado en la configuración del contrato (Fallback)
 */
async function getContractBasedSchedule(employeeId: string, date: Date): Promise<EffectiveSchedule> {
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      active: true,
    },
    orderBy: { startDate: "desc" },
  });

  if (!contract) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "NO_CONTRACT",
    };
  }

  // Si es tipo TURNO y no se encontró asignación manual (paso 2), entonces es DESCANSO
  if (contract.workScheduleType === "SHIFT") {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "CONTRACT",
      periodName: "Descanso (Sin turno asignado)",
    };
  }

  // Si es FLEXIBLE, devolver promedio sin slots fijos
  if (contract.workScheduleType === "FLEXIBLE") {
    return {
      date,
      isWorkingDay: true,
      expectedMinutes: 0,
      timeSlots: [],
      source: "CONTRACT",
      periodName: "Flexible total",
      scheduleMode: "FLEX_TOTAL",
      weeklyTargetMinutes: 0,
    };
  }

  // Si es FIXED, construir horario desde campos legacy
  if (contract.workScheduleType === "FIXED") {
    const dayOfWeek = date.getDay(); // 0=Dom, 1=Lun...

    // Mapeo de día a campos del contrato
    const dayMap = [
      {
        work: contract.workSunday,
        start: contract.sundayStartTime,
        end: contract.sundayEndTime,
        bStart: contract.sundayBreakStartTime,
        bEnd: contract.sundayBreakEndTime,
      }, // 0
      {
        work: contract.workMonday,
        start: contract.mondayStartTime,
        end: contract.mondayEndTime,
        bStart: contract.mondayBreakStartTime,
        bEnd: contract.mondayBreakEndTime,
      }, // 1
      {
        work: contract.workTuesday,
        start: contract.tuesdayStartTime,
        end: contract.tuesdayEndTime,
        bStart: contract.tuesdayBreakStartTime,
        bEnd: contract.tuesdayBreakEndTime,
      }, // 2
      {
        work: contract.workWednesday,
        start: contract.wednesdayStartTime,
        end: contract.wednesdayEndTime,
        bStart: contract.wednesdayBreakStartTime,
        bEnd: contract.wednesdayBreakEndTime,
      }, // 3
      {
        work: contract.workThursday,
        start: contract.thursdayStartTime,
        end: contract.thursdayEndTime,
        bStart: contract.thursdayBreakStartTime,
        bEnd: contract.thursdayBreakEndTime,
      }, // 4
      {
        work: contract.workFriday,
        start: contract.fridayStartTime,
        end: contract.fridayEndTime,
        bStart: contract.fridayBreakStartTime,
        bEnd: contract.fridayBreakEndTime,
      }, // 5
      {
        work: contract.workSaturday,
        start: contract.saturdayStartTime,
        end: contract.saturdayEndTime,
        bStart: contract.saturdayBreakStartTime,
        bEnd: contract.saturdayBreakEndTime,
      }, // 6
    ];

    const config = dayMap[dayOfWeek];

    if (!config?.work || !config.start || !config.end) {
      return {
        date,
        isWorkingDay: false,
        expectedMinutes: 0,
        timeSlots: [],
        source: "CONTRACT",
        periodName: "Descanso Semanal",
      };
    }

    // Parsear horas
    const parseTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const startMinutes = parseTime(config.start);
    const endMinutes = parseTime(config.end);

    const timeSlots: EffectiveTimeSlot[] = [];
    let expectedMinutes = 0;

    if (config.bStart && config.bEnd) {
      const breakStart = parseTime(config.bStart);
      const breakEnd = parseTime(config.bEnd);

      // Tramo 1: Inicio -> Pausa
      if (breakStart > startMinutes) {
        timeSlots.push({
          startMinutes,
          endMinutes: breakStart,
          slotType: "WORK",
          presenceType: "MANDATORY",
          isMandatory: true,
        });
        expectedMinutes += breakStart - startMinutes;
      }

      // Pausa
      timeSlots.push({
        startMinutes: breakStart,
        endMinutes: breakEnd,
        slotType: "BREAK",
        presenceType: "MANDATORY",
        isMandatory: true,
        description: "Pausa",
      });

      // Tramo 2: Pausa -> Fin
      if (endMinutes > breakEnd) {
        timeSlots.push({
          startMinutes: breakEnd,
          endMinutes,
          slotType: "WORK",
          presenceType: "MANDATORY",
          isMandatory: true,
        });
        expectedMinutes += endMinutes - breakEnd;
      }
    } else {
      // Jornada continua
      timeSlots.push({
        startMinutes,
        endMinutes,
        slotType: "WORK",
        presenceType: "MANDATORY",
        isMandatory: true,
      });
      expectedMinutes += endMinutes - startMinutes;
    }

    return {
      date,
      isWorkingDay: true,
      expectedMinutes,
      timeSlots,
      source: "CONTRACT",
      periodName: "Horario Fijo",
    };
  }

  // Default fallback
  return {
    date,
    isWorkingDay: false,
    expectedMinutes: 0,
    timeSlots: [],
    source: "CONTRACT",
  };
}

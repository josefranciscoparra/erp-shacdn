"use server";

import { Decimal } from "@prisma/client/runtime/library";

import { resolveApproverUsers } from "@/lib/approvals/approval-engine";
import { getActionError } from "@/lib/auth-guard";
import { isEmployeePausedDuringRange } from "@/lib/contracts/discontinuous-utils";
import { getLocalDayRange, normalizeDateToLocalNoon } from "@/lib/dates/date-only";
import { prisma } from "@/lib/prisma";
import { calculatePtoBalanceByType } from "@/lib/pto/balance-service";
import { DEFAULT_PTO_BALANCE_TYPE, type PtoBalanceType } from "@/lib/pto/balance-types";
import { calculateVacationBalance, getVacationDisplayInfo } from "@/lib/vacation";
import { applyCompensationFactor, daysToMinutes, getWorkdayMinutes } from "@/services/pto";
import { getEffectiveSchedule, getEffectiveScheduleForRange } from "@/services/schedules/schedule-engine";

import { createNotification } from "./notifications";
import { recalculatePtoBalance } from "./pto-balance";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

type SlotRange = { startMinutes: number; endMinutes: number };

function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function clampDayToMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(day, 1), lastDay);
}

function buildCarryoverDeadline(year: number, month: number, day: number): Date {
  const monthIndex = Math.min(Math.max(month, 1), 12) - 1;
  const safeDay = clampDayToMonth(year, monthIndex, day);
  return new Date(year, monthIndex, safeDay, 23, 59, 59, 999);
}

function formatCarryoverLimit(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function checkCarryoverLimitMessage(
  orgId: string,
  employeeId: string,
  requestYear: number,
  endDate: Date,
  workingDays: number,
): Promise<string | null> {
  const ptoConfig = await prisma.organizationPtoConfig.findUnique({
    where: { orgId },
    select: {
      carryoverMode: true,
      carryoverDeadlineMonth: true,
      carryoverDeadlineDay: true,
      carryoverRequestDeadlineMonth: true,
      carryoverRequestDeadlineDay: true,
    },
  });

  const carryoverMode = ptoConfig?.carryoverMode ?? "NONE";
  if (carryoverMode !== "UNTIL_DATE") return null;

  const usageDeadlineMonth = ptoConfig?.carryoverDeadlineMonth ?? 1;
  const usageDeadlineDay = ptoConfig?.carryoverDeadlineDay ?? 29;
  const requestDeadlineMonth = ptoConfig?.carryoverRequestDeadlineMonth ?? usageDeadlineMonth;
  const requestDeadlineDay = ptoConfig?.carryoverRequestDeadlineDay ?? usageDeadlineDay;

  const requestDeadlineDate = buildCarryoverDeadline(requestYear, requestDeadlineMonth, requestDeadlineDay);
  const usageDeadlineDate = buildCarryoverDeadline(requestYear, usageDeadlineMonth, usageDeadlineDay);
  const requestIsLate = new Date() > requestDeadlineDate;
  const usageIsLate = endDate > usageDeadlineDate;

  if (!requestIsLate && !usageIsLate) return null;

  const cutoffDate =
    requestDeadlineDate.getTime() < usageDeadlineDate.getTime() ? requestDeadlineDate : usageDeadlineDate;
  const balanceBeforeDeadline = await calculateVacationBalance(employeeId, {
    year: requestYear,
    cutoffDate,
    includePending: true,
  });

  if (balanceBeforeDeadline.availableDays < workingDays) return null;

  const requestLimitLabel = formatCarryoverLimit(requestDeadlineDate);
  const usageLimitLabel = formatCarryoverLimit(usageDeadlineDate);
  return `Las vacaciones de ${requestYear - 1} solo se pueden solicitar hasta el ${requestLimitLabel} y disfrutar hasta el ${usageLimitLabel}.`;
}

function mergeSlotRanges(slots: SlotRange[]): SlotRange[] {
  if (slots.length === 0) return [];

  const sorted = [...slots]
    .filter((slot) => slot.endMinutes > slot.startMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (sorted.length === 0) return [];

  const merged: SlotRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.startMinutes <= last.endMinutes) {
      last.endMinutes = Math.max(last.endMinutes, current.endMinutes);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function intervalCoveredBySlots(slots: SlotRange[], startMinutes: number, endMinutes: number): boolean {
  return slots.some((slot) => startMinutes >= slot.startMinutes && endMinutes <= slot.endMinutes);
}

function describeSlots(slots: SlotRange[]): string {
  if (slots.length === 0) return "";

  return slots
    .map((slot) => `${formatMinutesToTime(slot.startMinutes)}-${formatMinutesToTime(slot.endMinutes)}`)
    .join(", ");
}

/**
 * Obtiene el aprobador por defecto para un empleado según el flujo configurado
 */
export async function getDefaultApprover(employeeId: string, orgId: string): Promise<string> {
  const approvers = await resolveApproverUsers(employeeId, orgId, "PTO");
  if (approvers[0]) {
    return approvers[0].userId;
  }
  throw new Error("No se encontró un aprobador disponible");
}

/**
 * Calcula días hábiles entre dos fechas, excluyendo fines de semana y festivos
 */
export async function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  employeeId: string,
  orgId: string,
  countsCalendarDays: boolean = false,
): Promise<{ workingDays: number; holidays: Array<{ date: Date; name: string }> }> {
  // Si no se proporcionan IDs (ej: desde cliente), intentar obtener del usuario autenticado
  if (!employeeId || !orgId) {
    try {
      const auth = await getAuthenticatedEmployee();
      employeeId = auth.employeeId;
      orgId = auth.orgId;
    } catch (error) {
      // Si falla la autenticación y no hay IDs, calculamos sin festivos (solo fines de semana)
      console.warn("calculateWorkingDays: No employeeId/orgId and no auth session");
    }
  }

  const normalizedStart = normalizeDateToLocalNoon(startDate);
  const normalizedEnd = normalizeDateToLocalNoon(endDate);
  const rangeStart = getLocalDayRange(normalizedStart).start;
  const rangeEnd = getLocalDayRange(normalizedEnd).end;

  // Obtener el centro de coste del empleado para saber qué calendarios aplican
  let calendars: any[] = [];

  if (employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employmentContracts: {
          where: { active: true },
          include: {
            costCenter: {
              include: {
                calendars: {
                  where: { active: true },
                  include: {
                    events: {
                      where: {
                        eventType: "HOLIDAY",
                        date: {
                      gte: rangeStart,
                      lte: rangeEnd,
                    },
                  },
                },
                  },
                },
              },
            },
          },
          take: 1,
        },
      },
    });
    calendars = employee?.employmentContracts[0]?.costCenter?.calendars ?? [];
  }

  // Recopilar festivos
  const holidaysMap = new Map<string, { date: Date; name: string }>();

  for (const calendar of calendars) {
    for (const event of calendar.events) {
      const dateStr = event.date.toISOString().split("T")[0];
      if (!holidaysMap.has(dateStr)) {
        holidaysMap.set(dateStr, {
          date: event.date,
          name: event.name,
        });
      }
    }
  }

  // Contar días
  let workingDays = 0;
  const currentDate = new Date(normalizedStart);
  currentDate.setHours(12, 0, 0, 0);
  const end = new Date(normalizedEnd);
  end.setHours(12, 0, 0, 0);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split("T")[0];

    if (countsCalendarDays) {
      // Si cuenta días naturales, contamos TODOS los días (incluso festivos y fines de semana)
      // Útil para bajas médicas, permisos de matrimonio, nacimiento, etc.
      workingDays++;
    } else {
      // Lógica estándar: Días laborables
      const dayOfWeek = currentDate.getDay();

      // Excluir sábados (6) y domingos (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Excluir festivos
        if (!holidaysMap.has(dateStr)) {
          workingDays++;
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    workingDays,
    holidays: Array.from(holidaysMap.values()),
  };
}

/**
 * Obtiene el balance de PTO del empleado autenticado
 *
 * REFACTORIZADO: Usa calculateVacationBalance() para cálculo en tiempo real
 * - Contratos normales: prorrateo desde fecha de alta
 * - Fijos discontinuos: devengo día a día solo durante períodos ACTIVE
 */
export async function getMyPtoBalance(balanceType: PtoBalanceType = DEFAULT_PTO_BALANCE_TYPE) {
  try {
    const { employeeId, hasActiveContract, hasProvisionalContract, activeContract } = await getAuthenticatedEmployee();
    const currentYear = new Date().getFullYear();

    if (!hasActiveContract || !activeContract) {
      return {
        id: "NO_CONTRACT",
        year: currentYear,
        balanceType,
        // ❌ DEPRECADO
        annualAllowance: 0,
        daysUsed: 0,
        daysPending: 0,
        daysAvailable: 0,
        // ✅ NUEVOS CAMPOS
        annualAllowanceMinutes: 0,
        minutesUsed: 0,
        minutesPending: 0,
        minutesAvailable: 0,
        workdayMinutesSnapshot: 480, // default 8h
        hasActiveContract: false,
        hasProvisionalContract,
      };
    }

    if (balanceType === "VACATION") {
      // 🆕 CÁLCULO EN TIEMPO REAL usando VacationService
      // Diferencia automáticamente entre contratos normales y fijos discontinuos
      const balance = await calculateVacationBalance(employeeId, { year: currentYear });
      const displayInfo = await getVacationDisplayInfo(employeeId);

      return {
        id: `REALTIME_${employeeId}_${currentYear}`,
        year: currentYear,
        balanceType,
        // Campos legacy en días (para compatibilidad)
        annualAllowance: balance.annualAllowanceDays,
        daysUsed: balance.usedDays,
        daysPending: balance.pendingDays,
        daysAvailable: balance.availableDays,
        // Campos nuevos en minutos
        annualAllowanceMinutes: daysToMinutes(balance.annualAllowanceDays, balance.workdayMinutes),
        minutesUsed: balance.usedMinutes,
        minutesPending: balance.pendingMinutes,
        minutesAvailable: balance.availableMinutes,
        workdayMinutesSnapshot: balance.workdayMinutes,
        // Metadatos del contrato
        hasActiveContract: true,
        hasProvisionalContract,
        // 🆕 Información adicional para UI
        displayLabel: displayInfo.label,
        contractType: balance.contractType,
        discontinuousStatus: balance.discontinuousStatus,
        showFrozenIndicator: displayInfo.showFrozenIndicator,
        frozenSince: displayInfo.frozenSince,
        roundingUnit: balance.roundingUnit,
        roundingMode: balance.roundingMode,
      };
    }

    const balance = await calculatePtoBalanceByType(employeeId, balanceType, { year: currentYear });

    return {
      id: `REALTIME_${employeeId}_${currentYear}_${balanceType}`,
      year: currentYear,
      balanceType,
      annualAllowance: balance.annualAllowanceDays,
      daysUsed: balance.usedDays,
      daysPending: balance.pendingDays,
      daysAvailable: balance.availableDays,
      annualAllowanceMinutes: daysToMinutes(balance.annualAllowanceDays, balance.workdayMinutes),
      minutesUsed: balance.usedMinutes,
      minutesPending: balance.pendingMinutes,
      minutesAvailable: balance.availableMinutes,
      workdayMinutesSnapshot: balance.workdayMinutes,
      hasActiveContract: true,
      hasProvisionalContract,
      displayLabel: balance.displayLabel,
      contractType: balance.contractType,
      discontinuousStatus: balance.discontinuousStatus,
      showFrozenIndicator: false,
      frozenSince: null,
    };
  } catch (error) {
    console.error("Error al obtener balance de PTO:", error);
    throw error;
  }
}

/**
 * Obtiene los tipos de ausencia disponibles
 */
export async function getAbsenceTypes() {
  try {
    const { orgId } = await getAuthenticatedEmployee();

    const types = await prisma.absenceType.findMany({
      where: {
        orgId,
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Serializar Decimal a Number para Next.js 15 (no se pueden pasar Decimals al cliente)
    return types.map((type) => ({
      ...type,
      compensationFactor: Number(type.compensationFactor),
      balanceType: type.balanceType ?? "VACATION",
    }));
  } catch (error) {
    console.error("Error al obtener tipos de ausencia:", error);
    throw error;
  }
}

/**
 * Obtiene las solicitudes de PTO del empleado autenticado
 */
export async function getMyPtoRequests() {
  try {
    const { employeeId, orgId } = await getAuthenticatedEmployee();

    const requests = await prisma.ptoRequest.findMany({
      where: {
        employeeId,
        orgId,
      },
      include: {
        absenceType: true,
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // 🆕 Contar documentos adjuntos (Mejora 2)
        _count: {
          select: {
            documents: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    return requests.map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      workingDays: Number(r.workingDays),
      status: r.status,
      reason: r.reason,
      attachmentUrl: r.attachmentUrl,
      submittedAt: r.submittedAt,
      approvedAt: r.approvedAt,
      rejectedAt: r.rejectedAt,
      cancelledAt: r.cancelledAt,
      approverComments: r.approverComments,
      rejectionReason: r.rejectionReason,
      cancellationReason: r.cancellationReason,
      // Serializar compensationFactor de Decimal a Number para Next.js 15
      absenceType: {
        ...r.absenceType,
        compensationFactor: Number(r.absenceType.compensationFactor),
        balanceType: r.absenceType.balanceType ?? "VACATION",
      },
      approver: r.approver,
      // 🆕 Campos para ausencias parciales
      startTime: r.startTime,
      endTime: r.endTime,
      durationMinutes: r.durationMinutes,
      // 🆕 Conteo de documentos (Mejora 2)
      _count: r._count,
    }));
  } catch (error) {
    console.error("Error al obtener solicitudes de PTO:", error);
    throw error;
  }
}

/**
 * Crea una nueva solicitud de PTO
 */
export async function createPtoRequest(data: {
  absenceTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  attachmentUrl?: string;
  // 🆕 Campos para ausencias parciales (en minutos desde medianoche)
  startTime?: number; // Ej: 540 = 09:00
  endTime?: number; // Ej: 1020 = 17:00
  durationMinutes?: number; // Duración total en minutos
}) {
  try {
    const fail = (message: string) => ({ success: false as const, error: message });

    const { employeeId, orgId, employee } = await getAuthenticatedEmployee({
      requireActiveContract: true,
    });

    const normalizedStartDate = normalizeDateToLocalNoon(data.startDate);
    const normalizedEndDate = normalizeDateToLocalNoon(data.endDate);

    // Validar fechas
    if (normalizedStartDate > normalizedEndDate) {
      return fail("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    // Obtener tipo de ausencia
    const absenceType = await prisma.absenceType.findUnique({
      where: { id: data.absenceTypeId },
    });

    if (!absenceType || !absenceType.active) {
      return fail("Tipo de ausencia no válido");
    }

    const isPausedForRange = await isEmployeePausedDuringRange(
      employeeId,
      normalizedStartDate,
      normalizedEndDate,
      orgId,
    );
    if (isPausedForRange) {
      return fail("Tu contrato fijo discontinuo está pausado en las fechas solicitadas.");
    }

    const workdayMinutes = await getWorkdayMinutes(employeeId, orgId);
    let requestedDurationMinutes: number | null = null;

    const startTimeProvided = typeof data.startTime === "number";
    const endTimeProvided = typeof data.endTime === "number";
    const durationProvided = typeof data.durationMinutes === "number";
    const hasPartialPayload = startTimeProvided || endTimeProvided || durationProvided;

    if (hasPartialPayload) {
      if (!absenceType.allowPartialDays) {
        return fail("Este tipo de ausencia no permite especificar horas");
      }

      if (!startTimeProvided || !endTimeProvided) {
        return fail("Para ausencias parciales debes indicar la hora de inicio y la de fin");
      }

      if (normalizedStartDate.getTime() !== normalizedEndDate.getTime()) {
        return fail("Las ausencias parciales solo pueden ser para un mismo día");
      }

      const startTime = data.startTime as number;
      const endTime = data.endTime as number;

      if (startTime < 0 || startTime > 1440 || endTime < 0 || endTime > 1440) {
        return fail("Las horas deben estar entre 00:00 y 24:00");
      }

      if (startTime >= endTime) {
        return fail("La hora de inicio debe ser anterior a la hora de fin");
      }

      requestedDurationMinutes = endTime - startTime;

      if (requestedDurationMinutes % absenceType.granularityMinutes !== 0) {
        return fail(`La duración debe ser múltiplo de ${absenceType.granularityMinutes} minutos`);
      }

      if (requestedDurationMinutes < absenceType.minimumDurationMinutes) {
        return fail(
          `La duración mínima es de ${absenceType.minimumDurationMinutes} minutos (${absenceType.minimumDurationMinutes / 60}h)`,
        );
      }

      if (absenceType.maxDurationMinutes && requestedDurationMinutes > absenceType.maxDurationMinutes) {
        return fail(
          `La duración máxima es de ${absenceType.maxDurationMinutes} minutos (${absenceType.maxDurationMinutes / 60}h)`,
        );
      }

      const employeeSchedule = await getEffectiveSchedule(employeeId, normalizedStartDate);

      if (!employeeSchedule.isWorkingDay) {
        return fail("El día seleccionado no es un día laboral según tu horario");
      }

      const workingSlots = employeeSchedule.timeSlots.filter(
        (slot) => slot.countsAsWork !== false && slot.slotType !== "BREAK",
      );

      if (workingSlots.length === 0) {
        return fail("No tienes franjas laborales configuradas en esta fecha");
      }

      const mergedSlots = mergeSlotRanges(
        workingSlots.map((slot) => ({
          startMinutes: slot.startMinutes,
          endMinutes: slot.endMinutes,
        })),
      );

      if (!intervalCoveredBySlots(mergedSlots, startTime, endTime)) {
        return fail(
          `Las horas solicitadas (${formatMinutesToTime(startTime)}-${formatMinutesToTime(endTime)}) deben estar dentro de tus franjas laborales (${describeSlots(mergedSlots)})`,
        );
      }
    } else if (!absenceType.allowPartialDays && (startTimeProvided || endTimeProvided)) {
      return fail("Este tipo de ausencia no permite especificar horas");
    }
    // Si allowPartialDays=true pero NO se enviaron horas → día completo, válido

    const rawBalanceType = (absenceType as { balanceType?: string | null }).balanceType;
    const requestBalanceType = rawBalanceType ?? "VACATION";

    if (requestBalanceType === "VACATION" && requestedDurationMinutes !== null) {
      const ptoConfig = await prisma.organizationPtoConfig.findUnique({
        where: { orgId },
        select: { vacationRoundingUnit: true },
      });
      const rawRoundingUnit = ptoConfig?.vacationRoundingUnit;
      const roundingUnit = rawRoundingUnit === null || rawRoundingUnit === undefined ? 0.1 : Number(rawRoundingUnit);
      const requestedDays = requestedDurationMinutes / workdayMinutes;
      const ratio = requestedDays / roundingUnit;
      const isAligned = Math.abs(Math.round(ratio) - ratio) < 0.0001;

      if (!isAligned) {
        return fail(`Las vacaciones deben solicitarse en múltiplos de ${roundingUnit} días.`);
      }
    }

    let forceManualReview = false;
    let systemWarningReason = "";

    const countsCalendarDays = Boolean(
      (absenceType as unknown as { countsCalendarDays?: boolean }).countsCalendarDays ?? false,
    );

    // Calcular días hábiles o fracción de día para ausencias parciales
    let workingDays = 0;
    let holidays: Array<{ date: Date; name: string }> = [];
    let scheduledMinutesInRange = 0;

    if (requestedDurationMinutes !== null) {
      workingDays = requestedDurationMinutes / workdayMinutes;
      scheduledMinutesInRange = requestedDurationMinutes;
    } else {
      // Para días completos: calcular días hábiles excluyendo festivos (o naturales si aplica)
      const result = await calculateWorkingDays(
        normalizedStartDate,
        normalizedEndDate,
        employeeId,
        orgId,
        countsCalendarDays,
      );
      holidays = result.holidays;

      if (countsCalendarDays) {
        workingDays = result.workingDays;
      } else {
        const schedules = await getEffectiveScheduleForRange(employeeId, normalizedStartDate, normalizedEndDate);

        if (schedules.length === 0) {
          return fail("No se pudo resolver tu horario para las fechas seleccionadas.");
        }

        const workingScheduleDays = schedules.filter((day) => day.isWorkingDay && day.expectedMinutes > 0);
        workingDays = workingScheduleDays.length;
        scheduledMinutesInRange = workingScheduleDays.reduce((sum, day) => sum + day.expectedMinutes, 0);

        if (workingDays === 0) {
          return fail("No tienes turnos planificados en las fechas seleccionadas.");
        }

        const skippedDays = schedules.length - workingScheduleDays.length;
        if (skippedDays > 0) {
          systemWarningReason += ` [ℹ️ ${skippedDays} día(s) del rango no tienen turnos asignados y no se descontarán.]`;
        }
      }
    }

    // Validar días de anticipación
    const daysUntilStart = Math.ceil(
      (normalizedStartDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );

    if (absenceType.minDaysAdvance > 0 && daysUntilStart < absenceType.minDaysAdvance) {
      return fail(`Esta ausencia requiere ${absenceType.minDaysAdvance} días de anticipación`);
    }

    // Validar que no haya solapamiento con otras solicitudes aprobadas
    const overlappingRequests = await prisma.ptoRequest.findMany({
      where: {
        employeeId,
        orgId,
        status: "APPROVED",
        OR: [
          {
            startDate: {
              lte: normalizedEndDate,
            },
            endDate: {
              gte: normalizedStartDate,
            },
          },
        ],
      },
      include: {
        absenceType: true,
      },
    });

    if (overlappingRequests.length > 0) {
      // LÓGICA DE PRIORIDAD DE AUSENCIAS:
      // Definir códigos de alta prioridad
      const HIGH_PRIORITY_CODES = ["SICK_LEAVE", "MATERNITY_PATERNITY"];
      // Definir códigos de baja prioridad (cancelables)
      const LOW_PRIORITY_CODES = ["VACATION", "PERSONAL", "UNPAID_LEAVE"];

      // Obtener el código de la nueva solicitud
      const newTypeCode = absenceType.code;
      const isHighPriority = HIGH_PRIORITY_CODES.includes(newTypeCode);

      if (isHighPriority) {
        // Verificar si TODOS los solapamientos son cancelables
        const allOverlapsAreCancellable = overlappingRequests.every((req) =>
          LOW_PRIORITY_CODES.includes(req.absenceType.code),
        );

        if (allOverlapsAreCancellable) {
          // ✅ ESCENARIO B: SUPERVISIÓN DEL RESPONSABLE
          // En lugar de cancelar automáticamente, forzamos estado PENDING.
          // El responsable verá el conflicto y al aprobar se ejecutará la cancelación (en approvePtoRequest).
          forceManualReview = true;
          systemWarningReason += ` [⚠️ AVISO SISTEMA: Esta baja coincide con vacaciones aprobadas. Su aprobación cancelará las vacaciones existentes.]`;

          // No lanzamos error, permitimos continuar
        } else {
          // Si hay solapamientos que NO son cancelables (ej: otra Baja Médica), bloqueamos
          return fail("Ya existe una baja o permiso protegido en estas fechas.");
        }
      } else {
        // Si la nueva solicitud es normal (Vacaciones), comportamiento estándar: Bloquear
        return fail("Ya tienes una solicitud aprobada en estas fechas. Cancélala primero si es necesario.");
      }
    }

    // Si afecta al balance, validar días disponibles
    // 🆕 Usa cálculo en tiempo real (VacationService)
    if (absenceType.affectsBalance) {
      const requestYear = normalizedStartDate.getFullYear();
      const requestBalanceType =
        (absenceType as { balanceType?: PtoBalanceType | null }).balanceType ?? DEFAULT_PTO_BALANCE_TYPE;
      const balance = await calculatePtoBalanceByType(employeeId, requestBalanceType, { year: requestYear });
      const shortage = workingDays - balance.availableDays;

      if (balance.availableDays < workingDays) {
        // Verificar si el problema es por límite de carryover
        if (requestBalanceType === "VACATION") {
          const carryoverMsg = await checkCarryoverLimitMessage(
            orgId,
            employeeId,
            requestYear,
            normalizedEndDate,
            workingDays,
          );
          if (carryoverMsg) {
            return fail(carryoverMsg);
          }
        }

        return fail(`No tienes suficientes días disponibles (te faltan ${shortage} días)`);
      }
    }

    // Resolver destinatarios de aprobación según el flujo configurado
    const approverUsers = await resolveApproverUsers(employeeId, orgId, "PTO");
    const approverIds = approverUsers.map((a) => a.userId);

    // Obtener aprobador principal (para guardar en la solicitud)
    // Solo aplica si requiere aprobación o forzamos revisión manual
    let approverId: string | undefined;
    const requiresRouting = absenceType.requiresApproval || forceManualReview;
    if (requiresRouting) {
      approverId = approverIds[0];
      if (!approverId) {
        return fail("No se encontró un aprobador disponible");
      }
    }

    // 🆕 SISTEMA DE BALANCE EN MINUTOS - Calcular effectiveMinutes
    let minutesToDiscount: number;

    if (requestedDurationMinutes !== null) {
      minutesToDiscount = requestedDurationMinutes;
    } else if (countsCalendarDays) {
      minutesToDiscount = daysToMinutes(workingDays, workdayMinutes);
    } else {
      minutesToDiscount =
        scheduledMinutesInRange > 0 ? scheduledMinutesInRange : daysToMinutes(workingDays, workdayMinutes);
    }

    const effectiveMinutes = applyCompensationFactor(minutesToDiscount, Number(absenceType.compensationFactor));

    // Determinar estado final
    // Si forceManualReview es true -> PENDING
    // Si requiresApproval es true -> PENDING
    // Si requiresApproval es false y no forceManualReview -> APPROVED
    const finalStatus = requiresRouting ? "PENDING" : "APPROVED";
    const finalApprovedAt = finalStatus === "APPROVED" ? new Date() : undefined;

    // Crear la solicitud
    const request = await prisma.ptoRequest.create({
      data: {
        orgId,
        employeeId,
        absenceTypeId: data.absenceTypeId,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        workingDays: new Decimal(workingDays),
        reason: (data.reason ?? "") + systemWarningReason, // Añadir warning al motivo
        attachmentUrl: data.attachmentUrl,
        status: finalStatus,
        approverId: approverId,
        approvedAt: finalApprovedAt,
        // 🆕 Campos para ausencias parciales
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: requestedDurationMinutes ?? null,
        // 🆕 SISTEMA DE BALANCE EN MINUTOS
        effectiveMinutes,
      },
      include: {
        absenceType: true,
        approver: {
          select: {
            name: true,
          },
        },
      },
    });

    // Recalcular balance
    const currentYear = new Date().getFullYear();
    await recalculatePtoBalance(employeeId, orgId, currentYear);

    // Notificaciones a todos los destinatarios del flujo
    if (approverIds.length > 0) {
      const requesterName = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "El empleado";
      const daysText =
        requestedDurationMinutes !== null ? `${Math.round(minutesToDiscount / 60)}h` : `${workingDays} días`;
      const title = finalStatus === "PENDING" ? "Nueva solicitud de ausencia" : "Ausencia registrada";
      const message =
        `${requesterName} ha solicitado ${daysText} de ${absenceType.name}` +
        (finalStatus === "APPROVED" ? " (aprobada automáticamente)" : "") +
        (forceManualReview ? " (conflicto detectado)" : "");

      for (const recipientId of approverIds) {
        await createNotification(recipientId, orgId, "PTO_SUBMITTED", title, message, request.id);
      }
    }

    return {
      success: true,
      request: {
        id: request.id,
        workingDays,
        holidays,
      },
    };
  } catch (error) {
    return { success: false, error: getActionError(error, "Error al crear solicitud de ausencia") };
  }
}

/**
 * Cancela una solicitud de PTO pendiente
 */
export async function cancelPtoRequest(requestId: string, reason?: string) {
  try {
    const { employeeId, orgId, employee } = await getAuthenticatedEmployee();

    // Obtener la solicitud
    const request = await prisma.ptoRequest.findUnique({
      where: {
        id: requestId,
        employeeId, // Seguridad: solo puede cancelar sus propias solicitudes
      },
      include: {
        absenceType: true,
      },
    });

    if (!request) {
      throw new Error("Solicitud no encontrada");
    }

    if (request.status !== "PENDING") {
      throw new Error("Solo se pueden cancelar solicitudes pendientes");
    }

    // Actualizar la solicitud
    await prisma.ptoRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    // Recalcular balance
    const currentYear = new Date().getFullYear();
    await recalculatePtoBalance(employeeId, orgId, currentYear);

    // Notificar al aprobador
    if (request.approverId) {
      await createNotification(
        request.approverId,
        orgId,
        "PTO_CANCELLED",
        "Solicitud cancelada",
        `${employee.firstName} ${employee.lastName} ha cancelado su solicitud de ${request.absenceType.name}`,
        requestId,
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error al cancelar solicitud:", error);
    throw error;
  }
}

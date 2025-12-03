"use server";

import { Decimal } from "@prisma/client/runtime/library";

import { resolveApproverUsers } from "@/lib/approvals/approval-engine";
import { prisma } from "@/lib/prisma";
import { applyCompensationFactor, daysToMinutes, getWorkdayMinutes } from "@/services/pto";
import { getEffectiveScheduleForRange } from "@/services/schedules/schedule-engine";

import { createNotification } from "./notifications";
import { calculateOrUpdatePtoBalance, recalculatePtoBalance } from "./pto-balance";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

/**
 * Obtiene el aprobador por defecto para un empleado según el flujo configurado
 */
export async function getDefaultApprover(employeeId: string, orgId: string): Promise<string> {
  const approvers = await resolveApproverUsers(employeeId, orgId);
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
                          gte: startDate,
                          lte: endDate,
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
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

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
 */
export async function getMyPtoBalance() {
  try {
    const { employeeId, orgId, hasActiveContract, hasProvisionalContract, activeContract } =
      await getAuthenticatedEmployee();
    const currentYear = new Date().getFullYear();

    if (!hasActiveContract || !activeContract) {
      return {
        id: "NO_CONTRACT",
        year: currentYear,
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

    // Calcular o actualizar el balance
    const balance = await calculateOrUpdatePtoBalance(employeeId, orgId, currentYear);

    return {
      ...balance,
      hasActiveContract: true,
      hasProvisionalContract,
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
      },
      approver: r.approver,
      // 🆕 Campos para ausencias parciales
      startTime: r.startTime,
      endTime: r.endTime,
      durationMinutes: r.durationMinutes,
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
    const { employeeId, orgId, employee } = await getAuthenticatedEmployee({
      requireActiveContract: true,
    });

    // Validar fechas
    if (data.startDate > data.endDate) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    // Obtener tipo de ausencia
    const absenceType = await prisma.absenceType.findUnique({
      where: { id: data.absenceTypeId },
    });

    if (!absenceType || !absenceType.active) {
      throw new Error("Tipo de ausencia no válido");
    }

    // 🆕 Validaciones para ausencias parciales
    if (absenceType.allowPartialDays) {
      // Si permite fracciones, debe especificar startTime, endTime y durationMinutes
      if (data.startTime === undefined || data.endTime === undefined || data.durationMinutes === undefined) {
        throw new Error("Para ausencias parciales debes especificar las horas de inicio y fin");
      }

      // Validar que solo sea un mismo día
      if (data.startDate.getTime() !== data.endDate.getTime()) {
        throw new Error("Las ausencias parciales solo pueden ser para un mismo día");
      }

      // Validar rango de horas (0-1440 minutos)
      if (data.startTime < 0 || data.startTime > 1440 || data.endTime < 0 || data.endTime > 1440) {
        throw new Error("Las horas deben estar entre 00:00 y 24:00");
      }

      if (data.startTime >= data.endTime) {
        throw new Error("La hora de inicio debe ser anterior a la hora de fin");
      }

      // Validar granularidad
      if (data.durationMinutes % absenceType.granularityMinutes !== 0) {
        throw new Error(`La duración debe ser múltiplo de ${absenceType.granularityMinutes} minutos`);
      }

      // Validar duración mínima
      if (data.durationMinutes < absenceType.minimumDurationMinutes) {
        throw new Error(
          `La duración mínima es de ${absenceType.minimumDurationMinutes} minutos (${absenceType.minimumDurationMinutes / 60}h)`,
        );
      }

      // Validar duración máxima (si está configurada)
      if (absenceType.maxDurationMinutes && data.durationMinutes > absenceType.maxDurationMinutes) {
        throw new Error(
          `La duración máxima es de ${absenceType.maxDurationMinutes} minutos (${absenceType.maxDurationMinutes / 60}h)`,
        );
      }
    } else {
      // Si NO permite fracciones, no debe especificar horas
      if (data.startTime !== undefined || data.endTime !== undefined) {
        throw new Error("Este tipo de ausencia no permite especificar horas");
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

    if (absenceType.allowPartialDays && data.durationMinutes) {
      // Para ausencias parciales: convertir minutos a fracción de día
      // Asumiendo jornada laboral de 8 horas = 480 minutos
      const MINUTES_PER_WORKDAY = 480;
      workingDays = data.durationMinutes / MINUTES_PER_WORKDAY;
      scheduledMinutesInRange = data.durationMinutes;
    } else {
      // Para días completos: calcular días hábiles excluyendo festivos (o naturales si aplica)
      const result = await calculateWorkingDays(data.startDate, data.endDate, employeeId, orgId, countsCalendarDays);
      holidays = result.holidays;

      if (countsCalendarDays) {
        workingDays = result.workingDays;
      } else {
        const schedules = await getEffectiveScheduleForRange(employeeId, data.startDate, data.endDate);

        if (schedules.length === 0) {
          throw new Error("No se pudo resolver tu horario para las fechas seleccionadas.");
        }

        const workingScheduleDays = schedules.filter((day) => day.isWorkingDay && day.expectedMinutes > 0);
        workingDays = workingScheduleDays.length;
        scheduledMinutesInRange = workingScheduleDays.reduce((sum, day) => sum + day.expectedMinutes, 0);

        if (workingDays === 0) {
          throw new Error("No tienes turnos planificados en las fechas seleccionadas.");
        }

        const skippedDays = schedules.length - workingScheduleDays.length;
        if (skippedDays > 0) {
          systemWarningReason += ` [ℹ️ ${skippedDays} día(s) del rango no tienen turnos asignados y no se descontarán.]`;
        }
      }
    }

    // Validar días de anticipación
    const daysUntilStart = Math.ceil((data.startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (absenceType.minDaysAdvance > 0 && daysUntilStart < absenceType.minDaysAdvance) {
      throw new Error(`Esta ausencia requiere ${absenceType.minDaysAdvance} días de anticipación`);
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
              lte: data.endDate,
            },
            endDate: {
              gte: data.startDate,
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
          throw new Error("Ya existe una baja o permiso protegido en estas fechas.");
        }
      } else {
        // Si la nueva solicitud es normal (Vacaciones), comportamiento estándar: Bloquear
        throw new Error("Ya tienes una solicitud aprobada en estas fechas. Cancélala primero si es necesario.");
      }
    }

    // Si afecta al balance, validar días disponibles

    // Si afecta al balance, validar días disponibles
    if (absenceType.affectsBalance) {
      const currentYear = new Date().getFullYear();
      const balance = await calculateOrUpdatePtoBalance(employeeId, orgId, currentYear);

      if (balance.daysAvailable < workingDays) {
        throw new Error(
          `No tienes suficientes días disponibles (te faltan ${workingDays - balance.daysAvailable} días)`,
        );
      }
    }

    // Resolver destinatarios de aprobación según el flujo configurado
    const approverUsers = await resolveApproverUsers(employeeId, orgId);
    const approverIds = approverUsers.map((a) => a.userId);

    // Obtener aprobador principal (para guardar en la solicitud)
    // Solo aplica si requiere aprobación o forzamos revisión manual
    let approverId: string | undefined;
    const requiresRouting = absenceType.requiresApproval || forceManualReview;
    if (requiresRouting) {
      approverId = approverIds[0];
      if (!approverId) {
        throw new Error("No se encontró un aprobador disponible");
      }
    }

    // 🆕 SISTEMA DE BALANCE EN MINUTOS - Calcular effectiveMinutes
    const workdayMinutes = await getWorkdayMinutes(employeeId, orgId);
    let minutesToDiscount: number;

    if (absenceType.allowPartialDays && data.durationMinutes) {
      minutesToDiscount = data.durationMinutes;
    } else if (countsCalendarDays) {
      minutesToDiscount = daysToMinutes(workingDays, workdayMinutes);
    } else {
      minutesToDiscount =
        scheduledMinutesInRange > 0 ? scheduledMinutesInRange : daysToMinutes(workingDays, workdayMinutes);
    }

    const effectiveMinutes = applyCompensationFactor(minutesToDiscount, absenceType.compensationFactor);

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
        startDate: data.startDate,
        endDate: data.endDate,
        workingDays: new Decimal(workingDays),
        reason: (data.reason ?? "") + systemWarningReason, // Añadir warning al motivo
        attachmentUrl: data.attachmentUrl,
        status: finalStatus,
        approverId: approverId,
        approvedAt: finalApprovedAt,
        // 🆕 Campos para ausencias parciales
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
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
      const daysText = absenceType.allowPartialDays ? `${Math.round(minutesToDiscount / 60)}h` : `${workingDays} días`;
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
    console.error("Error al crear solicitud de PTO:", error);
    throw error;
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

"use server";

import type { TimeSlotType } from "@prisma/client";
import { isFuture } from "date-fns";

import { resolveApproverUsers } from "@/lib/approvals/approval-engine";
import { isEmployeePausedDuringRange } from "@/lib/contracts/discontinuous-utils";
import { prisma } from "@/lib/prisma";
import { getEffectiveSchedule } from "@/services/schedules/schedule-engine";
import { timeToMinutes } from "@/services/schedules/schedule-helpers";

import { createNotification } from "./notifications";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

/**
 * Crear una nueva solicitud de fichaje manual
 */
type ManualTimeEntrySlotInput = {
  startMinutes: number;
  endMinutes: number;
  slotType: TimeSlotType;
  order?: number;
};

function parseDateKey(dateKey: string): { year: number; monthIndex: number; day: number } {
  const [yearStr, monthStr, dayStr] = dateKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) {
    throw new Error("Fecha inválida");
  }

  return {
    year,
    monthIndex: month - 1,
    day,
  };
}

function buildUtcDate(year: number, monthIndex: number, day: number, minutes: number): Date {
  const base = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
  return new Date(base.getTime() + minutes * 60 * 1000);
}

function applyTimezoneOffset(minutes: number, offsetMinutes: number): number {
  const adjusted = minutes + offsetMinutes;
  const normalized = ((adjusted % 1440) + 1440) % 1440;
  return normalized;
}

function normalizeSlots(rawSlots: ManualTimeEntrySlotInput[]): ManualTimeEntrySlotInput[] {
  const filtered = rawSlots.filter((slot) => slot && typeof slot === "object");
  const normalized = filtered.map((slot) => ({
    startMinutes: Number(slot.startMinutes),
    endMinutes: Number(slot.endMinutes),
    slotType: slot.slotType,
    order: slot.order ?? 0,
  }));

  normalized.sort((a, b) => {
    if (a.startMinutes === b.startMinutes) {
      return (a.order ?? 0) - (b.order ?? 0);
    }
    return a.startMinutes - b.startMinutes;
  });

  return normalized.map((slot, index) => ({
    ...slot,
    order: index,
  }));
}

function validateSlots(slots: ManualTimeEntrySlotInput[]) {
  if (slots.length === 0) {
    throw new Error("Añade al menos un tramo de trabajo");
  }

  if (slots[0]?.slotType !== "WORK") {
    throw new Error("El primer tramo debe ser de trabajo");
  }

  const lastSlot = slots[slots.length - 1];
  if (lastSlot?.slotType !== "WORK") {
    throw new Error("El último tramo debe ser de trabajo");
  }

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (slot.slotType !== "WORK" && slot.slotType !== "BREAK") {
      throw new Error("Tipo de tramo inválido");
    }

    if (!Number.isFinite(slot.startMinutes) || !Number.isFinite(slot.endMinutes)) {
      throw new Error("Las horas de los tramos son inválidas");
    }

    if (slot.startMinutes < 0 || slot.endMinutes > 1440) {
      throw new Error("Los tramos deben estar entre 00:00 y 24:00");
    }

    if (slot.startMinutes >= slot.endMinutes) {
      throw new Error("La hora de inicio debe ser anterior a la hora de fin");
    }

    const prevSlot = slots[i - 1];
    if (prevSlot && slot.startMinutes < prevSlot.endMinutes) {
      throw new Error("Hay solapamientos entre tramos");
    }
  }
}

function resolveClockBoundsFromSlots(slots: ManualTimeEntrySlotInput[]) {
  const workSlots = slots.filter((slot) => slot.slotType === "WORK");
  if (workSlots.length === 0) {
    throw new Error("Añade al menos un tramo de trabajo");
  }

  const firstWork = workSlots[0];
  const lastWork = workSlots[workSlots.length - 1];

  return {
    startMinutes: firstWork.startMinutes,
    endMinutes: lastWork.endMinutes,
  };
}

function parseTimeInput(value: string | null | undefined, label: string): number {
  if (!value) {
    throw new Error(`Completa la hora de ${label}`);
  }

  return timeToMinutes(value);
}

export async function createManualTimeEntryRequest(
  dateKey: string,
  reason: string,
  slotsJson?: string | null,
  clockInTime?: string | null,
  clockOutTime?: string | null,
  timezoneOffsetMinutes?: number | null,
) {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();

    const { year, monthIndex, day } = parseDateKey(dateKey);

    // Crear fecha normalizada a medianoche UTC
    const normalizedDate = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
    const dayStart = normalizedDate;
    const dayEnd = new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999));
    const displayDate = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));

    const offsetMinutes =
      typeof timezoneOffsetMinutes === "number" && Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0;

    let slots: ManualTimeEntrySlotInput[] = [];
    if (slotsJson) {
      try {
        const parsed = JSON.parse(slotsJson) as ManualTimeEntrySlotInput[];
        slots = normalizeSlots(parsed);
      } catch {
        throw new Error("No se pudieron procesar los tramos solicitados");
      }
    }

    let clockInMinutes = 0;
    let clockOutMinutes = 0;
    if (slots.length > 0) {
      validateSlots(slots);
      const bounds = resolveClockBoundsFromSlots(slots);
      clockInMinutes = bounds.startMinutes;
      clockOutMinutes = bounds.endMinutes;
    } else {
      clockInMinutes = parseTimeInput(clockInTime, "entrada");
      clockOutMinutes = parseTimeInput(clockOutTime, "salida");
      if (clockInMinutes >= clockOutMinutes) {
        throw new Error("La hora de entrada debe ser anterior a la hora de salida");
      }
      slots = normalizeSlots([
        {
          startMinutes: clockInMinutes,
          endMinutes: clockOutMinutes,
          slotType: "WORK",
          order: 0,
        },
      ]);
    }

    const adjustedClockInMinutes = applyTimezoneOffset(clockInMinutes, offsetMinutes);
    const adjustedClockOutMinutes = applyTimezoneOffset(clockOutMinutes, offsetMinutes);
    const normalizedClockIn = buildUtcDate(year, monthIndex, day, adjustedClockInMinutes);
    const normalizedClockOut = buildUtcDate(year, monthIndex, day, adjustedClockOutMinutes);

    // Validaciones
    if (!reason || reason.trim().length < 10) {
      throw new Error("El motivo debe tener al menos 10 caracteres");
    }

    if (isFuture(dayStart)) {
      throw new Error("No puedes solicitar fichajes para fechas futuras");
    }

    const isPausedForRange = await isEmployeePausedDuringRange(employee.id, dayStart, dayEnd, orgId);
    if (isPausedForRange) {
      throw new Error("Tu contrato fijo discontinuo está pausado en la fecha solicitada.");
    }

    // Verificar que no exista ya un fichaje automático ese día

    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId: employee.id,
        orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        id: true,
        entryType: true,
        manualRequestId: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Consideramos automáticos los fichajes NO cancelados y sin solicitud manual asociada
    const automaticEntries = existingEntries.filter((entry) => entry.manualRequestId === null);

    // NUEVO: Permitir solicitudes sobre fichajes completos/incompletos
    // Ya no bloqueamos si hay fichajes completos - solo informamos para que el usuario decida

    // Verificar que no exista ya una solicitud pendiente para ese día
    const existingRequest = await prisma.manualTimeEntryRequest.findFirst({
      where: {
        employeeId: employee.id,
        orgId,
        date: dayStart,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      throw new Error("Ya tienes una solicitud pendiente para ese día");
    }

    const approvers = await resolveApproverUsers(employee.id, orgId, "MANUAL_TIME_ENTRY");
    const approverIds = approvers.map((approver) => approver.userId);
    const approverId = approverIds[0] ?? null;

    if (!approverId) {
      throw new Error("No se encontró un aprobador disponible. Contacta con RRHH.");
    }

    // Determinar si esta solicitud reemplaza fichajes automáticos (completos o incompletos)
    const replacesIncompleteEntry = automaticEntries.length > 0; // CAMBIADO: Ahora reemplaza cualquier fichaje automático
    const replacedEntryIds = automaticEntries.map((e) => e.id); // Guardar TODOS los IDs para cancelarlos después

    let warningMessage = null;
    if (replacesIncompleteEntry) {
      const clockInEntry = automaticEntries.find((e) => e.entryType === "CLOCK_IN");
      if (clockInEntry) {
        warningMessage = `Esta solicitud reemplazará un fichaje abierto desde ${new Date(clockInEntry.timestamp).toLocaleString("es-ES")}`;
      }
    }

    const slotsToCreate = slots.map((slot, index) => ({
      slotType: slot.slotType,
      startMinutes: applyTimezoneOffset(slot.startMinutes, offsetMinutes),
      endMinutes: applyTimezoneOffset(slot.endMinutes, offsetMinutes),
      sortOrder: slot.order ?? index,
    }));

    // Crear la solicitud CON LAS FECHAS NORMALIZADAS
    const request = await prisma.manualTimeEntryRequest.create({
      data: {
        orgId,
        employeeId: employee.id,
        date: dayStart, // Ya normalizado a medianoche UTC
        clockInTime: normalizedClockIn, // Hora de entrada normalizada
        clockOutTime: normalizedClockOut, // Hora de salida normalizada
        reason: reason.trim(),
        approverId,
        status: "PENDING",
        replacesIncompleteEntry,
        replacedEntryIds,
        warningMessage,
        slots: slotsToCreate.length > 0 ? { create: slotsToCreate } : undefined,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notificar a los aprobadores
    for (const recipientId of approverIds) {
      await createNotification(
        recipientId,
        orgId,
        "MANUAL_TIME_ENTRY_SUBMITTED",
        "Nueva solicitud de fichaje manual",
        `${request.employee.firstName} ${request.employee.lastName} ha solicitado un fichaje manual para el ${displayDate.toLocaleDateString("es-ES")}`,
        undefined, // ptoRequestId
        request.id, // manualTimeEntryRequestId
      );
    }

    const existingSummary = await prisma.workdaySummary.findUnique({
      where: {
        orgId_employeeId_date: {
          orgId,
          employeeId: employee.id,
          date: dayStart,
        },
      },
    });

    if (existingSummary) {
      const flags =
        existingSummary.resolutionFlags && typeof existingSummary.resolutionFlags === "object"
          ? existingSummary.resolutionFlags
          : {};
      await prisma.workdaySummary.update({
        where: { id: existingSummary.id },
        data: {
          resolutionStatus: "RESOLVED_BY_EMPLOYEE",
          dataQuality: "ESTIMATED",
          resolutionFlags: {
            ...flags,
            manualRequestId: request.id,
            regularizationRequestedAt: new Date().toISOString(),
          },
          overtimeCalcStatus: "DIRTY",
          overtimeCalcUpdatedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      requestId: request.id,
    };
  } catch (error) {
    // Manejo de errores mejorado para mostrar mensajes user-friendly
    console.error("[Manual Time Entry] Error al crear solicitud:", {
      error: error instanceof Error ? error.message : "Error desconocido",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Si es un error de validación conocido, re-lanzarlo tal cual
    if (error instanceof Error && error.message) {
      throw error;
    }

    // Para errores desconocidos (de BD, red, etc.), mensaje genérico user-friendly
    throw new Error(
      "No se pudo crear la solicitud de fichaje manual. Por favor, inténtalo de nuevo o contacta con soporte si el problema persiste.",
    );
  }
}

export async function getManualTimeEntryPrefill(dateKey: string) {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();
    const { year, monthIndex, day } = parseDateKey(dateKey);

    const scheduleDate = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
    const schedule = await getEffectiveSchedule(employee.id, scheduleDate);

    const slots = schedule.timeSlots
      .filter((slot) => slot.slotType === "WORK" || slot.slotType === "BREAK")
      .map((slot, index) => ({
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        slotType: slot.slotType,
        order: index,
      }))
      .sort((a, b) => a.startMinutes - b.startMinutes);

    return {
      success: true,
      slots,
      isWorkingDay: schedule.isWorkingDay,
      scheduleSource: schedule.source,
      orgId,
    };
  } catch (error) {
    console.error("Error al obtener prefill de fichaje manual:", error);
    return {
      success: false,
      slots: [],
      error: error instanceof Error ? error.message : "Error al obtener horario",
    };
  }
}

/**
 * Obtener mis solicitudes de fichaje manual
 */
export async function getMyManualTimeEntryRequests(status?: "PENDING" | "APPROVED" | "REJECTED") {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();

    const requests = await prisma.manualTimeEntryRequest.findMany({
      where: {
        employeeId: employee.id,
        orgId,
        ...(status && { status }),
      },
      include: {
        approver: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    // Contar totales por estado
    const [pendingTotal, approvedTotal, rejectedTotal] = await Promise.all([
      prisma.manualTimeEntryRequest.count({
        where: {
          employeeId: employee.id,
          orgId,
          status: "PENDING",
        },
      }),
      prisma.manualTimeEntryRequest.count({
        where: {
          employeeId: employee.id,
          orgId,
          status: "APPROVED",
        },
      }),
      prisma.manualTimeEntryRequest.count({
        where: {
          employeeId: employee.id,
          orgId,
          status: "REJECTED",
        },
      }),
    ]);

    return {
      requests: requests.map((r) => ({
        id: r.id,
        date: r.date,
        clockInTime: r.clockInTime,
        clockOutTime: r.clockOutTime,
        reason: r.reason,
        status: r.status,
        submittedAt: r.submittedAt,
        approvedAt: r.approvedAt,
        rejectedAt: r.rejectedAt,
        approverName: r.approver?.name,
        approverComments: r.approverComments,
        rejectionReason: r.rejectionReason,
      })),
      totals: {
        pending: pendingTotal,
        approved: approvedTotal,
        rejected: rejectedTotal,
      },
    };
  } catch (error) {
    console.error("Error al obtener solicitudes de fichaje manual:", error);
    throw error;
  }
}

/**
 * Cancelar una solicitud pendiente
 */
export async function cancelManualTimeEntryRequest(requestId: string) {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();

    const request = await prisma.manualTimeEntryRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error("Solicitud no encontrada");
    }

    if (request.employeeId !== employee.id) {
      throw new Error("No tienes permiso para cancelar esta solicitud");
    }

    if (request.status !== "PENDING") {
      throw new Error("Solo puedes cancelar solicitudes pendientes");
    }

    // Simplemente eliminar la solicitud pendiente
    await prisma.manualTimeEntryRequest.delete({
      where: { id: requestId },
    });

    // Notificar al aprobador
    if (request.approverId) {
      await createNotification(
        request.approverId,
        orgId,
        "PTO_CANCELLED", // Reutilizamos este tipo
        "Solicitud de fichaje manual cancelada",
        `Una solicitud de fichaje manual ha sido cancelada por el empleado`,
        undefined, // ptoRequestId
        undefined, // manualTimeEntryRequestId (la solicitud ya fue eliminada)
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error al cancelar solicitud:", error);
    throw error;
  }
}

/**
 * Obtener información del aprobador del empleado actual
 */
export async function getMyApprover() {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();

    const approvers = await resolveApproverUsers(employee.id, orgId, "MANUAL_TIME_ENTRY");
    const approver = approvers[0];

    if (approver) {
      const sourceLabelMap: Record<string, string> = {
        DIRECT_MANAGER: "Responsable directo",
        TEAM_RESPONSIBLE: "Responsable de equipo",
        DEPARTMENT_RESPONSIBLE: "Responsable de departamento",
        COST_CENTER_RESPONSIBLE: "Responsable de centro de coste",
        APPROVER_LIST: "Lista de aprobadores",
        GROUP_HR: "RRHH del grupo",
        HR_ADMIN: "RRHH",
        ORG_ADMIN: "Administración",
      };

      return {
        id: approver.userId,
        name: approver.name ?? approver.email,
        email: approver.email,
        role: sourceLabelMap[approver.source] ?? approver.role,
      };
    }

    return null;
  } catch (error) {
    console.error("Error al obtener aprobador:", error);
    return null;
  }
}

"use server";

import type { Shift } from "@prisma/client";
import { addDays, format, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";

import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";
import { canUserViewShifts } from "./shift-permissions";

/**
 * Slot de tiempo para análisis de cobertura
 */
export interface CoverageSlot {
  timeSlot: string; // "09:00"
  required: number; // Cobertura requerida
  assigned: number; // Cobertura actual
  gap: number; // Déficit (negativo si hay gap)
  percentage: number; // % de cobertura (0-100+)
  shifts: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    assignedCount: number;
  }>;
}

/**
 * Análisis de cobertura por día
 */
export interface DayCoverageAnalysis {
  date: Date;
  dayName: string; // "Lunes"
  slots: CoverageSlot[];
  totalRequired: number;
  totalAssigned: number;
  coveragePercentage: number;
  hasGaps: boolean;
  gapCount: number;
}

/**
 * Análisis de cobertura semanal
 */
export interface WeekCoverageAnalysis {
  weekStart: Date;
  weekEnd: Date;
  days: DayCoverageAnalysis[];
  totalShifts: number;
  totalRequired: number;
  totalAssigned: number;
  averageCoverage: number;
  criticalDays: string[]; // Días con cobertura < 80%
  optimalDays: string[]; // Días con cobertura >= 100%
}

/**
 * Estadísticas generales de cobertura
 */
export interface CoverageStats {
  totalShifts: number;
  publishedShifts: number;
  fullyStaffedShifts: number;
  partiallyStaffedShifts: number;
  unstaffedShifts: number;
  averageStaffingPercentage: number;
  totalPositionsRequired: number;
  totalPositionsFilled: number;
}

/**
 * Obtener análisis de cobertura para un rango de fechas
 */
export async function getCoverageAnalysis(
  dateFrom: Date,
  dateTo: Date,
  costCenterId?: string,
): Promise<WeekCoverageAnalysis> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos
  if (costCenterId) {
    const canView = await canUserViewShifts(user.id, costCenterId);
    if (!canView) {
      throw new Error("No autorizado para ver turnos de este centro");
    }
  }

  // Obtener turnos del rango
  const shifts = await prisma.shift.findMany({
    where: {
      orgId: user.orgId,
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
      ...(costCenterId && { costCenterId }),
      status: {
        in: ["PUBLISHED", "CLOSED"],
      },
    },
    include: {
      assignments: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      position: true,
      costCenter: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  // Agrupar turnos por día
  const dayGroups = new Map<string, typeof shifts>();
  let currentDate = new Date(dateFrom);

  while (currentDate <= dateTo) {
    const dateKey = format(currentDate, "yyyy-MM-dd");
    const dayShifts = shifts.filter((s) => isSameDay(new Date(s.date), currentDate));
    dayGroups.set(dateKey, dayShifts);
    currentDate = addDays(currentDate, 1);
  }

  // Analizar cada día
  const days: DayCoverageAnalysis[] = [];
  let totalRequired = 0;
  let totalAssigned = 0;

  for (const [dateKey, dayShifts] of dayGroups) {
    const date = parseISO(dateKey);
    const analysis = analyzeDayCoverage(date, dayShifts);
    days.push(analysis);
    totalRequired += analysis.totalRequired;
    totalAssigned += analysis.totalAssigned;
  }

  // Identificar días críticos y óptimos
  const criticalDays = days.filter((d) => d.coveragePercentage < 80).map((d) => format(d.date, "EEEE d"));

  const optimalDays = days.filter((d) => d.coveragePercentage >= 100).map((d) => format(d.date, "EEEE d"));

  return {
    weekStart: dateFrom,
    weekEnd: dateTo,
    days,
    totalShifts: shifts.length,
    totalRequired,
    totalAssigned,
    averageCoverage: totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0,
    criticalDays,
    optimalDays,
  };
}

/**
 * Analizar cobertura de un día específico
 */
function analyzeDayCoverage(
  date: Date,
  shifts: Array<
    Shift & {
      assignments: Array<{
        id: string;
        employeeId: string;
        employee: {
          id: string;
          firstName: string;
          lastName: string;
        };
      }>;
    }
  >,
): DayCoverageAnalysis {
  // Generar slots de 30 minutos (00:00 a 23:30)
  const slots: CoverageSlot[] = [];
  const slotMap = new Map<string, CoverageSlot>();

  // Inicializar slots
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeSlot = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slotMap.set(timeSlot, {
        timeSlot,
        required: 0,
        assigned: 0,
        gap: 0,
        percentage: 0,
        shifts: [],
      });
    }
  }

  // Procesar cada turno
  for (const shift of shifts) {
    const startParts = shift.startTime.split(":");
    const endParts = shift.endTime.split(":");
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    const assignedCount = shift.assignments.length;
    const required = shift.requiredHeadcount;

    // Marcar slots cubiertos por este turno
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeSlot = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

      const slot = slotMap.get(timeSlot);
      if (slot) {
        slot.required += required;
        slot.assigned += assignedCount;
        slot.shifts.push({
          id: shift.id,
          name: shift.position?.title ?? "Sin posición",
          startTime: shift.startTime,
          endTime: shift.endTime,
          assignedCount,
        });
      }
    }
  }

  // Calcular gaps y porcentajes
  let totalRequired = 0;
  let totalAssigned = 0;
  let gapCount = 0;

  for (const slot of slotMap.values()) {
    if (slot.required > 0) {
      slot.gap = slot.assigned - slot.required;
      slot.percentage = (slot.assigned / slot.required) * 100;

      if (slot.gap < 0) {
        gapCount++;
      }

      totalRequired += slot.required;
      totalAssigned += slot.assigned;
      slots.push(slot);
    }
  }

  return {
    date,
    dayName: format(date, "EEEE"),
    slots,
    totalRequired,
    totalAssigned,
    coveragePercentage: totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0,
    hasGaps: gapCount > 0,
    gapCount,
  };
}

/**
 * Obtener estadísticas de cobertura
 */
export async function getCoverageStats(dateFrom?: Date, dateTo?: Date, costCenterId?: string): Promise<CoverageStats> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  const whereClause: any = {
    orgId: user.orgId,
    ...(costCenterId && { costCenterId }),
  };

  if (dateFrom && dateTo) {
    whereClause.date = {
      gte: dateFrom,
      lte: dateTo,
    };
  }

  const shifts = await prisma.shift.findMany({
    where: whereClause,
    include: {
      assignments: true,
    },
  });

  const publishedShifts = shifts.filter((s) => s.status === "PUBLISHED" || s.status === "CLOSED");

  let fullyStaffed = 0;
  let partiallyStaffed = 0;
  let unstaffed = 0;
  let totalRequired = 0;
  let totalFilled = 0;

  for (const shift of shifts) {
    const assigned = shift.assignments.length;
    const required = shift.requiredHeadcount;

    totalRequired += required;
    totalFilled += assigned;

    if (assigned >= required) {
      fullyStaffed++;
    } else if (assigned > 0) {
      partiallyStaffed++;
    } else {
      unstaffed++;
    }
  }

  return {
    totalShifts: shifts.length,
    publishedShifts: publishedShifts.length,
    fullyStaffedShifts: fullyStaffed,
    partiallyStaffedShifts: partiallyStaffed,
    unstaffedShifts: unstaffed,
    averageStaffingPercentage: totalRequired > 0 ? (totalFilled / totalRequired) * 100 : 0,
    totalPositionsRequired: totalRequired,
    totalPositionsFilled: totalFilled,
  };
}

/**
 * Obtener heatmap de cobertura por hora del día
 */
export async function getCoverageHeatmap(
  weekStart: Date,
  costCenterId?: string,
): Promise<{
  days: string[];
  hours: string[];
  data: number[][]; // [día][hora] = porcentaje cobertura
}> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const analysis = await getCoverageAnalysis(weekStart, weekEnd, costCenterId);

  // Preparar estructura del heatmap
  const days = analysis.days.map((d) => format(d.date, "EEEE"));
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

  // Matriz de datos [día][hora]
  const data: number[][] = [];

  for (const dayAnalysis of analysis.days) {
    const dayData: number[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const timeSlot = `${hour.toString().padStart(2, "0")}:00`;
      const slot = dayAnalysis.slots.find((s) => s.timeSlot === timeSlot);

      if (slot && slot.required > 0) {
        dayData.push(slot.percentage);
      } else {
        dayData.push(0); // Sin turnos en este slot
      }
    }

    data.push(dayData);
  }

  return {
    days,
    hours,
    data,
  };
}

/**
 * Obtener turnos con deficit de cobertura
 */
export async function getUnderstaffedShifts(dateFrom: Date, dateTo: Date, costCenterId?: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  const shifts = await prisma.shift.findMany({
    where: {
      orgId: user.orgId,
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
      ...(costCenterId && { costCenterId }),
      status: {
        in: ["DRAFT", "PENDING_APPROVAL", "PUBLISHED"],
      },
    },
    include: {
      assignments: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      position: true,
      costCenter: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Filtrar solo turnos con deficit
  const understaffed = shifts.filter((shift) => {
    return shift.assignments.length < shift.requiredHeadcount;
  });

  return understaffed.map((shift) => ({
    ...shift,
    deficit: shift.requiredHeadcount - shift.assignments.length,
    coveragePercentage: (shift.assignments.length / shift.requiredHeadcount) * 100,
  }));
}

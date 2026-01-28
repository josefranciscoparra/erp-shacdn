"use server";

import { startOfMonth, endOfMonth } from "date-fns";

import { listEffectiveCalendarEventsForEmployeeRange } from "@/lib/calendars/effective-events";
import { prisma } from "@/lib/prisma";

import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

export interface CalendarEventData {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  endDate: Date | null;
  eventType: string;
  isRecurring: boolean;
  calendarId: string;
  calendar: {
    id: string;
    name: string;
    color: string;
    calendarType: string;
  };
}

export interface CalendarData {
  id: string;
  name: string;
  description: string | null;
  year: number;
  calendarType: string;
  color: string;
  active: boolean;
  costCenter?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    events: number;
  };
  events?: CalendarEventData[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Obtener los calendarios aplicables al empleado autenticado
 * Incluye:
 * - Calendarios sin centro de coste (nacionales/corporativos)
 * - Calendarios del centro de coste del empleado (locales)
 */
export async function getMyCalendars(): Promise<CalendarData[]> {
  try {
    const { orgId, activeContract } = await getAuthenticatedEmployee({
      contractInclude: {
        costCenter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    const employeeCostCenterId = activeContract?.costCenterId ?? null;

    console.log("🔍 getMyCalendars - Employee Cost Center:", employeeCostCenterId);

    // Buscar calendarios aplicables al empleado
    // Incluye: calendarios sin centro (nacionales) + calendarios del centro del empleado
    const calendars = await prisma.calendar.findMany({
      where: {
        orgId,
        active: true,
        OR: [
          { costCenterId: null }, // Calendarios nacionales/corporativos
          ...(employeeCostCenterId
            ? [{ costCenterId: employeeCostCenterId }] // Calendarios locales del centro
            : []),
        ],
      },
      include: {
        costCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { calendarType: "asc" }, { name: "asc" }],
    });

    console.log(`📅 Found ${calendars.length} calendars for employee`);

    return calendars as CalendarData[];
  } catch (error) {
    console.error("Error al obtener calendarios del empleado:", error);
    throw error;
  }
}

/**
 * Obtener eventos de los calendarios del empleado en un rango de fechas
 * Combina eventos de todos los calendarios aplicables al empleado
 */
export async function getMyCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEventData[]> {
  try {
    const { orgId, activeContract } = await getAuthenticatedEmployee({
      contractInclude: {
        costCenter: {
          select: {
            id: true,
          },
        },
      },
    });
    const employeeCostCenterId = activeContract?.costCenterId ?? null;

    const events = await listEffectiveCalendarEventsForEmployeeRange({
      orgId,
      employeeCostCenterId,
      startDate,
      endDate,
    });

    console.log(`🎉 Found ${events.length} effective events for employee in date range`);

    return events as unknown as CalendarEventData[];
  } catch (error) {
    console.error("Error al obtener eventos del empleado:", error);
    throw error;
  }
}

/**
 * Obtener eventos del mes actual del empleado
 * Útil para la vista de calendario mensual
 */
export async function getMyMonthEvents(year: number, month: number): Promise<CalendarEventData[]> {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  return getMyCalendarEvents(monthStart, monthEnd);
}

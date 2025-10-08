"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

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
    // Obtener sesión del usuario autenticado
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener datos del usuario y empleado
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        employee: {
          include: {
            employmentContracts: {
              where: {
                active: true,
              },
              take: 1,
              include: {
                costCenter: true,
              },
            },
          },
        },
      },
    });

    if (!user?.employee) {
      throw new Error("Usuario no tiene un empleado asociado");
    }

    // Obtener el centro de coste del contrato activo del empleado
    const activeContract = user.employee.employmentContracts[0];
    const employeeCostCenterId = activeContract?.costCenterId || null;

    console.log("🔍 getMyCalendars - Employee Cost Center:", employeeCostCenterId);

    // Buscar calendarios aplicables al empleado
    // Incluye: calendarios sin centro (nacionales) + calendarios del centro del empleado
    const calendars = await prisma.calendar.findMany({
      where: {
        orgId: user.orgId,
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
      orderBy: [
        { year: "desc" },
        { calendarType: "asc" },
        { name: "asc" },
      ],
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
export async function getMyCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarEventData[]> {
  try {
    // Obtener sesión del usuario autenticado
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener datos del usuario y empleado
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        employee: {
          include: {
            employmentContracts: {
              where: {
                active: true,
              },
              take: 1,
              include: {
                costCenter: true,
              },
            },
          },
        },
      },
    });

    if (!user?.employee) {
      throw new Error("Usuario no tiene un empleado asociado");
    }

    // Obtener el centro de coste del contrato activo del empleado
    const activeContract = user.employee.employmentContracts[0];
    const employeeCostCenterId = activeContract?.costCenterId || null;

    // Buscar calendarios aplicables al empleado
    const calendars = await prisma.calendar.findMany({
      where: {
        orgId: user.orgId,
        active: true,
        OR: [
          { costCenterId: null }, // Calendarios nacionales/corporativos
          ...(employeeCostCenterId
            ? [{ costCenterId: employeeCostCenterId }] // Calendarios locales del centro
            : []),
        ],
      },
      select: {
        id: true,
      },
    });

    const calendarIds = calendars.map((c) => c.id);

    // Buscar eventos de esos calendarios en el rango de fechas
    const events = await prisma.calendarEvent.findMany({
      where: {
        calendarId: {
          in: calendarIds,
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        calendar: {
          select: {
            id: true,
            name: true,
            color: true,
            calendarType: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    console.log(`🎉 Found ${events.length} events for employee in date range`);

    return events as CalendarEventData[];
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

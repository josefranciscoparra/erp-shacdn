"use server";

import { isAfter, isBefore, isSameDay } from "date-fns";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeekSchedule } from "@/services/schedules/schedule-engine";

import { getMyMonthEvents } from "./employee-calendars";
import { getMyPtoBalance } from "./employee-pto";
import { getAllMyNotifications } from "./notifications";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";
import { getTodaySummaryLite, getWeeklySummaryLite } from "./time-tracking";

export interface MySpaceDashboard {
  // Flag para identificar administradores sin empleado
  isAdminWithoutEmployee: boolean;

  // Resumen de fichajes
  timeTracking: {
    today: {
      workedMinutes: number;
      breakMinutes: number;
      expectedMinutes: number;
      status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";
    };
    week: {
      totalWorkedMinutes: number;
      totalBreakMinutes: number;
      expectedMinutes: number;
    };
  };

  // Balance de vacaciones
  pto: {
    year: number;
    annualAllowance: number;
    daysUsed: number;
    daysPending: number;
    daysAvailable: number;
    hasActiveContract: boolean;
  } | null;

  // Próximos eventos del calendario
  upcomingEvents: Array<{
    id: string;
    name: string;
    date: Date;
    endDate: Date | null;
    eventType: string;
    calendar: {
      name: string;
      color: string;
    };
  }>;

  // Notificaciones recientes
  recentNotifications: Array<{
    id: string;
    type: string;
    message: string;
    read: boolean;
    createdAt: Date;
    ptoRequestId: string | null;
    manualTimeEntryRequestId: string | null;
  }>;

  // Información del perfil
  profile: {
    name: string;
    email: string;
    position: string | null;
    department: string | null;
    photoUrl: string | null;
  };
}

/**
 * Obtiene todos los datos necesarios para el dashboard "Mi Espacio"
 */
export async function getMySpaceDashboard(): Promise<MySpaceDashboard> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Usuario no autenticado");
  }

  // Verificar si es un administrador sin empleado asociado
  const userRole = session.user.role;
  const isAdminRole = userRole === "SUPER_ADMIN" || userRole === "ORG_ADMIN";

  try {
    const { employee, orgId, activeContract } = await getAuthenticatedEmployee({
      contractInclude: {
        position: {
          select: {
            title: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    // 1. Obtener resumen de fichajes (hoy y semana)
    const today = new Date();
    const [todaySummary, weeklySummary, weekSchedule] = await Promise.all([
      getTodaySummaryLite(),
      getWeeklySummaryLite(),
      getWeekSchedule(employee.id, today),
    ]);

    const expectedWeeklyMinutes = weekSchedule.totalExpectedMinutes;
    const todaySchedule = weekSchedule.days.find((day) => isSameDay(day.date, today));
    const expectedDailyMinutes = todaySchedule ? todaySchedule.expectedMinutes : 0;

    // 2. Obtener balance de vacaciones
    let ptoBalance = null;
    try {
      const balance = await getMyPtoBalance();
      ptoBalance = balance;
    } catch (error) {
      console.log("⚠️ No se pudo obtener balance de vacaciones:", error);
      // No romper si no hay balance disponible
    }

    // 3. Obtener próximos eventos del calendario (mes actual y siguiente)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const [currentMonthEvents, nextMonthEvents] = await Promise.all([
      getMyMonthEvents(currentYear, currentMonth + 1), // mes en base 1
      getMyMonthEvents(currentMonth === 11 ? currentYear + 1 : currentYear, currentMonth === 11 ? 1 : currentMonth + 2),
    ]);

    // Combinar y filtrar solo eventos futuros
    const allEvents = [...currentMonthEvents, ...nextMonthEvents];
    const upcomingEvents = allEvents
      .filter((event) => {
        const eventDate = new Date(event.date);
        return isAfter(eventDate, now) || isBefore(now, new Date(event.endDate ?? event.date));
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5) // Solo los próximos 5 eventos
      .map((event) => ({
        id: event.id,
        name: event.name,
        date: event.date,
        endDate: event.endDate,
        eventType: event.eventType,
        calendar: {
          name: event.calendar.name,
          color: event.calendar.color,
        },
      }));

    // 4. Obtener notificaciones recientes
    const notificationsResult = await getAllMyNotifications(1, 5);
    const recentNotifications = notificationsResult.notifications.map((notif) => ({
      id: notif.id,
      type: notif.type,
      message: notif.message,
      read: notif.isRead,
      createdAt: notif.createdAt,
      ptoRequestId: notif.ptoRequestId,
      manualTimeEntryRequestId: notif.manualTimeEntryRequestId,
    }));

    // 5. Información del perfil
    const profile = {
      name: `${employee.firstName} ${employee.lastName}`,
      email: employee.email ?? session.user.email,
      position: activeContract?.position?.title ?? null,
      department: activeContract?.department?.name ?? null,
      // Avatar sin timestamp - se cachea por 24h
      photoUrl: employee.photoUrl ? `/api/users/${session.user.id}/avatar` : null,
    };

    // Determinar estado actual del fichaje
    let clockStatus: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK" = "CLOCKED_OUT";
    if (todaySummary.lastEntryType) {
      switch (todaySummary.lastEntryType) {
        case "CLOCK_IN":
        case "BREAK_END":
        case "PROJECT_SWITCH":
          clockStatus = "CLOCKED_IN";
          break;
        case "BREAK_START":
          clockStatus = "ON_BREAK";
          break;
        case "CLOCK_OUT":
        default:
          clockStatus = "CLOCKED_OUT";
          break;
      }
    }

    // Calcular tiempo en progreso (igual que en quick-clock-widget.tsx)
    let todayWorkedMinutes = todaySummary.totalWorkedMinutes;
    let weekWorkedMinutes = weeklySummary.totalWorkedMinutes;

    if (clockStatus === "CLOCKED_IN" && todaySummary.lastEntryTime) {
      const now = new Date();
      const startTime = new Date(todaySummary.lastEntryTime);
      const secondsFromStart = (now.getTime() - startTime.getTime()) / 1000;
      const minutesFromStart = secondsFromStart / 60;
      todayWorkedMinutes += minutesFromStart;
      weekWorkedMinutes += minutesFromStart;
    }

    return {
      isAdminWithoutEmployee: false,
      timeTracking: {
        today: {
          workedMinutes: todayWorkedMinutes,
          breakMinutes: todaySummary.totalBreakMinutes,
          expectedMinutes: expectedDailyMinutes,
          status: clockStatus,
        },
        week: {
          totalWorkedMinutes: weekWorkedMinutes,
          totalBreakMinutes: weeklySummary.totalBreakMinutes,
          expectedMinutes: expectedWeeklyMinutes,
        },
      },
      pto: ptoBalance,
      upcomingEvents,
      recentNotifications,
      profile,
    };
  } catch (error) {
    console.error("❌ Error en getMySpaceDashboard:", error);

    if (error instanceof Error && error.message === "Usuario no tiene un empleado asociado" && isAdminRole) {
      // Es un administrador sin empleado - comportamiento esperado
      const notificationsResult = await getAllMyNotifications(1, 5);
      const recentNotifications = notificationsResult.notifications.map((notif) => ({
        id: notif.id,
        type: notif.type,
        message: notif.message,
        read: notif.isRead,
        createdAt: notif.createdAt,
        ptoRequestId: notif.ptoRequestId,
        manualTimeEntryRequestId: notif.manualTimeEntryRequestId,
      }));

      return {
        isAdminWithoutEmployee: true,
        timeTracking: {
          today: {
            workedMinutes: 0,
            breakMinutes: 0,
            expectedMinutes: 0,
            status: "CLOCKED_OUT",
          },
          week: {
            totalWorkedMinutes: 0,
            totalBreakMinutes: 0,
            expectedMinutes: 0,
          },
        },
        pto: null,
        upcomingEvents: [],
        recentNotifications,
        profile: {
          name: session.user.name ?? session.user.email ?? "Usuario",
          email: session.user.email ?? "",
          position: null,
          department: null,
          photoUrl: session.user.image ?? null,
        },
      };
    }

    if (error instanceof Error) {
      throw new Error(`Error al cargar dashboard: ${error.message}`);
    }
    throw new Error("No se pudo cargar el dashboard");
  }
}

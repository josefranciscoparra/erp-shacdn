"use server";

import { endOfDay, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { getEffectiveSchedule } from "@/services/schedules/schedule-engine";
import type { EffectiveSchedule } from "@/types/schedule";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";
import { detectIncompleteEntries, getExpectedHoursForToday } from "./time-tracking";

type ClockStatus = "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";

interface ClockBootstrapResult {
  success: boolean;
  error?: string;
  currentStatus?: ClockStatus;
  todaySummary?: {
    id: string;
    date: Date;
    clockIn?: Date;
    clockOut?: Date;
    totalWorkedMinutes: number;
    totalBreakMinutes: number;
    status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT";
    timeEntries: Array<{
      id: string;
      entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | "PROJECT_SWITCH";
      timestamp: Date;
      location?: string;
      notes?: string;
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: number | null;
      isWithinAllowedArea?: boolean | null;
      distanceFromCenter?: number | null;
      requiresReview?: boolean | null;
      projectId?: string | null;
      project?: {
        id: string;
        name: string;
        code: string | null;
        color: string | null;
      } | null;
      task?: string | null;
    }>;
  };
  schedule?: EffectiveSchedule | null;
  scheduleSummary?: {
    expectedMinutes: number | null;
    deviationMinutes: number | null;
  };
  hoursInfo?: {
    hoursToday: number;
    isWorkingDay: boolean;
    hasActiveContract: boolean;
  };
  geolocationConfig?: {
    geolocationEnabled: boolean;
    geolocationRequired: boolean;
    geolocationMinAccuracy: number | null;
    geolocationMaxRadius: number | null;
  };
  incompleteEntry?: {
    hasIncompleteEntry: boolean;
    isExcessive: boolean;
    durationHours: number;
    durationMinutes: number;
    dailyHours: number;
    thresholdHours: number;
    percentageOfJourney: number;
    clockInDate: Date;
    clockInTime: Date;
    clockInId: string;
    workdayId: string | null;
  } | null;
}

function serializeTimeEntry(entry: any) {
  return {
    ...entry,
    latitude: entry.latitude ? Number(entry.latitude) : null,
    longitude: entry.longitude ? Number(entry.longitude) : null,
    accuracy: entry.accuracy ? Number(entry.accuracy) : null,
    distanceFromCenter: entry.distanceFromCenter ? Number(entry.distanceFromCenter) : null,
    project: entry.project
      ? {
          id: entry.project.id,
          name: entry.project.name,
          code: entry.project.code,
          color: entry.project.color,
        }
      : null,
    task: entry.task ?? null,
  };
}

function getStatusFromLastEntry(entryType?: string | null): ClockStatus {
  switch (entryType) {
    case "CLOCK_IN":
    case "BREAK_END":
    case "PROJECT_SWITCH":
      return "CLOCKED_IN";
    case "BREAK_START":
      return "ON_BREAK";
    case "CLOCK_OUT":
    default:
      return "CLOCKED_OUT";
  }
}

export async function getClockBootstrap(): Promise<ClockBootstrapResult> {
  try {
    const { userId, orgId, employee } = await getAuthenticatedUser();

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const scheduleDate = new Date(today);
    scheduleDate.setHours(12, 0, 0, 0);

    const hoursInfoPromise = getExpectedHoursForToday().catch((error) => {
      console.error("Error al obtener horas esperadas:", error);
      return null;
    });

    const geolocationConfigPromise = prisma.organization
      .findUnique({
        where: { id: orgId },
        select: {
          geolocationEnabled: true,
          geolocationRequired: true,
          geolocationMinAccuracy: true,
          geolocationMaxRadius: true,
        },
      })
      .catch((error) => {
        console.error("Error al obtener configuración de geolocalización:", error);
        return null;
      });

    if (!employee) {
      const hoursInfo = await hoursInfoPromise;
      const geolocationConfig = await geolocationConfigPromise;

      return {
        success: true,
        currentStatus: "CLOCKED_OUT",
        todaySummary: {
          id: "",
          date: dayStart,
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          status: "ABSENT",
          timeEntries: [],
        },
        schedule: null,
        scheduleSummary: {
          expectedMinutes: null,
          deviationMinutes: null,
        },
        hoursInfo: hoursInfo
          ? {
              hoursToday: hoursInfo.hoursToday,
              isWorkingDay: hoursInfo.isWorkingDay,
              hasActiveContract: hoursInfo.hasActiveContract,
            }
          : {
              hoursToday: 0,
              isWorkingDay: true,
              hasActiveContract: false,
            },
        geolocationConfig: geolocationConfig ?? {
          geolocationEnabled: false,
          geolocationRequired: false,
          geolocationMinAccuracy: null,
          geolocationMaxRadius: null,
        },
        incompleteEntry: null,
      };
    }

    const schedulePromise = getEffectiveSchedule(employee.id, scheduleDate).catch((error) => {
      console.warn("Error al obtener horario del día:", error);
      return null;
    });

    const incompletePromise = detectIncompleteEntries().catch((error) => {
      console.error("Error al detectar fichajes incompletos:", error);
      return null;
    });

    const [summary, timeEntries, schedule, hoursInfo, geolocationConfig, incompleteEntry] = await Promise.all([
      prisma.workdaySummary.findUnique({
        where: {
          orgId_employeeId_date: {
            orgId,
            employeeId: employee.id,
            date: dayStart,
          },
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          employeeId: employee.id,
          orgId,
          timestamp: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
              color: true,
            },
          },
        },
        orderBy: {
          timestamp: "asc",
        },
      }),
      schedulePromise,
      hoursInfoPromise,
      geolocationConfigPromise,
      incompletePromise,
    ]);

    let filteredIncompleteEntry = incompleteEntry;
    if (incompleteEntry?.clockInId) {
      const dismissed = await prisma.dismissedNotification.findUnique({
        where: {
          userId_type_referenceId: {
            userId,
            type: "INCOMPLETE_ENTRY",
            referenceId: incompleteEntry.clockInId,
          },
        },
      });
      if (dismissed) {
        filteredIncompleteEntry = null;
      }
    }

    const serializedEntries = timeEntries.map(serializeTimeEntry);
    const lastEntry = serializedEntries[serializedEntries.length - 1];
    const currentStatus = getStatusFromLastEntry(lastEntry?.entryType);

    let todaySummary: ClockBootstrapResult["todaySummary"];
    if (summary) {
      todaySummary = {
        id: summary.id,
        date: summary.date,
        clockIn: summary.clockIn ?? undefined,
        clockOut: summary.clockOut ?? undefined,
        totalWorkedMinutes: Number(summary.totalWorkedMinutes),
        totalBreakMinutes: Number(summary.totalBreakMinutes),
        status: summary.status,
        timeEntries: serializedEntries,
      };
    } else if (serializedEntries.length > 0) {
      todaySummary = {
        id: "",
        date: dayStart,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        status: "IN_PROGRESS",
        timeEntries: serializedEntries,
      };
    } else {
      todaySummary = {
        id: "",
        date: dayStart,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        status: "ABSENT",
        timeEntries: [],
      };
    }

    const hasWorkdaySummary = Boolean(todaySummary.id);
    const expectedMinutes = schedule ? schedule.expectedMinutes : summary ? Number(summary.expectedMinutes ?? 0) : null;
    const deviationMinutes =
      hasWorkdaySummary && expectedMinutes !== null ? todaySummary.totalWorkedMinutes - expectedMinutes : null;

    return {
      success: true,
      currentStatus,
      todaySummary,
      schedule,
      scheduleSummary: {
        expectedMinutes,
        deviationMinutes,
      },
      hoursInfo: hoursInfo
        ? {
            hoursToday: hoursInfo.hoursToday,
            isWorkingDay: hoursInfo.isWorkingDay,
            hasActiveContract: hoursInfo.hasActiveContract,
          }
        : {
            hoursToday: 0,
            isWorkingDay: true,
            hasActiveContract: false,
          },
      geolocationConfig: geolocationConfig ?? {
        geolocationEnabled: false,
        geolocationRequired: false,
        geolocationMinAccuracy: null,
        geolocationMaxRadius: null,
      },
      incompleteEntry: filteredIncompleteEntry,
    };
  } catch (error) {
    console.error("Error al cargar bootstrap de fichaje:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

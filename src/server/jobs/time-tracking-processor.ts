import type { AutoCloseReason, WorkdayDataQuality, WorkdayResolutionStatus } from "@prisma/client";
import { addDays, addMinutes, format, startOfDay } from "date-fns";

import { resolveApproverUsers } from "@/lib/approvals/approval-engine";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/actions/notifications";
import { updateWorkdaySummary } from "@/server/actions/time-tracking";
import { enqueueOvertimeWorkdayJob } from "@/server/jobs/overtime-queue";
import { getEffectiveSchedule } from "@/services/schedules/schedule-engine";

type MissingClockOutPolicy = {
  missingClockOutMode: "UNRESOLVED" | "AUTO_CLOSE";
  notifyEmployeeOnUnresolved: boolean;
  alertNotificationsEnabled: boolean;
  requireApprovalWhenOvertime: boolean;
  autoCloseEnabled: boolean;
  autoCloseStrategy: "SCHEDULE_END" | "FIXED_HOUR";
  autoCloseToleranceMinutes: number;
  autoCloseTriggerExtraMinutes: number;
  autoCloseMaxOpenHours: number;
  autoCloseFixedHour: number;
  autoCloseFixedMinute: number;
  autoClosedRequiresReview: boolean;
};

type ProtectedOverrides = {
  toleranceMinutes?: number;
  maxOpenHours?: number;
  windowNames: string[];
};

const DEFAULT_TIMEZONE = "Europe/Madrid";

const weekdayMap: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function resolveTimeZone(timezone?: string | null) {
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch (error) {
    console.warn(`[TimeTracking] Timezone inválido: ${timezone}`, error);
    return DEFAULT_TIMEZONE;
  }
}

function getLocalDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }

  const weekdayLabel = values.weekday ?? "Mon";
  const weekday = weekdayMap[weekdayLabel] ?? 1;

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday,
  };
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date) {
  const parts = getLocalDateParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (asUtc - date.getTime()) / (1000 * 60);
}

function getLocalMinutesOfDay(date: Date, timeZone: string) {
  const parts = getLocalDateParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

function getLocalDayStartUtc(date: Date, timeZone: string) {
  const parts = getLocalDateParts(date, timeZone);
  const localMidnightUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  const offset = getTimeZoneOffsetMinutes(timeZone, localMidnightUtc);
  return new Date(localMidnightUtc.getTime() - offset * 60 * 1000);
}

function isMinutesWithinWindow(minutesOfDay: number, startMinutes: number, endMinutes: number) {
  if (startMinutes <= endMinutes) {
    return minutesOfDay >= startMinutes && minutesOfDay < endMinutes;
  }
  return minutesOfDay >= startMinutes || minutesOfDay < endMinutes;
}

async function resolveProtectedOverrides(
  orgId: string,
  employeeId: string,
  timeZone: string,
  date: Date,
): Promise<ProtectedOverrides> {
  const minutesOfDay = getLocalMinutesOfDay(date, timeZone);
  const weekday = getLocalDateParts(date, timeZone).weekday;

  const windows = await prisma.protectedWindow.findMany({
    where: {
      orgId,
      isActive: true,
      OR: [{ scope: "ORGANIZATION" }, { scope: "EMPLOYEE", employeeId }],
    },
  });

  const activeWindows = windows.filter((window) => {
    if (!window.weekdays || window.weekdays.length === 0) return false;
    if (!window.weekdays.includes(weekday)) return false;
    return isMinutesWithinWindow(minutesOfDay, window.startMinutes, window.endMinutes);
  });

  if (activeWindows.length === 0) {
    return { windowNames: [] };
  }

  const toleranceMinutes = Math.max(
    ...activeWindows.map((window) =>
      typeof window.overrideToleranceMinutes === "number" ? window.overrideToleranceMinutes : 0,
    ),
  );
  const maxOpenHours = Math.max(
    ...activeWindows.map((window) =>
      typeof window.overrideMaxOpenHours === "number" ? window.overrideMaxOpenHours : 0,
    ),
  );

  return {
    toleranceMinutes: toleranceMinutes > 0 ? toleranceMinutes : undefined,
    maxOpenHours: maxOpenHours > 0 ? maxOpenHours : undefined,
    windowNames: activeWindows.map((window) => window.name),
  };
}

function normalizeResolutionFlags(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as Record<string, unknown>;
}

function normalizeNotifiedIds(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [] as string[];
  }
  return raw.filter((id): id is string => typeof id === "string");
}

async function notifyApproversForIncident(params: {
  orgId: string;
  employeeId: string;
  employeeUserId?: string | null;
  employeeLabel: string;
  dateLabel: string;
  flags: Record<string, unknown>;
  enabled: boolean;
  flagKey: "unresolvedApproverNotifiedIds" | "autoClosedApproverNotifiedIds";
  notificationType: "TIME_ENTRY_UNRESOLVED" | "TIME_ENTRY_AUTO_CLOSED";
  title: string;
  message: string;
}) {
  if (!params.enabled) {
    return params.flags;
  }

  const approvers = await resolveApproverUsers(params.employeeId, params.orgId, "MANUAL_TIME_ENTRY");
  if (approvers.length === 0) {
    return params.flags;
  }

  const alreadyNotified = normalizeNotifiedIds(params.flags[params.flagKey]);
  const pending = approvers.filter(
    (approver) => approver.userId !== params.employeeUserId && !alreadyNotified.includes(approver.userId),
  );

  if (pending.length === 0) {
    return params.flags;
  }

  await Promise.all(
    pending.map((approver) =>
      createNotification(approver.userId, params.orgId, params.notificationType, params.title, params.message),
    ),
  );

  return {
    ...params.flags,
    [params.flagKey]: [...alreadyNotified, ...pending.map((approver) => approver.userId)],
    [`${params.flagKey}At`]: new Date().toISOString(),
    approverNotificationDate: params.dateLabel,
    approverNotificationEmployee: params.employeeLabel,
  };
}

function getLastExpectedWorkSlot(
  timeSlots: Array<{
    slotType: string;
    countsAsWork?: boolean;
    presenceType?: string;
    endMinutes: number;
    startMinutes: number;
  }>,
) {
  const workSlots = timeSlots.filter((slot) => slot.slotType === "WORK" && (slot.countsAsWork ?? true));
  const mandatory = workSlots.filter((slot) => slot.presenceType === "MANDATORY");
  const candidates = mandatory.length > 0 ? mandatory : workSlots;

  if (candidates.length === 0) return null;

  return candidates.reduce((latest, slot) => (slot.endMinutes > latest.endMinutes ? slot : latest));
}

function resolveScheduleEnd(dayStart: Date, lastSlot: { startMinutes: number; endMinutes: number }) {
  const crossesMidnight = lastSlot.endMinutes <= lastSlot.startMinutes;
  const endBase = crossesMidnight ? addDays(dayStart, 1) : dayStart;
  return new Date(endBase.getTime() + lastSlot.endMinutes * 60 * 1000);
}

async function findOpenClockIn(employeeId: string, orgId: string) {
  const openClockIn = await prisma.timeEntry.findFirst({
    where: {
      employeeId,
      orgId,
      entryType: "CLOCK_IN",
      isCancelled: false,
    },
    orderBy: { timestamp: "desc" },
  });

  if (!openClockIn) return null;

  const hasClockOut = await prisma.timeEntry.findFirst({
    where: {
      employeeId,
      orgId,
      entryType: "CLOCK_OUT",
      isCancelled: false,
      timestamp: { gt: openClockIn.timestamp },
    },
  });

  if (hasClockOut) return null;
  return openClockIn;
}

async function getMissingClockOutPolicy(orgId: string): Promise<MissingClockOutPolicy> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      missingClockOutMode: true,
      notifyEmployeeOnUnresolved: true,
      alertNotificationsEnabled: true,
      requireApprovalWhenOvertime: true,
      autoCloseEnabled: true,
      autoCloseStrategy: true,
      autoCloseToleranceMinutes: true,
      autoCloseTriggerExtraMinutes: true,
      autoCloseMaxOpenHours: true,
      autoCloseFixedHour: true,
      autoCloseFixedMinute: true,
      autoClosedRequiresReview: true,
    },
  });

  return {
    missingClockOutMode: org?.missingClockOutMode ?? "UNRESOLVED",
    notifyEmployeeOnUnresolved:
      typeof org?.notifyEmployeeOnUnresolved === "boolean" ? org.notifyEmployeeOnUnresolved : true,
    alertNotificationsEnabled:
      typeof org?.alertNotificationsEnabled === "boolean" ? org.alertNotificationsEnabled : false,
    requireApprovalWhenOvertime:
      typeof org?.requireApprovalWhenOvertime === "boolean" ? org.requireApprovalWhenOvertime : true,
    autoCloseEnabled: org?.autoCloseEnabled === true,
    autoCloseStrategy: org?.autoCloseStrategy ?? "SCHEDULE_END",
    autoCloseToleranceMinutes: typeof org?.autoCloseToleranceMinutes === "number" ? org.autoCloseToleranceMinutes : 15,
    autoCloseTriggerExtraMinutes:
      typeof org?.autoCloseTriggerExtraMinutes === "number" ? org.autoCloseTriggerExtraMinutes : 120,
    autoCloseMaxOpenHours: typeof org?.autoCloseMaxOpenHours === "number" ? org.autoCloseMaxOpenHours : 16,
    autoCloseFixedHour: typeof org?.autoCloseFixedHour === "number" ? org.autoCloseFixedHour : 0,
    autoCloseFixedMinute: typeof org?.autoCloseFixedMinute === "number" ? org.autoCloseFixedMinute : 0,
    autoClosedRequiresReview: typeof org?.autoClosedRequiresReview === "boolean" ? org.autoClosedRequiresReview : true,
  };
}

async function updateResolutionState(params: {
  summaryId: string;
  status: WorkdayResolutionStatus;
  dataQuality: WorkdayDataQuality;
  flags: Record<string, unknown>;
}) {
  await prisma.workdaySummary.update({
    where: { id: params.summaryId },
    data: {
      resolutionStatus: params.status,
      dataQuality: params.dataQuality,
      resolutionFlags: params.flags,
      status: params.status === "OK" ? undefined : "INCOMPLETE",
      overtimeCalcStatus: "DIRTY",
      overtimeCalcUpdatedAt: new Date(),
    },
  });
}

export async function processOpenPunchRollover(payload: { orgId: string; lookbackDays: number }) {
  const organization = await prisma.organization.findUnique({
    where: { id: payload.orgId },
    select: {
      id: true,
      timezone: true,
      notifyEmployeeOnUnresolved: true,
      alertNotificationsEnabled: true,
      autoCloseEnabled: true,
      autoClosedRequiresReview: true,
    },
  });

  if (!organization) return;

  const timeZone = resolveTimeZone(organization.timezone);
  const now = new Date();
  const todayStartUtc = getLocalDayStartUtc(now, timeZone);
  const lookbackDays = Math.max(1, Math.min(payload.lookbackDays, 14));
  const lookbackStart = addDays(todayStartUtc, -lookbackDays);

  const openClockIns = await prisma.timeEntry.findMany({
    where: {
      orgId: organization.id,
      entryType: "CLOCK_IN",
      isCancelled: false,
      timestamp: {
        lt: todayStartUtc,
        gte: lookbackStart,
      },
    },
    orderBy: { timestamp: "desc" },
  });

  const seenEmployees = new Set<string>();

  for (const openClockIn of openClockIns) {
    if (seenEmployees.has(openClockIn.employeeId)) {
      continue;
    }
    seenEmployees.add(openClockIn.employeeId);

    const open = await findOpenClockIn(openClockIn.employeeId, openClockIn.orgId);
    if (!open || open.id !== openClockIn.id) {
      continue;
    }

    const summary = await updateWorkdaySummary(open.employeeId, open.orgId, open.timestamp);
    if (!summary) {
      continue;
    }

    const flags = normalizeResolutionFlags(summary.resolutionFlags);
    const nextFlags = {
      ...flags,
      crossedMidnight: true,
      openClockInId: open.id,
      unresolvedDetectedAt: new Date().toISOString(),
    };

    await updateResolutionState({
      summaryId: summary.id,
      status: "UNRESOLVED_MISSING_CLOCK_OUT",
      dataQuality: "LOW",
      flags: nextFlags,
    });

    await prisma.alert.upsert({
      where: {
        employeeId_date_type: {
          employeeId: open.employeeId,
          date: startOfDay(open.timestamp),
          type: "MISSING_CLOCK_OUT",
        },
      },
      create: {
        orgId: open.orgId,
        employeeId: open.employeeId,
        type: "MISSING_CLOCK_OUT",
        severity: "WARNING",
        title: "Fichaje sin salida",
        description: "Se detectó un fichaje sin salida del día anterior.",
        date: startOfDay(open.timestamp),
        status: "ACTIVE",
        workdaySummaryId: summary.id,
      },
      update: {
        severity: "WARNING",
        title: "Fichaje sin salida",
        description: "Se detectó un fichaje sin salida del día anterior.",
        status: "ACTIVE",
        workdaySummaryId: summary.id,
      },
    });

    const shouldNotifyEmployee = organization.notifyEmployeeOnUnresolved && !flags.unresolvedNotifiedAt;
    const shouldNotifyApprovers = organization.alertNotificationsEnabled;
    if (shouldNotifyEmployee || shouldNotifyApprovers) {
      const employee = await prisma.employee.findUnique({
        where: { id: open.employeeId },
        select: { userId: true, firstName: true, lastName: true, user: { select: { email: true } } },
      });
      const employeeLabel = employee
        ? (`${employee.firstName} ${employee.lastName}`.trim() ?? employee.user?.email ?? "Empleado")
        : "Empleado";

      if (shouldNotifyEmployee && employee?.userId) {
        await createNotification(
          employee.userId,
          open.orgId,
          "TIME_ENTRY_UNRESOLVED",
          "Fichaje sin salida pendiente",
          `Tienes un fichaje sin salida del ${format(open.timestamp, "dd/MM/yyyy")}. Regularízalo para cerrar el día.`,
          undefined,
          undefined,
          undefined,
          open.id,
        );

        nextFlags.unresolvedNotifiedAt = new Date().toISOString();
      }

      const approverFlags = await notifyApproversForIncident({
        orgId: open.orgId,
        employeeId: open.employeeId,
        employeeUserId: employee?.userId ?? null,
        employeeLabel,
        dateLabel: format(open.timestamp, "dd/MM/yyyy"),
        flags: nextFlags,
        enabled: shouldNotifyApprovers,
        flagKey: "unresolvedApproverNotifiedIds",
        notificationType: "TIME_ENTRY_UNRESOLVED",
        title: "Fichaje sin salida pendiente de revisión",
        message: `${employeeLabel} tiene un fichaje sin salida del ${format(open.timestamp, "dd/MM/yyyy")}.`,
      });

      await prisma.workdaySummary.update({
        where: { id: summary.id },
        data: {
          resolutionFlags: approverFlags,
        },
      });
    }

    await enqueueOvertimeWorkdayJob({
      orgId: open.orgId,
      employeeId: open.employeeId,
      date: format(startOfDay(open.timestamp), "yyyy-MM-dd"),
    });
  }
}

function resolveFixedHourTarget(startAt: Date, timeZone: string, hour: number, minute: number) {
  const parts = getLocalDateParts(startAt, timeZone);
  const localMidnightUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  const offset = getTimeZoneOffsetMinutes(timeZone, localMidnightUtc);
  const localMidnight = new Date(localMidnightUtc.getTime() - offset * 60 * 1000);
  let target = addMinutes(localMidnight, hour * 60 + minute);

  if (target.getTime() <= startAt.getTime()) {
    target = addDays(target, 1);
  }

  return target;
}

export async function processOpenPunchSafetyClose(payload: { orgId: string }) {
  const organization = await prisma.organization.findUnique({
    where: { id: payload.orgId },
    select: { id: true, timezone: true },
  });

  if (!organization) return;

  const policy = await getMissingClockOutPolicy(organization.id);
  const timeZone = resolveTimeZone(organization.timezone);
  const now = new Date();

  const openClockIns = await prisma.timeEntry.findMany({
    where: {
      orgId: organization.id,
      entryType: "CLOCK_IN",
      isCancelled: false,
      timestamp: {
        lte: now,
        gte: addDays(now, -7),
      },
    },
    orderBy: { timestamp: "desc" },
  });

  const processed = new Set<string>();

  for (const openClockIn of openClockIns) {
    if (processed.has(openClockIn.employeeId)) {
      continue;
    }
    processed.add(openClockIn.employeeId);

    const open = await findOpenClockIn(openClockIn.employeeId, openClockIn.orgId);
    if (!open || open.id !== openClockIn.id) {
      continue;
    }

    const durationMinutes = (now.getTime() - open.timestamp.getTime()) / (1000 * 60);
    const overrides = await resolveProtectedOverrides(open.orgId, open.employeeId, timeZone, now);
    const maxOpenHours = overrides.maxOpenHours ?? policy.autoCloseMaxOpenHours;

    let closeReason: AutoCloseReason | null = null;
    let closeTime: Date | null = null;

    if (durationMinutes >= maxOpenHours * 60) {
      closeReason = "MAX_OPEN_HOURS";
      closeTime = new Date(open.timestamp.getTime() + maxOpenHours * 60 * 60 * 1000);
    } else if (policy.autoCloseEnabled && policy.missingClockOutMode === "AUTO_CLOSE") {
      if (policy.autoCloseStrategy === "FIXED_HOUR") {
        const target = resolveFixedHourTarget(
          open.timestamp,
          timeZone,
          policy.autoCloseFixedHour,
          policy.autoCloseFixedMinute,
        );
        const waitMinutes = overrides.toleranceMinutes ?? policy.autoCloseToleranceMinutes;
        const triggerTime = addMinutes(target, waitMinutes);
        if (now.getTime() >= triggerTime.getTime()) {
          closeReason = "FIXED_HOUR";
          closeTime = target;
        }
      } else {
        const scheduleDate = startOfDay(open.timestamp);
        scheduleDate.setHours(12, 0, 0, 0);
        const schedule = await getEffectiveSchedule(open.employeeId, scheduleDate).catch(() => null);
        const lastSlot = schedule ? getLastExpectedWorkSlot(schedule.timeSlots) : null;
        const scheduleEnd = lastSlot ? resolveScheduleEnd(startOfDay(open.timestamp), lastSlot) : null;
        const waitMinutes = overrides.toleranceMinutes ?? policy.autoCloseToleranceMinutes;
        const triggerTime = scheduleEnd ? addMinutes(scheduleEnd, waitMinutes) : null;
        const shouldClose = triggerTime && now.getTime() >= triggerTime.getTime();
        if (shouldClose && scheduleEnd) {
          closeReason = "SCHEDULE_END";
          closeTime = scheduleEnd;
        }
      }
    }

    if (!closeTime || !closeReason) {
      continue;
    }

    if (closeTime.getTime() > now.getTime()) {
      closeTime = now;
    }

    const closeResult = await prisma.$transaction(async (tx) => {
      const existingClockOut = await tx.timeEntry.findFirst({
        where: {
          employeeId: open.employeeId,
          orgId: open.orgId,
          entryType: "CLOCK_OUT",
          isCancelled: false,
          timestamp: { gt: open.timestamp },
        },
      });
      if (existingClockOut) {
        return null;
      }

      const lastEntry = await tx.timeEntry.findFirst({
        where: {
          employeeId: open.employeeId,
          orgId: open.orgId,
          isCancelled: false,
          timestamp: {
            gte: open.timestamp,
            lte: now,
          },
        },
        orderBy: { timestamp: "desc" },
      });

      if (lastEntry?.entryType === "BREAK_START") {
        await tx.timeEntry.create({
          data: {
            orgId: open.orgId,
            employeeId: open.employeeId,
            entryType: "BREAK_END",
            timestamp: closeTime,
            isAutomatic: true,
            notes: "Autocierre de pausa por fichaje abierto",
          },
        });
      }

      return tx.timeEntry.create({
        data: {
          orgId: open.orgId,
          employeeId: open.employeeId,
          entryType: "CLOCK_OUT",
          timestamp: closeTime,
          isAutomatic: true,
          notes: "Autocierre automático por fichaje abierto",
          autoCloseReason: closeReason,
        },
      });
    });

    if (!closeResult) {
      continue;
    }

    await updateWorkdaySummary(open.employeeId, open.orgId, closeTime);
    if (startOfDay(open.timestamp).getTime() !== startOfDay(closeTime).getTime()) {
      await updateWorkdaySummary(open.employeeId, open.orgId, open.timestamp);
    }

    const summary = await prisma.workdaySummary.findUnique({
      where: {
        orgId_employeeId_date: {
          orgId: open.orgId,
          employeeId: open.employeeId,
          date: startOfDay(open.timestamp),
        },
      },
    });

    let autoCloseFlags: Record<string, unknown> | null = null;
    if (summary) {
      const flags = normalizeResolutionFlags(summary.resolutionFlags);
      const nextFlags = {
        ...flags,
        autoClosedAt: new Date().toISOString(),
        autoCloseReason: closeReason,
        requiresReview: policy.autoClosedRequiresReview,
        protectedWindows: overrides.windowNames,
      };

      await updateResolutionState({
        summaryId: summary.id,
        status: "AUTO_CLOSED_SAFETY",
        dataQuality: "ESTIMATED",
        flags: nextFlags,
      });
      autoCloseFlags = nextFlags;

      await prisma.alert.upsert({
        where: {
          employeeId_date_type: {
            employeeId: open.employeeId,
            date: startOfDay(open.timestamp),
            type: "AUTO_CLOSED_SAFETY",
          },
        },
        create: {
          orgId: open.orgId,
          employeeId: open.employeeId,
          type: "AUTO_CLOSED_SAFETY",
          severity: "WARNING",
          title: "Fichaje autocerrado",
          description: "Se autocerró un fichaje por seguridad. Requiere revisión.",
          date: startOfDay(open.timestamp),
          status: "ACTIVE",
          workdaySummaryId: summary.id,
        },
        update: {
          severity: "WARNING",
          title: "Fichaje autocerrado",
          description: "Se autocerró un fichaje por seguridad. Requiere revisión.",
          status: "ACTIVE",
          workdaySummaryId: summary.id,
        },
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: open.employeeId },
      select: { userId: true, firstName: true, lastName: true, user: { select: { email: true } } },
    });
    const employeeLabel = employee
      ? (`${employee.firstName} ${employee.lastName}`.trim() ?? employee.user?.email ?? "Empleado")
      : "Empleado";

    if (employee?.userId) {
      await createNotification(
        employee.userId,
        open.orgId,
        "TIME_ENTRY_AUTO_CLOSED",
        "Fichaje autocerrado por seguridad",
        `Se autocerró tu fichaje del ${format(open.timestamp, "dd/MM/yyyy")} a las ${format(
          closeTime,
          "HH:mm",
        )}. Revisa y regulariza si fuera necesario.`,
      );
    }

    if (summary && policy.alertNotificationsEnabled) {
      const flags = autoCloseFlags ?? normalizeResolutionFlags(summary.resolutionFlags);
      const updatedFlags = await notifyApproversForIncident({
        orgId: open.orgId,
        employeeId: open.employeeId,
        employeeUserId: employee?.userId ?? null,
        employeeLabel,
        dateLabel: format(open.timestamp, "dd/MM/yyyy"),
        flags,
        enabled: policy.alertNotificationsEnabled && policy.autoClosedRequiresReview,
        flagKey: "autoClosedApproverNotifiedIds",
        notificationType: "TIME_ENTRY_AUTO_CLOSED",
        title: "Fichaje autocerrado requiere revisión",
        message: `Se autocerró el fichaje de ${employeeLabel} del ${format(open.timestamp, "dd/MM/yyyy")}.`,
      });

      await prisma.workdaySummary.update({
        where: { id: summary.id },
        data: {
          resolutionFlags: updatedFlags,
        },
      });
    }

    await enqueueOvertimeWorkdayJob({
      orgId: open.orgId,
      employeeId: open.employeeId,
      date: format(startOfDay(open.timestamp), "yyyy-MM-dd"),
    });
  }
}

export async function processOnCallAvailabilitySettlement(payload: { orgId: string; lookbackDays: number }) {
  const now = new Date();
  const windowStart = addDays(startOfDay(now), -payload.lookbackDays);

  const schedules = await prisma.onCallSchedule.findMany({
    where: {
      orgId: payload.orgId,
      status: "SCHEDULED",
      endAt: {
        lte: now,
        gte: windowStart,
      },
      allowance: { is: null },
    },
    select: {
      id: true,
      orgId: true,
      employeeId: true,
      endAt: true,
      availabilityCompensationType: true,
      availabilityCompensationMinutes: true,
      availabilityCompensationAmount: true,
      availabilityCompensationCurrency: true,
    },
    orderBy: { endAt: "desc" },
  });

  for (const schedule of schedules) {
    if (!schedule.employeeId) {
      continue;
    }

    const type =
      schedule.availabilityCompensationType === "TIME" ||
      schedule.availabilityCompensationType === "PAY" ||
      schedule.availabilityCompensationType === "MIXED"
        ? schedule.availabilityCompensationType
        : "NONE";

    const timeEnabled = type === "TIME" || type === "MIXED";
    const payEnabled = type === "PAY" || type === "MIXED";
    const minutes = timeEnabled ? Math.max(0, Number(schedule.availabilityCompensationMinutes) || 0) : 0;
    const amount = payEnabled ? Math.max(0, Number(schedule.availabilityCompensationAmount) || 0) : 0;
    const currency = schedule.availabilityCompensationCurrency?.trim() || "EUR";

    if (type === "NONE" || (minutes === 0 && amount === 0)) {
      continue;
    }

    const status = amount > 0 ? "PENDING" : "SETTLED";

    await prisma.$transaction(async (tx) => {
      const existing = await tx.onCallAllowance.findUnique({
        where: { scheduleId: schedule.id },
      });

      if (existing) {
        return;
      }

      await tx.onCallAllowance.create({
        data: {
          scheduleId: schedule.id,
          orgId: schedule.orgId,
          employeeId: schedule.employeeId!,
          compensationType: type,
          minutes,
          amount,
          currency,
          status,
          settledAt: status === "SETTLED" ? new Date() : null,
        },
      });

      if (minutes > 0) {
        const existingMovement = await tx.timeBankMovement.findFirst({
          where: {
            referenceId: schedule.id,
            origin: "ON_CALL_AVAILABILITY",
          },
        });

        if (!existingMovement) {
          await tx.timeBankMovement.create({
            data: {
              orgId: schedule.orgId,
              employeeId: schedule.employeeId!,
              date: schedule.endAt,
              minutes,
              type: "EXTRA",
              origin: "ON_CALL_AVAILABILITY",
              status: "SETTLED",
              requiresApproval: false,
              description: "Compensación de guardia",
              referenceId: schedule.id,
            },
          });
        }
      }
    });
  }
}

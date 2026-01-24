import type { PgBoss } from "pg-boss";

import { prisma } from "@/lib/prisma";
import {
  enqueueTimeTrackingRolloverJob,
  enqueueTimeTrackingSafetyCloseJob,
  enqueueTimeTrackingOnCallSettlementJob,
} from "@/server/jobs/time-tracking-queue";

export const TIME_TRACKING_SWEEP_DISPATCH_JOB = "time-tracking.sweep.dispatch";

const DEFAULT_TIMEZONE = "Europe/Madrid";
const DEFAULT_SWEEP_HOUR = 4;
const DEFAULT_DISPATCH_INTERVAL_MINUTES = 10;
const DEFAULT_LOOKBACK_DAYS = 1;

const weekdayMap: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function resolveBooleanEnv(name: string, defaultValue: boolean) {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const normalized = raw.toLowerCase().trim();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

function resolveTimeZone(timezone?: string | null) {
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch (error) {
    console.warn(`[TimeTrackingScheduler] Timezone inválido: ${timezone}`, error);
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
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday,
  };
}

function isWithinWindow(minutesOfDay: number, startMinutes: number, endMinutes: number) {
  if (!Number.isFinite(minutesOfDay)) return false;
  const start = ((startMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const end = ((endMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

  if (start === end) {
    return false;
  }

  if (start < end) {
    return minutesOfDay >= start && minutesOfDay < end;
  }

  return minutesOfDay >= start || minutesOfDay < end;
}

function clampInterval(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_DISPATCH_INTERVAL_MINUTES;
  return Math.min(60, Math.max(1, Math.round(value)));
}

async function getGlobalSchedulerSettings() {
  const settings = await prisma.globalSettings.findUnique({
    where: { id: "global" },
    select: {
      timeTrackingSweepHour: true,
      timeTrackingSweepStartMinute: true,
      timeTrackingSweepEndHour: true,
      timeTrackingSweepEndMinute: true,
      timeTrackingSweepWindowMinutes: true,
      timeTrackingSweepLookbackDays: true,
      timeTrackingDispatchIntervalMinutes: true,
    },
  });

  const fallbackWindowMinutes =
    typeof settings?.timeTrackingSweepWindowMinutes === "number" ? settings.timeTrackingSweepWindowMinutes : 20;
  return {
    timeTrackingSweepHour:
      typeof settings?.timeTrackingSweepHour === "number" ? settings.timeTrackingSweepHour : DEFAULT_SWEEP_HOUR,
    timeTrackingSweepStartMinute:
      typeof settings?.timeTrackingSweepStartMinute === "number" ? settings.timeTrackingSweepStartMinute : 0,
    timeTrackingSweepEndHour:
      typeof settings?.timeTrackingSweepEndHour === "number"
        ? settings.timeTrackingSweepEndHour
        : (DEFAULT_SWEEP_HOUR + Math.floor(fallbackWindowMinutes / 60)) % 24,
    timeTrackingSweepEndMinute:
      typeof settings?.timeTrackingSweepEndMinute === "number"
        ? settings.timeTrackingSweepEndMinute
        : fallbackWindowMinutes % 60,
    timeTrackingSweepLookbackDays:
      typeof settings?.timeTrackingSweepLookbackDays === "number"
        ? settings.timeTrackingSweepLookbackDays
        : DEFAULT_LOOKBACK_DAYS,
    timeTrackingDispatchIntervalMinutes:
      typeof settings?.timeTrackingDispatchIntervalMinutes === "number"
        ? settings.timeTrackingDispatchIntervalMinutes
        : DEFAULT_DISPATCH_INTERVAL_MINUTES,
  };
}

async function dispatchTimeTrackingSweep(referenceTime: Date = new Date()) {
  const schedulerEnabled = resolveBooleanEnv("TIME_TRACKING_SWEEP_ENABLED", true);
  if (!schedulerEnabled) return;

  const {
    timeTrackingSweepHour,
    timeTrackingSweepStartMinute,
    timeTrackingSweepEndHour,
    timeTrackingSweepEndMinute,
    timeTrackingSweepLookbackDays,
  } = await getGlobalSchedulerSettings();

  const organizations = await prisma.organization.findMany({
    where: { active: true },
    select: {
      id: true,
      timezone: true,
    },
  });

  const now = referenceTime;

  for (const organization of organizations) {
    const timeZone = resolveTimeZone(organization.timezone);
    const parts = getLocalDateParts(now, timeZone);
    const minutesOfDay = parts.hour * 60 + parts.minute;
    const windowStartMinutes = timeTrackingSweepHour * 60 + timeTrackingSweepStartMinute;
    const windowEndMinutes = timeTrackingSweepEndHour * 60 + timeTrackingSweepEndMinute;

    if (!isWithinWindow(minutesOfDay, windowStartMinutes, windowEndMinutes)) {
      continue;
    }

    await enqueueTimeTrackingRolloverJob({
      orgId: organization.id,
      lookbackDays: timeTrackingSweepLookbackDays,
    });

    await enqueueTimeTrackingSafetyCloseJob({
      orgId: organization.id,
    });

    await enqueueTimeTrackingOnCallSettlementJob({
      orgId: organization.id,
      lookbackDays: timeTrackingSweepLookbackDays,
    });
  }
}

export async function registerTimeTrackingScheduler(boss: PgBoss) {
  await boss.createQueue(TIME_TRACKING_SWEEP_DISPATCH_JOB);

  await boss.work(TIME_TRACKING_SWEEP_DISPATCH_JOB, { teamSize: 1 }, async (jobOrJobs) => {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const referenceTime = job?.createdon ? new Date(job.createdon) : new Date();
      await dispatchTimeTrackingSweep(referenceTime);
    }
  });

  const schedulerEnabled = resolveBooleanEnv("TIME_TRACKING_SWEEP_ENABLED", true);
  if (!schedulerEnabled) {
    console.log("[TimeTrackingScheduler] Barrido desactivado por entorno");
    return;
  }

  const settings = await getGlobalSchedulerSettings();
  const interval = clampInterval(settings.timeTrackingDispatchIntervalMinutes);
  const cron = `*/${interval} * * * *`;
  await boss.schedule(TIME_TRACKING_SWEEP_DISPATCH_JOB, cron);
}

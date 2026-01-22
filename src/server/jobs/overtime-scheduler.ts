import type { PgBoss } from "pg-boss";

import { prisma } from "@/lib/prisma";
import {
  enqueueOvertimeAuthorizationExpireJob,
  enqueueOvertimeWeeklyReconciliationJob,
  enqueueOvertimeWorkdaySweepJob,
} from "@/server/jobs/overtime-queue";

export const OVERTIME_WEEKLY_DISPATCH_JOB = "overtime.weekly.dispatch";

const DEFAULT_TIMEZONE = "Europe/Madrid";
const DEFAULT_WEEKDAY = 1; // Lunes
const DEFAULT_HOUR = 4; // 04:00
const DEFAULT_WINDOW_MINUTES = 20;
const DEFAULT_DISPATCH_INTERVAL_MINUTES = 10;
const DEFAULT_AUTH_EXPIRY_DAYS = 7;

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
    console.warn(`[OvertimeScheduler] Timezone inválido: ${timezone}`, error);
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
  const weekday = weekdayMap[weekdayLabel] ?? DEFAULT_WEEKDAY;

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday,
  };
}

function formatUtcDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStartDateString(parts: ReturnType<typeof getLocalDateParts>) {
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  base.setUTCDate(base.getUTCDate() - (parts.weekday - 1));
  return formatUtcDate(base);
}

function isWithinWindow(
  parts: ReturnType<typeof getLocalDateParts>,
  targetWeekday: number,
  targetHour: number,
  windowMinutes: number,
) {
  if (parts.weekday !== targetWeekday) return false;
  if (parts.hour !== targetHour) return false;
  return parts.minute >= 0 && parts.minute < windowMinutes;
}

async function getGlobalSchedulerSettings() {
  const settings = await prisma.globalSettings.findUnique({
    where: { id: "global" },
    select: {
      overtimeReconciliationWeekday: true,
      overtimeReconciliationHour: true,
      overtimeReconciliationWindowMinutes: true,
      overtimeReconciliationDispatchIntervalMinutes: true,
      overtimeDailySweepHour: true,
      overtimeDailySweepWindowMinutes: true,
      overtimeDailySweepLookbackDays: true,
      overtimeAuthorizationExpiryDays: true,
    },
  });

  return {
    overtimeReconciliationWeekday:
      typeof settings?.overtimeReconciliationWeekday === "number"
        ? settings.overtimeReconciliationWeekday
        : DEFAULT_WEEKDAY,
    overtimeReconciliationHour:
      typeof settings?.overtimeReconciliationHour === "number" ? settings.overtimeReconciliationHour : DEFAULT_HOUR,
    overtimeReconciliationWindowMinutes:
      typeof settings?.overtimeReconciliationWindowMinutes === "number"
        ? settings.overtimeReconciliationWindowMinutes
        : DEFAULT_WINDOW_MINUTES,
    overtimeReconciliationDispatchIntervalMinutes:
      typeof settings?.overtimeReconciliationDispatchIntervalMinutes === "number"
        ? settings.overtimeReconciliationDispatchIntervalMinutes
        : DEFAULT_DISPATCH_INTERVAL_MINUTES,
    overtimeDailySweepHour: typeof settings?.overtimeDailySweepHour === "number" ? settings.overtimeDailySweepHour : 4,
    overtimeDailySweepWindowMinutes:
      typeof settings?.overtimeDailySweepWindowMinutes === "number" ? settings.overtimeDailySweepWindowMinutes : 20,
    overtimeDailySweepLookbackDays:
      typeof settings?.overtimeDailySweepLookbackDays === "number" ? settings.overtimeDailySweepLookbackDays : 2,
    overtimeAuthorizationExpiryDays: (() => {
      const raw =
        typeof settings?.overtimeAuthorizationExpiryDays === "number"
          ? settings.overtimeAuthorizationExpiryDays
          : DEFAULT_AUTH_EXPIRY_DAYS;
      return Math.max(1, Math.min(90, Math.round(raw)));
    })(),
  };
}

function clampInterval(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_DISPATCH_INTERVAL_MINUTES;
  return Math.min(60, Math.max(1, Math.round(value)));
}

async function dispatchWeeklyOvertimeReconciliation() {
  const schedulerEnabled = resolveBooleanEnv("OVERTIME_RECONCILIATION_ENABLED", true);
  if (!schedulerEnabled) return;

  const {
    overtimeReconciliationWeekday,
    overtimeReconciliationHour,
    overtimeReconciliationWindowMinutes,
    overtimeDailySweepHour,
    overtimeDailySweepWindowMinutes,
    overtimeDailySweepLookbackDays,
    overtimeAuthorizationExpiryDays,
  } = await getGlobalSchedulerSettings();

  const organizations = await prisma.organization.findMany({
    where: { active: true },
    select: {
      id: true,
      timezone: true,
      timeBankSettings: {
        select: {
          overtimeWeeklyReconciliationEnabled: true,
        },
      },
    },
  });

  const now = new Date();

  for (const organization of organizations) {
    const settingsEnabledValue = organization.timeBankSettings
      ? organization.timeBankSettings.overtimeWeeklyReconciliationEnabled
      : null;
    const weeklyEnabled = typeof settingsEnabledValue === "boolean" ? settingsEnabledValue : true;

    const timeZone = resolveTimeZone(organization.timezone);
    const parts = getLocalDateParts(now, timeZone);

    if (isWithinWindow(parts, parts.weekday, overtimeDailySweepHour, overtimeDailySweepWindowMinutes)) {
      await enqueueOvertimeWorkdaySweepJob({
        orgId: organization.id,
        lookbackDays: overtimeDailySweepLookbackDays,
      });
      await enqueueOvertimeAuthorizationExpireJob({
        orgId: organization.id,
        expiryDays: overtimeAuthorizationExpiryDays,
      });
    }

    if (!weeklyEnabled) {
      continue;
    }

    if (
      !isWithinWindow(
        parts,
        overtimeReconciliationWeekday,
        overtimeReconciliationHour,
        overtimeReconciliationWindowMinutes,
      )
    ) {
      continue;
    }

    const weekStart = getWeekStartDateString(parts);
    await enqueueOvertimeWeeklyReconciliationJob({
      orgId: organization.id,
      weekStart,
    });
  }
}

export async function registerOvertimeScheduler(boss: PgBoss) {
  await boss.createQueue(OVERTIME_WEEKLY_DISPATCH_JOB);

  await boss.work(OVERTIME_WEEKLY_DISPATCH_JOB, { teamSize: 1 }, async () => {
    await dispatchWeeklyOvertimeReconciliation();
  });

  const schedulerEnabled = resolveBooleanEnv("OVERTIME_RECONCILIATION_ENABLED", true);
  if (!schedulerEnabled) {
    console.log("[OvertimeScheduler] Reconciliación semanal desactivada por entorno");
    return;
  }

  const settings = await getGlobalSchedulerSettings();
  const interval = clampInterval(settings.overtimeReconciliationDispatchIntervalMinutes);
  const cron = `*/${interval} * * * *`;
  await boss.schedule(OVERTIME_WEEKLY_DISPATCH_JOB, cron);
}

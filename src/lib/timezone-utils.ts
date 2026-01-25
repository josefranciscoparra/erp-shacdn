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

export function resolveTimeZone(timezone?: string | null) {
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch (error) {
    console.warn(`[TimeTracking] Timezone inválido: ${timezone}`, error);
    return DEFAULT_TIMEZONE;
  }
}

export function getLocalDateParts(date: Date, timeZone: string) {
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

export function getLocalMinutesOfDay(date: Date, timeZone: string) {
  const parts = getLocalDateParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date) {
  const parts = getLocalDateParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (asUtc - date.getTime()) / (1000 * 60);
}

export function getLocalDayStartUtc(date: Date, timeZone: string) {
  const parts = getLocalDateParts(date, timeZone);
  const localMidnightUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, localMidnightUtc);
  return new Date(localMidnightUtc.getTime() - offsetMinutes * 60 * 1000);
}

function parseIsoDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

export function getLocalDayStartUtcFromParts(year: number, month: number, day: number, timeZone: string) {
  let probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const probeParts = getLocalDateParts(probe, timeZone);
  if (probeParts.year !== year || probeParts.month !== month || probeParts.day !== day) {
    const targetUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
    const probeUtc = Date.UTC(probeParts.year, probeParts.month - 1, probeParts.day, 0, 0, 0, 0);
    const diffDays = Math.round((probeUtc - targetUtc) / (24 * 60 * 60 * 1000));
    if (diffDays !== 0) {
      probe = new Date(probe.getTime() - diffDays * 24 * 60 * 60 * 1000);
    }
  }

  return getLocalDayStartUtc(probe, timeZone);
}

export function getLocalDayStartUtcFromDateKey(dateKey: string, timeZone: string) {
  const parsed = parseIsoDateKey(dateKey);
  if (!parsed) {
    return null;
  }

  return getLocalDayStartUtcFromParts(parsed.year, parsed.month, parsed.day, timeZone);
}

export function getLocalDayEndUtc(date: Date, timeZone: string) {
  const start = getLocalDayStartUtc(date, timeZone);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function getLocalDayAnchor(date: Date, timeZone: string, hour: number = 12) {
  const parts = getLocalDateParts(date, timeZone);
  const localAnchorUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, 0, 0, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, localAnchorUtc);
  return new Date(localAnchorUtc.getTime() - offsetMinutes * 60 * 1000);
}

export function isSameLocalDay(first: Date, second: Date, timeZone: string) {
  const firstStart = getLocalDayStartUtc(first, timeZone);
  const secondStart = getLocalDayStartUtc(second, timeZone);
  return firstStart.getTime() === secondStart.getTime();
}

export function formatUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

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

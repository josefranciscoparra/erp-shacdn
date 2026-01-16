export function normalizeDateToLocalNoon(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);
  return normalized;
}

export function getLocalDayRange(date: Date): { start: Date; end: Date } {
  const normalized = normalizeDateToLocalNoon(date);
  const start = new Date(normalized);
  start.setHours(0, 0, 0, 0);
  const end = new Date(normalized);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

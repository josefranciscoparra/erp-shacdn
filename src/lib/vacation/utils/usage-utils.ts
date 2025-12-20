import { daysToMinutes, minutesToDays, roundDays } from "./conversion-utils";

export type UsageRequest = {
  status: "APPROVED" | "PENDING" | "REJECTED" | "CANCELLED" | "DRAFT";
  startDate: Date;
  endDate: Date;
  workingDays?: number | null;
  durationMinutes?: number | null;
  effectiveMinutes?: number | null;
  submittedAt?: Date;
};

export type UsageOptions = {
  includePending?: boolean;
  cutoffDate?: Date;
  windowStart?: Date;
  windowEnd?: Date;
  submittedBefore?: Date;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getOverlapDays(start: Date, end: Date, windowStart: Date, windowEnd: Date): number {
  const normalizedStart = startOfDay(start);
  const normalizedEnd = startOfDay(end);
  const normalizedWindowStart = startOfDay(windowStart);
  const normalizedWindowEnd = startOfDay(windowEnd);

  if (normalizedEnd < normalizedWindowStart || normalizedStart > normalizedWindowEnd) {
    return 0;
  }

  const overlapStart = normalizedStart > normalizedWindowStart ? normalizedStart : normalizedWindowStart;
  const overlapEnd = normalizedEnd < normalizedWindowEnd ? normalizedEnd : normalizedWindowEnd;
  const diffDays = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(0, diffDays);
}

function getTotalDays(start: Date, end: Date): number {
  const normalizedStart = startOfDay(start);
  const normalizedEnd = startOfDay(end);
  if (normalizedEnd < normalizedStart) return 0;
  return Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function resolveRequestMinutes(request: UsageRequest, workdayMinutes: number): number {
  const effectiveMinutes = request.effectiveMinutes ?? 0;
  if (effectiveMinutes > 0) return effectiveMinutes;

  const durationMinutes = request.durationMinutes ?? 0;
  if (durationMinutes > 0) return durationMinutes;

  const workingDays = request.workingDays ? Number(request.workingDays) : 0;
  if (workingDays > 0) return daysToMinutes(workingDays, workdayMinutes);

  return 0;
}

export function calculateUsageFromRequests(
  requests: UsageRequest[],
  workdayMinutes: number,
  options: UsageOptions = {},
): { usedMinutes: number; usedDays: number; pendingMinutes: number; pendingDays: number } {
  const includePending = options.includePending ?? true;
  const cutoffDate = options.cutoffDate ?? new Date();
  const windowStart = options.windowStart;
  const windowEnd = options.windowEnd;
  const submittedBefore = options.submittedBefore;

  let usedMinutes = 0;
  let pendingMinutes = 0;

  for (const request of requests) {
    if (request.status !== "APPROVED" && request.status !== "PENDING") {
      continue;
    }

    if (submittedBefore && request.submittedAt && request.submittedAt > submittedBefore) {
      continue;
    }

    const requestMinutes = resolveRequestMinutes(request, workdayMinutes);
    if (requestMinutes <= 0) continue;

    let allocatedMinutes = requestMinutes;

    if (windowStart && windowEnd) {
      const totalDays = getTotalDays(request.startDate, request.endDate);
      const overlapDays = getOverlapDays(request.startDate, request.endDate, windowStart, windowEnd);

      if (totalDays === 0 || overlapDays === 0) {
        continue;
      }

      allocatedMinutes = (requestMinutes * overlapDays) / totalDays;
    }

    if (request.status === "PENDING") {
      if (includePending) {
        pendingMinutes += allocatedMinutes;
      }
      continue;
    }

    if (request.endDate <= cutoffDate) {
      usedMinutes += allocatedMinutes;
    } else if (includePending) {
      pendingMinutes += allocatedMinutes;
    }
  }

  const usedMinutesRounded = Math.round(usedMinutes);
  const pendingMinutesRounded = Math.round(pendingMinutes);

  return {
    usedMinutes: usedMinutesRounded,
    usedDays: roundDays(minutesToDays(usedMinutesRounded, workdayMinutes)),
    pendingMinutes: pendingMinutesRounded,
    pendingDays: roundDays(minutesToDays(pendingMinutesRounded, workdayMinutes)),
  };
}

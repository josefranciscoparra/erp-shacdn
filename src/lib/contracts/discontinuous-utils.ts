import { endOfDay, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";

type PausePeriod = {
  startDate: Date;
  endDate: Date | null;
};

type DiscontinuousContractInfo = {
  id: string;
  discontinuousStatus: "ACTIVE" | "PAUSED" | null;
  pauseHistory: PausePeriod[];
};

function normalizeRangeStartEnd(rangeStart: Date, rangeEnd: Date) {
  const start = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);

  if (start.getTime() <= end.getTime()) {
    return { start, end };
  }

  return { start: end, end: start };
}

export function isDateRangeOverlappingPause(pauseHistory: PausePeriod[], rangeStart: Date, rangeEnd: Date): boolean {
  if (pauseHistory.length === 0) {
    return false;
  }

  const { start, end } = normalizeRangeStartEnd(rangeStart, rangeEnd);

  for (const pause of pauseHistory) {
    const pauseStart = startOfDay(pause.startDate);
    const pauseEnd = pause.endDate ? endOfDay(pause.endDate) : null;

    const overlaps = pauseEnd ? start <= pauseEnd && end >= pauseStart : end >= pauseStart;
    if (overlaps) {
      return true;
    }
  }

  return false;
}

function isContractPausedFromHistory(pauseHistory: PausePeriod[]): boolean {
  return pauseHistory.some((pause) => pause.endDate === null);
}

export async function getDiscontinuousContractInfo(
  employeeId: string,
  orgId?: string,
): Promise<DiscontinuousContractInfo | null> {
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      active: true,
      contractType: "FIJO_DISCONTINUO",
      ...(orgId ? { orgId } : {}),
    },
    select: {
      id: true,
      discontinuousStatus: true,
      pauseHistory: {
        where: { action: "PAUSE" },
        select: {
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!contract) {
    return null;
  }

  return {
    id: contract.id,
    discontinuousStatus: contract.discontinuousStatus as "ACTIVE" | "PAUSED" | null,
    pauseHistory: contract.pauseHistory,
  };
}

export async function isEmployeePausedNow(employeeId: string, orgId?: string): Promise<boolean> {
  const contract = await getDiscontinuousContractInfo(employeeId, orgId);
  if (!contract) {
    return false;
  }

  return contract.discontinuousStatus === "PAUSED" || isContractPausedFromHistory(contract.pauseHistory);
}

export async function isEmployeePausedDuringRange(
  employeeId: string,
  rangeStart: Date,
  rangeEnd: Date,
  orgId?: string,
): Promise<boolean> {
  const contract = await getDiscontinuousContractInfo(employeeId, orgId);
  if (!contract) {
    return false;
  }

  if (contract.pauseHistory.length === 0) {
    return contract.discontinuousStatus === "PAUSED";
  }

  const overlaps = isDateRangeOverlappingPause(contract.pauseHistory, rangeStart, rangeEnd);
  if (overlaps) {
    return true;
  }

  if (contract.discontinuousStatus !== "PAUSED") {
    return false;
  }

  const { end } = normalizeRangeStartEnd(rangeStart, rangeEnd);
  const today = startOfDay(new Date());
  return end >= today;
}

import type { EffectiveSchedule } from "@/types/schedule";

export type PaidBreakSlot = {
  startMinutes: number;
  endMinutes: number;
};

export type TimeEntryLike = {
  entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | "PROJECT_SWITCH";
  timestamp: Date;
  isAutomatic?: boolean | null;
  automaticBreakSlotId?: string | null;
};

type BreakInterval = {
  startMinutes: number;
  endMinutes: number;
  automaticBreakSlotId?: string | null;
};

export type WorkdayTotals = {
  workedMinutes: number;
  breakMinutes: number;
  paidBreakMinutes: number;
};

function dateToMinutes(dayStart: Date, date: Date): number {
  const midnight = new Date(dayStart);
  midnight.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - midnight.getTime();
  return diffMs / (1000 * 60);
}

export function extractPaidBreakSlots(schedule: EffectiveSchedule | null): PaidBreakSlot[] {
  if (!schedule) return [];
  return schedule.timeSlots
    .filter((slot) => slot.slotType === "BREAK" && slot.countsAsWork === true)
    .map((slot) => ({
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
    }));
}

export function calculateWorkdayTotals(
  entries: TimeEntryLike[],
  dayStart: Date,
  options?: {
    paidBreakSlots?: PaidBreakSlot[];
    paidBreakSlotIds?: Set<string>;
  },
): WorkdayTotals {
  const paidBreakSlots = options?.paidBreakSlots ?? [];
  const paidBreakSlotIds = options?.paidBreakSlotIds ?? new Set<string>();

  const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const breakIntervals: BreakInterval[] = [];

  let totalWorked = 0;
  let totalBreak = 0;
  let lastClockIn: Date | null = null;
  let lastBreakStart: { timestamp: Date; automaticBreakSlotId?: string | null } | null = null;

  for (const entry of sorted) {
    switch (entry.entryType) {
      case "CLOCK_IN":
        lastClockIn = entry.timestamp;
        break;

      case "PROJECT_SWITCH":
        if (lastClockIn) {
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
        }
        lastClockIn = entry.timestamp;
        break;

      case "BREAK_START":
        if (lastClockIn) {
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          lastClockIn = null;
        }
        lastBreakStart = {
          timestamp: entry.timestamp,
          automaticBreakSlotId: entry.automaticBreakSlotId ?? null,
        };
        break;

      case "BREAK_END":
        if (lastBreakStart) {
          const minutes = (entry.timestamp.getTime() - lastBreakStart.timestamp.getTime()) / (1000 * 60);
          totalBreak += minutes;
          breakIntervals.push({
            startMinutes: dateToMinutes(dayStart, lastBreakStart.timestamp),
            endMinutes: dateToMinutes(dayStart, entry.timestamp),
            automaticBreakSlotId: lastBreakStart.automaticBreakSlotId ?? null,
          });
          lastClockIn = entry.timestamp;
          lastBreakStart = null;
        }
        break;

      case "CLOCK_OUT":
        if (lastClockIn) {
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          lastClockIn = null;
        }
        if (lastBreakStart) {
          const minutes = (entry.timestamp.getTime() - lastBreakStart.timestamp.getTime()) / (1000 * 60);
          totalBreak += minutes;
          breakIntervals.push({
            startMinutes: dateToMinutes(dayStart, lastBreakStart.timestamp),
            endMinutes: dateToMinutes(dayStart, entry.timestamp),
            automaticBreakSlotId: lastBreakStart.automaticBreakSlotId ?? null,
          });
          lastBreakStart = null;
        }
        break;
    }
  }

  let paidBreakMinutes = 0;

  for (const interval of breakIntervals) {
    if (interval.endMinutes <= interval.startMinutes) {
      continue;
    }

    if (interval.automaticBreakSlotId && paidBreakSlotIds.has(interval.automaticBreakSlotId)) {
      paidBreakMinutes += interval.endMinutes - interval.startMinutes;
      continue;
    }

    if (interval.automaticBreakSlotId) {
      continue;
    }

    for (const slot of paidBreakSlots) {
      const overlapStart = Math.max(interval.startMinutes, slot.startMinutes);
      const overlapEnd = Math.min(interval.endMinutes, slot.endMinutes);
      if (overlapEnd > overlapStart) {
        paidBreakMinutes += overlapEnd - overlapStart;
      }
    }
  }

  return {
    workedMinutes: totalWorked + paidBreakMinutes,
    breakMinutes: totalBreak,
    paidBreakMinutes,
  };
}

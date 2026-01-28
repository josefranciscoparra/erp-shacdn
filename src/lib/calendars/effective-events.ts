import { prisma } from "@/lib/prisma";

export type EffectiveHolidayResult = {
  isHoliday: boolean;
  name?: string;
  source?: "GROUP" | "GROUP_ADDITION" | "ORG";
};

function buildOrgCalendarHolidayWhere(params: {
  orgId: string;
  year: number;
  dayStart: Date;
  dayEnd: Date;
  costCenterId: string | null;
}) {
  const { orgId, year, dayStart, dayEnd, costCenterId } = params;
  return {
    calendar: {
      orgId,
      active: true,
      year,
      OR: [{ costCenterId: null }, ...(costCenterId ? [{ costCenterId }] : [])],
    },
    date: { gte: dayStart, lte: dayEnd },
    eventType: "HOLIDAY" as const,
  };
}

async function getActiveGroupIdsForOrg(orgId: string): Promise<string[]> {
  const rows = await prisma.organizationGroupOrganization.findMany({
    where: {
      organizationId: orgId,
      status: "ACTIVE",
      group: { isActive: true },
    },
    select: { groupId: true },
  });
  return rows.map((r) => r.groupId);
}

function buildGroupCalendarApplicabilityWhere(params: {
  orgId: string;
  costCenterId: string | null;
  includeLocal: boolean;
}) {
  const { orgId, costCenterId, includeLocal } = params;

  const nonLocalByAssignment = {
    calendarType: { not: "LOCAL_HOLIDAY" as const },
    assignments: { some: { orgId, enabled: true } },
  };

  const nonLocalByGlobal = {
    calendarType: { not: "LOCAL_HOLIDAY" as const },
    applyToAllOrganizations: true,
  };

  const localByAssignment =
    includeLocal && costCenterId
      ? {
          calendarType: "LOCAL_HOLIDAY" as const,
          assignments: {
            some: {
              orgId,
              enabled: true,
              costCenters: { some: { costCenterId } },
            },
          },
        }
      : null;

  return {
    OR: [nonLocalByGlobal, nonLocalByAssignment, ...(localByAssignment ? [localByAssignment] : [])],
  };
}

export async function findEffectiveHolidayForDay(params: {
  orgId: string;
  dayStart: Date;
  dayEnd: Date;
  year: number;
  costCenterId?: string | null;
  // Si false, solo se consideran calendarios globales (útil para vistas “de toda la org”).
  includeLocal?: boolean;
}): Promise<EffectiveHolidayResult> {
  const costCenterId = params.costCenterId ?? null;
  const includeLocal = params.includeLocal ?? true;

  const groupIds = await getActiveGroupIdsForOrg(params.orgId);

  if (groupIds.length > 0) {
    const groupEvent = await prisma.groupCalendarEvent.findFirst({
      where: {
        date: { gte: params.dayStart, lte: params.dayEnd },
        eventType: "HOLIDAY",
        exclusions: { none: { orgId: params.orgId } },
        calendar: {
          groupId: { in: groupIds },
          active: true,
          year: params.year,
          ...buildGroupCalendarApplicabilityWhere({ orgId: params.orgId, costCenterId, includeLocal }),
        },
      },
      select: { name: true },
    });

    if (groupEvent) {
      return { isHoliday: true, name: groupEvent.name, source: "GROUP" };
    }

    const groupAddition = await prisma.groupCalendarEventAddition.findFirst({
      where: {
        orgId: params.orgId,
        date: { gte: params.dayStart, lte: params.dayEnd },
        eventType: "HOLIDAY",
        OR: [{ costCenterId: null }, ...(includeLocal && costCenterId ? [{ costCenterId }] : [])],
        groupCalendar: {
          groupId: { in: groupIds },
          active: true,
          year: params.year,
          ...buildGroupCalendarApplicabilityWhere({ orgId: params.orgId, costCenterId, includeLocal }),
        },
      },
      select: { name: true },
    });

    if (groupAddition) {
      return { isHoliday: true, name: groupAddition.name, source: "GROUP_ADDITION" };
    }
  }

  const orgEvent = await prisma.calendarEvent.findFirst({
    where: buildOrgCalendarHolidayWhere({
      orgId: params.orgId,
      year: params.year,
      dayStart: params.dayStart,
      dayEnd: params.dayEnd,
      costCenterId,
    }),
    select: { name: true },
  });

  if (orgEvent) {
    return { isHoliday: true, name: orgEvent.name, source: "ORG" };
  }

  return { isHoliday: false };
}

export async function listEffectiveCalendarEventsForEmployeeRange(params: {
  orgId: string;
  employeeCostCenterId: string | null;
  startDate: Date;
  endDate: Date;
}): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    date: Date;
    endDate: Date | null;
    eventType: string;
    isRecurring: boolean;
    calendarId: string;
    calendar: { id: string; name: string; color: string; calendarType: string };
    source: "GROUP" | "GROUP_ADDITION" | "ORG";
  }>
> {
  const groupIds = await getActiveGroupIdsForOrg(params.orgId);
  const result: Array<{
    id: string;
    name: string;
    description: string | null;
    date: Date;
    endDate: Date | null;
    eventType: string;
    isRecurring: boolean;
    calendarId: string;
    calendar: { id: string; name: string; color: string; calendarType: string };
    source: "GROUP" | "GROUP_ADDITION" | "ORG";
  }> = [];

  if (groupIds.length > 0) {
    const groupEvents = await prisma.groupCalendarEvent.findMany({
      where: {
        date: { gte: params.startDate, lte: params.endDate },
        exclusions: { none: { orgId: params.orgId } },
        calendar: {
          groupId: { in: groupIds },
          active: true,
          ...buildGroupCalendarApplicabilityWhere({
            orgId: params.orgId,
            costCenterId: params.employeeCostCenterId,
            includeLocal: true,
          }),
        },
      },
      include: {
        calendar: { select: { id: true, name: true, color: true, calendarType: true } },
      },
      orderBy: { date: "asc" },
    });

    result.push(
      ...groupEvents.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        date: e.date,
        endDate: e.endDate ?? null,
        eventType: e.eventType,
        isRecurring: e.isRecurring,
        calendarId: e.calendarId,
        calendar: {
          id: e.calendar.id,
          name: e.calendar.name,
          color: e.calendar.color,
          calendarType: e.calendar.calendarType,
        },
        source: "GROUP" as const,
      })),
    );

    const additions = await prisma.groupCalendarEventAddition.findMany({
      where: {
        orgId: params.orgId,
        date: { gte: params.startDate, lte: params.endDate },
        OR: [
          { costCenterId: null },
          ...(params.employeeCostCenterId ? [{ costCenterId: params.employeeCostCenterId }] : []),
        ],
        groupCalendar: {
          groupId: { in: groupIds },
          active: true,
          ...buildGroupCalendarApplicabilityWhere({
            orgId: params.orgId,
            costCenterId: params.employeeCostCenterId,
            includeLocal: true,
          }),
        },
      },
      include: {
        groupCalendar: { select: { id: true, name: true, color: true, calendarType: true } },
      },
      orderBy: { date: "asc" },
    });

    result.push(
      ...additions.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        date: e.date,
        endDate: e.endDate ?? null,
        eventType: e.eventType,
        isRecurring: e.isRecurring,
        calendarId: e.groupCalendarId,
        calendar: {
          id: e.groupCalendar.id,
          name: `${e.groupCalendar.name} (override)`,
          color: e.groupCalendar.color,
          calendarType: e.groupCalendar.calendarType,
        },
        source: "GROUP_ADDITION" as const,
      })),
    );
  }

  const orgEvents = await prisma.calendarEvent.findMany({
    where: {
      calendar: {
        orgId: params.orgId,
        active: true,
        OR: [
          { costCenterId: null },
          ...(params.employeeCostCenterId ? [{ costCenterId: params.employeeCostCenterId }] : []),
        ],
      },
      date: { gte: params.startDate, lte: params.endDate },
    },
    include: {
      calendar: { select: { id: true, name: true, color: true, calendarType: true } },
    },
    orderBy: { date: "asc" },
  });

  result.push(
    ...orgEvents.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      date: e.date,
      endDate: e.endDate ?? null,
      eventType: e.eventType,
      isRecurring: e.isRecurring,
      calendarId: e.calendarId,
      calendar: {
        id: e.calendar.id,
        name: e.calendar.name,
        color: e.calendar.color,
        calendarType: e.calendar.calendarType,
      },
      source: "ORG" as const,
    })),
  );

  // Dedup: mismo día + tipo + nombre, prioriza grupo sobre org.
  const priority: Record<string, number> = { GROUP: 3, GROUP_ADDITION: 2, ORG: 1 };
  const key = (e: { name: string; eventType: string; date: Date; endDate: Date | null }) => {
    const start = e.date.toISOString().slice(0, 10);
    const end = e.endDate ? e.endDate.toISOString().slice(0, 10) : "";
    return `${start}|${end}|${e.eventType}|${e.name}`.toLowerCase();
  };

  const best = new Map<string, (typeof result)[number]>();
  for (const e of result) {
    const k = key(e);
    const current = best.get(k);
    if (!current || priority[e.source] > priority[current.source]) {
      best.set(k, e);
    }
  }

  return Array.from(best.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

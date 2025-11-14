import { isSameDay } from "date-fns";

import type { CalendarEventData } from "@/server/actions/employee-calendars";

import type { CalendarEvent, EventColor } from "./components";

/**
 * Get CSS classes for event colors (chips estilo Factorial/Linear)
 * Colores más sólidos y visibles para Safari
 */
export function getEventColorClasses(color?: EventColor | string): string {
  const eventColor = color ?? "sky";

  switch (eventColor) {
    case "sky":
      return "bg-sky-100 hover:bg-sky-200 text-sky-900 dark:bg-sky-900/70 dark:hover:bg-sky-900/80 dark:text-sky-100";
    case "amber":
      return "bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/70 dark:hover:bg-amber-900/80 dark:text-amber-100";
    case "violet":
      return "bg-violet-100 hover:bg-violet-200 text-violet-900 dark:bg-violet-900/70 dark:hover:bg-violet-900/80 dark:text-violet-100";
    case "rose":
      return "bg-rose-100 hover:bg-rose-200 text-rose-900 dark:bg-rose-900/70 dark:hover:bg-rose-900/80 dark:text-rose-100";
    case "emerald":
      return "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-900/70 dark:hover:bg-emerald-900/80 dark:text-emerald-100";
    case "orange":
      return "bg-orange-100 hover:bg-orange-200 text-orange-900 dark:bg-orange-900/70 dark:hover:bg-orange-900/80 dark:text-orange-100";
    default:
      return "bg-sky-100 hover:bg-sky-200 text-sky-900 dark:bg-sky-900/70 dark:hover:bg-sky-900/80 dark:text-sky-100";
  }
}

/**
 * Get CSS classes for border radius based on event position in multi-day events
 */
export function getBorderRadiusClasses(isFirstDay: boolean, isLastDay: boolean): string {
  if (isFirstDay && isLastDay) {
    return "rounded"; // Both ends rounded
  } else if (isFirstDay) {
    return "rounded-l rounded-r-none"; // Only left end rounded
  } else if (isLastDay) {
    return "rounded-r rounded-l-none"; // Only right end rounded
  } else {
    return "rounded-none"; // No rounded corners
  }
}

/**
 * Check if an event is a multi-day event
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  return (event.allDay ?? false) || eventStart.getDate() !== eventEnd.getDate();
}

/**
 * Filter events for a specific day
 */
export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((event) => {
      const eventStart = new Date(event.start);
      return isSameDay(day, eventStart);
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Sort events with multi-day events first, then by start time
 */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aIsMultiDay = isMultiDayEvent(a);
    const bIsMultiDay = isMultiDayEvent(b);

    if (aIsMultiDay && !bIsMultiDay) return -1;
    if (!aIsMultiDay && bIsMultiDay) return 1;

    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}

/**
 * Get multi-day events that span across a specific day (but don't start on that day)
 */
export function getSpanningEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((event) => {
    if (!isMultiDayEvent(event)) return false;

    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Only include if it's not the start day but is either the end day or a middle day
    return !isSameDay(day, eventStart) && (isSameDay(day, eventEnd) || (day > eventStart && day < eventEnd));
  });
}

/**
 * Get all events visible on a specific day (starting, ending, or spanning)
 */
export function getAllEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return isSameDay(day, eventStart) || isSameDay(day, eventEnd) || (day > eventStart && day < eventEnd);
  });
}

/**
 * Get all events for a day (for agenda view)
 */
export function getAgendaEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return isSameDay(day, eventStart) || isSameDay(day, eventEnd) || (day > eventStart && day < eventEnd);
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Add hours to a date
 */
export function addHoursToDate(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Map event type to color
 */
export function mapEventTypeToColor(eventType: string): EventColor {
  switch (eventType) {
    case "HOLIDAY":
      return "rose";
    case "CLOSURE":
      return "amber";
    case "EVENT":
      return "sky";
    case "MEETING":
      return "violet";
    case "DEADLINE":
      return "orange";
    default:
      return "emerald";
  }
}

/**
 * Map CalendarEventData from server to CalendarEvent for the calendar component
 */
export function mapServerEventToCalendarEvent(serverEvent: CalendarEventData): CalendarEvent {
  const start = new Date(serverEvent.date);
  const end = serverEvent.endDate ? new Date(serverEvent.endDate) : new Date(serverEvent.date);

  // Considerarlo evento de todo el día si:
  // 1. No tiene endDate, O
  // 2. endDate es el mismo día que date (festivos, eventos de 1 día)
  const allDay = !serverEvent.endDate || serverEvent.date === serverEvent.endDate;

  return {
    id: serverEvent.id,
    title: serverEvent.name,
    description: serverEvent.description ?? undefined,
    start,
    end,
    allDay,
    color: mapEventTypeToColor(serverEvent.eventType),
  };
}

/**
 * Map array of server events to calendar events
 */
export function mapServerEventsToCalendarEvents(serverEvents: CalendarEventData[]): CalendarEvent[] {
  return serverEvents.map(mapServerEventToCalendarEvent);
}

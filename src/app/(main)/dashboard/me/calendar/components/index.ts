"use client";

// Component exports - Only export components that are used externally
export { EventCalendar } from "./event-calendar";
export { CalendarDndProvider, useCalendarDnd } from "./calendar-dnd-context";

// Type exports
export type { CalendarEvent, CalendarView, EventColor } from "../types";

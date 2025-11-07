"use client";

import { useState, useEffect, useCallback } from "react";

import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getMyCalendarEvents } from "@/server/actions/employee-calendars";

import { EventCalendar, type CalendarEvent } from "./";
import { mapServerEventsToCalendarEvents } from "../utils";

export default function EventCalendarApp() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Función para cargar eventos del mes actual (cargar 3 meses: anterior, actual y siguiente)
  const loadMonthEvents = useCallback(async (date: Date) => {
    try {
      setIsLoading(true);

      // Cargar eventos del mes anterior, actual y siguiente para mejor experiencia
      const prevMonth = subMonths(date, 1);
      const nextMonth = addMonths(date, 1);

      const startDate = startOfMonth(prevMonth);
      const endDate = endOfMonth(nextMonth);

      const serverEvents = await getMyCalendarEvents(startDate, endDate);
      const mappedEvents = mapServerEventsToCalendarEvents(serverEvents);

      setEvents(mappedEvents);
    } catch (error) {
      console.error("Error loading calendar events:", error);
      toast.error("Error al cargar eventos del calendario");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar eventos al montar el componente
  useEffect(() => {
    loadMonthEvents(currentMonth);
  }, [currentMonth, loadMonthEvents]);

  // Recargar eventos cuando el usuario cambie de mes
  const handleMonthChange = (newDate: Date) => {
    const newMonth = new Date(newDate.getFullYear(), newDate.getMonth());

    // Solo recargar si cambió el mes
    if (newMonth.getMonth() !== currentMonth.getMonth() || newMonth.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(newMonth);
      loadMonthEvents(newMonth);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height)-3rem)] items-center justify-center rounded-lg border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando calendario...</span>
        </div>
      </div>
    );
  }

  return (
    <EventCalendar
      events={events}
      readOnly={true}
      onMonthChange={handleMonthChange}
    />
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { getMyCalendarEvents } from "@/server/actions/employee-calendars";

import { mapServerEventsToCalendarEvents } from "../utils";

import { EventCalendar, type CalendarEvent } from "./";

export default function EventCalendarApp() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedRangeRef = useRef<{ start: Date; end: Date } | null>(null);

  // Función para cargar eventos con un rango más amplio (6 meses)
  const loadMonthEvents = useCallback(async (date: Date, showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      // Cargar 6 meses: 3 anteriores, actual y 2 siguientes
      const startMonth = subMonths(date, 3);
      const endMonth = addMonths(date, 2);

      const startDate = startOfMonth(startMonth);
      const endDate = endOfMonth(endMonth);

      const serverEvents = await getMyCalendarEvents(startDate, endDate);
      const mappedEvents = mapServerEventsToCalendarEvents(serverEvents);

      setEvents(mappedEvents);
      loadedRangeRef.current = { start: startDate, end: endDate };
    } catch (error) {
      console.error("Error loading calendar events:", error);
      toast.error("Error al cargar eventos del calendario");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar eventos al montar el componente
  useEffect(() => {
    loadMonthEvents(new Date());
  }, [loadMonthEvents]);

  // Verificar si necesitamos recargar cuando el usuario cambie de mes
  const handleMonthChange = (newDate: Date) => {
    const monthStart = startOfMonth(newDate);
    const monthEnd = endOfMonth(newDate);

    // Verificar si el mes está fuera del rango cargado
    const loadedRange = loadedRangeRef.current;
    const needsReload =
      !loadedRange ||
      !isWithinInterval(monthStart, { start: loadedRange.start, end: loadedRange.end }) ||
      !isWithinInterval(monthEnd, { start: loadedRange.start, end: loadedRange.end });

    if (needsReload) {
      // Solo recargar si el mes está fuera del rango, sin mostrar loader
      loadMonthEvents(newDate, false);
    }
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Mi Calendario"
          description="Visualiza y gestiona tus eventos, vacaciones y turnos en un solo lugar."
        />
        <div className="flex min-h-[calc(100vh-var(--header-height)-3rem)] items-center justify-center rounded-lg border">
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Cargando calendario...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mi Calendario"
        description="Visualiza y gestiona tus eventos, vacaciones y turnos en un solo lugar."
      />
      <EventCalendar events={events} readOnly={true} onMonthChange={handleMonthChange} />
    </div>
  );
}

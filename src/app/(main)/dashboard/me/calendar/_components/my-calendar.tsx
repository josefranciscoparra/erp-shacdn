"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMyCalendars, getMyMonthEvents, CalendarData, CalendarEventData } from "@/server/actions/employee-calendars";

import { CalendarEventsView } from "./calendar-events-view";

const eventTypeLabels: Record<string, string> = {
  HOLIDAY: "Festivo",
  CLOSURE: "Cierre",
  EVENT: "Evento",
  MEETING: "Reunión",
  DEADLINE: "Fecha límite",
  OTHER: "Otro",
};

type FilterType = "all" | "HOLIDAY" | "EVENT" | "CLOSURE";

export function MyCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendars, setCalendars] = useState<CalendarData[]>([]);
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayEventsDialogOpen, setDayEventsDialogOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadCalendars();
  }, []);

  useEffect(() => {
    loadMonthEvents();
  }, [currentDate]);

  const loadCalendars = async () => {
    try {
      setIsLoading(true);
      const data = await getMyCalendars();
      setCalendars(data);
    } catch (error) {
      console.error("Error loading calendars:", error);
      toast.error("Error al cargar calendarios");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMonthEvents = async () => {
    try {
      const data = await getMyMonthEvents(year, month + 1);
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Error al cargar eventos");
    }
  };

  const handleMonthChange = (newMonth: Date) => {
    setCurrentDate(newMonth);
  };

  // Filtrar eventos según el filtro seleccionado
  const filteredEvents = events.filter((event) => {
    if (filterType === "all") return true;
    return event.eventType === filterType;
  });

  const handleDayClick = (day: Date, dayEvents: CalendarEventData[]) => {
    setSelectedDay(day);
    setDayEventsDialogOpen(true);
  };

  const selectedDayEvents = selectedDay
    ? filteredEvents.filter((event) => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        const selectedDate = new Date(selectedDay);
        selectedDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === selectedDate.getTime();
      })
    : [];

  // Próximos eventos (ordenados por fecha)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = filteredEvents
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Mi Calendario" description="Eventos, festivos y cierres de la organización" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2 text-sm">Cargando calendario...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="animate-in fade-in duration-500">
        <SectionHeader title="Mi Calendario" description="Eventos, festivos y cierres de la organización" />
      </div>

      {/* Filtros */}
      <div className="animate-in fade-in flex items-center gap-2 duration-700" style={{ animationDelay: "100ms" }}>
        <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar eventos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los eventos</SelectItem>
            <SelectItem value="HOLIDAY">Solo festivos</SelectItem>
            <SelectItem value="EVENT">Solo eventos</SelectItem>
            <SelectItem value="CLOSURE">Solo cierres</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className="animate-in fade-in grid gap-4 duration-700 md:gap-6 @4xl/main:grid-cols-[auto_minmax(0,1fr)] @4xl/main:items-start"
        style={{ animationDelay: "200ms" }}
      >
        {/* Calendario principal */}
        <div className="w-fit">
          <CalendarEventsView
            events={filteredEvents}
            calendars={calendars}
            currentMonth={currentDate}
            onMonthChange={handleMonthChange}
            onDayClick={handleDayClick}
          />
        </div>

        {/* Sidebar: Próximos eventos con timeline vertical */}
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="text-lg">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="ps-8">
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="bg-muted flex size-16 items-center justify-center rounded-full border">
                  <Calendar className="text-muted-foreground h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-medium">No hay eventos próximos</p>
                  <p className="text-muted-foreground mt-1 text-xs">Los eventos futuros aparecerán aquí</p>
                </div>
              </div>
            ) : (
              <ol className="relative border-s">
                {upcomingEvents.map((event, idx) => (
                  <li key={event.id} className={`ms-6 ${idx !== upcomingEvents.length - 1 ? "mb-8" : ""} space-y-2`}>
                    {/* Círculo con color del calendario */}
                    <span
                      className="bg-background absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full border-2"
                      style={{ borderColor: event.calendar?.color ?? "var(--primary)" }}
                    >
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: event.calendar?.color ?? "var(--primary)" }}
                      />
                    </span>

                    <div className="space-y-1">
                      <h3 className="font-semibold">{event.name}</h3>
                      {event.description && <p className="text-muted-foreground text-sm">{event.description}</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <time className="text-muted-foreground flex items-center gap-1.5 text-sm leading-none">
                          <Clock className="size-3" />
                          {format(new Date(event.date), "PPP", { locale: es })}
                        </time>
                        <Badge variant="outline" className="text-xs">
                          {eventTypeLabels[event.eventType] ?? event.eventType}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">{event.calendar?.name ?? "Calendario"}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de eventos del día */}
      <Dialog open={dayEventsDialogOpen} onOpenChange={setDayEventsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDay && format(selectedDay, "PPP", { locale: es })}</DialogTitle>
            <DialogDescription>
              {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "evento" : "eventos"} este día
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {selectedDayEvents.map((event) => (
              <div
                key={event.id}
                className="hover:bg-accent flex items-start gap-3 rounded-lg border p-3 transition-colors"
              >
                <div
                  className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: event.calendar?.color ?? "var(--primary)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{event.name}</div>
                  {event.description && <p className="text-muted-foreground mt-1 text-sm">{event.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {eventTypeLabels[event.eventType] ?? event.eventType}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{event.calendar?.name ?? "Calendario"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

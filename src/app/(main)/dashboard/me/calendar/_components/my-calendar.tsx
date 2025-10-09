"use client";

import { useState, useEffect } from "react";

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMyCalendars, getMyMonthEvents, CalendarData, CalendarEventData } from "@/server/actions/employee-calendars";

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filtrar eventos según el filtro seleccionado
  const filteredEvents = events.filter((event) => {
    if (filterType === "all") return true;
    return event.eventType === filterType;
  });

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => isSameDay(new Date(event.date), date));
  };

  const handleDayClick = (day: Date, dayEvents: CalendarEventData[]) => {
    if (dayEvents.length > 0) {
      setSelectedDay(day);
      setDayEventsDialogOpen(true);
    }
  };

  const selectedDayEvents = selectedDay ? getEventsForDate(selectedDay) : [];

  // Calcular días del calendario (con días del mes anterior/siguiente para completar semanas)
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }); // Lunes
  const endDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });

  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  // Próximos eventos (ordenados por fecha)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = filteredEvents
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  // Agrupar próximos eventos por calendario
  const upcomingByCalendar = upcomingEvents.reduce(
    (acc, event) => {
      const calendarName = event.calendar.name;
      if (!acc[calendarName]) {
        acc[calendarName] = {
          calendar: event.calendar,
          events: [],
        };
      }
      acc[calendarName].events.push(event);
      return acc;
    },
    {} as Record<string, { calendar: CalendarEventData["calendar"]; events: CalendarEventData[] }>,
  );

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Mi Calendario" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando calendario...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Mi Calendario" />

      {/* Filtros */}
      <div className="flex items-center gap-2">
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

      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-3">
        {/* Calendario principal */}
        <Card className="@container/card flex flex-col gap-4 p-6 @xl/main:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {monthNames[month]} {year}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((day) => (
              <div key={day} className="text-muted-foreground text-center text-sm font-semibold">
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day, dayEvents)}
                  className={`relative flex min-h-24 flex-col gap-2 rounded-lg border p-2 transition-colors ${
                    isToday ? "border-primary bg-primary/5" : ""
                  } ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""} ${
                    dayEvents.length > 0 ? "hover:bg-accent cursor-pointer" : ""
                  }`}
                >
                  <div
                    className={`text-sm font-semibold ${
                      isToday ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </div>

                  {/* Puntos de eventos */}
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dayEvents.slice(0, 6).map((event) => (
                        <div
                          key={event.id}
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: event.calendar.color }}
                          title={`${event.name} (${event.calendar.name})`}
                        />
                      ))}
                      {dayEvents.length > 6 && (
                        <span className="text-muted-foreground text-xs">+{dayEvents.length - 6}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Próximos eventos */}
        <Card className="@container/card flex flex-col gap-4 p-6">
          <h3 className="text-lg font-semibold">Próximos eventos</h3>

          <div className="flex flex-col gap-4">
            {Object.keys(upcomingByCalendar).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Calendar className="text-muted-foreground h-12 w-12" />
                <p className="text-muted-foreground text-sm">No tienes eventos próximos</p>
              </div>
            ) : (
              Object.values(upcomingByCalendar).map(({ calendar, events: calendarEvents }) => (
                <div key={calendar.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                    <span className="text-sm font-medium">{calendar.name}</span>
                  </div>
                  {calendarEvents.map((event) => (
                    <div key={event.id} className="ml-5 flex items-start gap-3 rounded-lg border p-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{event.name}</span>
                        {event.description && (
                          <span className="text-muted-foreground text-xs">{event.description}</span>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(event.date), "PPP", { locale: es })}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {eventTypeLabels[event.eventType] || event.eventType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Leyenda - Calendarios visibles */}
      {calendars.length > 0 && (
        <Card className="@container/card flex flex-col gap-4 p-6">
          <h3 className="text-lg font-semibold">Calendarios visibles</h3>
          <div className="flex flex-wrap gap-3">
            {calendars.map((cal) => (
              <Badge key={cal.id} variant="outline" className="flex items-center gap-2 py-1.5">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cal.color }} />
                <span>{cal.name}</span>
                {cal.costCenter && <span className="text-muted-foreground text-xs">({cal.costCenter.name})</span>}
              </Badge>
            ))}
          </div>
          {calendars.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No tienes calendarios asignados. Contacta con RRHH si crees que esto es un error.
            </p>
          )}
        </Card>
      )}

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
              <div key={event.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div
                  className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: event.calendar.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{event.name}</div>
                  {event.description && <p className="text-muted-foreground mt-1 text-sm">{event.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {eventTypeLabels[event.eventType] || event.eventType}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{event.calendar.name}</span>
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

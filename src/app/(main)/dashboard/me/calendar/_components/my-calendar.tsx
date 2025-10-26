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
import { cn } from "@/lib/utils";
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
        {/* Columna principal del calendario */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold">{format(currentDate, "MMMM yyyy", { locale: es })}</h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Hoy
              </Button>
            </CardHeader>
            <CardContent className="p-2">
              <div className="text-muted-foreground grid grid-cols-7 text-center text-sm font-medium">
                {dayNames.map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, currentDate);

                  return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(day, dayEvents)}
                      className={cn(
                        "relative h-24 rounded-lg border p-2 transition-colors",
                        isCurrentMonth ? "bg-transparent" : "bg-gray-50 dark:bg-gray-900",
                        dayEvents.length > 0 && "hover:bg-accent cursor-pointer",
                        isToday && "border-blue-500 bg-blue-50 dark:bg-blue-900/30",
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isToday
                            ? "text-blue-600 dark:text-blue-300"
                            : isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className="flex items-center gap-1.5 truncate rounded-md p-1 text-xs"
                              style={{ backgroundColor: `${event.calendar.color}20` }}
                            >
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: event.calendar.color }} />
                              <span className="truncate font-medium" style={{ color: event.calendar.color }}>
                                {event.name}
                              </span>
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-muted-foreground text-xs">+ {dayEvents.length - 2} más</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra lateral de eventos e información */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Próximos eventos</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(upcomingByCalendar).length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  <Calendar className="mx-auto h-10 w-10" />
                  <p className="mt-4">No hay eventos próximos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.values(upcomingByCalendar).map(({ calendar, events: calendarEvents }) => (
                    <div key={calendar.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: calendar.color }} />
                        <h4 className="text-sm font-semibold">{calendar.name}</h4>
                      </div>
                      <div className="mt-2 space-y-2 border-l-2 pl-4" style={{ borderColor: calendar.color }}>
                        {calendarEvents.map((event) => (
                          <div key={event.id} className="text-sm">
                            <p className="font-medium">{event.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {format(new Date(event.date), "PPP", { locale: es })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mis Calendarios</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {calendars.map((cal) => (
                <Badge key={cal.id} variant="outline" className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cal.color }} />
                  {cal.name}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
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

      <Dialog open={dayEventsDialogOpen} onOpenChange={setDayEventsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDay && format(selectedDay, "EEEE, d 'de' MMMM", { locale: es })}</DialogTitle>
          </DialogHeader>
          <div className="-mx-6 mt-4 space-y-4 border-t px-6 pt-4">
            {selectedDayEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-4">
                <div
                  className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: event.calendar.color }}
                />
                <div className="flex-1">
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-muted-foreground text-sm">{event.calendar.name}</p>
                  {event.description && <p className="mt-1 text-sm">{event.description}</p>}
                </div>
                <Badge variant="outline">{eventTypeLabels[event.eventType] || event.eventType}</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

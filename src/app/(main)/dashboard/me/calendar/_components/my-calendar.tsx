"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/hr/section-header";

interface CalendarEvent {
  date: string;
  type: "vacation" | "holiday" | "sick" | "personal";
  title: string;
}

const mockEvents: CalendarEvent[] = [
  { date: "2025-02-10", type: "vacation", title: "Vacaciones" },
  { date: "2025-02-11", type: "vacation", title: "Vacaciones" },
  { date: "2025-02-12", type: "vacation", title: "Vacaciones" },
  { date: "2025-02-13", type: "vacation", title: "Vacaciones" },
  { date: "2025-02-14", type: "vacation", title: "Vacaciones" },
  { date: "2025-01-06", type: "holiday", title: "Día de Reyes" },
  { date: "2025-01-28", type: "personal", title: "Asuntos personales" },
];

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

export function MyCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return mockEvents.find((e) => e.date === dateStr);
  };

  const getEventColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "vacation":
        return "bg-blue-500";
      case "holiday":
        return "bg-green-500";
      case "sick":
        return "bg-red-500";
      case "personal":
        return "bg-yellow-500";
    }
  };

  const days = [];
  for (let i = 0; i < adjustedStartDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const event = getEventForDate(day);
    const isToday =
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    days.push(
      <div
        key={day}
        className={`relative flex h-24 flex-col gap-1 rounded-lg border p-2 ${
          isToday ? "border-primary bg-primary/5" : ""
        } ${event ? getEventColor(event.type) + " bg-opacity-10" : ""}`}
      >
        <div
          className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}
        >
          {day}
        </div>
        {event && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {event.title}
          </div>
        )}
      </div>
    );
  }

  const upcomingEvents = mockEvents
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Mi Calendario" />

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
              <div
                key={day}
                className="text-center text-sm font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-2">{days}</div>
        </Card>

        {/* Eventos próximos */}
        <Card className="@container/card flex flex-col gap-4 p-6">
          <h3 className="text-lg font-semibold">Próximos eventos</h3>

          <div className="flex flex-col gap-3">
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No tienes eventos próximos
                </p>
              </div>
            ) : (
              upcomingEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div
                    className={`h-3 w-3 rounded-full ${getEventColor(event.type)}`}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Leyenda */}
      <Card className="@container/card flex flex-col gap-4 p-6">
        <h3 className="text-lg font-semibold">Leyenda</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-blue-500" />
            <span className="text-sm">Vacaciones</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-500" />
            <span className="text-sm">Festivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-500" />
            <span className="text-sm">Baja médica</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-yellow-500" />
            <span className="text-sm">Asuntos personales</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { DayButton, type DayMouseEventHandler } from "react-day-picker";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type CalendarEventData, type CalendarData } from "@/server/actions/employee-calendars";

interface CalendarEventsViewProps {
  events: CalendarEventData[];
  calendars: CalendarData[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayClick?: (date: Date, events: CalendarEventData[]) => void;
}

export function CalendarEventsView({
  events,
  calendars,
  currentMonth,
  onMonthChange,
  onDayClick,
}: CalendarEventsViewProps) {
  const [month, setMonth] = useState<Date>(currentMonth);

  useEffect(() => {
    setMonth(currentMonth);
  }, [currentMonth]);

  const handleMonthChange = (newMonth: Date) => {
    setMonth(newMonth);
    onMonthChange(newMonth);
  };

  const getEventsForDate = useCallback(
    (date: Date): CalendarEventData[] => {
      return events.filter((event) => isSameDay(new Date(event.date), date));
    },
    [events],
  );

  const handleDayClick: DayMouseEventHandler = (day) => {
    const dayEvents = getEventsForDate(day);
    if (dayEvents.length > 0 && onDayClick) {
      onDayClick(day, dayEvents);
    }
  };

  // Componente personalizado para DayButton con tooltip
  const CustomDayButton = useCallback(
    (props: React.ComponentProps<typeof DayButton>) => {
      const dayEvents = getEventsForDate(props.day.date);

      // Si no hay eventos, renderizar botón normal sin tooltip
      if (dayEvents.length === 0) {
        return <CalendarDayButton {...props} />;
      }

      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <CalendarDayButton {...props} />
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-card text-card-foreground w-80 border-2 shadow-lg">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-card-foreground text-sm font-semibold">
                    {format(props.day.date, "d 'de' MMMM", { locale: es })}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}
                  </span>
                </div>

                {/* Eventos del día */}
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <div key={event.id} className="space-y-1 rounded-lg border p-2">
                      <div className="flex items-start gap-2">
                        <div
                          className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: event.calendar?.color ?? "var(--primary)" }}
                        />
                        <div className="flex-1">
                          <p className="text-card-foreground text-sm leading-tight font-semibold">{event.name}</p>
                          {event.description && (
                            <p className="text-muted-foreground mt-1 text-xs leading-tight">{event.description}</p>
                          )}
                          <p className="text-muted-foreground mt-1 text-xs">{event.calendar?.name ?? "Calendario"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    [events],
  );

  CustomDayButton.displayName = "CustomDayButton";

  // Preparar modifiers por tipo de evento
  const holidayDays = events.filter((e) => e.eventType === "HOLIDAY").map((e) => new Date(e.date));

  const closureDays = events.filter((e) => e.eventType === "CLOSURE").map((e) => new Date(e.date));

  const eventDays = events.filter((e) => e.eventType === "EVENT").map((e) => new Date(e.date));

  const meetingDays = events.filter((e) => e.eventType === "MEETING").map((e) => new Date(e.date));

  const otherDays = events
    .filter((e) => !["HOLIDAY", "CLOSURE", "EVENT", "MEETING"].includes(e.eventType))
    .map((e) => new Date(e.date));

  const clickableDays = events.map((e) => new Date(e.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card className="p-0">
      <CardContent className="p-0">
        <Calendar
          mode="single"
          selected={undefined}
          month={month}
          onMonthChange={handleMonthChange}
          today={today}
          defaultMonth={month}
          locale={es}
          className="w-full!"
          monthsClassName="w-full"
          monthClassName="space-y-4 w-full flex flex-col"
          weekdayClassName="w-full!"
          weekClassName="w-full!"
          monthGridClassName="m-0"
          dayClassName="md:size-10"
          dayButtonClassName="md:size-12"
          onDayClick={handleDayClick}
          components={{
            DayButton: CustomDayButton,
          }}
          modifiers={{
            holiday: holidayDays,
            closure: closureDays,
            event: eventDays,
            meeting: meetingDays,
            other: otherDays,
            clickable: clickableDays,
          }}
          modifiersClassNames={{
            holiday: "bg-red-100 text-red-700 font-semibold dark:bg-red-950 dark:text-red-300 rounded-md",
            closure: "bg-gray-100 text-gray-700 font-semibold dark:bg-gray-800 dark:text-gray-300 rounded-md",
            event: "bg-blue-100 text-blue-700 font-semibold dark:bg-blue-950 dark:text-blue-300 rounded-md",
            meeting: "bg-purple-100 text-purple-700 font-semibold dark:bg-purple-950 dark:text-purple-300 rounded-md",
            other: "bg-orange-100 text-orange-700 font-semibold dark:bg-orange-950 dark:text-orange-300 rounded-md",
            today:
              "!bg-amber-100 !text-amber-700 !font-bold ring-2 ring-amber-400 dark:!bg-amber-950 dark:!text-amber-300 dark:ring-amber-600 rounded-md",
            clickable: "cursor-pointer hover:ring-2 hover:ring-primary/50 rounded-md",
          }}
        />
      </CardContent>
      <div className="flex flex-col divide-y border-t px-0">
        {calendars.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-3 p-4 text-xs">
              {calendars.map((cal) => (
                <div key={cal.id} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cal.color ?? "var(--primary)" }} />
                  <span>
                    {cal.name}
                    {cal.costCenter && <span className="text-muted-foreground ml-1">({cal.costCenter.name})</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

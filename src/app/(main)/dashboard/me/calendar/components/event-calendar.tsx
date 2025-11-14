"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import {
  addHoursToDate,
  AgendaDaysToShow,
  AgendaView,
  CalendarDndProvider,
  CalendarEvent,
  CalendarView,
  DayView,
  EventDialog,
  EventViewDialog,
  EventGap,
  EventHeight,
  MonthView,
  WeekCellsHeight,
  WeekView,
} from "./";

export interface EventCalendarProps {
  events?: CalendarEvent[];
  onEventAdd?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
  onMonthChange?: (date: Date) => void;
  className?: string;
  initialView?: CalendarView;
  readOnly?: boolean;
}

// Helper para capitalizar la primera letra de cada palabra
const capitalizeWords = (str: string): string => {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function EventCalendar({
  events = [],
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  onMonthChange,
  className,
  initialView = "month",
  readOnly = false,
}: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(initialView);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Traducción de vistas al español
  const viewLabels: Record<CalendarView, string> = {
    month: "Mes",
    week: "Semana",
    day: "Día",
    agenda: "Agenda",
  };

  // Add keyboard shortcuts for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea or contentEditable element
      // or if the event dialog is open
      if (
        isEventDialogOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "m":
          setView("month");
          break;
        case "w":
          setView("week");
          break;
        case "d":
          setView("day");
          break;
        case "a":
          setView("agenda");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEventDialogOpen]);

  const handlePrevious = () => {
    let newDate: Date;
    if (view === "month") {
      newDate = subMonths(currentDate, 1);
    } else if (view === "week") {
      newDate = subWeeks(currentDate, 1);
    } else if (view === "day") {
      newDate = addDays(currentDate, -1);
    } else if (view === "agenda") {
      // For agenda view, go back 30 days (a full month)
      newDate = addDays(currentDate, -AgendaDaysToShow);
    } else {
      newDate = currentDate;
    }
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  const handleNext = () => {
    let newDate: Date;
    if (view === "month") {
      newDate = addMonths(currentDate, 1);
    } else if (view === "week") {
      newDate = addWeeks(currentDate, 1);
    } else if (view === "day") {
      newDate = addDays(currentDate, 1);
    } else if (view === "agenda") {
      // For agenda view, go forward 30 days (a full month)
      newDate = addDays(currentDate, AgendaDaysToShow);
    } else {
      newDate = currentDate;
    }
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventSelect = (event: CalendarEvent) => {
    console.log("Event selected:", event); // Debug log
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleEventCreate = (startTime: Date) => {
    // No permitir creación de eventos en modo readOnly
    if (readOnly) return;

    console.log("Creating new event at:", startTime); // Debug log

    // Snap to 15-minute intervals
    const minutes = startTime.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
      if (remainder < 7.5) {
        // Round down to nearest 15 min
        startTime.setMinutes(minutes - remainder);
      } else {
        // Round up to nearest 15 min
        startTime.setMinutes(minutes + (15 - remainder));
      }
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);
    }

    const newEvent: CalendarEvent = {
      id: "",
      title: "",
      start: startTime,
      end: addHoursToDate(startTime, 1),
      allDay: false,
    };
    setSelectedEvent(newEvent);
    setIsEventDialogOpen(true);
  };

  const handleEventSave = (event: CalendarEvent) => {
    if (event.id) {
      onEventUpdate?.(event);
      // Show toast notification when an event is updated
      toast(`Evento "${event.title}" actualizado`, {
        description: format(new Date(event.start), "d 'de' MMM 'de' yyyy", { locale: es }),
        position: "bottom-left",
      });
    } else {
      onEventAdd?.({
        ...event,
        id: Math.random().toString(36).substring(2, 11),
      });
      // Show toast notification when an event is added
      toast(`Evento "${event.title}" agregado`, {
        description: format(new Date(event.start), "d 'de' MMM 'de' yyyy", { locale: es }),
        position: "bottom-left",
      });
    }
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleEventDelete = (eventId: string) => {
    const deletedEvent = events.find((e) => e.id === eventId);
    onEventDelete?.(eventId);
    setIsEventDialogOpen(false);
    setSelectedEvent(null);

    // Show toast notification when an event is deleted
    if (deletedEvent) {
      toast(`Evento "${deletedEvent.title}" eliminado`, {
        description: format(new Date(deletedEvent.start), "d 'de' MMM 'de' yyyy", { locale: es }),
        position: "bottom-left",
      });
    }
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    // No permitir actualización de eventos en modo readOnly
    if (readOnly) return;

    onEventUpdate?.(updatedEvent);

    // Show toast notification when an event is updated via drag and drop
    toast(`Evento "${updatedEvent.title}" movido`, {
      description: format(new Date(updatedEvent.start), "d 'de' MMM 'de' yyyy", { locale: es }),
      position: "bottom-left",
    });
  };

  const viewTitle = useMemo(() => {
    if (view === "month") {
      return capitalizeWords(format(currentDate, "MMMM yyyy", { locale: es }));
    } else if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (isSameMonth(start, end)) {
        return capitalizeWords(format(start, "MMMM yyyy", { locale: es }));
      } else {
        return capitalizeWords(`${format(start, "MMM", { locale: es })} - ${format(end, "MMM yyyy", { locale: es })}`);
      }
    } else if (view === "day") {
      return (
        <>
          <span className="min-[480px]:hidden" aria-hidden="true">
            {capitalizeWords(format(currentDate, "d 'de' MMM 'de' yyyy", { locale: es }))}
          </span>
          <span className="max-[479px]:hidden min-md:hidden" aria-hidden="true">
            {capitalizeWords(format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: es }))}
          </span>
          <span className="max-md:hidden">
            {capitalizeWords(format(currentDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }))}
          </span>
        </>
      );
    } else if (view === "agenda") {
      // Show the month range for agenda view
      const start = currentDate;
      const end = addDays(currentDate, AgendaDaysToShow - 1);

      if (isSameMonth(start, end)) {
        return capitalizeWords(format(start, "MMMM yyyy", { locale: es }));
      } else {
        return capitalizeWords(`${format(start, "MMM", { locale: es })} - ${format(end, "MMM yyyy", { locale: es })}`);
      }
    } else {
      return capitalizeWords(format(currentDate, "MMMM yyyy", { locale: es }));
    }
  }, [currentDate, view]);

  return (
    <div
      className="flex min-h-[calc(100vh-var(--header-height)-3rem)] flex-col rounded-lg border has-data-[slot=month-view]:flex-1"
      style={
        {
          "--event-height": `${EventHeight}px`,
          "--event-gap": `${EventGap}px`,
          "--week-cells-height": `${WeekCellsHeight}px`,
        } as React.CSSProperties
      }
    >
      <CalendarDndProvider onEventUpdate={handleEventUpdate}>
        <div className={cn("flex items-center justify-between p-2 sm:p-4", className)}>
          <div className="flex items-center gap-3">
            {/* Botón Hoy más prominente */}
            <Button variant="outline" size="sm" onClick={handleToday}>
              <CalendarCheck className="mr-2 h-4 w-4 max-[479px]:mr-0" aria-hidden="true" />
              <span className="max-[479px]:sr-only">Hoy</span>
            </Button>

            {/* Navegación mes centrada con flechas redondeadas - estilo Factorial/Linear */}
            <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2 py-1.5 sm:px-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-accent"
                onClick={handlePrevious}
                aria-label="Mes anterior"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
              <h2 className="min-w-[140px] text-center text-sm font-semibold sm:min-w-[180px] sm:text-base">
                {viewTitle}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-accent"
                onClick={handleNext}
                aria-label="Mes siguiente"
              >
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5 max-[479px]:h-8">
                  <span>
                    <span className="min-[480px]:hidden" aria-hidden="true">
                      {viewLabels[view].charAt(0)}
                    </span>
                    <span className="max-[479px]:sr-only">{viewLabels[view]}</span>
                  </span>
                  <ChevronDownIcon className="-me-1 opacity-60" size={16} aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-32">
                <DropdownMenuItem onClick={() => setView("month")}>
                  Mes <DropdownMenuShortcut>M</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("week")}>
                  Semana <DropdownMenuShortcut>W</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("day")}>
                  Día <DropdownMenuShortcut>D</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("agenda")}>
                  Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!readOnly && (
              <Button
                className="max-[479px]:aspect-square max-[479px]:p-0!"
                size="sm"
                onClick={() => {
                  setSelectedEvent(null); // Ensure we're creating a new event
                  setIsEventDialogOpen(true);
                }}
              >
                <PlusIcon className="opacity-60 sm:-ms-1" size={16} aria-hidden="true" />
                <span className="max-sm:sr-only">Nuevo evento</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              onEventCreate={handleEventCreate}
            />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              onEventCreate={handleEventCreate}
            />
          )}
          {view === "day" && (
            <DayView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              onEventCreate={handleEventCreate}
            />
          )}
          {view === "agenda" && (
            <AgendaView currentDate={currentDate} events={events} onEventSelect={handleEventSelect} />
          )}
        </div>

        {readOnly ? (
          <EventViewDialog
            event={selectedEvent}
            isOpen={isEventDialogOpen}
            onClose={() => {
              setIsEventDialogOpen(false);
              setSelectedEvent(null);
            }}
          />
        ) : (
          <EventDialog
            event={selectedEvent}
            isOpen={isEventDialogOpen}
            onClose={() => {
              setIsEventDialogOpen(false);
              setSelectedEvent(null);
            }}
            onSave={handleEventSave}
            onDelete={handleEventDelete}
          />
        )}
      </CalendarDndProvider>
    </div>
  );
}

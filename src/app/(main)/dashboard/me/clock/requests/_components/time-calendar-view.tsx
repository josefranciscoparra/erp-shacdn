"use client";

import { useEffect, useState } from "react";

import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type DayCalendarData } from "@/server/actions/time-calendar";
import { useTimeCalendarStore } from "@/stores/time-calendar-store";

import { ManualTimeEntryDialog } from "../../_components/manual-time-entry-dialog";

export function TimeCalendarView() {
  const { monthlyData, selectedMonth, selectedYear, isLoading, loadMonthlyData } = useTimeCalendarStore();

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadMonthlyData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadMonthlyData]);

  const handlePreviousMonth = () => {
    const prevDate = subMonths(new Date(selectedYear, selectedMonth - 1), 1);
    loadMonthlyData(prevDate.getFullYear(), prevDate.getMonth() + 1);
  };

  const handleNextMonth = () => {
    const nextDate = addMonths(new Date(selectedYear, selectedMonth - 1), 1);
    loadMonthlyData(nextDate.getFullYear(), nextDate.getMonth() + 1);
  };

  const handleDayClick = (day: DayCalendarData) => {
    // Solo permitir crear solicitud si:
    // 1. Es día laboral
    // 2. Está ausente o incompleto
    // 3. No es futuro
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);

    if (day.isWorkday && (day.status === "ABSENT" || day.status === "INCOMPLETE") && dayDate < today) {
      setSelectedDate(day.date);
      setManualDialogOpen(true);
    }
  };

  if (isLoading || !monthlyData) {
    return (
      <Card className="mx-auto flex h-[340px] w-full max-w-[780px] items-center justify-center">
        <div className="text-muted-foreground text-sm">Cargando calendario...</div>
      </Card>
    );
  }

  // Organizar días en semanas
  const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0);

  // Obtener día de la semana del primer día (0=Domingo, 1=Lunes, etc.)
  let firstDayWeekday = firstDayOfMonth.getDay();
  // Ajustar para que Lunes sea 0
  firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

  // Crear array de días con padding
  const daysWithPadding: (DayCalendarData | null)[] = [...Array(firstDayWeekday).fill(null), ...monthlyData.days];

  // Dividir en semanas
  const weeks: (DayCalendarData | null)[][] = [];
  for (let i = 0; i < daysWithPadding.length; i += 7) {
    weeks.push(daysWithPadding.slice(i, i + 7));
  }

  return (
    <>
      <Card className="p-4 sm:p-6">
        {/* Header con navegación */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: es })}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendario */}
        <div className="text-muted-foreground grid grid-cols-7 text-center text-xs">
          {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day, index) => (
            <DayCell key={index} day={day} onClick={day ? () => handleDayClick(day) : undefined} />
          ))}
        </div>

        {/* Leyenda */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t pt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Completo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span>Incompleto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Ausente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <span>Pendiente</span>
          </div>
        </div>
      </Card>

      <ManualTimeEntryDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        initialDate={selectedDate ?? undefined}
      />
    </>
  );
}

interface DayCellProps {
  day: DayCalendarData | null;
  onClick?: () => void;
}

function DayCell({ day, onClick }: DayCellProps) {
  if (!day) {
    return <div className="h-[56px] w-full sm:h-[64px]" />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayDate = new Date(day.date);
  dayDate.setHours(0, 0, 0, 0);
  const isToday = dayDate.getTime() === today.getTime();
  const isFuture = dayDate > today;

  const getStatusStyles = () => {
    if (day.hasPendingRequest) {
      return "bg-orange-100/50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    }
    if (isFuture) {
      return day.isWorkday
        ? "bg-gray-50 text-gray-400 dark:bg-gray-800/30 dark:text-gray-600"
        : "bg-transparent text-gray-400 dark:text-gray-600";
    }
    switch (day.status) {
      case "COMPLETED":
        return "bg-green-100/50 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "INCOMPLETE":
        return "bg-amber-100/50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "ABSENT":
        return "bg-red-100/50 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "NON_WORKDAY":
        return "bg-gray-50 text-gray-400 dark:bg-gray-800/30 dark:text-gray-600";
      default:
        return "bg-gray-50 dark:bg-gray-800/30";
    }
  };

  const isClickable =
    day.isWorkday && (day.status === "ABSENT" || day.status === "INCOMPLETE") && !isFuture && !day.hasPendingRequest;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={isClickable ? onClick : undefined}
            disabled={!onClick}
            className={cn(
              "group relative flex h-[56px] w-full flex-col items-start justify-start rounded-lg p-2 text-left transition-all sm:h-[64px]",
              getStatusStyles(),
              isClickable && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50",
              isToday && "ring-offset-background font-bold ring-2 ring-blue-500 ring-offset-1",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-medium">{format(day.date, "d")}</span>
              {day.isHoliday && <span className="text-xs">🎉</span>}
            </div>
            {day.isWorkday && !isFuture && (
              <div className="mt-auto text-xs font-semibold">
                {day.workedHours > 0 ? `${day.workedHours.toFixed(1)}h` : "-"}
              </div>
            )}
            {day.hasPendingRequest && <div className="absolute right-2 bottom-2 h-2 w-2 rounded-full bg-orange-500" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{format(day.date, "EEEE, d 'de' MMMM", { locale: es })}</p>
          <div className="text-muted-foreground mt-2 space-y-1 text-xs">
            {day.isHoliday && <p className="text-primary font-medium">{day.holidayName}</p>}
            {day.isWorkday ? (
              <>
                <p>Horas esperadas: {day.expectedHours.toFixed(1)}h</p>
                <p>Horas trabajadas: {day.workedHours.toFixed(1)}h</p>
              </>
            ) : (
              <p>Día no laboral</p>
            )}
            {day.hasPendingRequest && <p className="font-medium text-orange-500">Solicitud pendiente</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

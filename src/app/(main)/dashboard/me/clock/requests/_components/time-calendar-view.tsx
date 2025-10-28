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
      <Card className="flex h-[340px] w-full items-center justify-center">
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
      <Card className="w-full p-4 sm:p-5">
        {/* Header con navegación */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold sm:text-lg">
              {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: es })}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendario */}
        <div className="flex flex-col gap-1">
          {/* Headers de días de la semana */}
          <div className="grid grid-cols-7 gap-1">
            {["L", "M", "X", "J", "V", "S", "D"].map((day, idx) => (
              <div
                key={day}
                className="text-muted-foreground flex h-5 items-center justify-center text-[10px] font-medium sm:h-6"
                title={["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][idx]}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => (
                <DayCell key={dayIndex} day={day} onClick={day ? () => handleDayClick(day) : undefined} />
              ))}
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex flex-wrap gap-3 border-t pt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-green-500" />
            <span>Completo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-amber-500" />
            <span>Incompleto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-red-500" />
            <span>Ausente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-orange-500" />
            <span>Solicitud pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-blue-100 dark:bg-blue-900" />
            <span>Futuro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-muted h-3 w-3 rounded-sm" />
            <span>No laboral</span>
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
    return <div className="h-[48px] w-full sm:h-[56px]" />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayDate = new Date(day.date);
  dayDate.setHours(0, 0, 0, 0);
  const isToday = dayDate.getTime() === today.getTime();
  const isFuture = dayDate > today;

  const getStatusColor = () => {
    if (isToday) {
      return "border border-orange-200 bg-orange-100 text-orange-900 dark:border-orange-500/60 dark:bg-orange-500/25 dark:text-orange-100";
    }

    // Días con solicitud pendiente
    if (day.hasPendingRequest) {
      return "bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700";
    }

    // Días futuros
    if (isFuture) {
      if (day.isWorkday) {
        return "bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
      }
      return "bg-muted/50 text-muted-foreground";
    }

    // Días pasados y hoy
    switch (day.status) {
      case "COMPLETED":
        return "bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700";
      case "INCOMPLETE":
        return "bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700";
      case "ABSENT":
        return "bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700";
      case "NON_WORKDAY":
        return "bg-muted text-muted-foreground";
    }
  };

  const isClickable =
    day.isWorkday &&
    (day.status === "ABSENT" || day.status === "INCOMPLETE") &&
    !isFuture &&
    !isToday &&
    !day.hasPendingRequest; // No permitir click si ya hay solicitud pendiente

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={isClickable ? onClick : undefined}
            disabled={!isClickable}
            className={cn(
              "group relative flex h-[48px] w-full flex-col items-center justify-center rounded-md border border-transparent p-1 text-center transition-all disabled:cursor-not-allowed sm:h-[56px] sm:p-1.5",
              getStatusColor(),
              isClickable && "cursor-pointer",
              isToday && "ring-2 ring-orange-400 ring-offset-1 dark:ring-orange-500",
            )}
          >
            {/* Número del día */}
            <span className={cn("leading-tight font-semibold", "text-[10px] sm:text-[11px]")}>
              {format(day.date, "d")}
            </span>

            {/* Horas trabajadas (solo si es día laboral y no es futuro) */}
            {day.isWorkday && !isFuture && (
              <span className="mt-0.5 text-[8px] leading-none opacity-80 sm:text-[9px]">
                {day.workedHours > 0 ? `${day.workedHours.toFixed(1)}h` : "-"}
              </span>
            )}

            {/* Horas esperadas para días futuros */}
            {day.isWorkday && isFuture && (
              <span className="mt-0.5 text-[8px] leading-none opacity-60 sm:text-[9px]">
                {day.expectedHours.toFixed(1)}h
              </span>
            )}

            {/* Icono de añadir (solo en días clickeables) */}
            {isClickable && (
              <Plus className="absolute top-0.5 right-0.5 h-2 w-2 opacity-0 transition-opacity group-hover:opacity-100 sm:h-2.5 sm:w-2.5" />
            )}

            {/* Badge de festivo */}
            {day.isHoliday && <span className="absolute top-0.5 left-0.5 text-[9px]">🎉</span>}

            {/* Indicador de hoy */}
            {isToday && (
              <span className="bg-primary absolute bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full"></span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">
              {format(day.date, "dd 'de' MMMM", { locale: es })}
              {isToday && " (Hoy)"}
            </p>
            {day.isHoliday && <p className="text-xs">{day.holidayName}</p>}
            {day.isWorkday ? (
              <>
                {isFuture ? (
                  <>
                    <p className="text-xs">Esperadas: {day.expectedHours.toFixed(1)}h</p>
                    <p className="text-xs text-blue-400">⏳ Día futuro</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs">Esperadas: {day.expectedHours.toFixed(1)}h</p>
                    <p className="text-xs">Trabajadas: {day.workedHours.toFixed(1)}h</p>
                    {day.status === "COMPLETED" && <p className="text-xs text-green-400">✓ Jornada completa</p>}
                    {day.status === "INCOMPLETE" && (
                      <p className="text-xs text-amber-400">
                        ⚠ Faltan {(day.expectedHours - day.workedHours).toFixed(1)}h
                      </p>
                    )}
                    {day.status === "ABSENT" && <p className="text-xs text-red-400">✗ Sin fichaje</p>}
                  </>
                )}
              </>
            ) : (
              <p className="text-xs">Día no laboral</p>
            )}
            {isClickable && <p className="text-muted-foreground mt-2 text-xs">Click para solicitar fichaje</p>}
            {day.hasPendingRequest && (
              <p className="mt-2 text-xs text-orange-400">⏳ Solicitud de fichaje pendiente de aprobación</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

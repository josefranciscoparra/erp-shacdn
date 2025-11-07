"use client";

import { useCallback, useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DayButton, type DayMouseEventHandler } from "react-day-picker";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type DayCalendarData } from "@/server/actions/time-calendar";
import { useTimeCalendarStore } from "@/stores/time-calendar-store";

import { ManualTimeEntryDialog } from "../../_components/manual-time-entry-dialog";

export function TimeCalendarView() {
  const { monthlyData, selectedMonth, selectedYear, isLoading, loadMonthlyData } = useTimeCalendarStore();

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date>(new Date(selectedYear, selectedMonth - 1));

  useEffect(() => {
    loadMonthlyData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadMonthlyData]);

  useEffect(() => {
    setMonth(new Date(selectedYear, selectedMonth - 1));
  }, [selectedYear, selectedMonth]);

  const handleMonthChange = (newMonth: Date) => {
    setMonth(newMonth);
    loadMonthlyData(newMonth.getFullYear(), newMonth.getMonth() + 1);
  };

  const handleDayClick: DayMouseEventHandler = (day, modifiers) => {
    if (modifiers.disabled) return;

    // Buscar el día en monthlyData
    const dayData = monthlyData?.days.find((d) => {
      const dayDate = new Date(d.date);
      dayDate.setHours(0, 0, 0, 0);
      day.setHours(0, 0, 0, 0);
      return dayDate.getTime() === day.getTime();
    });

    if (!dayData) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(day);
    dayDate.setHours(0, 0, 0, 0);

    // Solo permitir crear solicitud si es día laboral ausente o incompleto y es pasado
    if (dayData.isWorkday && (dayData.status === "ABSENT" || dayData.status === "INCOMPLETE") && dayDate < today) {
      setSelectedDate(day);
      setManualDialogOpen(true);
    }
  };

  // Función para obtener datos del día (DEBE estar antes del early return)
  const getDayData = useCallback(
    (date: Date): DayCalendarData | undefined => {
      return monthlyData?.days.find((d) => {
        const dayDate = new Date(d.date);
        dayDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return dayDate.getTime() === compareDate.getTime();
      });
    },
    [monthlyData],
  );

  // Componente personalizado para DayButton con tooltip (DEBE estar antes del early return)
  const CustomDayButton = useCallback(
    (props: React.ComponentProps<typeof DayButton>) => {
      const dayData = getDayData(props.day.date);

      // Si no es día laboral, renderizar botón normal sin tooltip
      if (!dayData || !dayData.isWorkday) {
        return <CalendarDayButton {...props} />;
      }

      const percentage =
        dayData.expectedHours > 0 ? Math.round((dayData.workedHours / dayData.expectedHours) * 100) : 0;

      const workedPercentage = Math.min(percentage, 100);
      const missingPercentage = 100 - workedPercentage;

      // Obtener fichajes del día para la línea de tiempo
      const timeEntries = dayData.workdaySummary?.timeEntries ?? [];
      const workdaySummary = dayData.workdaySummary;

      // Crear entradas simplificadas desde clockIn/clockOut si no hay timeEntries
      const simplifiedEntries = [];
      if (workdaySummary?.clockIn) {
        simplifiedEntries.push({
          entryType: "CLOCK_IN",
          timestamp: workdaySummary.clockIn,
        });
      }
      if (workdaySummary?.clockOut) {
        simplifiedEntries.push({
          entryType: "CLOCK_OUT",
          timestamp: workdaySummary.clockOut,
        });
      }

      const entriesToShow = timeEntries.length > 0 ? timeEntries : simplifiedEntries;

      // Crear bloques de tiempo trabajado
      const workBlocks: { start: number; end: number; type: "work" | "break" }[] = [];

      // Si tenemos clockIn y clockOut, crear un bloque simple
      if (workdaySummary?.clockIn && workdaySummary?.clockOut) {
        const clockInDate = new Date(workdaySummary.clockIn);
        const clockOutDate = new Date(workdaySummary.clockOut);
        const startHour = clockInDate.getHours() + clockInDate.getMinutes() / 60;
        const endHour = clockOutDate.getHours() + clockOutDate.getMinutes() / 60;

        workBlocks.push({ start: startHour, end: endHour, type: "work" });
      } else if (workdaySummary?.clockIn) {
        // Solo clockIn, sin clockOut (todavía trabajando)
        const clockInDate = new Date(workdaySummary.clockIn);
        const startHour = clockInDate.getHours() + clockInDate.getMinutes() / 60;

        const now = new Date();
        const isToday = format(props.day.date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
        const endHour = isToday ? now.getHours() + now.getMinutes() / 60 : 24;

        workBlocks.push({ start: startHour, end: endHour, type: "work" });
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
                  <span className="text-card-foreground text-xs font-semibold">{percentage}%</span>
                </div>

                {/* Barra de progreso */}
                <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
                  <div className="bg-green-500" style={{ width: `${workedPercentage}%` }} />
                  <div className="bg-red-500" style={{ width: `${missingPercentage}%` }} />
                </div>

                {/* Línea de tiempo visual (24 horas) */}
                <div className="space-y-2">
                  <div className="text-card-foreground text-xs font-medium">
                    Línea de tiempo{" "}
                    {entriesToShow.length === 0 && <span className="text-muted-foreground">(sin fichajes)</span>}
                  </div>

                  {/* Barra de 24 horas */}
                  <div className="bg-muted/30 relative h-6 w-full rounded border">
                    {workBlocks.map((block, idx) => {
                      const startPercent = (block.start / 24) * 100;
                      const widthPercent = ((block.end - block.start) / 24) * 100;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "absolute top-0 h-full",
                            block.type === "work" ? "bg-green-500/80" : "bg-orange-400/60",
                          )}
                          style={{
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Marcadores de hora */}
                  <div className="text-muted-foreground flex justify-between text-[10px] font-medium">
                    <span>0:00</span>
                    <span>6:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>24:00</span>
                  </div>

                  {/* Fichajes */}
                  {entriesToShow.length > 0 && (
                    <div className="space-y-1">
                      {entriesToShow.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span
                            className={cn(
                              "font-semibold",
                              entry.entryType === "CLOCK_IN" && "text-green-600 dark:text-green-400",
                              entry.entryType === "CLOCK_OUT" && "text-blue-600 dark:text-blue-400",
                              entry.entryType === "PAUSE_START" && "text-orange-600 dark:text-orange-400",
                              entry.entryType === "PAUSE_END" && "text-green-600 dark:text-green-400",
                            )}
                          >
                            {entry.entryType === "CLOCK_IN" && "Entrada"}
                            {entry.entryType === "CLOCK_OUT" && "Salida"}
                            {entry.entryType === "PAUSE_START" && "Pausa"}
                            {entry.entryType === "PAUSE_END" && "Reanuda"}
                          </span>
                          <span className="text-card-foreground font-mono font-semibold">
                            {format(new Date(entry.timestamp), "HH:mm")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Información de horas */}
                <div className="space-y-1 border-t pt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trabajadas:</span>
                    <span className="text-card-foreground font-medium">{dayData.workedHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Esperadas:</span>
                    <span className="text-card-foreground font-medium">{dayData.expectedHours.toFixed(1)}h</span>
                  </div>
                  {dayData.workedHours < dayData.expectedHours && (
                    <div className="flex justify-between">
                      <span className="font-medium text-red-600 dark:text-red-400">Faltan:</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {(dayData.expectedHours - dayData.workedHours).toFixed(1)}h
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    [monthlyData],
  );

  CustomDayButton.displayName = "CustomDayButton";

  if (isLoading || !monthlyData) {
    return (
      <Card className="flex h-[340px] w-full items-center justify-center">
        <div className="text-muted-foreground text-sm">Cargando calendario...</div>
      </Card>
    );
  }

  // Preparar modifiers para el calendario
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedDays = monthlyData.days.filter((d) => d.status === "COMPLETED").map((d) => new Date(d.date));

  const incompleteDays = monthlyData.days
    .filter((d) => {
      const dayDate = new Date(d.date);
      dayDate.setHours(0, 0, 0, 0);
      return d.status === "INCOMPLETE" && dayDate <= today;
    })
    .map((d) => new Date(d.date));

  const absentDays = monthlyData.days
    .filter((d) => {
      const dayDate = new Date(d.date);
      dayDate.setHours(0, 0, 0, 0);
      return d.status === "ABSENT" && dayDate <= today;
    })
    .map((d) => new Date(d.date));

  const pendingDays = monthlyData.days
    .filter((d) => {
      const dayDate = new Date(d.date);
      dayDate.setHours(0, 0, 0, 0);
      return d.hasPendingRequest && dayDate <= today;
    })
    .map((d) => new Date(d.date));

  const futureDays = monthlyData.days
    .filter((d) => {
      const dayDate = new Date(d.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate > today && d.isWorkday;
    })
    .map((d) => new Date(d.date));

  const nonWorkdays = monthlyData.days.filter((d) => !d.isWorkday).map((d) => new Date(d.date));

  const clickableDays = monthlyData.days
    .filter((d) => {
      const dayDate = new Date(d.date);
      dayDate.setHours(0, 0, 0, 0);
      return (
        d.isWorkday && (d.status === "ABSENT" || d.status === "INCOMPLETE") && dayDate < today && !d.hasPendingRequest
      );
    })
    .map((d) => new Date(d.date));

  return (
    <>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <Calendar
            mode="single"
            selected={undefined}
            month={month}
            onMonthChange={handleMonthChange}
            today={today}
            locale={es}
            className="w-full"
            fullWidth
            monthsClassName="w-full"
            monthClassName="w-full flex flex-col"
            weekdayClassName="w-full"
            weekClassName="w-full"
            monthGridClassName="m-0"
            dayClassName="size-9"
            dayButtonClassName="size-9 rounded-md"
            onDayClick={handleDayClick}
            disabled={[...nonWorkdays, ...futureDays, ...pendingDays]}
            components={{
              DayButton: CustomDayButton,
            }}
            modifiers={{
              completed: completedDays,
              incomplete: incompleteDays,
              absent: absentDays,
              pending: pendingDays,
              future: futureDays,
              nonWorkday: nonWorkdays,
              clickable: clickableDays,
            }}
            modifiersClassNames={{
              completed: "bg-green-100 text-green-700 font-semibold dark:bg-green-950 dark:text-green-300 rounded-md",
              incomplete:
                "bg-orange-100 text-orange-700 font-semibold dark:bg-orange-950 dark:text-orange-300 rounded-md",
              absent: "bg-red-100 text-red-700 font-semibold dark:bg-red-950 dark:text-red-300 rounded-md",
              pending: "bg-orange-100 text-orange-700 font-semibold dark:bg-orange-950 dark:text-orange-300 rounded-md",
              future: "bg-blue-50 text-blue-600 font-medium dark:bg-blue-950 dark:text-blue-400 rounded-md",
              nonWorkday: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded-md",
              today:
                "!bg-amber-100 !text-amber-700 !font-bold ring-2 ring-amber-400 dark:!bg-amber-950 dark:!text-amber-300 dark:ring-amber-600 rounded-md",
              clickable: "cursor-pointer hover:ring-2 hover:ring-primary/50 rounded-md",
            }}
          />
        </CardContent>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 border-t p-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Completo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <span>Incompleto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Ausente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <span>Solicitud pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-blue-100 dark:bg-blue-950" />
            <span>Futuro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-gray-200 dark:bg-gray-800" />
            <span>No laboral</span>
          </div>
        </div>

        {/* Lista de solicitudes pendientes debajo del calendario */}
        {pendingDays.length > 0 && (
          <div className="flex flex-col divide-y border-t">
            <div className="p-4">
              <h3 className="text-sm font-semibold">Solicitudes pendientes</h3>
            </div>
            {monthlyData.days
              .filter((d) => d.hasPendingRequest)
              .slice(0, 3)
              .map((day) => (
                <div key={format(day.date, "yyyy-MM-dd")} className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {format(new Date(day.date), "dd MMM", { locale: es })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {day.status === "ABSENT" ? "Sin fichaje" : `${day.workedHours.toFixed(1)}h trabajadas`}
                    </p>
                  </div>
                  <div className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700 capitalize dark:bg-orange-950 dark:text-orange-300">
                    Pendiente
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      <ManualTimeEntryDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        initialDate={selectedDate ?? undefined}
      />
    </>
  );
}

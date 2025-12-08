"use client";

import { useCallback, useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { DayButton, type DayMouseEventHandler } from "react-day-picker";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type DayCalendarData } from "@/server/actions/time-calendar";
import { recalculateWorkdaySummary } from "@/server/actions/time-tracking";
import { useTimeBankStore } from "@/stores/time-bank-store";
import { useTimeCalendarStore } from "@/stores/time-calendar-store";

import { ManualTimeEntryDialog } from "../../_components/manual-time-entry-dialog";

export function TimeCalendarView() {
  const { monthlyData, selectedMonth, selectedYear, isLoading, loadMonthlyData } = useTimeCalendarStore();
  const refreshTimeBank = useTimeBankStore((state) => state.refresh);

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date>(new Date(selectedYear, selectedMonth - 1));
  const [isRecalculating, setIsRecalculating] = useState<string | null>(null); // ID del día que se está recalculando

  const handleRecalculate = async (date: Date, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir que se abra el tooltip/dialog
    e.preventDefault();

    const dayKey = format(date, "yyyy-MM-dd");
    setIsRecalculating(dayKey);

    try {
      const result = await recalculateWorkdaySummary(date);
      toast.success("Horas recalculadas correctamente", {
        description: `Trabajadas: ${(result.totalWorkedMinutes / 60).toFixed(1)}h | Pausas: ${(result.totalBreakMinutes / 60).toFixed(1)}h`,
      });

      // Recargar los datos del mes para reflejar el cambio
      await loadMonthlyData(selectedYear, selectedMonth);
      await refreshTimeBank();
    } catch (error) {
      console.error("Error al recalcular:", error);
      toast.error("Error al recalcular horas", {
        description: error instanceof Error ? error.message : "Intenta de nuevo",
      });
    } finally {
      setIsRecalculating(null);
    }
  };

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

      if (!dayData) {
        return <CalendarDayButton {...props} />;
      }

      const timeEntries = dayData.workdaySummary?.timeEntries ?? dayData.timeEntries ?? [];
      const hasAnyEntries =
        timeEntries.length > 0 ||
        dayData.workedHours > 0 ||
        Boolean(dayData.workdaySummary?.clockIn) ||
        Boolean(dayData.workdaySummary?.clockOut);
      const showTooltip = dayData.isWorkday || hasAnyEntries;

      if (!showTooltip) {
        return <CalendarDayButton {...props} />;
      }

      const percentage =
        dayData.expectedHours > 0 ? Math.round((dayData.workedHours / dayData.expectedHours) * 100) : 0;

      const workedPercentage = Math.min(percentage, 100);
      const missingPercentage = 100 - workedPercentage;

      // Obtener fichajes del día para la línea de tiempo
      const workdaySummary = dayData.workdaySummary;
      const filteredTimeEntries = timeEntries.filter((entry) => entry.entryType !== "PROJECT_SWITCH");
      const sortedTimeEntries = [...filteredTimeEntries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      const deduplicatedEntries: typeof sortedTimeEntries = [];
      const seenEntries = new Set<string>();
      for (const entry of sortedTimeEntries) {
        const key = entry.id ?? `${entry.entryType}-${new Date(entry.timestamp).getTime()}`;
        if (seenEntries.has(key)) continue;
        seenEntries.add(key);
        deduplicatedEntries.push(entry);
      }
      const dayKey = format(props.day.date, "yyyy-MM-dd");
      const isSameDayAsCell = (date: Date) => format(date, "yyyy-MM-dd") === dayKey;
      const getHourValue = (date: Date) => date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
      const MIN_DISPLAY_MINUTES = 5;
      const manualEntries = deduplicatedEntries.filter((entry) => entry.isManual);
      const isManualOnlyDay = manualEntries.length > 0 && manualEntries.length === deduplicatedEntries.length;

      const getManualEntriesForDisplay = () => {
        if (!isManualOnlyDay) {
          return deduplicatedEntries;
        }

        const manualGroups = new Map<string, { entries: typeof deduplicatedEntries; latestCreatedAt: number }>();
        manualEntries.forEach((entry) => {
          const groupKey = entry.manualRequestId ?? `manual-${entry.id}`;
          const existingGroup = manualGroups.get(groupKey) ?? { entries: [], latestCreatedAt: 0 };
          existingGroup.entries.push(entry);
          const createdAtTime = entry.createdAt
            ? new Date(entry.createdAt).getTime()
            : new Date(entry.timestamp).getTime();
          existingGroup.latestCreatedAt = Math.max(existingGroup.latestCreatedAt, createdAtTime);
          manualGroups.set(groupKey, existingGroup);
        });

        const sortedGroups = Array.from(manualGroups.values())
          .map((group) => ({
            entries: [...group.entries].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            ),
            latestCreatedAt: group.latestCreatedAt,
          }))
          .sort((a, b) => b.latestCreatedAt - a.latestCreatedAt);

        const latestGroupEntries = sortedGroups[0]?.entries ?? manualEntries;

        const manualClockIns = latestGroupEntries.filter((entry) => entry.entryType === "CLOCK_IN");
        const manualClockOuts = latestGroupEntries.filter((entry) => entry.entryType === "CLOCK_OUT");

        const firstClockIn = manualClockIns.length > 0 ? manualClockIns[0] : latestGroupEntries[0];
        const lastClockOut =
          manualClockOuts.length > 0
            ? manualClockOuts[manualClockOuts.length - 1]
            : latestGroupEntries[latestGroupEntries.length - 1];

        const result: typeof deduplicatedEntries = [];

        if (firstClockIn) {
          result.push(firstClockIn);
        }

        if (lastClockOut && (!firstClockIn || lastClockOut.id !== firstClockIn.id)) {
          result.push(lastClockOut);
        }

        return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      };

      const getRegularEntriesForDisplay = () => {
        if (deduplicatedEntries.length === 0) {
          return deduplicatedEntries;
        }

        const firstClockIn =
          deduplicatedEntries.find((entry) => entry.entryType === "CLOCK_IN") ?? deduplicatedEntries[0];
        const lastClockOut =
          [...deduplicatedEntries].reverse().find((entry) => entry.entryType === "CLOCK_OUT") ?? null;

        const result: typeof deduplicatedEntries = [];

        if (firstClockIn) {
          result.push(firstClockIn);
        }

        if (lastClockOut && (!firstClockIn || lastClockOut.id !== firstClockIn.id)) {
          result.push(lastClockOut);
        }

        return result;
      };

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

      const entriesForDisplay = isManualOnlyDay ? getManualEntriesForDisplay() : getRegularEntriesForDisplay();
      const entriesToShow = entriesForDisplay.length > 0 ? entriesForDisplay : simplifiedEntries;

      const clampDurationMinutes = (minutes: number) => {
        if (minutes <= 0) return 0;
        return Math.max(minutes, MIN_DISPLAY_MINUTES);
      };

      const buildBlocksFromEntries = (entries: typeof deduplicatedEntries, allowSyntheticBlock = true) => {
        const blocks: { start: number; end: number; type: "work" | "break" }[] = [];
        if (entries.length === 0) {
          return blocks;
        }

        let currentBlockStart: Date | null = null;
        let currentBlockType: "work" | "break" | null = null;

        const closeBlock = (endDate: Date) => {
          if (!currentBlockStart || !currentBlockType) return;
          const startHour = getHourValue(currentBlockStart);
          const endHour = getHourValue(endDate);
          if (endHour > startHour) {
            blocks.push({ start: startHour, end: endHour, type: currentBlockType });
          }
          currentBlockStart = null;
          currentBlockType = null;
        };

        for (const entry of entries) {
          const entryDate = new Date(entry.timestamp);
          switch (entry.entryType) {
            case "CLOCK_IN": {
              if (currentBlockStart && currentBlockType) {
                closeBlock(entryDate);
              }
              currentBlockStart = entryDate;
              currentBlockType = "work";
              break;
            }
            case "CLOCK_OUT": {
              closeBlock(entryDate);
              break;
            }
            case "BREAK_START":
            case "PAUSE_START": {
              closeBlock(entryDate);
              currentBlockStart = entryDate;
              currentBlockType = "break";
              break;
            }
            case "BREAK_END":
            case "PAUSE_END": {
              closeBlock(entryDate);
              currentBlockStart = entryDate;
              currentBlockType = "work";
              break;
            }
            default:
              break;
          }
        }

        if (currentBlockStart && currentBlockType) {
          const now = new Date();
          if (isSameDayAsCell(now)) {
            closeBlock(now);
          }
        }

        if (allowSyntheticBlock && blocks.length === 0 && entries.length > 0) {
          const firstEntry = entries.find((entry) => entry.entryType === "CLOCK_IN") ?? entries[0];
          const firstDate = new Date(firstEntry.timestamp);
          const durationMinutes = clampDurationMinutes(dayData.workedHours * 60);
          if (durationMinutes > 0) {
            const endDate = new Date(firstDate.getTime() + durationMinutes * 60 * 1000);
            const startHour = getHourValue(firstDate);
            const endHour = Math.min(getHourValue(endDate), 24);
            if (endHour > startHour) {
              blocks.push({ start: startHour, end: endHour, type: "work" });
            }
          }
        }

        return blocks;
      };

      const createWorkBlock = (startDate: Date | null, endDate: Date | null, durationMinutes = 0) => {
        if (!startDate) {
          return null;
        }

        let blockEnd = endDate;
        if (!blockEnd && durationMinutes > 0) {
          blockEnd = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        }

        if (!blockEnd || blockEnd <= startDate) {
          return null;
        }

        const startHour = getHourValue(startDate);
        const endHour = Math.min(getHourValue(blockEnd), 24);

        if (endHour <= startHour) {
          return null;
        }

        return { start: startHour, end: endHour, type: "work" as const };
      };

      const buildBlocksFromSummary = () => {
        if (!workdaySummary?.clockIn) {
          return [];
        }

        const startDate = new Date(workdaySummary.clockIn);
        const endDate = workdaySummary.clockOut
          ? new Date(workdaySummary.clockOut)
          : dayData.workedHours > 0
            ? new Date(startDate.getTime() + dayData.workedHours * 60 * 60 * 1000)
            : null;

        const finalEndDate =
          endDate ??
          new Date(
            Math.min(startDate.getTime() + MIN_DISPLAY_MINUTES * 60 * 1000, new Date(startDate).setHours(24, 0, 0, 0)),
          );

        const startHour = getHourValue(startDate);
        const endHour = Math.min(getHourValue(finalEndDate), 24);

        return endHour > startHour ? [{ start: startHour, end: endHour, type: "work" as const }] : [];
      };

      const buildManualBlocks = () => {
        if (!isManualOnlyDay || entriesForDisplay.length === 0) {
          return [];
        }
        const firstEntry = entriesForDisplay.find((entry) => entry.entryType === "CLOCK_IN") ?? entriesForDisplay[0];
        if (!firstEntry) {
          return [];
        }

        const startDate = new Date(firstEntry.timestamp);
        const lastExit = [...entriesForDisplay].reverse().find((entry) => entry.entryType === "CLOCK_OUT") ?? null;

        const durationMinutes =
          dayData.workedHours > 0
            ? Math.max(dayData.workedHours * 60, MIN_DISPLAY_MINUTES)
            : lastExit
              ? Math.max(
                  (new Date(lastExit.timestamp).getTime() - startDate.getTime()) / (60 * 1000),
                  MIN_DISPLAY_MINUTES,
                )
              : MIN_DISPLAY_MINUTES;
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

        const startHour = getHourValue(startDate);
        const endHour = Math.min(getHourValue(endDate), 24);

        return endHour > startHour ? [{ start: startHour, end: endHour, type: "work" as const }] : [];
      };

      const buildRegularBlocks = () => {
        const summaryDuration = clampDurationMinutes(dayData.workedHours * 60);
        const summaryBlock =
          workdaySummary && summaryDuration > 0
            ? createWorkBlock(workdaySummary.clockIn ? new Date(workdaySummary.clockIn) : null, null, summaryDuration)
            : null;

        if (summaryBlock) {
          return [summaryBlock];
        }

        const firstEntry =
          entriesForDisplay.find((entry) => entry.entryType === "CLOCK_IN") ??
          deduplicatedEntries.find((entry) => entry.entryType === "CLOCK_IN") ??
          deduplicatedEntries[0];

        const lastExit =
          [...entriesForDisplay].reverse().find((entry) => entry.entryType === "CLOCK_OUT") ??
          [...deduplicatedEntries].reverse().find((entry) => entry.entryType === "CLOCK_OUT") ??
          null;

        const fallbackMinutes = dayData.workedHours > 0 ? clampDurationMinutes(dayData.workedHours * 60) : 0;

        const entriesBlock =
          fallbackMinutes > 0
            ? createWorkBlock(firstEntry ? new Date(firstEntry.timestamp) : null, null, fallbackMinutes)
            : null;

        if (entriesBlock) {
          return [entriesBlock];
        }

        return buildBlocksFromEntries(deduplicatedEntries, dayData.workedHours > 0);
      };

      const workBlocks = (() => {
        if (isManualOnlyDay) {
          const manualBlocks = buildManualBlocks();
          if (manualBlocks.length > 0) {
            return manualBlocks;
          }
        }

        const regularBlocks = buildRegularBlocks();
        if (regularBlocks.length > 0) {
          return regularBlocks;
        }

        return [];
      })();

      const clockInMarkers = entriesForDisplay
        .filter((entry) => entry.entryType === "CLOCK_IN")
        .map((entry, index) => {
          const date = new Date(entry.timestamp);
          return {
            key: `${entry.entryType}-${index}-${date.getTime()}`,
            positionPercent: (getHourValue(date) / 24) * 100,
          };
        });

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
                    {workBlocks.map((block) => {
                      const startPercent = (block.start / 24) * 100;
                      const widthPercent = ((block.end - block.start) / 24) * 100;

                      return (
                        <div
                          key={`${block.type}-${block.start}-${block.end}`}
                          className="absolute top-0 h-full"
                          style={{
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                            minWidth: widthPercent < 0.5 ? "2px" : undefined,
                            backgroundColor: block.type === "work" ? "#22c55e" : "#fb923c",
                            opacity: block.type === "work" ? 0.85 : 0.7,
                          }}
                        />
                      );
                    })}
                    {clockInMarkers.map((marker) => (
                      <div
                        key={marker.key}
                        className="absolute top-0 h-full"
                        style={{
                          left: `calc(${marker.positionPercent}% - 1px)`,
                          width: "2px",
                          backgroundColor: "#16a34a",
                          opacity: 0.8,
                        }}
                      />
                    ))}
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
                      {entriesToShow.map((entry) => (
                        <div
                          key={`${entry.entryType}-${entry.timestamp}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <span
                            className={cn(
                              "font-semibold",
                              entry.entryType === "CLOCK_IN" && "text-green-600 dark:text-green-400",
                              entry.entryType === "CLOCK_OUT" && "text-blue-600 dark:text-blue-400",
                              (entry.entryType === "PAUSE_START" || entry.entryType === "BREAK_START") &&
                                "text-orange-600 dark:text-orange-400",
                              (entry.entryType === "PAUSE_END" || entry.entryType === "BREAK_END") &&
                                "text-green-600 dark:text-green-400",
                            )}
                          >
                            {entry.entryType === "CLOCK_IN" && "Entrada"}
                            {entry.entryType === "CLOCK_OUT" && "Salida"}
                            {(entry.entryType === "PAUSE_START" || entry.entryType === "BREAK_START") && "Pausa"}
                            {(entry.entryType === "PAUSE_END" || entry.entryType === "BREAK_END") && "Reanuda"}
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
                <div className="space-y-2 border-t pt-2 text-xs">
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

                  {/* Botón de recalcular */}
                  {timeEntries.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full gap-1.5 text-xs"
                      onClick={(e) => handleRecalculate(new Date(dayData.date), e)}
                      disabled={isRecalculating === format(new Date(dayData.date), "yyyy-MM-dd")}
                    >
                      <RefreshCw
                        className={cn(
                          "size-3",
                          isRecalculating === format(new Date(dayData.date), "yyyy-MM-dd") && "animate-spin",
                        )}
                      />
                      {isRecalculating === format(new Date(dayData.date), "yyyy-MM-dd")
                        ? "Recalculando..."
                        : "Recalcular horas"}
                    </Button>
                  )}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    [getDayData],
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

  const nonWorkdaysWithEntries = monthlyData.days
    .filter((d) => {
      if (d.isWorkday) return false;
      const timeEntries = d.workdaySummary?.timeEntries ?? d.timeEntries ?? [];
      return (
        timeEntries.length > 0 ||
        d.workedHours > 0 ||
        Boolean(d.workdaySummary?.clockIn) ||
        Boolean(d.workdaySummary?.clockOut)
      );
    })
    .map((d) => new Date(d.date));

  const nonWorkdays = monthlyData.days.filter((d) => !d.isWorkday).map((d) => new Date(d.date));
  const nonWorkdaysWithoutEntries = nonWorkdays.filter(
    (date) => !nonWorkdaysWithEntries.some((withEntries) => withEntries.getTime() === date.getTime()),
  );

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
        <CardContent className="px-4 pt-6 pb-6 sm:px-6">
          <Calendar
            mode="single"
            selected={undefined}
            month={month}
            onMonthChange={handleMonthChange}
            today={today}
            locale={es}
            className="w-full [--rdp-cell-size:clamp(3.6rem,5vw,5.2rem)]"
            fullWidth
            monthsClassName="w-full"
            monthClassName="w-full flex flex-col"
            weekdayClassName="w-full"
            weekClassName="w-full"
            monthGridClassName="m-0"
            dayClassName="flex flex-1 items-center justify-center p-0 text-base"
            dayButtonClassName="rounded-xl text-base font-medium"
            onDayClick={handleDayClick}
            disabled={[...nonWorkdaysWithoutEntries, ...futureDays, ...pendingDays]}
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
        <div className="flex flex-wrap items-center justify-center gap-3 border-t px-4 py-4 text-center text-xs sm:px-6">
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
            <div className="px-4 py-4 sm:px-6">
              <h3 className="text-sm font-semibold">Solicitudes pendientes</h3>
            </div>
            {monthlyData.days
              .filter((d) => d.hasPendingRequest)
              .slice(0, 3)
              .map((day) => (
                <div
                  key={format(day.date, "yyyy-MM-dd")}
                  className="flex items-center justify-between px-4 py-4 sm:px-6"
                >
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

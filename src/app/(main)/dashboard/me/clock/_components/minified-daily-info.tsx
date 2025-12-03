"use client";

import { useEffect } from "react";

import { Clock, PiggyBank, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { minutesToTime, formatDuration } from "@/services/schedules";
import { useTimeBankStore } from "@/stores/time-bank-store";
import { type EffectiveSchedule } from "@/types/schedule";

interface MinifiedDailyInfoProps {
  schedule: EffectiveSchedule | null;
}

export function MinifiedDailyInfo({ schedule }: MinifiedDailyInfoProps) {
  // Store for TimeBank
  const { summary: timeBankSummary, loadSummary: loadTimeBankSummary } = useTimeBankStore();

  useEffect(() => {
    // Load Time Bank
    loadTimeBankSummary();
  }, [loadTimeBankSummary]);

  // Render helper for Schedule
  const renderScheduleInfo = () => {
    if (!schedule) return <span className="text-muted-foreground">Cargando horario...</span>;

    if (schedule.source === "NO_ASSIGNMENT") {
      return (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Sin horario asignado</span>
        </div>
      );
    }

    if (schedule.source === "ABSENCE") {
      return (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-orange-200 bg-orange-50 text-xs text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-400"
          >
            {schedule.absence?.type ?? "Ausencia"}
          </Badge>
          <span className="text-muted-foreground max-w-[150px] truncate text-xs">{schedule.absence?.reason}</span>
        </div>
      );
    }

    if (!schedule.isWorkingDay) {
      return (
        <Badge variant="secondary" className="text-xs">
          Día no laborable
        </Badge>
      );
    }

    // Working Day
    const timeRange =
      schedule.timeSlots.length > 0
        ? `${minutesToTime(schedule.timeSlots[0].startMinutes)} - ${minutesToTime(schedule.timeSlots[schedule.timeSlots.length - 1].endMinutes)}`
        : "Sin franjas";

    return (
      <div className="flex items-center gap-2">
        <Clock className="text-muted-foreground h-3.5 w-3.5" />
        <span className="font-medium">{timeRange}</span>
        <span className="text-muted-foreground text-xs">({formatDuration(schedule.expectedMinutes)})</span>
      </div>
    );
  };

  // Render helper for Time Bank
  const renderTimeBank = () => {
    if (!timeBankSummary) return null;

    const totalMinutes = timeBankSummary.totalMinutes;
    const isPositive = totalMinutes >= 0;
    const hours = totalMinutes / 60;
    const label = `${isPositive ? "+" : ""}${Math.abs(hours).toFixed(1)}h`;

    return (
      <div className="flex items-center gap-2">
        <PiggyBank
          className={cn(
            "h-3.5 w-3.5",
            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          )}
        />
        <span
          className={cn(
            "text-xs font-bold",
            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          )}
        >
          {label} global
        </span>
      </div>
    );
  };

  return (
    <div className="bg-card text-card-foreground w-full rounded-lg border p-3 shadow-sm">
      <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row sm:gap-4">
        {/* Left: Schedule */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground hidden text-xs font-semibold tracking-wider uppercase sm:inline-block">
            Horario
          </span>
          {renderScheduleInfo()}
        </div>

        <Separator orientation="vertical" className="hidden h-4 sm:block" />

        {/* Right: Time Bank */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground hidden text-xs font-semibold tracking-wider uppercase sm:inline-block">
            Bolsa
          </span>
          {renderTimeBank() ?? <span className="text-muted-foreground text-xs">--</span>}
        </div>
      </div>
    </div>
  );
}

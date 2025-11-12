/**
 * Navegador de Semana
 *
 * Controles para navegar entre semanas: anterior, siguiente, hoy
 */

"use client";

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatWeekRange } from "../_lib/shift-utils";
import { useShiftsStore } from "../_store/shifts-store";

export function WeekNavigator() {
  const { currentWeekStart, goToPreviousWeek, goToNextWeek, goToToday } = useShiftsStore();

  return (
    <div className="bg-card flex items-center justify-center gap-2 rounded-lg border p-3">
      <Button variant="outline" size="icon" onClick={goToPreviousWeek} aria-label="Semana anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex min-w-[220px] items-center justify-center gap-2">
        <CalendarIcon className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-semibold">{formatWeekRange(currentWeekStart)}</span>
      </div>

      <Button variant="outline" size="icon" onClick={goToNextWeek} aria-label="Semana siguiente">
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={goToToday}>
        Hoy
      </Button>
    </div>
  );
}

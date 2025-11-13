/**
 * Navegador de Semana (v2 - Estilo moderno sticky)
 *
 * Controles para navegar entre semanas con diseño limpio y sticky
 */

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatWeekRange } from "../_lib/shift-utils";
import { useShiftsStore } from "../_store/shifts-store";

export function WeekNavigator() {
  const { currentWeekStart, goToPreviousWeek, goToNextWeek, goToToday } = useShiftsStore();

  const weekDisplay = formatWeekRange(currentWeekStart);

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
      <div className="flex items-center justify-center gap-4 py-3">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label="Semana anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm font-medium">{weekDisplay}</span>

        <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label="Semana siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoy
        </Button>
      </div>
    </div>
  );
}

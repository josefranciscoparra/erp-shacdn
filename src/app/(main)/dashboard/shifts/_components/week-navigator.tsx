/**
 * Navegador de Semana (v2 - Estilo moderno sticky)
 *
 * Controles para navegar entre semanas con diseño limpio y sticky
 */

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { formatWeekRange } from "../_lib/shift-utils";
import { useShiftsStore } from "../_store/shifts-store";

export function WeekNavigator() {
  const { currentWeekStart, goToPreviousWeek, goToNextWeek, goToToday, shifts } = useShiftsStore();

  const weekDisplay = formatWeekRange(currentWeekStart);

  // Calcular estado de la semana
  const getWeekStatus = () => {
    if (shifts.length === 0) return { label: "Vacía", variant: "outline", className: "text-muted-foreground" };
    if (shifts.some((s) => s.status === "conflict"))
      return { label: "Conflictos", variant: "destructive", className: "" };
    if (shifts.some((s) => s.status === "draft"))
      return {
        label: "Borrador",
        variant: "outline",
        className: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20",
      };
    return {
      label: "Publicada",
      variant: "default",
      className: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600",
    };
  };

  const status = getWeekStatus();

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
      <div className="flex items-center justify-center gap-4 py-3">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label="Semana anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
          <span className="text-sm font-medium">{weekDisplay}</span>
          <Badge
            variant={status.variant as any}
            className={`h-5 px-1.5 text-[10px] sm:h-6 sm:text-xs ${status.className}`}
          >
            {status.label}
          </Badge>
        </div>

        <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label="Semana siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={goToToday} className="ml-2 hidden sm:inline-flex">
          Hoy
        </Button>
      </div>
    </div>
  );
}

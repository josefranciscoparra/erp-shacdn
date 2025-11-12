/**
 * Selector de Vista para Turnos
 *
 * Permite cambiar entre:
 * - Vista: Semana / Mes
 * - Modo: Por Empleado / Por Áreas
 */

"use client";

import { Calendar, CalendarDays, Users, Building2 } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { CalendarView, CalendarMode } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

export function ShiftsViewSelector() {
  const { calendarView, calendarMode, setCalendarView, setCalendarMode } = useShiftsStore();

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Vista: Semana / Mes */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">Vista:</span>
        <ToggleGroup
          type="single"
          value={calendarView}
          onValueChange={(value) => {
            if (value) setCalendarView(value as CalendarView);
          }}
          className="border"
        >
          <ToggleGroupItem value="week" aria-label="Vista semanal" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden @md:inline">Semana</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="month" aria-label="Vista mensual" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden @md:inline">Mes</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Modo: Empleados / Áreas */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">Agrupar por:</span>
        <ToggleGroup
          type="single"
          value={calendarMode}
          onValueChange={(value) => {
            if (value) setCalendarMode(value as CalendarMode);
          }}
          className="border"
        >
          <ToggleGroupItem value="employee" aria-label="Vista por empleado" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden @md:inline">Empleado</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="area" aria-label="Vista por áreas" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden @md:inline">Áreas</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

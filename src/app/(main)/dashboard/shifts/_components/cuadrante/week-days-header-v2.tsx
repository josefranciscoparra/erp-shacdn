/**
 * Cabecera de Días de la Semana v2 (Rediseño)
 *
 * Diseño estilo Google Calendar:
 * - Día pequeño uppercase (LUN)
 * - Número grande (10)
 * - Border bottom elegante
 */

"use client";

import { cn } from "@/lib/utils";

interface WeekDay {
  date: string; // "2025-11-10"
  dayName: string; // "LUN"
  dayNumber: string; // "10"
  isToday?: boolean;
}

interface WeekDaysHeaderV2Props {
  weekDays: WeekDay[];
}

export function WeekDaysHeaderV2({ weekDays }: WeekDaysHeaderV2Props) {
  return (
    <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-slate-50/50">
      {/* Espacio para columna de empleados */}
      <div className="border-r" />

      {/* Cabeceras de días */}
      {weekDays.map((day) => (
        <div
          key={day.date}
          className={cn("border-r py-3 text-center transition-colors last:border-r-0", day.isToday && "bg-primary/5")}
        >
          {/* Nombre del día */}
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{day.dayName}</div>

          {/* Número del día */}
          <div className={cn("mt-1 text-2xl font-bold", day.isToday ? "text-primary" : "text-foreground")}>
            {day.dayNumber}
          </div>
        </div>
      ))}
    </div>
  );
}

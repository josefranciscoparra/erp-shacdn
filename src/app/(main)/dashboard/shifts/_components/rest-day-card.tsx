/**
 * Tarjeta de Día de Descanso o Sin Planificar
 *
 * Muestra una tarjeta visual para días sin turnos asignados
 * - rest: Día planificado como descanso/día libre
 * - unplanned: Día sin planificar (no se ha asignado nada aún)
 */

"use client";

import { Coffee, CalendarX } from "lucide-react";

import { cn } from "@/lib/utils";

interface RestDayCardProps {
  type?: "rest" | "unplanned";
  className?: string;
  compact?: boolean;
}

export function RestDayCard({ type = "unplanned", className, compact = false }: RestDayCardProps) {
  const isRest = type === "rest";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-xs font-medium",
        isRest
          ? "border-emerald-300 bg-emerald-50/50 text-emerald-600"
          : "border-slate-300 bg-slate-50/50 text-slate-500",
        compact && "p-1.5 text-[10px]",
        className,
      )}
    >
      {isRest ? (
        <Coffee className={cn("shrink-0", compact ? "size-3" : "size-3.5")} />
      ) : (
        <CalendarX className={cn("shrink-0", compact ? "size-3" : "size-3.5")} />
      )}
      <span>{isRest ? "Descanso" : "Sin planificar"}</span>
    </div>
  );
}

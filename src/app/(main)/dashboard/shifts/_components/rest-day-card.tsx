/**
 * Tarjeta de Día de Descanso
 *
 * Muestra una tarjeta visual para días sin turnos asignados
 */

"use client";

import { Coffee } from "lucide-react";

import { cn } from "@/lib/utils";

interface RestDayCardProps {
  className?: string;
  compact?: boolean;
}

export function RestDayCard({ className, compact = false }: RestDayCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-2.5 text-slate-500",
        compact && "p-1.5",
        className,
      )}
    >
      <Coffee className={cn("shrink-0", compact ? "size-3" : "size-3.5")} />
      <span className={cn("text-xs font-medium", compact && "text-[10px]")}>Descanso</span>
    </div>
  );
}

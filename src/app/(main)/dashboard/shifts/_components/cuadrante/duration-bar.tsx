/**
 * Barra de Duración Proporcional
 *
 * Visualiza la duración de un turno de forma proporcional tipo Gantt
 * Diseño minimalista y moderno
 */

"use client";

import { cn } from "@/lib/utils";

interface DurationBarProps {
  percentage: number; // 0-100
  className?: string;
}

export function DurationBar({ percentage, className }: DurationBarProps) {
  return (
    <div className={cn("relative h-1 overflow-hidden rounded-full bg-slate-200", className)}>
      <div
        className="bg-primary absolute inset-y-0 left-0 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
      />
    </div>
  );
}

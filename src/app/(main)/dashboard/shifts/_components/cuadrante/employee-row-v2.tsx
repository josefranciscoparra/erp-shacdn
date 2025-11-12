/**
 * Fila de Empleado v2 (Rediseño)
 *
 * Row del calendario con:
 * - Avatar con inicial
 * - Nombre
 * - Badge de horas (32h/40h)
 * - Columnas de días con turnos
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { Shift } from "../../_lib/types";

import { ShiftCardV2 } from "./shift-card-v2";

interface EmployeeRowV2Props {
  employeeName: string;
  employeeInitial: string;
  assignedHours: number;
  contractHours: number;
  weekDays: Array<{ date: string }>;
  shiftsPerDay: Record<string, Shift[]>; // date -> shifts[]
  isCompact?: boolean;
  onShiftClick?: (shift: Shift) => void;
}

export function EmployeeRowV2({
  employeeName,
  employeeInitial,
  assignedHours,
  contractHours,
  weekDays,
  shiftsPerDay,
  isCompact = false,
  onShiftClick,
}: EmployeeRowV2Props) {
  // Determinar si está por debajo/arriba del objetivo
  const hoursPercentage = (assignedHours / contractHours) * 100;
  const badgeVariant = hoursPercentage < 70 ? "destructive" : hoursPercentage > 110 ? "secondary" : "outline";

  return (
    <div
      className={cn(
        "grid grid-cols-[200px_repeat(7,1fr)] border-b transition-colors hover:bg-slate-50/50",
        isCompact ? "min-h-[60px]" : "min-h-[80px]",
      )}
    >
      {/* Columna empleado */}
      <div className="flex items-center gap-3 border-r bg-slate-50/80 p-4">
        {/* Avatar */}
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
          <span className="text-primary text-sm font-semibold">{employeeInitial}</span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{employeeName}</p>
          <Badge variant={badgeVariant} className="mt-1 text-xs">
            {assignedHours}h/{contractHours}h
          </Badge>
        </div>
      </div>

      {/* Columnas de días */}
      {weekDays.map((day) => {
        const dayShifts = shiftsPerDay[day.date] ?? [];

        return (
          <div key={day.date} className="space-y-2 border-r p-2 last:border-r-0">
            {dayShifts.map((shift) => (
              <ShiftCardV2 key={shift.id} shift={shift} onClick={() => onShiftClick?.(shift)} isCompact={isCompact} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

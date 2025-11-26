/**
 * Componente Bloque de Turno
 *
 * Representa visualmente un turno en el calendario.
 * Soporta drag & drop y muestra información relevante.
 * Diseño tipo "Pill" moderno (Factorial/Workday).
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Clock, Coffee, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { formatShiftTime, formatDuration, calculateDuration } from "../_lib/shift-utils";
import type { Shift } from "../_lib/types";

interface ShiftBlockProps {
  shift: Shift;
  onClick: () => void;
  isDraggable?: boolean;
  showEmployeeName?: boolean; // Para vista por áreas
  employeeName?: string;
}

export function ShiftBlock({
  shift,
  onClick,
  isDraggable = true,
  showEmployeeName = false,
  employeeName,
}: ShiftBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: shift.id,
    disabled: !isDraggable,
    data: {
      type: "shift",
      shift,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const duration = calculateDuration(shift.startTime, shift.endTime);
  const isConflict = shift.status === "conflict";
  const isDraft = shift.status === "draft";

  // Determinar estado de warnings
  const hasWarnings = shift.warnings && shift.warnings.length > 0;
  const hasErrors = shift.warnings?.some((w) => w.severity === "error");
  const hasOnlyWarnings = hasWarnings && !hasErrors;

  // Diseño de colores (Moderno)
  // Draft: Gris/Outline con fondo suave
  // Published: Color solido (Indigo/Blue)
  // Conflict: Rojo solido o borde rojo fuerte

  const getBaseClasses = () => {
    if (isConflict || hasErrors) {
      return "bg-red-100 border-red-200 text-red-900 hover:bg-red-200 dark:bg-red-900/40 dark:border-red-800 dark:text-red-100";
    }
    if (isDraft) {
      return "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 border-dashed border";
    }
    // Published (Default)
    return "bg-indigo-100 border-indigo-200 text-indigo-900 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-100";
  };

  // Indicador de warning (borde o glow)
  const getWarningClasses = () => {
    if (hasOnlyWarnings) return "ring-1 ring-amber-400 ring-inset";
    return "";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={cn(
              "group relative flex min-h-[3rem] w-full cursor-pointer flex-col justify-center rounded-md border px-2 py-1.5 text-xs shadow-sm transition-all",
              getBaseClasses(),
              getWarningClasses(),
              isDragging && "ring-primary z-50 scale-105 opacity-50 shadow-lg ring-2",
              !isDraggable && "cursor-default",
            )}
          >
            {/* Header: Hora */}
            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold tracking-tight">{formatShiftTime(shift.startTime, shift.endTime)}</span>

              {/* Iconos de estado mini */}
              <div className="flex items-center gap-0.5">
                {shift.breakMinutes && shift.breakMinutes > 0 && <Coffee className="h-3 w-3 opacity-70" />}
                {isConflict && <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                {hasOnlyWarnings && <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
              </div>
            </div>

            {/* Details */}
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 opacity-90">
              {/* Nombre empleado (si aplica) */}
              {showEmployeeName && employeeName && (
                <span className="block max-w-full truncate font-medium">{employeeName}</span>
              )}

              {/* Rol/Zona */}
              {shift.role && <span className="truncate opacity-80">{shift.role}</span>}

              {/* Duración */}
              {/* <span className="opacity-70">{formatDuration(duration)}</span> */}
            </div>
          </div>
        </TooltipTrigger>

        <TooltipContent side="right" className="z-50 max-w-xs p-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold">{formatShiftTime(shift.startTime, shift.endTime)}</span>
              <Badge variant="outline" className="h-5 text-[10px]">
                {formatDuration(duration)}
              </Badge>
            </div>

            {shift.breakMinutes && shift.breakMinutes > 0 && (
              <p className="text-muted-foreground flex items-center gap-2 text-xs">
                <Coffee className="h-3.5 w-3.5" />
                {shift.breakMinutes} min de descanso
              </p>
            )}

            {shift.role && (
              <div className="text-xs">
                <span className="text-muted-foreground">Rol:</span> {shift.role}
              </div>
            )}

            {shift.notes && (
              <div className="bg-muted/50 text-muted-foreground rounded p-2 text-xs italic">
                &ldquo;{shift.notes}&rdquo;
              </div>
            )}

            {/* Conflicts/Warnings */}
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
            {(hasWarnings || isConflict) && (
              <div className="space-y-1 pt-1">
                {isConflict && (
                  <p className="text-destructive flex items-center gap-1 text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" /> Conflicto grave
                  </p>
                )}
                {shift.warnings?.map((w, i) => (
                  <p
                    key={i}
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      w.severity === "error" ? "text-destructive" : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    <Info className="h-3 w-3" />
                    {w.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Placeholder para celda vacía (donde se puede soltar un turno)
 */
interface ShiftDropZoneProps {
  isOver: boolean;
  canDrop: boolean;
}

export function ShiftDropZone({ isOver, canDrop }: ShiftDropZoneProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[3rem] w-full items-center justify-center rounded-md border border-dashed transition-colors",
        isOver && canDrop && "border-primary bg-primary/10 ring-primary/20 ring-1",
        isOver && !canDrop && "border-destructive bg-destructive/10",
        !isOver && "border-transparent",
      )}
    />
  );
}

/**
 * Tarjeta de Turno v2 (Rediseño)
 *
 * Diseño moderno estilo Google Calendar/Factorial
 * - Fondo morado suave #F5E8FF
 * - Barra de duración proporcional
 * - Acciones visibles solo en hover
 * - Border radius 12px
 * - Badge de conflictos cuando status="conflict"
 * - Borde naranja/rojo para warnings
 */

"use client";

import { AlertTriangle, Copy, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { Shift } from "../../_lib/types";
import { useShiftsStore } from "../../_store/shifts-store";

import { DurationBar } from "./duration-bar";

interface ShiftCardV2Props {
  shift: Shift;
  onClick?: () => void;
  isCompact?: boolean;
  conflictCount?: number; // Número de conflictos (si se pasa explícitamente)
}

export function ShiftCardV2({ shift, onClick, isCompact = false, conflictCount }: ShiftCardV2Props) {
  // Estado de resaltado desde el store
  const highlightedShiftId = useShiftsStore((s) => s.highlightedShiftId);
  const isHighlighted = highlightedShiftId === shift.id;

  // Calcular duración en horas
  const startHour = parseInt(shift.startTime.split(":")[0]);
  const startMin = parseInt(shift.startTime.split(":")[1]);
  const endHour = parseInt(shift.endTime.split(":")[0]);
  const endMin = parseInt(shift.endTime.split(":")[1]);

  const durationHours = endHour - startHour + (endMin - startMin) / 60;
  const breakHours = (shift.breakMinutes ?? 0) / 60;
  const netHours = durationHours - breakHours;

  // Porcentaje de la barra (asumiendo jornada máxima 12h)
  const percentage = (netHours / 12) * 100;

  // Determinar estado de warnings
  const hasWarnings = shift.warnings && shift.warnings.length > 0;
  const hasErrors = shift.warnings?.some((w) => w.severity === "error");
  const hasOnlyWarnings = hasWarnings && !hasErrors;

  // Colores según estado (prioridad: conflict > error > warning > normal)
  const isConflict = shift.status === "conflict";

  const getBgColor = () => {
    if (isConflict || hasErrors) return "bg-red-50 dark:bg-red-950/30";
    if (hasOnlyWarnings) return "bg-amber-50 dark:bg-amber-950/30";
    return "bg-[#F5E8FF] dark:bg-primary/10";
  };

  const getBorderColor = () => {
    if (isConflict || hasErrors) return "border-red-300 dark:border-red-800";
    if (hasOnlyWarnings) return "border-amber-400 dark:border-amber-700";
    return "border-primary/20";
  };

  // Número de conflictos (usar el prop si se pasa, si no default a 1 para turnos con conflict)
  const displayConflictCount = conflictCount ?? (isConflict ? 1 : 0);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group relative">
            <div
              onClick={onClick}
              className={cn(
                "cursor-pointer rounded-xl border shadow-sm transition-all hover:shadow-md",
                getBgColor(),
                getBorderColor(),
                isCompact ? "p-2" : "p-3",
                // Borde más grueso si hay warnings
                hasWarnings && "border-2",
                // Animación de resaltado cuando se navega desde el panel de conflictos
                isHighlighted && "animate-pulse ring-2 ring-red-500 ring-offset-2",
              )}
            >
              {/* Badge de conflictos (esquina superior derecha) */}
              {isConflict && displayConflictCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center gap-0.5 px-1.5 text-xs"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {displayConflictCount > 1 && <span>{displayConflictCount}</span>}
                </Badge>
              )}

              {/* Badge de warning (esquina superior derecha) - solo si no es conflict */}
              {!isConflict && hasWarnings && (
                <Badge
                  variant={hasErrors ? "destructive" : "outline"}
                  className={cn(
                    "absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center gap-0.5 px-1.5 text-xs",
                    hasOnlyWarnings &&
                      "border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {shift.warnings!.length > 1 && <span>{shift.warnings!.length}</span>}
                </Badge>
              )}

              {/* Rango horario */}
              <div className={cn("font-semibold", isCompact ? "text-xs" : "text-sm")}>
                {shift.startTime} – {shift.endTime}
              </div>

              {/* Duración */}
              <div className="text-muted-foreground mt-0.5 text-xs">{netHours.toFixed(1)}h</div>

              {/* Lugar/Zona */}
              {shift.role && <div className="text-muted-foreground mt-1 truncate text-xs">{shift.role}</div>}

              {/* Barra de duración (oculta en modo compacto) */}
              {!isCompact && <DurationBar percentage={percentage} className="mt-2" />}

              {/* Acciones (solo visible en hover) */}
              <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-1 rounded-lg bg-white p-1 shadow-sm dark:bg-gray-900">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-primary/10 size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Editar turno
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-primary/10 size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Duplicar turno
                    }}
                  >
                    <Copy className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-destructive/10 hover:text-destructive size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Eliminar turno
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        {/* Tooltip con warnings */}
        {hasWarnings && (
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              {shift.warnings!.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 h-3 w-3 shrink-0",
                      w.severity === "error" ? "text-red-500" : "text-amber-500",
                    )}
                  />
                  <span className="text-xs">{w.message}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

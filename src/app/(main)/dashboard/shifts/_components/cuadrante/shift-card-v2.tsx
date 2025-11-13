/**
 * Tarjeta de Turno v2 (Rediseño)
 *
 * Diseño moderno estilo Google Calendar/Factorial
 * - Fondo morado suave #F5E8FF
 * - Barra de duración proporcional
 * - Acciones visibles solo en hover
 * - Border radius 12px
 */

"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Shift } from "../../_lib/types";

import { DurationBar } from "./duration-bar";

interface ShiftCardV2Props {
  shift: Shift;
  onClick?: () => void;
  isCompact?: boolean;
}

export function ShiftCardV2({ shift, onClick, isCompact = false }: ShiftCardV2Props) {
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

  // Colores según estado
  const bgColor = shift.status === "conflict" ? "bg-red-50" : "bg-[#F5E8FF]";
  const borderColor = shift.status === "conflict" ? "border-red-300" : "border-primary/20";

  return (
    <div className="group relative">
      <div
        onClick={onClick}
        className={cn(
          "cursor-pointer rounded-xl border shadow-sm transition-all hover:shadow-md",
          bgColor,
          borderColor,
          isCompact ? "p-2" : "p-3",
        )}
      >
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
          <div className="flex gap-1 rounded-lg bg-white p-1 shadow-sm">
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
  );
}

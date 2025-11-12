/**
 * Navegador de Semana v2 (Rediseño)
 *
 * Navegación sticky con diseño limpio estilo Linear
 * - Sin caja, solo border-b
 * - Backdrop blur glassmorphism
 * - Botones ghost
 */

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WeekNavigatorV2Props {
  weekDisplay: string; // "10 – 16 nov 2025"
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekNavigatorV2({ weekDisplay, onPrevious, onNext, onToday }: WeekNavigatorV2Props) {
  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
      <div className="flex items-center justify-center gap-4 py-3">
        {/* Navegación anterior */}
        <Button variant="ghost" size="icon" onClick={onPrevious} className="size-8">
          <ChevronLeft className="size-4" />
        </Button>

        {/* Rango de fechas */}
        <span className="min-w-[160px] text-center text-sm font-medium">{weekDisplay}</span>

        {/* Navegación siguiente */}
        <Button variant="ghost" size="icon" onClick={onNext} className="size-8">
          <ChevronRight className="size-4" />
        </Button>

        {/* Botón "Hoy" */}
        <Button variant="outline" size="sm" onClick={onToday} className="h-8 text-xs">
          Hoy
        </Button>
      </div>
    </div>
  );
}

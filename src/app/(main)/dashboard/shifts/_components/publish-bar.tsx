/**
 * Barra de Acciones Masivas para Turnos
 *
 * Permite copiar turnos de la semana anterior y publicar turnos pendientes.
 */

"use client";

import { useMemo } from "react";

import { Copy, Send, AlertCircle, AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { formatWeekRange } from "../_lib/shift-utils";
import { useShiftsStore } from "../_store/shifts-store";

export function PublishBar() {
  const { shifts, currentWeekStart, copyPreviousWeek, publishShifts, openConflictsPanel } = useShiftsStore();

  // Contar turnos en borrador para la semana actual
  const draftShiftsCount = useMemo(() => {
    return shifts.filter((s) => s.status === "draft").length;
  }, [shifts]);

  // Contar turnos con conflictos
  const conflictShiftsCount = useMemo(() => {
    return shifts.filter((s) => s.status === "conflict").length;
  }, [shifts]);

  // Turnos ya publicados
  const publishedShiftsCount = useMemo(() => {
    return shifts.filter((s) => s.status === "published").length;
  }, [shifts]);

  const hasShifts = shifts.length > 0;
  const hasDrafts = draftShiftsCount > 0;
  const hasConflicts = conflictShiftsCount > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Advertencia si hay conflictos */}
      {hasConflicts && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4 text-sm">
            <span>
              <strong>Atención:</strong> Hay {conflictShiftsCount} {conflictShiftsCount === 1 ? "turno" : "turnos"} con
              conflictos. Revisa los turnos marcados antes de publicar la semana.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={openConflictsPanel}
              className="shrink-0 gap-2 border-red-300 bg-white text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <AlertTriangle className="h-4 w-4" />
              Ver conflictos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Botones de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Botón: Copiar semana anterior */}
          <Button variant="outline" size="sm" onClick={() => copyPreviousWeek()} disabled={hasShifts}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar Semana Anterior
          </Button>

          {hasShifts && !hasDrafts && (
            <p className="text-muted-foreground text-sm">✓ Todos los turnos están publicados</p>
          )}
        </div>

        {/* Botón: Publicar turnos */}
        {hasDrafts && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">
                {draftShiftsCount} {draftShiftsCount === 1 ? "turno" : "turnos"} pendiente
                {draftShiftsCount === 1 ? "" : "s"}
              </p>
            </div>

            <Button variant="default" size="sm" onClick={() => publishShifts()} className="gap-2">
              <Send className="h-4 w-4" />
              Publicar Turnos
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

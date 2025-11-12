/**
 * Barra de Acciones Masivas para Turnos
 *
 * Permite copiar turnos de la semana anterior y publicar turnos pendientes.
 */

"use client";

import { useMemo } from "react";

import { Copy, Send, Loader2, AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatWeekRange } from "../_lib/shift-utils";
import { useShiftsStore } from "../_store/shifts-store";

export function PublishBar() {
  const { shifts, currentWeekStart, copyFromPreviousWeek, publishWeekShifts } = useShiftsStore();

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
    <div className="space-y-4">
      {/* Estadísticas de la semana */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">Semana {formatWeekRange(currentWeekStart)}:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <span className="text-xs font-semibold">{shifts.length}</span>
            <span className="text-muted-foreground text-xs">Total</span>
          </Badge>

          {hasDrafts && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
            >
              <span className="text-xs font-semibold">{draftShiftsCount}</span>
              <span className="text-xs">Borrador</span>
            </Badge>
          )}

          {publishedShiftsCount > 0 && (
            <Badge variant="default" className="gap-1">
              <span className="text-xs font-semibold">{publishedShiftsCount}</span>
              <span className="text-xs">Publicado</span>
            </Badge>
          )}

          {hasConflicts && (
            <Badge variant="destructive" className="gap-1">
              <span className="text-xs font-semibold">{conflictShiftsCount}</span>
              <span className="text-xs">Conflictos</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Advertencia si hay conflictos */}
      {hasConflicts && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Atención:</strong> Hay {conflictShiftsCount} {conflictShiftsCount === 1 ? "turno" : "turnos"} con
            conflictos. Revisa los turnos marcados antes de publicar la semana.
          </AlertDescription>
        </Alert>
      )}

      {/* Botones de acciones */}
      <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Botón: Copiar semana anterior */}
          <Button variant="outline" size="default" onClick={() => copyFromPreviousWeek()} disabled={hasShifts}>
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
              <p className="text-muted-foreground text-xs">Publicar para notificar a empleados</p>
            </div>

            <Button variant="default" size="default" onClick={() => publishWeekShifts()} className="gap-2">
              <Send className="h-4 w-4" />
              Publicar Turnos
            </Button>
          </div>
        )}
      </div>

      {/* Info adicional */}
      <div className="text-muted-foreground space-y-1 text-xs">
        <p>
          <strong>Copiar semana anterior:</strong> Duplica todos los turnos de la semana pasada a esta semana. Solo
          disponible si la semana actual está vacía.
        </p>
        <p>
          <strong>Publicar turnos:</strong> Cambia el estado de todos los borradores a "Publicado" y notifica a los
          empleados. Los turnos publicados NO se pueden editar sin despublicar primero.
        </p>
      </div>
    </div>
  );
}

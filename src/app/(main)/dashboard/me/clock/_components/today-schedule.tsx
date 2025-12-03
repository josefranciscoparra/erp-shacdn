"use client";

import { memo, useCallback, useEffect, useState } from "react";

import { Calendar, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getTodaySchedule } from "@/server/actions/employee-schedule";
import { minutesToTime, formatDuration } from "@/services/schedules";
import type { EffectiveSchedule } from "@/types/schedule";

function TodayScheduleComponent() {
  const [schedule, setSchedule] = useState<EffectiveSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getTodaySchedule();

      if (result.success && result.schedule) {
        setSchedule(result.schedule);
      } else {
        setError(result.error ?? "Error al cargar horario");
      }
    } catch (err) {
      setError("Error al cargar horario");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("[TodaySchedule] Component mounted");
    loadSchedule();
  }, [loadSchedule]);

  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Tu Horario Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="bg-muted relative h-24 w-full overflow-hidden rounded-lg">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error ?? !schedule) {
    return (
      <Card className="@container/card border-orange-200 bg-orange-50/30 dark:border-orange-900 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Tu Horario Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-700 dark:text-orange-400">{error ?? "No se pudo cargar el horario"}</p>
        </CardContent>
      </Card>
    );
  }

  // Si no hay asignación de horario
  if (schedule.source === "NO_ASSIGNMENT") {
    return (
      <Card className="@container/card border-orange-200 bg-orange-50/30 dark:border-orange-900 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            Configuración Requerida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Badge
              variant="outline"
              className="w-fit border-orange-200 bg-orange-50/50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-400"
            >
              Sin horario asignado
            </Badge>
            <p className="text-sm text-orange-700 dark:text-orange-400">
              No tienes un horario asignado. Contacta con tu administrador para que te asigne un horario de trabajo.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // FASE 5.2: Si hay error de configuración en la plantilla asignada
  if (schedule.source === "CONFIGURATION_ERROR") {
    return (
      <Card className="@container/card border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
            Error de Configuración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Badge
              variant="outline"
              className="w-fit border-red-200 bg-red-50/50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
            >
              Plantilla incompleta
            </Badge>
            <p className="text-sm text-red-700 dark:text-red-400">
              {schedule.configurationError ??
                "Tu plantilla de horario tiene errores de configuración. Contacta con tu administrador para que complete la configuración."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si es ausencia
  if (schedule.source === "ABSENCE") {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Tu Horario Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Badge
              variant="outline"
              className="w-fit border-orange-200 bg-orange-50/50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-400"
            >
              {schedule.absence?.type}
            </Badge>
            <p className="text-muted-foreground text-sm">{schedule.absence?.reason ?? "Día de ausencia"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si no es día laboral
  if (!schedule.isWorkingDay) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Tu Horario Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">
              Día no laborable
            </Badge>
            <p className="text-muted-foreground text-sm">Hoy no tienes jornada laboral asignada según tu horario</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Horario normal con franjas horarias
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Tu Horario Hoy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Franjas horarias */}
          <div className="space-y-2">
            {schedule.timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-2">
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-sm">
                    {minutesToTime(slot.startMinutes)} - {minutesToTime(slot.endMinutes)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={slot.slotType === "WORK" ? "default" : "secondary"} className="text-xs">
                    {slot.slotType === "WORK" ? "Trabajo" : "Pausa"}
                  </Badge>
                  {slot.isMandatory && (
                    <Badge variant="outline" className="text-xs">
                      Obligatorio
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Aviso de Ausencia Parcial */}
          {schedule.absence && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-2 dark:border-orange-900 dark:bg-orange-950/30">
              <div className="flex items-center justify-between gap-2 text-orange-800 dark:text-orange-300">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-5 border-orange-300 bg-orange-100/50 px-1.5 py-0 text-[10px] text-orange-700"
                  >
                    {schedule.absence.type}
                  </Badge>
                  <span className="text-xs font-medium">Ausencia Parcial</span>
                </div>
                {schedule.absence.startTime !== undefined && schedule.absence.endTime !== undefined && (
                  <span className="rounded bg-orange-100/50 px-1.5 font-mono text-xs text-orange-700 dark:text-orange-400">
                    {minutesToTime(schedule.absence.startTime)} - {minutesToTime(schedule.absence.endTime)}
                  </span>
                )}
              </div>
              {schedule.absence.reason && (
                <p className="mt-1 ml-1 text-xs text-orange-700 dark:text-orange-400">{schedule.absence.reason}</p>
              )}
            </div>
          )}

          <Separator />

          {/* Resumen */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Horas esperadas:</span>
            <span className="font-medium">{formatDuration(schedule.expectedMinutes)}</span>
          </div>

          {schedule.periodName && <p className="text-muted-foreground text-xs">Período: {schedule.periodName}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// Memoizar el componente para evitar re-renders innecesarios cuando el padre se actualiza
export const TodaySchedule = memo(TodayScheduleComponent);

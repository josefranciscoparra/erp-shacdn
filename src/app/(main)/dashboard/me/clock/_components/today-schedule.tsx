"use client";

import { useCallback, useEffect, useState } from "react";

import { Calendar, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { minutesToTime, formatDuration } from "@/lib/schedule-helpers";
import { getTodaySchedule } from "@/server/actions/employee-schedule";
import type { EffectiveSchedule } from "@/types/schedule";

export function TodaySchedule() {
  const [schedule, setSchedule] = useState<EffectiveSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("[TodaySchedule] Component mounted");

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

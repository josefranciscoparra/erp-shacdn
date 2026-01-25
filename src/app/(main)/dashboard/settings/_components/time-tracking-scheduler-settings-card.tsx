"use client";

import { useCallback, useEffect, useState } from "react";

import { Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getGlobalTimeTrackingSchedulerSettings,
  updateGlobalTimeTrackingSchedulerSettings,
} from "@/server/actions/global-time-tracking-scheduler";
import { minutesToTime, timeToMinutes } from "@/services/schedules/schedule-helpers";

type SchedulerConfig = {
  timeTrackingSweepHour: number;
  timeTrackingSweepStartMinute: number;
  timeTrackingSweepEndHour: number;
  timeTrackingSweepEndMinute: number;
  timeTrackingSweepLookbackDays: number;
  timeTrackingDispatchIntervalMinutes: number;
};

function minutesToTimeSafe(value: number) {
  const minutes = Math.min(1439, Math.max(0, value));
  return minutesToTime(minutes);
}

export function TimeTrackingSchedulerSettingsCard() {
  const [config, setConfig] = useState<SchedulerConfig>({
    timeTrackingSweepHour: 4,
    timeTrackingSweepStartMinute: 0,
    timeTrackingSweepEndHour: 4,
    timeTrackingSweepEndMinute: 20,
    timeTrackingSweepLookbackDays: 1,
    timeTrackingDispatchIntervalMinutes: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoadError(null);
      setIsLoading(true);
      const data = await getGlobalTimeTrackingSchedulerSettings();
      setConfig(data);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error loading global time tracking scheduler settings:", error);
      toast.error("No se pudo cargar la configuración global");
      setLoadError(error instanceof Error ? error.message : "Error desconocido");
      setHasLoaded(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!hasLoaded) {
      toast.error("La configuración aún no se ha cargado");
      return;
    }

    try {
      setIsSaving(true);
      await updateGlobalTimeTrackingSchedulerSettings(config);
      toast.success("Configuración global actualizada");
    } catch (error) {
      console.error("Error updating global time tracking scheduler settings:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-lg border p-6">
        <Skeleton className="h-28 w-full" />
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-semibold">No se pudo cargar la configuración global</h3>
            <p className="text-muted-foreground text-sm">{loadError}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void loadSettings()} disabled={isLoading}>
              Reintentar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Cierre automático de jornadas incompletas</h3>
            <p className="text-muted-foreground text-sm">
              Configura cuándo el sistema cierra automáticamente los fichajes que quedaron sin registrar salida.
            </p>
          </div>
        </div>

        <div className="grid gap-6 @xl/main:grid-cols-2">
          <div className="space-y-2">
            <Label>Hora de inicio</Label>
            <Input
              type="time"
              step={60}
              value={minutesToTimeSafe(config.timeTrackingSweepHour * 60 + config.timeTrackingSweepStartMinute)}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                const minutes = timeToMinutes(value);
                setConfig((prev) => ({
                  ...prev,
                  timeTrackingSweepHour: Math.floor(minutes / 60),
                  timeTrackingSweepStartMinute: minutes % 60,
                }));
              }}
            />
            <p className="text-muted-foreground text-xs">El proceso se ejecuta según la hora local de cada empresa.</p>
          </div>

          <div className="space-y-2">
            <Label>Hora de fin</Label>
            <Input
              type="time"
              step={60}
              value={minutesToTimeSafe(config.timeTrackingSweepEndHour * 60 + config.timeTrackingSweepEndMinute)}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                const minutes = timeToMinutes(value);
                setConfig((prev) => ({
                  ...prev,
                  timeTrackingSweepEndHour: Math.floor(minutes / 60),
                  timeTrackingSweepEndMinute: minutes % 60,
                }));
              }}
            />
            <p className="text-muted-foreground text-xs">
              El proceso se ejecutará entre estas dos horas. Si la hora de fin es anterior, se entiende que cruza
              medianoche.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Días anteriores a revisar</Label>
            <Input
              type="number"
              min="1"
              max="14"
              value={config.timeTrackingSweepLookbackDays}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const value = Number.isNaN(parsed) ? 1 : parsed;
                setConfig((prev) => ({
                  ...prev,
                  timeTrackingSweepLookbackDays: Math.max(1, Math.min(14, value)),
                }));
              }}
            />
            <p className="text-muted-foreground text-xs">
              Cuántos días atrás se revisan para detectar jornadas sin cerrar.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Frecuencia de verificación (minutos)</Label>
            <Input
              type="number"
              min="1"
              max="60"
              value={config.timeTrackingDispatchIntervalMinutes}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const value = Number.isNaN(parsed) ? 1 : parsed;
                setConfig((prev) => ({
                  ...prev,
                  timeTrackingDispatchIntervalMinutes: Math.max(1, Math.min(60, value)),
                }));
              }}
            />
            <p className="text-muted-foreground text-xs">
              Cada cuántos minutos el sistema verifica si hay empresas con jornadas pendientes de cerrar.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Configuración avanzada</p>
            <p className="text-muted-foreground text-xs">
              Este proceso puede desactivarse a nivel de servidor si es necesario.
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px]">
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

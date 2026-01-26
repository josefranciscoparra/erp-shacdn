"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AlarmClock, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  getGlobalOvertimeSchedulerSettings,
  updateGlobalOvertimeSchedulerSettings,
} from "@/server/actions/global-overtime-scheduler";

type SchedulerConfig = {
  overtimeReconciliationEnabled: boolean;
  overtimeReconciliationWeekday: number;
  overtimeReconciliationHour: number;
  overtimeReconciliationWindowMinutes: number;
  overtimeReconciliationDispatchIntervalMinutes: number;
  overtimeDailySweepHour: number;
  overtimeDailySweepWindowMinutes: number;
  overtimeDailySweepLookbackDays: number;
  overtimeAuthorizationExpiryDays: number;
};

const weekdayOptions = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

function formatHourLabel(value: number) {
  const padded = value.toString().padStart(2, "0");
  return `${padded}:00`;
}

export function OvertimeSchedulerSettingsCard() {
  const [config, setConfig] = useState<SchedulerConfig>({
    overtimeReconciliationEnabled: true,
    overtimeReconciliationWeekday: 1,
    overtimeReconciliationHour: 4,
    overtimeReconciliationWindowMinutes: 20,
    overtimeReconciliationDispatchIntervalMinutes: 10,
    overtimeDailySweepHour: 4,
    overtimeDailySweepWindowMinutes: 20,
    overtimeDailySweepLookbackDays: 2,
    overtimeAuthorizationExpiryDays: 7,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoadError(null);
      setIsLoading(true);
      const data = await getGlobalOvertimeSchedulerSettings();
      setConfig(data);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error loading global overtime scheduler settings:", error);
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
      await updateGlobalOvertimeSchedulerSettings(config);
      toast.success("Configuración global actualizada");
    } catch (error) {
      console.error("Error updating global overtime scheduler settings:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar");
    } finally {
      setIsSaving(false);
    }
  };

  const weekdayLabel = useMemo(() => {
    const match = weekdayOptions.find((option) => option.value === config.overtimeReconciliationWeekday);
    return match ? match.label : "Lunes";
  }, [config.overtimeReconciliationWeekday]);

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
            <AlarmClock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Consolidación semanal de horas extra</h3>
            <p className="text-muted-foreground text-sm">
              Configura cuándo se consolidan automáticamente las horas extra para su revisión y aprobación.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Activar procesos automáticos</p>
            <p className="text-muted-foreground text-xs">
              Si está desactivado, no se ejecutará ninguna reconciliación automática.
            </p>
          </div>
          <Switch
            checked={config.overtimeReconciliationEnabled}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({
                ...prev,
                overtimeReconciliationEnabled: checked,
              }))
            }
          />
        </div>

        <div className="grid gap-6 @xl/main:grid-cols-2">
          <div className="space-y-2">
            <Label>Día de consolidación</Label>
            <Select
              value={String(config.overtimeReconciliationWeekday)}
              onValueChange={(value) =>
                setConfig((prev) => ({
                  ...prev,
                  overtimeReconciliationWeekday: Number.parseInt(value, 10),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekdayOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hora de consolidación</Label>
            <Select
              value={String(config.overtimeReconciliationHour)}
              onValueChange={(value) =>
                setConfig((prev) => ({
                  ...prev,
                  overtimeReconciliationHour: Number.parseInt(value, 10),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {Array.from({ length: 24 }).map((_, hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {formatHourLabel(hour)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Las horas extra se consolidan cada {weekdayLabel} a las{" "}
              {formatHourLabel(config.overtimeReconciliationHour)} (hora local de cada empresa).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Duración del proceso (minutos)</Label>
            <Input
              type="number"
              min="1"
              max="60"
              value={config.overtimeReconciliationWindowMinutes}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const value = Number.isNaN(parsed) ? 1 : parsed;
                setConfig((prev) => ({
                  ...prev,
                  overtimeReconciliationWindowMinutes: Math.max(1, Math.min(60, value)),
                }));
              }}
            />
            <p className="text-muted-foreground text-xs">Tiempo máximo que puede durar el proceso de consolidación.</p>
          </div>

          <div className="space-y-2">
            <Label>Hora de revisión automática</Label>
            <Select
              value={String(config.overtimeDailySweepHour)}
              onValueChange={(value) =>
                setConfig((prev) => ({
                  ...prev,
                  overtimeDailySweepHour: Number.parseInt(value, 10),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {Array.from({ length: 24 }).map((_, hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {formatHourLabel(hour)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Cada día, el sistema revisa si hay horas extra pendientes de procesar.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Duración de la revisión (minutos)</Label>
            <Input
              type="number"
              min="5"
              max="120"
              value={config.overtimeDailySweepWindowMinutes}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const value = Number.isNaN(parsed) ? 20 : parsed;
                setConfig((prev) => ({
                  ...prev,
                  overtimeDailySweepWindowMinutes: Math.max(5, Math.min(120, value)),
                }));
              }}
            />
            <p className="text-muted-foreground text-xs">Tiempo máximo que puede durar la revisión diaria.</p>
          </div>

          <div className="space-y-2">
            <Label>Días anteriores a revisar</Label>
            <Input
              type="number"
              min="1"
              max="14"
              value={config.overtimeDailySweepLookbackDays}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const value = Number.isNaN(parsed) ? 2 : parsed;
                setConfig((prev) => ({
                  ...prev,
                  overtimeDailySweepLookbackDays: Math.max(1, Math.min(14, value)),
                }));
              }}
            />
            <p className="text-muted-foreground text-xs">
              Cuántos días atrás se revisan para detectar horas extra no procesadas.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Expiración de solicitudes (días)</Label>
            <Input
              type="number"
              min="1"
              max="90"
              value={config.overtimeAuthorizationExpiryDays}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const value = Number.isNaN(parsed) ? 7 : parsed;
                setConfig((prev) => ({
                  ...prev,
                  overtimeAuthorizationExpiryDays: Math.max(1, Math.min(90, value)),
                }));
              }}
            />
            <p className="text-muted-foreground text-xs">
              Las solicitudes sin respuesta se cerrarán automáticamente pasado este tiempo.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Frecuencia de verificación (minutos)</Label>
            <Input
              type="number"
              min="1"
              max="60"
              value={config.overtimeReconciliationDispatchIntervalMinutes}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const value = Number.isNaN(parsed) ? 10 : parsed;
                setConfig((prev) => ({
                  ...prev,
                  overtimeReconciliationDispatchIntervalMinutes: Math.max(1, Math.min(60, value)),
                }));
              }}
            />
            <p className="text-muted-foreground text-xs">
              Cada cuántos minutos el sistema verifica si hay empresas pendientes de consolidar.
            </p>
          </div>
        </div>

        <div className="rounded-md border p-4">
          <div className="flex items-start gap-2 text-sm">
            <Info className="text-muted-foreground h-4 w-4" />
            <div className="space-y-1">
              <p className="font-medium">Información</p>
              <p className="text-muted-foreground text-xs">
                Esta configuración aplica a todas las empresas del sistema. Cada empresa puede activar o desactivar la
                consolidación semanal desde su propia configuración de Horas extra.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

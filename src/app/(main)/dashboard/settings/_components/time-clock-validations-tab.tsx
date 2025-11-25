"use client";

import { useEffect, useState } from "react";

import { ClockIcon, Settings2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  getOrganizationValidationConfig,
  updateOrganizationValidationConfig,
} from "@/server/actions/time-clock-validations";

interface ValidationConfig {
  clockInToleranceMinutes: number;
  clockOutToleranceMinutes: number;
  earlyClockInToleranceMinutes: number;
  lateClockOutToleranceMinutes: number;
  nonWorkdayClockInAllowed: boolean;
  nonWorkdayClockInWarning: boolean;
  // Nuevos campos de alertas
  criticalLateArrivalMinutes: number;
  criticalEarlyDepartureMinutes: number;
  alertsEnabled: boolean;
  alertNotificationsEnabled: boolean;
  alertNotificationRoles: string[];
}

export function TimeClockValidationsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<ValidationConfig>({
    clockInToleranceMinutes: 15,
    clockOutToleranceMinutes: 15,
    earlyClockInToleranceMinutes: 30,
    lateClockOutToleranceMinutes: 30,
    nonWorkdayClockInAllowed: false,
    nonWorkdayClockInWarning: true,
    criticalLateArrivalMinutes: 30,
    criticalEarlyDepartureMinutes: 30,
    alertsEnabled: true,
    alertNotificationsEnabled: false,
    alertNotificationRoles: ["RRHH"],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getOrganizationValidationConfig();
        setConfig(data);
      } catch (error) {
        console.error("Error loading validation config:", error);
        toast.error("Error al cargar la configuración");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateOrganizationValidationConfig(config);
      toast.success("Configuración actualizada correctamente");
    } catch (error) {
      console.error("Error updating validation config:", error);
      toast.error("Error al actualizar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border p-6">
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Settings2Icon className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Configuración de Validaciones de Fichajes</h3>
              <p className="text-muted-foreground text-sm">
                Define las tolerancias y reglas para los fichajes de entrada y salida
              </p>
            </div>
          </div>

          <div className="grid gap-6 @xl/main:grid-cols-2">
            {/* Tolerancia Entrada */}
            <div className="space-y-2">
              <Label htmlFor="clockInTolerance">Tolerancia Entrada (minutos)</Label>
              <Input
                id="clockInTolerance"
                type="number"
                min="0"
                max="60"
                value={config.clockInToleranceMinutes}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, clockInToleranceMinutes: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-muted-foreground text-xs">
                Minutos de retraso aceptables sin generar alerta (por defecto: 15 min)
              </p>
            </div>

            {/* Tolerancia Salida */}
            <div className="space-y-2">
              <Label htmlFor="clockOutTolerance">Tolerancia Salida (minutos)</Label>
              <Input
                id="clockOutTolerance"
                type="number"
                min="0"
                max="60"
                value={config.clockOutToleranceMinutes}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, clockOutToleranceMinutes: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-muted-foreground text-xs">
                Minutos de adelanto/retraso aceptables en salida (por defecto: 15 min)
              </p>
            </div>

            {/* Tolerancia Entrada Anticipada */}
            <div className="space-y-2">
              <Label htmlFor="earlyClockInTolerance">Tolerancia Entrada Anticipada (minutos)</Label>
              <Input
                id="earlyClockInTolerance"
                type="number"
                min="0"
                max="120"
                value={config.earlyClockInToleranceMinutes}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, earlyClockInToleranceMinutes: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-muted-foreground text-xs">
                Minutos antes del horario permitidos para fichar entrada (por defecto: 30 min)
              </p>
            </div>

            {/* Tolerancia Salida Tardía */}
            <div className="space-y-2">
              <Label htmlFor="lateClockOutTolerance">Tolerancia Salida Tardía (minutos)</Label>
              <Input
                id="lateClockOutTolerance"
                type="number"
                min="0"
                max="120"
                value={config.lateClockOutToleranceMinutes}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, lateClockOutToleranceMinutes: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-muted-foreground text-xs">
                Minutos después del horario permitidos para fichar salida (por defecto: 30 min)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/**
             * Temporalmente oculto: la API aún permite el fichaje siempre y solo guarda el warning,
             * así que mostramos únicamente la opción de alerta hasta que el backend haga cumplir esta regla.
             */}
            {/* <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="nonWorkdayAllowed">Permitir fichajes en días no laborables</Label>
                <p className="text-muted-foreground text-sm">
                  Los empleados podrán fichar en días festivos o fines de semana
                </p>
              </div>
              <Switch
                id="nonWorkdayAllowed"
                checked={config.nonWorkdayClockInAllowed}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, nonWorkdayClockInAllowed: checked }))}
              />
            </div> */}

            {/* Mostrar warning en días no laborables */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="nonWorkdayWarning">Alertar al fichar en día no laboral</Label>
                <p className="text-muted-foreground text-sm">
                  Mostrar aviso amarillo cuando fichen en días no laborables (aunque esté permitido)
                </p>
              </div>
              <Switch
                id="nonWorkdayWarning"
                checked={config.nonWorkdayClockInWarning}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, nonWorkdayClockInWarning: checked }))}
              />
            </div>
          </div>

          {/* Sección de Alertas Avanzadas */}
          <div className="border-t pt-6">
            <div className="mb-4 flex items-center gap-2">
              <Settings2Icon className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Sistema de Alertas Avanzadas</h3>
                <p className="text-muted-foreground text-sm">
                  Configura umbrales críticos y notificaciones automáticas para RRHH
                </p>
              </div>
            </div>

            <div className="grid gap-6 @xl/main:grid-cols-2">
              {/* Umbral crítico entrada tarde */}
              <div className="space-y-2">
                <Label htmlFor="criticalLateArrival">Umbral Crítico - Entrada Tarde (minutos)</Label>
                <Input
                  id="criticalLateArrival"
                  type="number"
                  min="0"
                  max="120"
                  value={config.criticalLateArrivalMinutes}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, criticalLateArrivalMinutes: parseInt(e.target.value) || 0 }))
                  }
                />
                <p className="text-muted-foreground text-xs">
                  A partir de estos minutos de retraso, la alerta es CRÍTICA (por defecto: 30 min)
                </p>
              </div>

              {/* Umbral crítico salida temprana */}
              <div className="space-y-2">
                <Label htmlFor="criticalEarlyDeparture">Umbral Crítico - Salida Temprana (minutos)</Label>
                <Input
                  id="criticalEarlyDeparture"
                  type="number"
                  min="0"
                  max="120"
                  value={config.criticalEarlyDepartureMinutes}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, criticalEarlyDepartureMinutes: parseInt(e.target.value) || 0 }))
                  }
                />
                <p className="text-muted-foreground text-xs">
                  A partir de estos minutos de salida anticipada, la alerta es CRÍTICA (por defecto: 30 min)
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Activar sistema de alertas */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="alertsEnabled">Activar Sistema de Alertas</Label>
                  <p className="text-muted-foreground text-sm">
                    Detectar automáticamente entradas tarde, salidas temprano y ausencias sin justificar
                  </p>
                </div>
                <Switch
                  id="alertsEnabled"
                  checked={config.alertsEnabled}
                  onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, alertsEnabled: checked }))}
                />
              </div>

              {/**
               * Sin efecto por ahora: no existe lógica para enviar notificaciones automáticas,
               * así que dejamos el bloque comentado hasta que se implemente el flujo real.
               */}
              {/* <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="alertNotifications">Enviar Notificaciones Automáticas</Label>
                  <p className="text-muted-foreground text-sm">
                    Notificar a RRHH/managers cuando se detecten alertas críticas
                  </p>
                </div>
                <Switch
                  id="alertNotifications"
                  checked={config.alertNotificationsEnabled}
                  onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, alertNotificationsEnabled: checked }))}
                  disabled={!config.alertsEnabled}
                />
              </div> */}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Card Informativo */}
      <Card className="rounded-lg border p-6">
        <div className="flex gap-3">
          <ClockIcon className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">¿Cómo funcionan las validaciones y alertas?</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
              <li>
                <strong>Tolerancia Entrada:</strong> Fichajes dentro de esta tolerancia no generan warning de retraso
              </li>
              <li>
                <strong>Tolerancia Salida:</strong> Salidas dentro de esta tolerancia no generan avisos
              </li>
              <li>
                <strong>Entrada Anticipada:</strong> Cuánto antes puede fichar sin generar alerta
              </li>
              <li>
                <strong>Salida Tardía:</strong> Cuánto después puede fichar salida sin generar alerta
              </li>
              <li>
                <strong>Alertas (3 niveles):</strong> INFO (informativo), WARNING (dentro de tolerancia), CRÍTICO
                (supera umbral crítico)
              </li>
              <li>
                <strong>Ejemplo:</strong> Tolerancia entrada 15min, Umbral crítico 30min → 0-15min = OK, 16-30min =
                WARNING, +30min = CRÍTICO
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import { ClockIcon, Settings2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  missingClockOutMode: "UNRESOLVED" | "AUTO_CLOSE";
  notifyEmployeeOnUnresolved: boolean;
  requireApprovalWhenOvertime: boolean;
  autoCloseEnabled: boolean;
  autoCloseStrategy: "SCHEDULE_END" | "FIXED_HOUR";
  autoCloseToleranceMinutes: number;
  autoCloseTriggerExtraMinutes: number;
  autoCloseMaxOpenHours: number;
  autoCloseFixedHour: number;
  autoCloseFixedMinute: number;
  autoClosedRequiresReview: boolean;
  // Nuevos campos de alertas
  criticalLateArrivalMinutes: number;
  criticalEarlyDepartureMinutes: number;
  alertsEnabled: boolean;
  alertsRequireResolution: boolean;
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
    missingClockOutMode: "UNRESOLVED",
    notifyEmployeeOnUnresolved: true,
    requireApprovalWhenOvertime: true,
    autoCloseEnabled: false,
    autoCloseStrategy: "SCHEDULE_END",
    autoCloseToleranceMinutes: 15,
    autoCloseTriggerExtraMinutes: 120,
    autoCloseMaxOpenHours: 16,
    autoCloseFixedHour: 0,
    autoCloseFixedMinute: 0,
    autoClosedRequiresReview: true,
    criticalLateArrivalMinutes: 30,
    criticalEarlyDepartureMinutes: 30,
    alertsEnabled: true,
    alertsRequireResolution: true,
    alertNotificationsEnabled: false,
    alertNotificationRoles: ["RRHH"],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const validationData = await getOrganizationValidationConfig();
        setConfig(validationData);
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
              <h3 className="font-semibold">Política de Registro de Jornada</h3>
              <p className="text-muted-foreground text-sm">
                Establece las reglas de puntualidad, flexibilidad y protocolos de cierre para el control horario.
              </p>
            </div>
          </div>

          <div className="grid gap-6 @xl/main:grid-cols-2">
            {/* Margen de entrada */}
            <div className="space-y-2">
              <Label htmlFor="clockInTolerance">Cortesía en entrada (minutos)</Label>
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
              <p className="text-muted-foreground text-xs">Tiempo de flexibilidad antes de considerar un retraso.</p>
            </div>

            {/* Margen de salida */}
            <div className="space-y-2">
              <Label htmlFor="clockOutTolerance">Flexibilidad en salida (minutos)</Label>
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
                Margen de tiempo aceptable respecto a la hora de salida teórica.
              </p>
            </div>

            {/* Entrada anticipada */}
            <div className="space-y-2">
              <Label htmlFor="earlyClockInTolerance">Antelación máxima permitida</Label>
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
                Límite de tiempo previo al inicio de jornada permitido para fichar.
              </p>
            </div>

            {/* Salida tardía */}
            <div className="space-y-2">
              <Label htmlFor="lateClockOutTolerance">Extensión máxima post-jornada</Label>
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
                Tiempo máximo permitido tras el fin de jornada antes de generar alerta.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Aviso en días no laborables */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="nonWorkdayWarning">Alertas en Días No Laborables</Label>
                <p className="text-muted-foreground text-sm">
                  Notificar registros de actividad en días festivos o de descanso.
                </p>
              </div>
              <Switch
                id="nonWorkdayWarning"
                checked={config.nonWorkdayClockInWarning}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, nonWorkdayClockInWarning: checked }))}
              />
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label>Gestión de Olvidos</Label>
                <p className="text-muted-foreground text-sm">
                  Protocolo a seguir cuando un empleado olvida registrar su salida.
                </p>
              </div>

              <div className="grid gap-4 @xl/main:grid-cols-2">
                <div className="space-y-2">
                  <Label>Protocolo de Ausencia de Salida</Label>
                  <Select
                    value={config.missingClockOutMode}
                    onValueChange={(value) =>
                      setConfig((prev) => ({
                        ...prev,
                        missingClockOutMode: value as ValidationConfig["missingClockOutMode"],
                        autoCloseEnabled: value === "AUTO_CLOSE",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNRESOLVED">Requiere regularización manual</SelectItem>
                      <SelectItem value="AUTO_CLOSE">Ejecutar cierre automático</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Recomendado: dejar pendiente para que el empleado justifique la corrección.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Notificación al Empleado</Label>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-muted-foreground text-sm">Enviar aviso automático al detectar un olvido</p>
                    <Switch
                      checked={config.notifyEmployeeOnUnresolved}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, notifyEmployeeOnUnresolved: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Validación de Exceso de Jornada</Label>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-muted-foreground text-sm">Supervisar si la corrección genera horas extra</p>
                    <Switch
                      checked={config.requireApprovalWhenOvertime}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, requireApprovalWhenOvertime: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label>Política de Cierre Automático</Label>
                <p className="text-muted-foreground text-sm">
                  Configuración del sistema para cerrar sesiones olvidadas por seguridad.
                </p>
              </div>

              <div className="grid gap-4 @xl/main:grid-cols-2">
                <div className="space-y-2">
                  <Label>Criterio de Cierre</Label>
                  <Select
                    value={config.autoCloseStrategy}
                    onValueChange={(value) =>
                      setConfig((prev) => ({
                        ...prev,
                        autoCloseStrategy: value as ValidationConfig["autoCloseStrategy"],
                      }))
                    }
                    disabled={config.missingClockOutMode !== "AUTO_CLOSE"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHEDULE_END">Según horario teórico</SelectItem>
                      <SelectItem value="FIXED_HOUR">Hora fija de corte</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    {config.autoCloseStrategy === "SCHEDULE_END"
                      ? "Cierra coincidiendo con el fin de turno planificado."
                      : "Cierra siempre a una hora específica predefinida."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Revisión Obligatoria</Label>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-muted-foreground text-sm">Marcar cierres automáticos como incidencias</p>
                    <Switch
                      checked={config.autoClosedRequiresReview}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, autoClosedRequiresReview: checked }))
                      }
                      disabled={config.missingClockOutMode !== "AUTO_CLOSE"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Latencia de cierre (min)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1440"
                    value={config.autoCloseToleranceMinutes}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setConfig((prev) => ({
                        ...prev,
                        autoCloseToleranceMinutes: Number.isNaN(value) ? prev.autoCloseToleranceMinutes : value,
                      }));
                    }}
                    disabled={config.missingClockOutMode !== "AUTO_CLOSE"}
                  />
                  <p className="text-muted-foreground text-xs">Tiempo de espera antes de forzar el cierre.</p>
                </div>

                <div className="space-y-2">
                  <Label>Tiempo máximo de sesión (horas)</Label>
                  <Input
                    type="number"
                    min="4"
                    max="48"
                    value={config.autoCloseMaxOpenHours}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setConfig((prev) => ({
                        ...prev,
                        autoCloseMaxOpenHours: Number.isNaN(value) ? prev.autoCloseMaxOpenHours : value,
                      }));
                    }}
                  />
                  <p className="text-muted-foreground text-xs">
                    Límite de seguridad para forzar el cierre de sesiones olvidadas.
                  </p>
                </div>

                {config.autoCloseStrategy === "FIXED_HOUR" && (
                  <div className="space-y-2">
                    <Label>Hora de cierre (hh:mm)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={config.autoCloseFixedHour}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setConfig((prev) => ({
                            ...prev,
                            autoCloseFixedHour: Number.isNaN(value) ? prev.autoCloseFixedHour : value,
                          }));
                        }}
                        disabled={config.missingClockOutMode !== "AUTO_CLOSE"}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={config.autoCloseFixedMinute}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setConfig((prev) => ({
                            ...prev,
                            autoCloseFixedMinute: Number.isNaN(value) ? prev.autoCloseFixedMinute : value,
                          }));
                        }}
                        disabled={config.missingClockOutMode !== "AUTO_CLOSE"}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">Se aplicará en la zona horaria de la empresa.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sección de Alertas */}
          <div className="border-t pt-6">
            <div className="mb-4 flex items-center gap-2">
              <Settings2Icon className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Detección de Anomalías</h3>
                <p className="text-muted-foreground text-sm">
                  Configura los umbrales para identificar comportamientos inusuales y automatizar notificaciones.
                </p>
              </div>
            </div>

            <div className="grid gap-6 @xl/main:grid-cols-2">
              {/* Umbral crítico entrada tarde */}
              <div className="space-y-2">
                <Label htmlFor="criticalLateArrival">Umbral de Retraso Grave (minutos)</Label>
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
                  Tiempo a partir del cual un retraso se etiqueta como incidencia crítica.
                </p>
              </div>

              {/* Umbral crítico salida temprana */}
              <div className="space-y-2">
                <Label htmlFor="criticalEarlyDeparture">Umbral de Salida Anticipada (minutos)</Label>
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
                  Tiempo a partir del cual una salida temprana se etiqueta como incidencia crítica.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Activar alertas */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="alertsEnabled">Monitorización de Anomalías</Label>
                  <p className="text-muted-foreground text-sm">
                    Habilitar el sistema de detección automática de incidencias.
                  </p>
                </div>
                <Switch
                  id="alertsEnabled"
                  checked={config.alertsEnabled}
                  onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, alertsEnabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="alertsRequireResolution">Resolución de Incidencias Obligatoria</Label>
                  <p className="text-muted-foreground text-sm">
                    Las anomalías detectadas requieren una acción explícita para cerrarse.
                  </p>
                </div>
                <Switch
                  id="alertsRequireResolution"
                  checked={config.alertsRequireResolution}
                  onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, alertsRequireResolution: checked }))}
                  disabled={!config.alertsEnabled}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="alertNotifications">Escalado a Responsables</Label>
                  <p className="text-muted-foreground text-sm">
                    Notificar automáticamente a los responsables ante incidencias graves.
                  </p>
                </div>
                <Switch
                  id="alertNotifications"
                  checked={config.alertNotificationsEnabled}
                  onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, alertNotificationsEnabled: checked }))}
                  disabled={!config.alertsEnabled}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Bolsa de horas</h3>
                <p className="text-muted-foreground text-sm">
                  La configuración de saldo y límites está en la pestaña Bolsa de horas.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Los responsables de aprobar solicitudes se definen en la pestaña Aprobaciones.
            </p>
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
          <div className="space-y-3">
            <p className="text-sm font-medium">¿Cómo funcionan las alertas?</p>
            <p className="text-muted-foreground text-xs">
              El sistema detecta automáticamente incidencias en los fichajes y las clasifica por gravedad:
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
              <li>
                <strong>Sin alerta:</strong> dentro del margen de tolerancia
              </li>
              <li>
                <strong>Aviso:</strong> fuera del margen pero dentro del umbral crítico
              </li>
              <li>
                <strong>Crítico:</strong> supera el umbral crítico configurado
              </li>
            </ul>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-muted-foreground text-xs">
                <strong>Ejemplo:</strong> Con margen de 15 min y umbral crítico de 30 min:
              </p>
              <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-0.5 text-xs">
                <li>Retraso de 10 min → sin alerta</li>
                <li>Retraso de 20 min → aviso</li>
                <li>Retraso de 45 min → crítico</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

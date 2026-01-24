"use client";

import { useCallback, useEffect, useState } from "react";

import { Clock, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  getGlobalOvertimeSchedulerSummary,
  type GlobalOvertimeSchedulerSettings,
} from "@/server/actions/global-overtime-scheduler";
import { getOvertimeSettings, updateOvertimeSettings } from "@/server/actions/overtime-settings";

type CalculationMode = "DAILY" | "WEEKLY" | "DAILY_WEEKLY";
type ApprovalMode = "NONE" | "POST" | "PRE";
type CompensationType = "PAY" | "TIME" | "MIXED" | "NONE";
type NonWorkingDayPolicy = "ALLOW" | "REQUIRE_APPROVAL";

interface OvertimeConfig {
  overtimeCalculationMode: CalculationMode;
  overtimeApprovalMode: ApprovalMode;
  overtimeCompensationType: CompensationType;
  overtimeToleranceMinutes: number;
  overtimeDailyLimitHours: number;
  overtimeWeeklyLimitHours: number;
  overtimeMonthlyLimitHours: number;
  overtimeAnnualLimitHours: number;
  overtimeFullTimeWeeklyHours: number;
  overtimeNonWorkingDayPolicy: NonWorkingDayPolicy;
  overtimeWeeklyReconciliationEnabled: boolean;
}

export function OvertimeTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [globalSchedule, setGlobalSchedule] = useState<GlobalOvertimeSchedulerSettings | null>(null);
  const [config, setConfig] = useState<OvertimeConfig>({
    overtimeCalculationMode: "DAILY",
    overtimeApprovalMode: "POST",
    overtimeCompensationType: "TIME",
    overtimeToleranceMinutes: 15,
    overtimeDailyLimitHours: 0,
    overtimeWeeklyLimitHours: 0,
    overtimeMonthlyLimitHours: 0,
    overtimeAnnualLimitHours: 0,
    overtimeFullTimeWeeklyHours: 40,
    overtimeNonWorkingDayPolicy: "REQUIRE_APPROVAL",
    overtimeWeeklyReconciliationEnabled: true,
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoadError(null);
      setIsLoading(true);
      const [settings, globalSummary] = await Promise.all([
        getOvertimeSettings(),
        getGlobalOvertimeSchedulerSummary().catch(() => null),
      ]);

      setConfig({
        overtimeCalculationMode: settings.overtimeCalculationMode,
        overtimeApprovalMode: settings.overtimeApprovalMode,
        overtimeCompensationType: settings.overtimeCompensationType,
        overtimeToleranceMinutes: settings.overtimeToleranceMinutes,
        overtimeDailyLimitHours: Math.round(settings.overtimeDailyLimitMinutes / 60),
        overtimeWeeklyLimitHours: Math.round(settings.overtimeWeeklyLimitMinutes / 60),
        overtimeMonthlyLimitHours: Math.round(settings.overtimeMonthlyLimitMinutes / 60),
        overtimeAnnualLimitHours: Math.round(settings.overtimeAnnualLimitMinutes / 60),
        overtimeFullTimeWeeklyHours: settings.overtimeFullTimeWeeklyHours,
        overtimeNonWorkingDayPolicy: settings.overtimeNonWorkingDayPolicy,
        overtimeWeeklyReconciliationEnabled: settings.overtimeWeeklyReconciliationEnabled,
      });
      if (globalSummary) {
        setGlobalSchedule(globalSummary);
      }
      setHasLoaded(true);
    } catch (error) {
      console.error("Error loading overtime settings:", error);
      toast.error("Error al cargar la configuración de horas extra");
      setLoadError(error instanceof Error ? error.message : "Error desconocido");
      setHasLoaded(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const weeklyScheduleLabel = (() => {
    if (!globalSchedule) return "Horario global no disponible";
    const weekdayMap = {
      1: "Lunes",
      2: "Martes",
      3: "Miércoles",
      4: "Jueves",
      5: "Viernes",
      6: "Sábado",
      7: "Domingo",
    } as const;
    const weekdayLabel = weekdayMap[globalSchedule.overtimeReconciliationWeekday] ?? "Lunes";
    const hourLabel = `${globalSchedule.overtimeReconciliationHour.toString().padStart(2, "0")}:00`;
    return `Cada ${weekdayLabel.toLowerCase()} a las ${hourLabel} se procesan automáticamente las horas de la semana anterior.`;
  })();

  const expiryLabel = (() => {
    if (!globalSchedule) return "Las solicitudes pendientes se cierran automáticamente tras el plazo definido.";
    return `Las solicitudes pendientes se cierran automáticamente tras ${globalSchedule.overtimeAuthorizationExpiryDays} días.`;
  })();

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
      await updateOvertimeSettings({
        overtimeCalculationMode: config.overtimeCalculationMode,
        overtimeApprovalMode: config.overtimeApprovalMode,
        overtimeCompensationType: config.overtimeCompensationType,
        overtimeToleranceMinutes: config.overtimeToleranceMinutes,
        overtimeDailyLimitMinutes: config.overtimeDailyLimitHours * 60,
        overtimeWeeklyLimitMinutes: config.overtimeWeeklyLimitHours * 60,
        overtimeMonthlyLimitMinutes: config.overtimeMonthlyLimitHours * 60,
        overtimeAnnualLimitMinutes: config.overtimeAnnualLimitHours * 60,
        overtimeFullTimeWeeklyHours: config.overtimeFullTimeWeeklyHours,
        overtimeNonWorkingDayPolicy: config.overtimeNonWorkingDayPolicy,
        overtimeWeeklyReconciliationEnabled: config.overtimeWeeklyReconciliationEnabled,
      });
      toast.success("Configuración de horas extra actualizada");
    } catch (error) {
      console.error("Error updating overtime settings:", error);
      toast.error(error instanceof Error ? error.message : "Error al actualizar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border p-6">
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-semibold">No se pudo cargar la configuración</h3>
              <p className="text-muted-foreground text-sm">{loadError}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void loadSettings()} disabled={isLoading}>
                Reintentar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Horas extra</h3>
              <p className="text-muted-foreground text-sm">
                Establece cómo se calculan, aprueban y compensan las horas trabajadas fuera del horario habitual.
              </p>
            </div>
          </div>

          <div className="grid gap-6 @xl/main:grid-cols-2">
            <div className="space-y-2">
              <Label>Cálculo</Label>
              <Select
                value={config.overtimeCalculationMode}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, overtimeCalculationMode: value as CalculationMode }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Diario — cada día se evalúa independientemente</SelectItem>
                  <SelectItem value="WEEKLY">Semanal — se acumulan las horas de toda la semana</SelectItem>
                  <SelectItem value="DAILY_WEEKLY">Diario con cierre semanal</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Define cuándo se considera que un empleado ha realizado horas extra.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Aprobación</Label>
              <Select
                value={config.overtimeApprovalMode}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, overtimeApprovalMode: value as ApprovalMode }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Automático — sin necesidad de aprobación</SelectItem>
                  <SelectItem value="POST">Posterior — aprobar después de realizarlas</SelectItem>
                  <SelectItem value="PRE">Previa — solicitar autorización antes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Compensación</Label>
              <Select
                value={config.overtimeCompensationType}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, overtimeCompensationType: value as CompensationType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIME">Bolsa de horas — acumular tiempo libre</SelectItem>
                  <SelectItem value="PAY">Nómina — pagar como complemento</SelectItem>
                  <SelectItem value="MIXED">A elección del empleado</SelectItem>
                  <SelectItem value="NONE">Solo registro — sin compensación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trabajo en festivos</Label>
              <Select
                value={config.overtimeNonWorkingDayPolicy}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, overtimeNonWorkingDayPolicy: value as NonWorkingDayPolicy }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALLOW">Permitir sin autorización</SelectItem>
                  <SelectItem value="REQUIRE_APPROVAL">Requiere autorización</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Controla si trabajar en días no laborables requiere autorización previa.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cierre semanal</Label>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Procesar automáticamente</p>
                  <p className="text-muted-foreground text-xs">
                    Se ejecuta de madrugada según el horario local de cada empresa.
                  </p>
                </div>
                <Switch
                  checked={config.overtimeWeeklyReconciliationEnabled}
                  onCheckedChange={(value) =>
                    setConfig((prev) => ({ ...prev, overtimeWeeklyReconciliationEnabled: value }))
                  }
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {weeklyScheduleLabel} {expiryLabel}
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4" />
              Tolerancias y límites
            </div>

            <div className="grid gap-6 @xl/main:grid-cols-2">
              <div className="space-y-2">
                <Label>Tolerancia (min)</Label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={config.overtimeToleranceMinutes}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const value = Number.isNaN(parsed) ? 0 : parsed;
                    setConfig((prev) => ({
                      ...prev,
                      overtimeToleranceMinutes: Math.max(0, Math.min(120, value)),
                    }));
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  Los primeros minutos trabajados de más no se consideran hora extra.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Horas semanales de referencia</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={config.overtimeFullTimeWeeklyHours}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const value = Number.isNaN(parsed) ? 40 : parsed;
                    setConfig((prev) => ({
                      ...prev,
                      overtimeFullTimeWeeklyHours: Math.max(1, Math.min(60, value)),
                    }));
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  Referencia para distinguir horas complementarias en contratos a tiempo parcial.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Límite diario (horas)</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={config.overtimeDailyLimitHours}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const value = Number.isNaN(parsed) ? 0 : parsed;
                    setConfig((prev) => ({
                      ...prev,
                      overtimeDailyLimitHours: Math.max(0, Math.min(24, value)),
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Límite semanal (horas)</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={config.overtimeWeeklyLimitHours}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const value = Number.isNaN(parsed) ? 0 : parsed;
                    setConfig((prev) => ({
                      ...prev,
                      overtimeWeeklyLimitHours: Math.max(0, Math.min(60, value)),
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Límite mensual (horas)</Label>
                <Input
                  type="number"
                  min="0"
                  max="200"
                  value={config.overtimeMonthlyLimitHours}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const value = Number.isNaN(parsed) ? 0 : parsed;
                    setConfig((prev) => ({
                      ...prev,
                      overtimeMonthlyLimitHours: Math.max(0, Math.min(200, value)),
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Límite anual (horas)</Label>
                <Input
                  type="number"
                  min="0"
                  max="400"
                  value={config.overtimeAnnualLimitHours}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const value = Number.isNaN(parsed) ? 0 : parsed;
                    setConfig((prev) => ({
                      ...prev,
                      overtimeAnnualLimitHours: Math.max(0, Math.min(400, value)),
                    }));
                  }}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">Déjalo en 0 para no establecer límite.</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

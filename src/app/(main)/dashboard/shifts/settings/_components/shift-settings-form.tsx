"use client";

/**
 * Formulario de Configuración de Turnos
 * Sprint 7
 */

import { useState, useEffect } from "react";

import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getShiftSettings, updateShiftSettings } from "@/server/actions/shift-settings";

export function ShiftSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await getShiftSettings();
      setConfig(data);
    } catch (error) {
      console.error("Error cargando configuración:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await updateShiftSettings(config);
      toast.success("Configuración guardada correctamente");
    } catch (error: any) {
      console.error("Error guardando configuración:", error);
      toast.error(error.message ?? "Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  function updateConfig(field: string, value: any) {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!config) return null;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
          <CardDescription>Define las reglas y límites del sistema de gestión de turnos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Granularidad de Planning */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Granularidad de Planning</Label>
            <div className="space-y-2">
              <Label htmlFor="planningGranularity">Intervalos de tiempo (minutos)</Label>
              <Select
                value={String(config.planningGranularityMinutes)}
                onValueChange={(val) => updateConfig("planningGranularityMinutes", Number(val))}
              >
                <SelectTrigger id="planningGranularity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">Los turnos se crearán en múltiplos de este intervalo</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekStartDay">Día de inicio de semana</Label>
              <Select
                value={String(config.weekStartDay)}
                onValueChange={(val) => updateConfig("weekStartDay", Number(val))}
              >
                <SelectTrigger id="weekStartDay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Domingo</SelectItem>
                  <SelectItem value="1">Lunes</SelectItem>
                  <SelectItem value="6">Sábado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Límites de Jornada */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Límites de Jornada</Label>

            <div className="grid gap-4 @2xl/main:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxDailyHours">Máximo horas diarias</Label>
                <Input
                  id="maxDailyHours"
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  value={config.maxDailyHours}
                  onChange={(e) => updateConfig("maxDailyHours", Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxWeeklyHours">Máximo horas semanales</Label>
                <Input
                  id="maxWeeklyHours"
                  type="number"
                  step="0.5"
                  min="1"
                  max="168"
                  value={config.maxWeeklyHours}
                  onChange={(e) => updateConfig("maxWeeklyHours", Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRestBetweenShifts">Descanso mínimo entre turnos (horas)</Label>
              <Input
                id="minRestBetweenShifts"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={config.minRestBetweenShiftsHours}
                onChange={(e) => updateConfig("minRestBetweenShiftsHours", Number(e.target.value))}
              />
              <p className="text-muted-foreground text-sm">Tiempo mínimo de descanso obligatorio entre dos turnos</p>
            </div>
          </div>

          <Separator />

          {/* Horas Complementarias */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-semibold">Horas Complementarias</Label>
                <p className="text-muted-foreground text-sm">Para empleados con contrato a tiempo parcial</p>
              </div>
              <Switch
                checked={config.complementaryHoursEnabled}
                onCheckedChange={(checked) => updateConfig("complementaryHoursEnabled", checked)}
              />
            </div>

            {config.complementaryHoursEnabled && (
              <div className="grid gap-4 @2xl/main:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="complementaryLimit">Límite (% sobre jornada)</Label>
                  <Input
                    id="complementaryLimit"
                    type="number"
                    step="5"
                    min="0"
                    max="100"
                    value={config.complementaryHoursLimitPercent ?? ""}
                    onChange={(e) =>
                      updateConfig("complementaryHoursLimitPercent", e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complementaryCap">Tope mensual (horas)</Label>
                  <Input
                    id="complementaryCap"
                    type="number"
                    step="1"
                    min="0"
                    value={config.complementaryHoursMonthlyCap ?? ""}
                    onChange={(e) =>
                      updateConfig("complementaryHoursMonthlyCap", e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="60"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Políticas de Publicación */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Políticas de Publicación</Label>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="publishRequiresApproval">Requiere aprobación</Label>
                <p className="text-muted-foreground text-sm">Los turnos deben ser aprobados antes de publicar</p>
              </div>
              <Switch
                id="publishRequiresApproval"
                checked={config.publishRequiresApproval}
                onCheckedChange={(checked) => updateConfig("publishRequiresApproval", checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minAdvancePublishDays">Días mínimos de anticipación</Label>
              <Input
                id="minAdvancePublishDays"
                type="number"
                min="0"
                max="30"
                value={config.minAdvancePublishDays}
                onChange={(e) => updateConfig("minAdvancePublishDays", Number(e.target.value))}
              />
              <p className="text-muted-foreground text-sm">Los turnos deben publicarse con X días de anticipación</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="allowEditAfterPublish">Permitir editar después de publicar</Label>
                <p className="text-muted-foreground text-sm">
                  Los planificadores pueden modificar turnos ya publicados
                </p>
              </div>
              <Switch
                id="allowEditAfterPublish"
                checked={config.allowEditAfterPublish}
                onCheckedChange={(checked) => updateConfig("allowEditAfterPublish", checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Validación de Cobertura */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Validación de Cobertura</Label>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enforceMinimumCoverage">Validar cobertura mínima</Label>
                <p className="text-muted-foreground text-sm">Avisar si no se cumple la cobertura mínima requerida</p>
              </div>
              <Switch
                id="enforceMinimumCoverage"
                checked={config.enforceMinimumCoverage}
                onCheckedChange={(checked) => updateConfig("enforceMinimumCoverage", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="blockPublishIfUncovered">Bloquear publicación sin cobertura</Label>
                <p className="text-muted-foreground text-sm">
                  Impedir publicar turnos si no se alcanza la cobertura mínima
                </p>
              </div>
              <Switch
                id="blockPublishIfUncovered"
                checked={config.blockPublishIfUncovered}
                onCheckedChange={(checked) => updateConfig("blockPublishIfUncovered", checked)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

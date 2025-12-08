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
import { getTimeBankFullSettings, updateTimeBankBasicSettings } from "@/server/actions/time-bank-settings";

interface TimeBankConfig {
  excessGraceMinutes: number;
  deficitGraceMinutes: number;
  roundingIncrementMinutes: number;
  maxPositiveHours: number; // En UI manejamos horas
  maxNegativeHours: number; // En UI manejamos horas
}

export function TimeBankTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [config, setConfig] = useState<TimeBankConfig>({
    excessGraceMinutes: 15,
    deficitGraceMinutes: 10,
    roundingIncrementMinutes: 5,
    maxPositiveHours: 80,
    maxNegativeHours: 8,
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoadError(null);
      setIsLoading(true);
      const settings = await getTimeBankFullSettings();
      setConfig({
        excessGraceMinutes: settings.excessGraceMinutes,
        deficitGraceMinutes: settings.deficitGraceMinutes,
        roundingIncrementMinutes: settings.roundingIncrementMinutes,
        // Convertir minutos a horas para la UI
        maxPositiveHours: Math.round(settings.maxPositiveMinutes / 60),
        maxNegativeHours: Math.round(settings.maxNegativeMinutes / 60),
      });
      setHasLoaded(true);
    } catch (error) {
      console.error("Error loading time bank settings:", error);
      toast.error("Error al cargar la configuración de bolsa de horas");
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
      // Convertir horas a minutos para guardar
      await updateTimeBankBasicSettings({
        excessGraceMinutes: config.excessGraceMinutes,
        deficitGraceMinutes: config.deficitGraceMinutes,
        roundingIncrementMinutes: config.roundingIncrementMinutes,
        maxPositiveMinutes: config.maxPositiveHours * 60,
        maxNegativeMinutes: config.maxNegativeHours * 60,
      });
      toast.success("Configuración de bolsa de horas actualizada");
    } catch (error) {
      console.error("Error updating time bank settings:", error);
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
          {/* Header */}
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Configuración de Bolsa de Horas</h3>
              <p className="text-muted-foreground text-sm">
                Define los márgenes y límites para el cálculo automático de la bolsa de horas
              </p>
            </div>
          </div>

          {/* Sección: Márgenes de Gracia */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Márgenes de Gracia</h4>
            <p className="text-muted-foreground text-xs">
              Pequeñas diferencias que no se acumulan en la bolsa de horas
            </p>

            <div className="grid gap-6 @xl/main:grid-cols-2">
              {/* Margen de exceso */}
              <div className="space-y-2">
                <Label htmlFor="excessGrace">Margen de Exceso (minutos)</Label>
                <Input
                  id="excessGrace"
                  type="number"
                  min="0"
                  max="60"
                  value={config.excessGraceMinutes}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      excessGraceMinutes: Math.max(0, Math.min(60, parseInt(e.target.value) || 0)),
                    }))
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Si un empleado trabaja hasta {config.excessGraceMinutes} minutos de más, NO se acumula en la bolsa
                </p>
              </div>

              {/* Margen de déficit */}
              <div className="space-y-2">
                <Label htmlFor="deficitGrace">Margen de Déficit (minutos)</Label>
                <Input
                  id="deficitGrace"
                  type="number"
                  min="0"
                  max="60"
                  value={config.deficitGraceMinutes}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      deficitGraceMinutes: Math.max(0, Math.min(60, parseInt(e.target.value) || 0)),
                    }))
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Si un empleado trabaja hasta {config.deficitGraceMinutes} minutos de menos, NO penaliza
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Redondeo */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">Redondeo de Diferencias</h4>

            <div className="grid gap-6 @xl/main:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rounding">Incremento de Redondeo</Label>
                <Select
                  value={String(config.roundingIncrementMinutes)}
                  onValueChange={(value) =>
                    setConfig((prev) => ({ ...prev, roundingIncrementMinutes: parseInt(value) }))
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger id="rounding">
                    <SelectValue placeholder="Selecciona incremento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minuto (sin redondeo)</SelectItem>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="10">10 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Las diferencias se redondean a múltiplos de este valor antes de aplicar márgenes
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Límites */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">Límites de Saldo</h4>
            <p className="text-muted-foreground text-xs">El saldo de la bolsa no puede exceder estos límites</p>

            <div className="grid gap-6 @xl/main:grid-cols-2">
              {/* Límite positivo */}
              <div className="space-y-2">
                <Label htmlFor="maxPositive">Máximo Saldo Positivo (horas)</Label>
                <Input
                  id="maxPositive"
                  type="number"
                  min="0"
                  max="500"
                  value={config.maxPositiveHours}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxPositiveHours: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Máximo de horas que un empleado puede acumular ({config.maxPositiveHours * 60} minutos)
                </p>
              </div>

              {/* Límite negativo */}
              <div className="space-y-2">
                <Label htmlFor="maxNegative">Máximo Saldo Negativo (horas)</Label>
                <Input
                  id="maxNegative"
                  type="number"
                  min="0"
                  max="100"
                  value={config.maxNegativeHours}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxNegativeHours: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Máximo déficit permitido antes de alertar ({config.maxNegativeHours * 60} minutos)
                </p>
              </div>
            </div>
          </div>

          {/* Botón guardar */}
          <div className="flex justify-end border-t pt-4">
            <Button onClick={handleSave} disabled={isSaving || !hasLoaded}>
              {isSaving ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Card Informativo */}
      <Card className="rounded-lg border p-6">
        <div className="flex gap-3">
          <Info className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium">¿Cómo funciona el cálculo de la bolsa de horas?</p>
            <div className="text-muted-foreground space-y-2 text-xs">
              <p>
                <strong>Orden de aplicación:</strong> Primero se redondea la diferencia, luego se aplican los márgenes.
              </p>
              <p>
                <strong>Ejemplo con redondeo 5 min, exceso 15 min, déficit 10 min:</strong>
              </p>
              <ul className="list-inside list-disc space-y-1 pl-2">
                <li>
                  +7 min trabajados → redondea a +5 min → menor que 15 min de exceso → <strong>0 min</strong>
                </li>
                <li>
                  +16 min trabajados → redondea a +15 min → menor o igual que 15 min → <strong>0 min</strong>
                </li>
                <li>
                  +23 min trabajados → redondea a +25 min → mayor que 15 min → <strong>+25 min</strong>
                </li>
                <li>
                  -7 min trabajados → redondea a -5 min → menor o igual que 10 min de déficit → <strong>0 min</strong>
                </li>
                <li>
                  -18 min trabajados → redondea a -20 min → mayor que 10 min → <strong>-20 min</strong>
                </li>
              </ul>
              <p className="mt-2">
                <strong>Límites:</strong> Si el saldo alcanza el límite configurado, las nuevas horas se recortarán
                automáticamente.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

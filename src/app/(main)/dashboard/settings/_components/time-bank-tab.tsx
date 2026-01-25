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
                Define las reglas para el cálculo automático del saldo de horas, estableciendo márgenes de cortesía y
                límites de acumulación para tu equipo.
              </p>
            </div>
          </div>

          {/* Sección: Márgenes de Gracia */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Márgenes de Cortesía</h4>
            <p className="text-muted-foreground text-xs">
              Establece un margen de tiempo en el que las pequeñas desviaciones no impactarán en el saldo del empleado.
            </p>

            <div className="grid gap-6 @xl/main:grid-cols-2">
              {/* Margen de exceso */}
              <div className="space-y-2">
                <Label htmlFor="excessGrace">Margen de exceso (minutos)</Label>
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
                  Tiempo trabajado de más que no se sumará a la bolsa si no supera este umbral.
                </p>
              </div>

              {/* Margen de déficit */}
              <div className="space-y-2">
                <Label htmlFor="deficitGrace">Margen de déficit (minutos)</Label>
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
                  Ausencia de tiempo que no descontará de la bolsa si no supera este umbral.
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Redondeo */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">Reglas de Redondeo</h4>

            <div className="grid gap-6 @xl/main:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rounding">Incremento de redondeo</Label>
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
                  Ajusta automáticamente los registros de tiempo al intervalo seleccionado (ej. bloques de 5 min).
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Límites */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">Límites de Saldo</h4>
            <p className="text-muted-foreground text-xs">Déjalo en 0 para no establecer límite.</p>

            <div className="grid gap-6 @xl/main:grid-cols-2">
              {/* Límite positivo */}
              <div className="space-y-2">
                <Label htmlFor="maxPositive">Tope de horas acumulables</Label>
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
                  Cantidad máxima de horas extra que un empleado puede almacenar en su bolsa.
                </p>
              </div>

              {/* Límite negativo */}
              <div className="space-y-2">
                <Label htmlFor="maxNegative">Límite de deuda horaria</Label>
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
                <p className="text-muted-foreground text-xs">Máximo de horas negativas permitidas por empleado.</p>
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
            <p className="text-sm font-medium">¿Cómo funciona el cálculo?</p>
            <div className="text-muted-foreground space-y-2 text-xs">
              <p>
                El sistema calcula automáticamente la diferencia entre el horario teórico y el fichaje real. Si la
                diferencia está dentro del &quot;Margen de Cortesía&quot;, se ignora. Si lo supera, se aplica el
                redondeo y se suma o resta a la bolsa del empleado.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

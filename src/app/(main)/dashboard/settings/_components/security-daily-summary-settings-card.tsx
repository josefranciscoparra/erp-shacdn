"use client";

import { useCallback, useEffect, useState } from "react";

import { MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getGlobalSecurityDailySummarySettings,
  updateGlobalSecurityDailySummarySettings,
  type GlobalSecurityDailySummarySettings,
} from "@/server/actions/global-security-summary";

type FormState = {
  enabled: boolean;
  timeZone: string;
  dispatchHour: number;
  recipientsInput: string;
  orgIdsInput: string;
  sendEmpty: boolean;
};

function formatHourLabel(value: number) {
  const padded = value.toString().padStart(2, "0");
  return `${padded}:00`;
}

function parseList(value: string) {
  return value
    .split(/[,\\n]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatList(values: string[]) {
  if (values.length === 0) return "";
  return values.join(", ");
}

function mapSettingsToForm(settings: GlobalSecurityDailySummarySettings): FormState {
  return {
    enabled: settings.enabled,
    timeZone: settings.timeZone,
    dispatchHour: settings.dispatchHour,
    recipientsInput: formatList(settings.recipients),
    orgIdsInput: formatList(settings.orgIds),
    sendEmpty: settings.sendEmpty,
  };
}

function mapFormToSettings(form: FormState): GlobalSecurityDailySummarySettings {
  return {
    enabled: form.enabled,
    timeZone: form.timeZone.trim(),
    dispatchHour: form.dispatchHour,
    dispatchMinute: 0,
    windowMinutes: 30,
    lookbackHours: 24,
    dispatchIntervalMinutes: 10,
    recipients: parseList(form.recipientsInput),
    orgIds: parseList(form.orgIdsInput),
    sendEmpty: form.sendEmpty,
  };
}

export function SecurityDailySummarySettingsCard() {
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoadError(null);
      setIsLoading(true);
      const data = await getGlobalSecurityDailySummarySettings();
      setForm(mapSettingsToForm(data));
    } catch (error) {
      console.error("Error loading security summary settings:", error);
      toast.error("No se pudo cargar la configuración del resumen");
      setLoadError(error instanceof Error ? error.message : "Error desconocido");
      setForm(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!form) return;
    try {
      setIsSaving(true);
      const payload = mapFormToSettings(form);
      await updateGlobalSecurityDailySummarySettings(payload);
      toast.success("Resumen diario actualizado");
      setForm(mapSettingsToForm(payload));
    } catch (error) {
      console.error("Error updating security summary settings:", error);
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

  if (loadError || !form) {
    return (
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-semibold">No se pudo cargar la configuración</h3>
            <p className="text-muted-foreground text-sm">{loadError ?? "Error desconocido"}</p>
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
            <MailCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Resumen diario de seguridad</h3>
            <p className="text-muted-foreground text-sm">
              Envía un email diario con intentos fallidos, bloqueos y desbloqueos por organización.
            </p>
          </div>
        </div>

        <div className="grid gap-6 @xl/main:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Activar resumen</p>
              <p className="text-muted-foreground text-xs">Se enviará a los destinatarios configurados.</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm((prev) => (prev ? { ...prev, enabled: checked } : prev))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Enviar aunque no haya eventos</p>
              <p className="text-muted-foreground text-xs">Útil para confirmar que el sistema funciona.</p>
            </div>
            <Switch
              checked={form.sendEmpty}
              onCheckedChange={(checked) => setForm((prev) => (prev ? { ...prev, sendEmpty: checked } : prev))}
            />
          </div>

          <div className="space-y-2">
            <Label>Hora de envío</Label>
            <Select
              value={String(form.dispatchHour)}
              onValueChange={(value) =>
                setForm((prev) => (prev ? { ...prev, dispatchHour: Number.parseInt(value, 10) } : prev))
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
              Se enviará cada día a las {formatHourLabel(form.dispatchHour)}.
            </p>
          </div>

          <div className="space-y-2 @xl/main:col-span-2">
            <Label>Destinatarios</Label>
            <Textarea
              value={form.recipientsInput}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, recipientsInput: event.target.value } : prev))}
              placeholder="security@timenow.cloud, Admin <admin@timenow.cloud>"
              rows={3}
            />
            <p className="text-muted-foreground text-xs">
              Separa por comas o saltos de línea. Puedes usar el formato Nombre &lt;email&gt;.
            </p>
          </div>

          <div className="space-y-2 @xl/main:col-span-2">
            <Label>Filtrar por organizaciones (opcional)</Label>
            <Textarea
              value={form.orgIdsInput}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, orgIdsInput: event.target.value } : prev))}
              placeholder="org_123, org_456"
              rows={2}
            />
            <p className="text-muted-foreground text-xs">
              Si se indica, el resumen solo incluirá estas organizaciones.
            </p>
          </div>
        </div>

        <div className="rounded-md border p-4">
          <div className="flex items-start gap-2 text-sm">
            <ShieldCheck className="text-muted-foreground h-4 w-4" />
            <div className="space-y-1">
              <p className="font-medium">Información</p>
              <p className="text-muted-foreground text-xs">
                El envío diario depende de que el worker esté activo. En entornos con EMAIL_SEND_ENABLED=false no se
                enviarán correos.
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

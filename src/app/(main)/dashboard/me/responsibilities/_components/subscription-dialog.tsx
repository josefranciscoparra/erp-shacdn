"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { subscribeToAlerts, updateAlertSubscription } from "@/server/actions/alerts";
import type { ResponsibilityScope, ResponsibilityWithSubscription } from "@/server/actions/responsibilities";

type SubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responsibility: ResponsibilityWithSubscription | null;
  onSuccess: () => void;
};

const ALERT_TYPES = [
  { value: "LATE_ARRIVAL", label: "Entrada tardía" },
  { value: "CRITICAL_LATE_ARRIVAL", label: "Entrada crítica" },
  { value: "EARLY_DEPARTURE", label: "Salida temprana" },
  { value: "CRITICAL_EARLY_DEPARTURE", label: "Salida crítica" },
  { value: "MISSING_CLOCK_IN", label: "Falta entrada" },
  { value: "MISSING_CLOCK_OUT", label: "Falta salida" },
  { value: "NON_WORKDAY_CLOCK_IN", label: "Fichaje día no laboral" },
  { value: "EXCESSIVE_HOURS", label: "Horas excesivas" },
];

const SEVERITY_LEVELS = [
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Aviso" },
  { value: "CRITICAL", label: "Crítico" },
];

export function SubscriptionDialog({ open, onOpenChange, responsibility, onSuccess }: SubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Cargar datos de suscripción existente al abrir el dialog
  useEffect(() => {
    if (open && responsibility) {
      if (responsibility.subscription) {
        // Editar suscripción existente
        setSelectedSeverities(responsibility.subscription.severityLevels);
        setSelectedTypes(responsibility.subscription.alertTypes);
      } else {
        // Nueva suscripción
        setSelectedSeverities([]);
        setSelectedTypes([]);
      }
    }
  }, [open, responsibility]);

  // Toggle severity
  const toggleSeverity = (severity: string) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity],
    );
  };

  // Toggle type
  const toggleType = (type: string) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  // Obtener scopeId según el tipo de responsabilidad
  const getScopeId = (): string | null => {
    if (!responsibility) return null;
    if (responsibility.scope === "ORGANIZATION") return null;
    if (responsibility.scope === "DEPARTMENT") return responsibility.department?.id ?? null;
    if (responsibility.scope === "COST_CENTER") return responsibility.costCenter?.id ?? null;
    if (responsibility.scope === "TEAM") return responsibility.team?.id ?? null;
    return null;
  };

  // Obtener título del área
  const getAreaTitle = (): string => {
    if (!responsibility) return "";
    if (responsibility.scope === "ORGANIZATION") return responsibility.organization?.name ?? "Organización";
    if (responsibility.scope === "DEPARTMENT") return responsibility.department?.name ?? "Departamento";
    if (responsibility.scope === "COST_CENTER") return responsibility.costCenter?.name ?? "Centro";
    if (responsibility.scope === "TEAM") return responsibility.team?.name ?? "Equipo";
    return "";
  };

  // Submit (crear o actualizar)
  const handleSubmit = async () => {
    if (!responsibility) return;

    try {
      setLoading(true);

      if (responsibility.subscription) {
        // Actualizar suscripción existente
        await updateAlertSubscription(responsibility.subscription.id, {
          severityLevels: selectedSeverities.length > 0 ? selectedSeverities : undefined,
          alertTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        });
      } else {
        // Crear nueva suscripción
        await subscribeToAlerts(responsibility.scope as any, getScopeId(), {
          severityLevels: selectedSeverities.length > 0 ? selectedSeverities : undefined,
          alertTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        });
      }

      alert("Suscripción guardada exitosamente");
      onSuccess();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Error al gestionar suscripción"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Alertas</DialogTitle>
          <DialogDescription>
            Personaliza qué alertas quieres recibir para: <strong>{getAreaTitle()}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros de severidad */}
          <div className="space-y-2">
            <Label>Severidad (opcional)</Label>
            <p className="text-muted-foreground text-xs">Deja vacío para recibir todas las severidades</p>
            <div className="flex flex-wrap gap-4">
              {SEVERITY_LEVELS.map((severity) => (
                <div key={severity.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`severity-${severity.value}`}
                    checked={selectedSeverities.includes(severity.value)}
                    onCheckedChange={() => toggleSeverity(severity.value)}
                  />
                  <label
                    htmlFor={`severity-${severity.value}`}
                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {severity.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros de tipo */}
          <div className="space-y-2">
            <Label>Tipos de alerta (opcional)</Label>
            <p className="text-muted-foreground text-xs">Deja vacío para recibir todos los tipos</p>
            <div className="grid grid-cols-2 gap-3">
              {ALERT_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={selectedTypes.includes(type.value)}
                    onCheckedChange={() => toggleType(type.value)}
                  />
                  <label
                    htmlFor={`type-${type.value}`}
                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

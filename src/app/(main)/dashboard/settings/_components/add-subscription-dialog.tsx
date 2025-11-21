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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { subscribeToAlerts } from "@/server/actions/alerts";
import { getAvailableScopes } from "@/server/actions/user-context";

type AddSubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type AvailableScopes = {
  hasOrganizationScope: boolean;
  departments: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; name: string; code: string | null }>;
  teams: Array<{ id: string; name: string; code: string | null }>;
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

export function AddSubscriptionDialog({ open, onOpenChange, onSuccess }: AddSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [availableScopes, setAvailableScopes] = useState<AvailableScopes | null>(null);

  // Form state
  const [scope, setScope] = useState<"ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM">("ORGANIZATION");
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Cargar scopes disponibles al abrir el dialog
  useEffect(() => {
    console.log("[AddSubscriptionDialog] useEffect ejecutado. open =", open);
    if (open) {
      console.log("[AddSubscriptionDialog] Diálogo abierto, cargando scopes...");
      loadAvailableScopes();
      // Reset form
      setScope("ORGANIZATION");
      setScopeId(null);
      setNotifyByEmail(false);
      setSelectedSeverities([]);
      setSelectedTypes([]);
    }
  }, [open]);

  const loadAvailableScopes = async () => {
    console.log("[AddSubscriptionDialog] loadAvailableScopes iniciado");
    try {
      const scopes = await getAvailableScopes();
      console.log("[AddSubscriptionDialog] Scopes recibidos:", scopes);
      setAvailableScopes(scopes as AvailableScopes);
    } catch (error) {
      console.error("[AddSubscriptionDialog] Error al cargar scopes:", error);
    }
  };

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

  // Submit
  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validar que se haya seleccionado scopeId si no es ORGANIZATION
      if (scope !== "ORGANIZATION" && !scopeId) {
        alert("Error: Debes seleccionar un ámbito específico");
        setLoading(false);
        return;
      }

      await subscribeToAlerts(scope, scopeId, {
        severityLevels: selectedSeverities.length > 0 ? selectedSeverities : undefined,
        alertTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        notifyByEmail,
      });

      alert("Suscripción creada exitosamente");
      onSuccess();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Error al crear suscripción"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Añadir Suscripción a Alertas</DialogTitle>
          <DialogDescription>
            Configura una nueva suscripción para recibir alertas de fichajes de un ámbito específico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selector de scope */}
          <div className="space-y-2">
            <Label>Ámbito</Label>
            <Select
              value={scope}
              onValueChange={(value) => {
                setScope(value as typeof scope);
                setScopeId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableScopes?.hasOrganizationScope && (
                  <SelectItem value="ORGANIZATION">Toda la organización</SelectItem>
                )}
                {availableScopes && availableScopes.departments.length > 0 && (
                  <SelectItem value="DEPARTMENT">Departamento específico</SelectItem>
                )}
                {availableScopes && availableScopes.costCenters.length > 0 && (
                  <SelectItem value="COST_CENTER">Centro de coste específico</SelectItem>
                )}
                {availableScopes && availableScopes.teams.length > 0 && (
                  <SelectItem value="TEAM">Equipo específico</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de ámbito específico */}
          {scope === "DEPARTMENT" && availableScopes && availableScopes.departments.length > 0 && (
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={scopeId ?? ""} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un departamento" />
                </SelectTrigger>
                <SelectContent>
                  {availableScopes.departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === "COST_CENTER" && availableScopes && availableScopes.costCenters.length > 0 && (
            <div className="space-y-2">
              <Label>Centro de Coste</Label>
              <Select value={scopeId ?? ""} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un centro" />
                </SelectTrigger>
                <SelectContent>
                  {availableScopes.costCenters.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name} {center.code ? `(${center.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === "TEAM" && availableScopes && availableScopes.teams.length > 0 && (
            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select value={scopeId ?? ""} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {availableScopes.teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} {team.code ? `(${team.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {/* Notificación por email */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Notificaciones por email</Label>
              <p className="text-muted-foreground text-xs">Recibir alertas por correo electrónico</p>
            </div>
            <Switch checked={notifyByEmail} onCheckedChange={setNotifyByEmail} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creando..." : "Crear Suscripción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

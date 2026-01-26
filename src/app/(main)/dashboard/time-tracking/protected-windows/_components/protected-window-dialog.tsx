"use client";

import { useEffect, useMemo, useState } from "react";

import { CalendarDays, Clock, Moon, Shield, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeCombobox } from "@/components/ui/employee-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createProtectedWindow, updateProtectedWindow } from "@/server/actions/protected-windows";
import { minutesToTime, timeToMinutes } from "@/services/schedules/schedule-helpers";

type ProtectedWindowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: {
    id: string;
    name: string;
    description?: string | null;
    scope: "ORGANIZATION" | "EMPLOYEE";
    weekdays: number[];
    startMinutes: number;
    endMinutes: number;
    overrideToleranceMinutes?: number | null;
    overrideMaxOpenHours?: number | null;
    isActive: boolean;
    employee?: { id: string; name: string } | null;
  } | null;
  onSaved: () => void;
};

const weekdayOptions = [
  { value: 1, label: "Lun", fullLabel: "Lunes" },
  { value: 2, label: "Mar", fullLabel: "Martes" },
  { value: 3, label: "Mié", fullLabel: "Miércoles" },
  { value: 4, label: "Jue", fullLabel: "Jueves" },
  { value: 5, label: "Vie", fullLabel: "Viernes" },
  { value: 6, label: "Sáb", fullLabel: "Sábado" },
  { value: 7, label: "Dom", fullLabel: "Domingo" },
];

export function ProtectedWindowDialog({ open, onOpenChange, initialData, onSaved }: ProtectedWindowDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"ORGANIZATION" | "EMPLOYEE">("ORGANIZATION");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("22:00");
  const [endTime, setEndTime] = useState("06:00");
  const [overrideToleranceMinutes, setOverrideToleranceMinutes] = useState<number | "">("");
  const [overrideMaxOpenHours, setOverrideMaxOpenHours] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setDescription(initialData?.description ?? "");
      setScope(initialData?.scope ?? "ORGANIZATION");
      setEmployeeId(initialData?.employee?.id ?? "");
      setWeekdays(initialData?.weekdays?.length ? initialData.weekdays : [1, 2, 3, 4, 5]);
      setStartTime(initialData ? minutesToTime(initialData.startMinutes) : "22:00");
      setEndTime(initialData ? minutesToTime(initialData.endMinutes) : "06:00");
      setOverrideToleranceMinutes(initialData?.overrideToleranceMinutes ?? "");
      setOverrideMaxOpenHours(initialData?.overrideMaxOpenHours ?? "");
      setIsActive(initialData ? initialData.isActive : true);
    }
  }, [open, initialData]);

  const crossesMidnight = useMemo(() => {
    try {
      const start = timeToMinutes(startTime);
      const end = timeToMinutes(endTime);
      return end <= start;
    } catch {
      return false;
    }
  }, [startTime, endTime]);

  const handleToggleWeekday = (day: number) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]));
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      toast.error("El nombre debe tener al menos 3 caracteres");
      return;
    }

    if (weekdays.length === 0) {
      toast.error("Selecciona al menos un día de la semana");
      return;
    }

    const normalizedEmployeeId = employeeId === "__none__" ? "" : employeeId;
    if (scope === "EMPLOYEE" && normalizedEmployeeId.trim().length === 0) {
      toast.error("Selecciona un empleado para el ámbito individual");
      return;
    }

    try {
      setIsSaving(true);
      let startMinutes: number;
      let endMinutes: number;
      try {
        startMinutes = timeToMinutes(startTime);
        endMinutes = timeToMinutes(endTime);
      } catch {
        toast.error("Selecciona una hora de inicio y fin válidas");
        return;
      }
      if (startMinutes === endMinutes) {
        toast.error("El inicio y el fin no pueden ser iguales");
        return;
      }

      const payload = {
        name: trimmedName,
        description,
        scope,
        weekdays,
        startMinutes,
        endMinutes,
        overrideToleranceMinutes: overrideToleranceMinutes === "" ? null : Number(overrideToleranceMinutes),
        overrideMaxOpenHours: overrideMaxOpenHours === "" ? null : Number(overrideMaxOpenHours),
        isActive,
        employeeId: scope === "EMPLOYEE" ? normalizedEmployeeId : null,
      };

      if (initialData) {
        await updateProtectedWindow(initialData.id, payload);
        toast.success("Excepción actualizada");
      } else {
        await createProtectedWindow(payload);
        toast.success("Excepción creada");
      }

      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error("Error al guardar excepción:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const applyTemplate = (template: "on_call_night" | "ops_close" | "weekend_emergency") => {
    if (template === "on_call_night") {
      setName("Guardia nocturna");
      setDescription("Ventana para guardias nocturnas: permite más margen antes de autocerrar.");
      setScope("ORGANIZATION");
      setEmployeeId("");
      setWeekdays([1, 2, 3, 4, 5]);
      setStartTime("22:00");
      setEndTime("06:00");
      setOverrideToleranceMinutes(60);
      setOverrideMaxOpenHours(20);
      setIsActive(true);
      return;
    }

    if (template === "ops_close") {
      setName("Cierre operativo");
      setDescription("Cierre diario: evita incidencias por cierres algo más tardíos.");
      setScope("ORGANIZATION");
      setEmployeeId("");
      setWeekdays([1, 2, 3, 4, 5]);
      setStartTime("19:00");
      setEndTime("21:00");
      setOverrideToleranceMinutes(30);
      setOverrideMaxOpenHours("");
      setIsActive(true);
      return;
    }

    setName("Emergencias fin de semana");
    setDescription("Ventana para incidencias/urgencias en fin de semana.");
    setScope("ORGANIZATION");
    setEmployeeId("");
    setWeekdays([6, 7]);
    setStartTime("00:00");
    setEndTime("23:59");
    setOverrideToleranceMinutes(60);
    setOverrideMaxOpenHours(24);
    setIsActive(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            {initialData ? "Editar excepción" : "Nueva excepción"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Define ventanas donde el autocierre se relaja para guardias o cierres operativos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
            {/* Plantillas rápidas */}
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                <Sparkles className="h-3 w-3" />
                Plantillas rápidas
              </Label>
              <div className="xs:grid-cols-3 grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start px-3 py-2"
                  onClick={() => applyTemplate("on_call_night")}
                >
                  <Moon className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-xs">Guardia nocturna</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start px-3 py-2"
                  onClick={() => applyTemplate("ops_close")}
                >
                  <Clock className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-xs">Cierre operativo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start px-3 py-2"
                  onClick={() => applyTemplate("weekend_emergency")}
                >
                  <Zap className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-xs">Emergencias finde</span>
                </Button>
              </div>
            </div>

            {/* Información básica */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">
                  Nombre
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej: Guardia nocturna IT"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">
                  Descripción
                  <span className="text-muted-foreground ml-1 text-xs font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe el propósito de esta excepción..."
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </div>

            {/* Ámbito */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Ámbito</Label>
                <Select
                  value={scope}
                  onValueChange={(value) => {
                    setScope(value as "ORGANIZATION" | "EMPLOYEE");
                    if (value === "ORGANIZATION") {
                      setEmployeeId("");
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORGANIZATION">Toda la organización</SelectItem>
                    <SelectItem value="EMPLOYEE">Empleado específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Empleado</Label>
                <EmployeeCombobox
                  value={employeeId}
                  onValueChange={setEmployeeId}
                  placeholder={scope === "EMPLOYEE" ? "Buscar..." : "No aplica"}
                  emptyText="Sin empleado"
                  disabled={scope !== "EMPLOYEE"}
                  minChars={2}
                />
              </div>
            </div>

            {/* Días de la semana */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                Días activos
              </Label>
              <div className="flex flex-wrap gap-1">
                {weekdayOptions.map((day) => {
                  const isSelected = weekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleWeekday(day.value)}
                      className={`flex h-9 w-9 items-center justify-center rounded-md border text-xs font-medium transition-colors sm:h-10 sm:w-10 sm:text-sm ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-input"
                      }`}
                      title={day.fullLabel}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horario */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5" />
                  Horario de la ventana
                </Label>
                {crossesMidnight ? (
                  <Badge variant="secondary" className="text-xs">
                    <Moon className="mr-1 h-3 w-3" />
                    Cruza medianoche
                  </Badge>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Inicio</span>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Fin</span>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Ajustes de autocierre */}
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                Ajustes durante la ventana
              </Label>
              <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="tolerance" className="text-xs">
                    Latencia extra (min)
                  </Label>
                  <Input
                    id="tolerance"
                    type="number"
                    min="0"
                    placeholder="Por defecto"
                    value={overrideToleranceMinutes}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      setOverrideToleranceMinutes(Number.isNaN(parsed) ? "" : parsed);
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxHours" className="text-xs">
                    Máx. sesión (horas)
                  </Label>
                  <Input
                    id="maxHours"
                    type="number"
                    min="0"
                    placeholder="Por defecto"
                    value={overrideMaxOpenHours}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      setOverrideMaxOpenHours(Number.isNaN(parsed) ? "" : parsed);
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">Deja vacío para usar la configuración base del sistema.</p>
            </div>

            {/* Estado activo */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Ventana activa</p>
                <p className="text-muted-foreground text-xs">Desactiva para pausar sin eliminar</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

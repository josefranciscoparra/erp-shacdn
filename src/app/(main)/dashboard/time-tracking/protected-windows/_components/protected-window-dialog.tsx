"use client";

import { useEffect, useMemo, useState } from "react";

import { CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  employees: Array<{ id: string; name: string }>;
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
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

export function ProtectedWindowDialog({
  open,
  onOpenChange,
  employees,
  initialData,
  onSaved,
}: ProtectedWindowDialogProps) {
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

  const employeeOptions = useMemo(() => employees, [employees]);

  const handleToggleWeekday = (day: number) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      const payload = {
        name,
        description,
        scope,
        weekdays,
        startMinutes,
        endMinutes,
        overrideToleranceMinutes: overrideToleranceMinutes === "" ? null : Number(overrideToleranceMinutes),
        overrideMaxOpenHours: overrideMaxOpenHours === "" ? null : Number(overrideMaxOpenHours),
        isActive,
        employeeId: scope === "EMPLOYEE" ? employeeId : null,
      };

      if (initialData) {
        await updateProtectedWindow(initialData.id, payload);
        toast.success("Ventana actualizada");
      } else {
        await createProtectedWindow(payload);
        toast.success("Ventana creada");
      }

      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error("Error al guardar ventana protegida:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar ventana protegida" : "Nueva ventana protegida"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Ámbito</Label>
            <Select
              value={scope}
              onValueChange={(value) => {
                setScope(value as "ORGANIZATION" | "EMPLOYEE");
                if (value === "ORGANIZATION") {
                  setEmployeeId("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ORGANIZATION">Organización</SelectItem>
                <SelectItem value="EMPLOYEE">Empleado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Empleado</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={scope !== "EMPLOYEE"}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona empleado" />
              </SelectTrigger>
              <SelectContent>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Días de la semana
            </Label>
            <div className="flex flex-wrap gap-4">
              {weekdayOptions.map((day) => (
                <label key={day.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={weekdays.includes(day.value)}
                    onCheckedChange={() => handleToggleWeekday(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Inicio
            </Label>
            <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Fin</Label>
            <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Tolerancia extra (min)</Label>
            <Input
              type="number"
              min="0"
              value={overrideToleranceMinutes}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                setOverrideToleranceMinutes(Number.isNaN(parsed) ? "" : parsed);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Máximo horas abiertas</Label>
            <Input
              type="number"
              min="0"
              value={overrideMaxOpenHours}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                setOverrideMaxOpenHours(Number.isNaN(parsed) ? "" : parsed);
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
            <div>
              <p className="text-sm font-medium">Ventana activa</p>
              <p className="text-muted-foreground text-xs">Desactiva para pausar la regla sin eliminarla.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

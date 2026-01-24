"use client";

import { useEffect, useMemo, useState } from "react";

import { Wrench } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type OnCallInterventionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Array<{ id: string; name: string }>;
  schedules: Array<{ id: string; startAt: Date; endAt: Date; employee?: { id: string; name: string } | null }>;
  initialData: {
    id: string;
    employee?: { id: string; name: string } | null;
    startAt: Date;
    endAt: Date;
    notes?: string | null;
    scheduleId?: string | null;
  } | null;
  onSave: (payload: {
    employeeId: string;
    startAt: string;
    endAt: string;
    notes?: string;
    scheduleId?: string | null;
  }) => Promise<void>;
};

export function OnCallInterventionDialog({
  open,
  onOpenChange,
  employees,
  schedules,
  initialData,
  onSave,
}: OnCallInterventionDialogProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [scheduleId, setScheduleId] = useState<string>("none");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmployeeId(initialData?.employee?.id ?? "");
    setScheduleId(initialData?.scheduleId ?? "none");
    setStartAt(initialData ? new Date(initialData.startAt).toISOString().slice(0, 16) : "");
    setEndAt(initialData ? new Date(initialData.endAt).toISOString().slice(0, 16) : "");
    setNotes(initialData?.notes ?? "");
  }, [open, initialData]);

  const scheduleOptions = useMemo(
    () =>
      schedules.map((schedule) => ({
        id: schedule.id,
        label: `${schedule.employee?.name ?? "Organización"} • ${new Date(schedule.startAt).toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        })}`,
      })),
    [schedules],
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave({
        employeeId,
        startAt,
        endAt,
        notes,
        scheduleId: scheduleId === "none" ? null : scheduleId,
      });
      toast.success(initialData ? "Intervención actualizada" : "Intervención registrada");
      onOpenChange(false);
    } catch (error) {
      console.error("Error guardando intervención:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {initialData ? "Editar intervención" : "Nueva intervención"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Empleado</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Guardia asociada (opcional)</Label>
            <Select value={scheduleId} onValueChange={setScheduleId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin guardia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin guardia</SelectItem>
                {scheduleOptions.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Inicio</Label>
            <Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Fin</Label>
            <Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
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

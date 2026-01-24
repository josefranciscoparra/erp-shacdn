"use client";

import { useEffect, useState } from "react";

import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type OnCallScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Array<{ id: string; name: string }>;
  initialData: {
    id: string;
    scope?: "EMPLOYEE" | "ORGANIZATION";
    employee?: { id: string; name: string } | null;
    startAt: Date;
    endAt: Date;
    notes?: string | null;
    availabilityCompensationType?: "NONE" | "TIME" | "PAY" | "MIXED";
    availabilityCompensationMinutes?: number;
    availabilityCompensationAmount?: number;
    availabilityCompensationCurrency?: string;
  } | null;
  onSave: (payload: {
    scope?: "EMPLOYEE" | "ORGANIZATION";
    employeeId?: string | null;
    startAt: string;
    endAt: string;
    notes?: string;
    availabilityCompensationType?: "NONE" | "TIME" | "PAY" | "MIXED";
    availabilityCompensationMinutes?: number;
    availabilityCompensationAmount?: number;
    availabilityCompensationCurrency?: string;
  }) => Promise<void>;
};

export function OnCallScheduleDialog({
  open,
  onOpenChange,
  employees,
  initialData,
  onSave,
}: OnCallScheduleDialogProps) {
  const [scope, setScope] = useState<"EMPLOYEE" | "ORGANIZATION">("EMPLOYEE");
  const [employeeId, setEmployeeId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");
  const [compensationType, setCompensationType] = useState<"NONE" | "TIME" | "PAY" | "MIXED">("NONE");
  const [compensationMinutes, setCompensationMinutes] = useState("0");
  const [compensationAmount, setCompensationAmount] = useState("0");
  const [compensationCurrency, setCompensationCurrency] = useState("EUR");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const nextScope = initialData?.scope ?? "EMPLOYEE";
    setScope(nextScope);
    setEmployeeId(initialData?.employee?.id ?? "");
    setStartAt(initialData ? new Date(initialData.startAt).toISOString().slice(0, 16) : "");
    setEndAt(initialData ? new Date(initialData.endAt).toISOString().slice(0, 16) : "");
    setNotes(initialData?.notes ?? "");
    setCompensationType(initialData?.availabilityCompensationType ?? "NONE");
    setCompensationMinutes(String(initialData?.availabilityCompensationMinutes ?? 0));
    setCompensationAmount(String(initialData?.availabilityCompensationAmount ?? 0));
    setCompensationCurrency(initialData?.availabilityCompensationCurrency ?? "EUR");
  }, [open, initialData]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave({
        scope,
        employeeId: scope === "EMPLOYEE" ? employeeId : null,
        startAt,
        endAt,
        notes,
        availabilityCompensationType: compensationType,
        availabilityCompensationMinutes: Number(compensationMinutes) || 0,
        availabilityCompensationAmount: Number(compensationAmount) || 0,
        availabilityCompensationCurrency: compensationCurrency.trim().length > 0 ? compensationCurrency.trim() : "EUR",
      });
      toast.success(initialData ? "Guardia actualizada" : "Guardia creada");
      onOpenChange(false);
    } catch (error) {
      console.error("Error guardando guardia:", error);
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
            <CalendarClock className="h-5 w-5" />
            {initialData ? "Editar guardia" : "Nueva guardia"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Alcance</Label>
            <Select value={scope} onValueChange={(value) => setScope(value as "EMPLOYEE" | "ORGANIZATION")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                <SelectItem value="ORGANIZATION">Organización</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-1">
            <Label>Empleado</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={scope !== "EMPLOYEE"}>
              <SelectTrigger>
                <SelectValue placeholder={scope === "EMPLOYEE" ? "Selecciona empleado" : "No aplica"} />
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

          <div className="space-y-2 md:col-span-2">
            <Label>Compensación de disponibilidad</Label>
            <Select
              value={compensationType}
              onValueChange={(value) => setCompensationType(value as typeof compensationType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona compensación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Sin compensación</SelectItem>
                <SelectItem value="TIME">Bolsa de horas</SelectItem>
                <SelectItem value="PAY">Pago fijo</SelectItem>
                <SelectItem value="MIXED">Mixta (tiempo + pago)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(compensationType === "TIME" || compensationType === "MIXED") && (
            <div className="space-y-2">
              <Label>Minutos a bolsa</Label>
              <Input
                type="number"
                min={0}
                value={compensationMinutes}
                onChange={(event) => setCompensationMinutes(event.target.value)}
              />
            </div>
          )}

          {(compensationType === "PAY" || compensationType === "MIXED") && (
            <>
              <div className="space-y-2">
                <Label>Importe</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={compensationAmount}
                  onChange={(event) => setCompensationAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Input value={compensationCurrency} onChange={(event) => setCompensationCurrency(event.target.value)} />
              </div>
            </>
          )}
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

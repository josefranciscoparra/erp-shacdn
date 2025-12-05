"use client";

import { useState, useEffect, useTransition } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type VacationCalculation } from "@/lib/vacation-calculator";
import { calculateSettlement, createSettlement } from "@/server/actions/vacation-settlement";

interface NewSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  employeeNumber: string | null;
}

export function NewSettlementDialog({ open, onOpenChange, onSuccess }: NewSettlementDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [settlementDate, setSettlementDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [calculation, setCalculation] = useState<VacationCalculation | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isCalculating, startCalculation] = useTransition();
  const [isCreating, startCreation] = useTransition();

  // Cargar empleados al abrir el diálogo
  useEffect(() => {
    if (open) {
      loadEmployees();
    }
  }, [open]);

  // Calcular cuando cambie el empleado o la fecha
  useEffect(() => {
    if (selectedEmployeeId && settlementDate) {
      startCalculation(async () => {
        try {
          const result = await calculateSettlement(selectedEmployeeId, settlementDate);
          setCalculation(result);
        } catch (err) {
          console.error("Error al calcular:", err);
          setCalculation(null);
        }
      });
    } else {
      setCalculation(null);
    }
  }, [selectedEmployeeId, settlementDate]);

  const loadEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const response = await fetch("/api/employees?active=true");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees ?? data);
      }
    } catch (err) {
      console.error("Error al cargar empleados:", err);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleCreate = () => {
    if (!selectedEmployeeId || !settlementDate) {
      toast.error("Selecciona un empleado y una fecha");
      return;
    }

    startCreation(async () => {
      try {
        const result = await createSettlement({
          employeeId: selectedEmployeeId,
          settlementDate,
          notes: notes || undefined,
        });

        if (result.success) {
          toast.success("Liquidación creada correctamente");
          onSuccess();
          handleClose();
        } else {
          toast.error(result.error ?? "Error al crear liquidación");
        }
      } catch {
        toast.error("Error al crear liquidación");
      }
    });
  };

  const handleClose = () => {
    setSelectedEmployeeId("");
    setSettlementDate(new Date());
    setNotes("");
    setCalculation(null);
    onOpenChange(false);
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nueva liquidación de vacaciones</DialogTitle>
          <DialogDescription>Calcula y registra la liquidación de vacaciones de un empleado</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="employee">Empleado</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={isLoadingEmployees}>
              <SelectTrigger id="employee">
                <SelectValue placeholder={isLoadingEmployees ? "Cargando..." : "Seleccionar empleado"} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.displayName ?? `${employee.firstName} ${employee.lastName}`}
                    {employee.employeeNumber && ` (${employee.employeeNumber})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Fecha de liquidación</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !settlementDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {settlementDate ? format(settlementDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={settlementDate}
                  onSelect={(date) => date && setSettlementDate(date)}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Previsualización del cálculo */}
          {isCalculating ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              <span className="text-muted-foreground ml-2">Calculando...</span>
            </div>
          ) : calculation ? (
            <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
              <h4 className="font-medium">Previsualización del cálculo</h4>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Días devengados:</span>
                  <span className="ml-2 font-mono">{calculation.accruedDays.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Días disfrutados:</span>
                  <span className="ml-2 font-mono">{calculation.usedDays.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Días pendientes:</span>
                  <span className="ml-2 font-mono">{calculation.pendingDays.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Días activos:</span>
                  <span className="ml-2 font-mono">{calculation.totalActiveDays}</span>
                </div>
              </div>

              <div className="border-t pt-2">
                <span className="text-muted-foreground">Saldo final:</span>
                <span
                  className={cn(
                    "ml-2 font-mono text-lg font-bold",
                    calculation.balanceDays >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {calculation.balanceDays >= 0 ? "+" : ""}
                  {calculation.balanceDays.toFixed(2)} días
                </span>
              </div>

              {calculation.balanceDays > 0 && (
                <p className="text-muted-foreground text-xs">
                  El empleado tiene días a su favor que deben ser liquidados o compensados.
                </p>
              )}
              {calculation.balanceDays < 0 && (
                <p className="text-muted-foreground text-xs">El empleado ha disfrutado más días de los devengados.</p>
              )}
              {calculation.isDiscontinuous && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Contrato fijo discontinuo - {calculation.totalPausedDays} días pausados
                </p>
              )}
            </div>
          ) : selectedEmployeeId ? (
            <div className="text-muted-foreground rounded-lg border p-4 text-center">
              Selecciona un empleado y fecha para ver el cálculo
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Motivo de la liquidación, observaciones..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!selectedEmployeeId || !calculation || isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear liquidación"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

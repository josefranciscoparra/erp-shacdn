"use client";

import { useState, useEffect, useTransition } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Calculator, AlertCircle } from "lucide-react";
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
import { EmployeeCombobox } from "@/components/ui/employee-combobox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type VacationCalculation } from "@/lib/vacation-calculator";
import { calculateSettlement, createSettlement } from "@/server/actions/vacation-settlement";

interface NewSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewSettlementDialog({ open, onOpenChange, onSuccess }: NewSettlementDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [settlementDate, setSettlementDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [calculation, setCalculation] = useState<VacationCalculation | null>(null);
  const [isCalculating, startCalculation] = useTransition();
  const [isCreating, startCreation] = useTransition();

  // Calcular cuando cambie el empleado o la fecha
  useEffect(() => {
    if (selectedEmployeeId && selectedEmployeeId !== "__none__" && settlementDate) {
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

  const handleCreate = () => {
    if (!selectedEmployeeId || selectedEmployeeId === "__none__" || !settlementDate) {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Nueva liquidación de vacaciones
          </DialogTitle>
          <DialogDescription>Calcula y registra la liquidación final de vacaciones para un empleado.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee">Empleado</Label>
              <EmployeeCombobox
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
                placeholder="Buscar empleado..."
                minChars={0}
              />
            </div>

            <div className="space-y-2">
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
          </div>

          <Separator />

          {/* Previsualización del cálculo */}
          <div className="min-h-[200px]">
            {isCalculating ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center space-y-2 py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span>Calculando días devengados...</span>
              </div>
            ) : calculation ? (
              <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
                <div className="bg-muted/40 border-b p-4">
                  <h4 className="font-semibold">Resumen del cálculo</h4>
                  <p className="text-muted-foreground text-xs">
                    Basado en la fecha {format(settlementDate, "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div className="flex justify-between border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Días devengados (+)</span>
                      <span className="font-mono font-medium">{calculation.accruedDays.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Días disfrutados (-)</span>
                      <span className="font-mono font-medium text-red-600 dark:text-red-400">
                        {calculation.usedDays.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Pendientes aprobación (-)</span>
                      <span className="font-mono font-medium text-yellow-600 dark:text-yellow-400">
                        {calculation.pendingDays.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Días activos</span>
                      <span className="text-muted-foreground font-mono">{calculation.totalActiveDays}</span>
                    </div>
                  </div>

                  <div className="bg-muted/50 mt-6 flex items-center justify-between rounded-md p-3">
                    <span className="font-semibold">Saldo final a liquidar</span>
                    <span
                      className={cn(
                        "font-mono text-xl font-bold",
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
                    <div className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span>El empleado tiene saldo a favor. Debe ser pagado en la liquidación.</span>
                    </div>
                  )}
                  {calculation.balanceDays < 0 && (
                    <div className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span>El empleado debe días. Se descontarán de la liquidación.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedEmployeeId && selectedEmployeeId !== "__none__" ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center space-y-2 rounded-lg border border-dashed p-8">
                <Calculator className="h-8 w-8 opacity-50" />
                <span>Selecciona un empleado y fecha para ver el cálculo</span>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center space-y-2 rounded-lg border border-dashed p-8">
                <Calculator className="h-8 w-8 opacity-50" />
                <span>Selecciona un empleado para comenzar</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Añade observaciones, motivo del fin de contrato, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedEmployeeId || selectedEmployeeId === "__none__" || !calculation || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Confirmar y Crear"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

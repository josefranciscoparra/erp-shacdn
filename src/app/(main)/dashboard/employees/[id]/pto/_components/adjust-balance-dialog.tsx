"use client";

import { useState, useEffect } from "react";

import type { PtoAdjustmentType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adjustPtoBalance } from "@/server/actions/admin-pto";
import { formatWorkingDays } from "@/services/pto/pto-helpers-client";

interface AdjustBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  currentBalance: {
    annualAllowance: number;
    daysUsed: number;
    daysPending: number;
    daysAvailable: number;
  } | null;
  onSuccess: () => void;
}

export function AdjustBalanceDialog({
  open,
  onOpenChange,
  employeeId,
  currentBalance,
  onSuccess,
}: AdjustBalanceDialogProps) {
  const [action, setAction] = useState<"add" | "subtract">("add");
  const [days, setDays] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<PtoAdjustmentType | "">("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpiar formulario cuando se cierre la modal
  useEffect(() => {
    if (!open) {
      setAction("add");
      setDays("");
      setAdjustmentType("");
      setIsRecurring(false);
      setReason("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!days || Number(days) === 0) {
      toast.error("Debes especificar una cantidad de días");
      return;
    }

    if (!adjustmentType) {
      toast.error("Debes seleccionar un tipo de ajuste");
      return;
    }

    if (!reason.trim()) {
      toast.error("Debes proporcionar un motivo");
      return;
    }

    setIsSubmitting(true);
    try {
      const daysAdjusted = action === "add" ? Number(days) : -Number(days);

      await adjustPtoBalance({
        employeeId,
        daysAdjusted,
        adjustmentType,
        reason,
        notes: notes.trim() || undefined,
        isRecurring,
      });

      toast.success("Balance ajustado correctamente");
      onSuccess();

      // Cerrar modal (el useEffect se encargará de limpiar)
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al ajustar balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewBalance = currentBalance
    ? {
        before: currentBalance.annualAllowance,
        after: currentBalance.annualAllowance + (action === "add" ? Number(days || 0) : -Number(days || 0)),
      }
    : null;
  const previewDisplay = previewBalance
    ? {
        beforeRounded: Number(previewBalance.before.toFixed(1)),
        afterRounded: Number(previewBalance.after.toFixed(1)),
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajustar Balance de Vacaciones</DialogTitle>
          <DialogDescription>Añade o quita días del balance de vacaciones del empleado</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Acción */}
          <div className="space-y-2">
            <Label>Acción *</Label>
            <RadioGroup value={action} onValueChange={(v) => setAction(v as "add" | "subtract")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="add" id="add" />
                <Label htmlFor="add" className="cursor-pointer font-normal">
                  ➕ Añadir días
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="subtract" id="subtract" />
                <Label htmlFor="subtract" className="cursor-pointer font-normal">
                  ➖ Quitar días
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Cantidad */}
          <div className="space-y-2">
            <Label htmlFor="days">Cantidad de días *</Label>
            <Input
              id="days"
              type="number"
              min="0"
              step="0.5"
              placeholder="Ej: 2"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>

          {/* Tipo de ajuste */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentType">Tipo de ajuste *</Label>
            <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as PtoAdjustmentType)}>
              <SelectTrigger id="adjustmentType">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CORRECTION">Corrección de error</SelectItem>
                <SelectItem value="COMPENSATION">Compensación</SelectItem>
                <SelectItem value="SENIORITY_BONUS">Días por antigüedad</SelectItem>
                <SelectItem value="COLLECTIVE_AGREEMENT">Días por convenio</SelectItem>
                <SelectItem value="OTHER">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Aplicación */}
          <div className="space-y-2">
            <Label>Aplicación del ajuste *</Label>
            <RadioGroup
              value={isRecurring ? "recurring" : "once"}
              onValueChange={(v) => setIsRecurring(v === "recurring")}
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="once" id="once" className="mt-1" />
                <Label htmlFor="once" className="cursor-pointer leading-relaxed font-normal">
                  Solo para este año ({new Date().getFullYear()})
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="recurring" id="recurring" className="mt-1" />
                <Label htmlFor="recurring" className="cursor-pointer leading-relaxed font-normal">
                  Recurrente (cada año desde {new Date().getFullYear()})
                </Label>
              </div>
            </RadioGroup>

            {isRecurring && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/20">
                <p className="font-medium text-blue-900 dark:text-blue-100">💡 Ajuste recurrente</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-700 dark:text-blue-300">
                  Se aplicará automáticamente al calcular el balance cada año. Puedes desactivarlo más tarde si es
                  necesario.
                </p>
              </div>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Textarea
              id="reason"
              placeholder="Ej: Compensación por trabajo en festivo"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Información adicional (opcional)"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Preview */}
          {previewBalance && previewDisplay && (
            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
                <span className="text-muted-foreground">Balance actual ({new Date().getFullYear()}):</span>
                <span className="font-medium">
                  {formatWorkingDays(previewDisplay.beforeRounded)}{" "}
                  {previewDisplay.beforeRounded === 1 ? "día" : "días"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-sm font-semibold">
                <span>Después del ajuste:</span>
                <span className={previewBalance.after > previewBalance.before ? "text-green-600" : "text-red-600"}>
                  {formatWorkingDays(previewDisplay.afterRounded)} {previewDisplay.afterRounded === 1 ? "día" : "días"}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              "Aplicar ajuste"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

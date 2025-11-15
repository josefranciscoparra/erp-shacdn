"use client";

import { useState } from "react";

import { AlertTriangle, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reimburseExpenses } from "@/server/actions/expense-reimbursements";

interface ReimbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseIds: string[];
  totalAmount: number;
  employeeCount: number;
  onSuccess: () => void;
}

type ReimbursementMethod = "TRANSFER" | "PAYROLL" | "CASH" | "OTHER";

const METHOD_LABELS: Record<ReimbursementMethod, string> = {
  TRANSFER: "Transferencia bancaria",
  PAYROLL: "Nómina",
  CASH: "Efectivo",
  OTHER: "Otro método",
};

export function ReimbursementDialog({
  open,
  onOpenChange,
  expenseIds,
  totalAmount,
  employeeCount,
  onSuccess,
}: ReimbursementDialogProps) {
  const [method, setMethod] = useState<ReimbursementMethod>("TRANSFER");
  const [reference, setReference] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReimburse = async () => {
    try {
      setIsLoading(true);

      const result = await reimburseExpenses({
        expenseIds,
        method,
        reference: reference.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? "Error al procesar reembolsos");
        return;
      }

      toast.success(result.message ?? "Reembolsos procesados correctamente");
      onOpenChange(false);
      onSuccess();

      // Reset form
      setMethod("TRANSFER");
      setReference("");
    } catch (error) {
      console.error("Error processing reimbursements:", error);
      toast.error("Error inesperado al procesar reembolsos");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirmar Reembolso</DialogTitle>
          <DialogDescription>
            Estás a punto de marcar {expenseIds.length} gasto{expenseIds.length > 1 ? "s" : ""} como reembolsado
            {expenseIds.length > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Resumen */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gastos:</span>
                <span className="font-medium">{expenseIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Empleados:</span>
                <span className="font-medium">{employeeCount}</span>
              </div>
              <div className="border-muted mt-2 flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Método de reembolso */}
          <div className="grid gap-2">
            <Label htmlFor="method">Método de reembolso *</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as ReimbursementMethod)}>
              <SelectTrigger id="method">
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Referencia (opcional) */}
          <div className="grid gap-2">
            <Label htmlFor="reference">
              Referencia de pago <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              id="reference"
              placeholder="Nº transferencia, nómina..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-muted-foreground text-xs">Ejemplo: TRF2024001234 o Nómina Enero 2024</p>
          </div>

          {/* Advertencia */}
          <div className="bg-warning/10 text-warning-foreground flex items-start gap-2 rounded-lg p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">
              Esta acción marcará los gastos como reembolsados y enviará notificaciones a los empleados. No se puede
              deshacer.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleReimburse} disabled={isLoading || expenseIds.length === 0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Reembolso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

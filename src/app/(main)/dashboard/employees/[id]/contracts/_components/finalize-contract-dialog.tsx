"use client";

import { useEffect, useState } from "react";

import { Calendar, CheckCircle, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContractsStore, type Contract } from "@/stores/contracts-store";

interface FinalizeContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onSuccess?: () => void;
}

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return "";
  return value.split("T")[0];
};

export function FinalizeContractDialog({ open, onOpenChange, contract, onSuccess }: FinalizeContractDialogProps) {
  const { updateContract, isUpdating } = useContractsStore();
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const today = new Date();
      const defaultDate = today.toISOString().split("T")[0];
      setEndDate(toDateInputValue(contract?.endDate) || defaultDate);
      setError(null);
    }
  }, [open, contract]);

  const handleFinalize = async () => {
    if (!contract) return;

    if (!endDate) {
      setError("Selecciona una fecha de fin");
      return;
    }

    const startDate = new Date(contract.startDate);
    const selectedEnd = new Date(endDate);

    if (selectedEnd <= startDate) {
      setError("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    try {
      await updateContract(contract.id, {
        endDate,
        active: false,
      });

      toast.success("Contrato finalizado", {
        description: `El contrato se marcó como finalizado con fecha ${selectedEnd.toLocaleDateString("es-ES")}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Error al finalizar contrato", {
        description: err?.message ?? "Ocurrió un error inesperado",
      });
    }
  };

  const isActive = contract?.active;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-gray-100 dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <TriangleAlert className="text-destructive h-5 w-5" />
            Finalizar contrato
          </DialogTitle>
          <DialogDescription>
            Indica la fecha de finalización para concluir el contrato seleccionado. Este cambio no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isActive && (
            <Alert className="border-secondary bg-secondary/10">
              <CheckCircle className="text-secondary h-4 w-4" />
              <AlertDescription>Este contrato ya está finalizado.</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="endDate" className="font-medium">
              Fecha de fin
            </Label>
            <div className="relative">
              <Calendar className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="endDate"
                type="date"
                className="bg-white pl-9"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setError(null);
                }}
                disabled={!isActive}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 rounded-md border p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4" />
            <p>Finalizar el contrato lo marcará como inactivo y ya no aparecerá en la lista de contratos activos.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleFinalize} disabled={!isActive || isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              "Finalizar contrato"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

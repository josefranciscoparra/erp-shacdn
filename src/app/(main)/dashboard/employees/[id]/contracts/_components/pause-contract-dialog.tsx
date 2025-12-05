"use client";

import { useState, useTransition } from "react";

import { Loader2, Pause } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pauseContract } from "@/server/actions/contract-discontinuous";
import type { Contract } from "@/stores/contracts-store";

interface PauseContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onSuccess: () => void;
}

export function PauseContractDialog({ open, onOpenChange, contract, onSuccess }: PauseContractDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePause = () => {
    if (!contract) return;

    startTransition(async () => {
      try {
        const result = await pauseContract(contract.id, reason || undefined);

        if (result.success) {
          toast.success("Contrato pausado correctamente");
          onSuccess();
          handleClose();
        } else {
          toast.error(result.error ?? "Error al pausar contrato");
        }
      } catch {
        toast.error("Error al pausar contrato");
      }
    });
  };

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-yellow-600" />
            Pausar contrato fijo discontinuo
          </DialogTitle>
          <DialogDescription>
            Al pausar el contrato, el empleado dejará de acumular vacaciones hasta que se reanude.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/30">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Importante:</strong> Durante el período de pausa:
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-yellow-600 dark:text-yellow-400">
              <li>No se acumularán días de vacaciones</li>
              <li>El contrato permanecerá activo pero en estado pausado</li>
              <li>Se registrará la fecha de inicio de la pausa</li>
            </ul>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Motivo de la pausa (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ej: Fin de temporada, período no laborable..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handlePause} disabled={isPending} className="bg-yellow-600 hover:bg-yellow-700">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pausando...
              </>
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pausar contrato
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

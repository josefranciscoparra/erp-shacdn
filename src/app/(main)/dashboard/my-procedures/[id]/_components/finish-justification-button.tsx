"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateProcedure } from "@/server/actions/expense-procedures";

interface FinishJustificationButtonProps {
  procedureId: string;
  hasExpenses: boolean;
}

export function FinishJustificationButton({ procedureId, hasExpenses }: FinishJustificationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const result = await updateProcedure(procedureId, {
          status: "JUSTIFICATION_PENDING",
        });

        if (result.success) {
          toast.success("Justificación presentada correctamente");
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.error ?? "Error al presentar la justificación");
        }
      } catch {
        toast.error("Ocurrió un error inesperado");
      }
    });
  };

  if (!hasExpenses) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
        >
          <CheckCircle className="mr-2 size-4" />
          Finalizar Justificación
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Finalizar Justificación?</DialogTitle>
          <DialogDescription>
            Al finalizar, notificaremos al responsable para que revise los gastos. No podrás añadir más tickets a menos
            que te devuelvan el expediente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-green-600 hover:bg-green-700">
            {isPending ? "Enviando..." : "Confirmar y Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateProcedure } from "@/server/actions/expense-procedures";

interface SubmitButtonProps {
  procedureId: string;
}

export function SubmitButton({ procedureId }: SubmitButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const result = await updateProcedure(procedureId, {
          status: "PENDING_AUTHORIZATION",
        });

        if (result.success) {
          toast.success("Expediente enviado para autorización");
          router.refresh();
        } else {
          toast.error(result.error ?? "Error al enviar el expediente");
        }
      } catch {
        toast.error("Ocurrió un error inesperado");
      }
    });
  };

  return (
    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={isPending}>
      <Send className="mr-2 size-4" />
      {isPending ? "Enviando..." : "Solicitar Autorización"}
    </Button>
  );
}

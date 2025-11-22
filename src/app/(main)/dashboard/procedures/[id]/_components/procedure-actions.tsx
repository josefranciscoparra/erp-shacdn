"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { ProcedureStatus } from "@prisma/client";
import { CheckCircle, XCircle, Lock, FileCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateProcedureStatus } from "@/server/actions/expense-procedures";

interface ProcedureActionsProps {
  id: string;
  currentStatus: ProcedureStatus;
  canManage: boolean; // Si es manager/admin
}

export function ProcedureActions({ id, currentStatus, canManage }: ProcedureActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!canManage) return null;

  const handleStatusChange = (newStatus: ProcedureStatus) => {
    startTransition(async () => {
      const result = await updateProcedureStatus(id, newStatus as any);

      if (result.success) {
        toast.success("Estado actualizado", {
          description: `El expediente ha pasado a estado: ${newStatus}`,
        });
        router.refresh();
      } else {
        toast.error("Error", {
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {currentStatus === "DRAFT" && (
        <Button
          onClick={() => handleStatusChange("AUTHORIZED")}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Autorizar
        </Button>
      )}

      {currentStatus === "AUTHORIZED" && (
        <>
          <Button variant="secondary" onClick={() => handleStatusChange("JUSTIFICATION_PENDING")} disabled={isPending}>
            <FileCheck className="mr-2 h-4 w-4" />
            Solicitar Justificación
          </Button>
          <Button variant="outline" onClick={() => handleStatusChange("CLOSED")} disabled={isPending}>
            <Lock className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
        </>
      )}

      {(currentStatus === "DRAFT" || currentStatus === "PENDING_AUTHORIZATION") && (
        <Button variant="destructive" onClick={() => handleStatusChange("REJECTED")} disabled={isPending}>
          <XCircle className="mr-2 h-4 w-4" />
          Rechazar
        </Button>
      )}
    </div>
  );
}

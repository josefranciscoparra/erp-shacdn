"use client";

import { useState } from "react";

import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { removeOrganizationApprover } from "@/server/actions/expense-approvers";

type Approver = {
  id: string;
  user: {
    name: string;
    email: string;
    image: string | null;
  };
};

type RemoveApproverDialogProps = {
  approver: Approver | null;
  onOpenChange: (open: boolean) => void;
  onApproverRemoved: () => void;
};

export function RemoveApproverDialog({ approver, onOpenChange, onApproverRemoved }: RemoveApproverDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const handleRemove = async () => {
    if (!approver) return;

    try {
      setIsSubmitting(true);
      const result = await removeOrganizationApprover(approver.id);

      if (result.success) {
        toast.success("Aprobador eliminado correctamente");
        onApproverRemoved();
      } else {
        // Si tiene gastos pendientes, mostrar el contador
        if (result.pendingCount) {
          setPendingCount(result.pendingCount);
        }
        toast.error(result.error ?? "Error al eliminar aprobador");
      }
    } catch (error) {
      console.error("Error removing approver:", error);
      toast.error("Error al eliminar aprobador");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!approver) return null;

  return (
    <Dialog open={!!approver} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Eliminar aprobador de gastos</DialogTitle>
          <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info del aprobador */}
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={approver.user.image ?? undefined} alt={approver.user.name} />
              <AvatarFallback>
                {approver.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{approver.user.name}</p>
              <p className="text-muted-foreground text-sm">{approver.user.email}</p>
            </div>
          </div>

          {/* Warning si tiene gastos pendientes */}
          {pendingCount !== null && pendingCount > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este aprobador tiene {pendingCount} gasto{pendingCount === 1 ? "" : "s"} pendiente
                {pendingCount === 1 ? "" : "s"} de aprobar. Por favor, reasigna o aprueba estos gastos antes de
                eliminarlo.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-muted-foreground text-sm">
            {pendingCount === null || pendingCount === 0 ? (
              <>
                ¿Estás seguro de que deseas eliminar a este aprobador? Los empleados seguirán teniendo acceso a los
                otros aprobadores configurados.
              </>
            ) : (
              <>No puedes eliminar este aprobador hasta que se resuelvan los gastos pendientes.</>
            )}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={isSubmitting || (pendingCount !== null && pendingCount > 0)}
          >
            {isSubmitting ? "Eliminando..." : "Eliminar aprobador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

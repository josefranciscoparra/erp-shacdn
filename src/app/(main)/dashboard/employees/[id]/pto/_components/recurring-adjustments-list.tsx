"use client";

import { useState } from "react";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deactivateRecurringAdjustment } from "@/server/actions/admin-pto";

interface RecurringAdjustment {
  id: string;
  extraDays: number;
  adjustmentType: string;
  reason: string;
  notes: string | null;
  startYear: number;
  active: boolean;
  createdAt: string;
  createdBy: {
    name: string | null;
    email: string;
  };
}

interface RecurringAdjustmentsListProps {
  adjustments: RecurringAdjustment[];
  onSuccess: () => void;
}

const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  CORRECTION: "Corrección de error",
  COMPENSATION: "Compensación",
  SENIORITY_BONUS: "Días por antigüedad",
  COLLECTIVE_AGREEMENT: "Días por convenio",
  OTHER: "Otro",
};

export function RecurringAdjustmentsList({ adjustments, onSuccess }: RecurringAdjustmentsListProps) {
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; adjustmentId: string | null }>({
    open: false,
    adjustmentId: null,
  });

  const handleDeactivate = async () => {
    if (!confirmDialog.adjustmentId) return;

    setDeactivatingId(confirmDialog.adjustmentId);
    try {
      await deactivateRecurringAdjustment(confirmDialog.adjustmentId);
      toast.success("Ajuste recurrente desactivado correctamente");
      setConfirmDialog({ open: false, adjustmentId: null });
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al desactivar ajuste");
    } finally {
      setDeactivatingId(null);
    }
  };

  if (adjustments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">No hay ajustes recurrentes activos para este empleado</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {adjustments.map((adjustment) => {
          const isDeactivating = deactivatingId === adjustment.id;
          const daysText = adjustment.extraDays > 0 ? `+${adjustment.extraDays}` : adjustment.extraDays;

          return (
            <div key={adjustment.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${adjustment.extraDays > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {daysText} días
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {ADJUSTMENT_TYPE_LABELS[adjustment.adjustmentType] ?? adjustment.adjustmentType}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Desde {adjustment.startYear}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{adjustment.reason}</p>
                {adjustment.notes && <p className="text-muted-foreground text-xs">Nota: {adjustment.notes}</p>}
                <p className="text-muted-foreground text-xs">
                  Creado por {adjustment.createdBy.name ?? adjustment.createdBy.email} el{" "}
                  {new Date(adjustment.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDialog({ open: true, adjustmentId: adjustment.id })}
                disabled={isDeactivating}
              >
                {isDeactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          );
        })}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, adjustmentId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar ajuste recurrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Este ajuste dejará de aplicarse a partir del próximo año. El ajuste del año actual no se verá afectado.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>Desactivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

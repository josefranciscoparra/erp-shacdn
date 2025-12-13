"use client";

import { useState } from "react";

import { AlertTriangle, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  revokeBatch,
  revokePayslipItem,
  type PayslipBatchListItem,
  type PayslipUploadItemDetail,
} from "@/server/actions/payslips";

interface RevokeBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: PayslipBatchListItem;
  onSuccess: () => void;
}

export function RevokeBatchDialog({ open, onOpenChange, batch, onSuccess }: RevokeBatchDialogProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [reason, setReason] = useState("");

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      const result = await revokeBatch(batch.id, reason || undefined);
      if (result.success) {
        toast.success(`${result.revokedCount} nóminas revocadas`);
        setReason("");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error ?? "Error al revocar");
      }
    } catch {
      toast.error("Error al revocar el lote");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Undo2 className="h-5 w-5" />
            Revocar acceso al lote completo
          </DialogTitle>
          <DialogDescription>Esta acción revocará el acceso a todas las nóminas publicadas del lote.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acción irreversible</AlertTitle>
            <AlertDescription>
              Se revocarán <strong>{batch.publishedCount}</strong> nóminas publicadas. Los empleados dejarán de ver
              estas nóminas en su portal inmediatamente.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de la revocación (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Error en los importes, nóminas duplicadas..."
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRevoking}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking || batch.publishedCount === 0}>
            {isRevoking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revocando...
              </>
            ) : (
              <>
                <Undo2 className="mr-2 h-4 w-4" />
                Revocar {batch.publishedCount} nóminas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog para revocar un item individual
interface RevokeItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PayslipUploadItemDetail;
  onSuccess: () => void;
}

export function RevokeItemDialog({ open, onOpenChange, item, onSuccess }: RevokeItemDialogProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [reason, setReason] = useState("");

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      const result = await revokePayslipItem(item.id, reason || undefined);
      if (result.success) {
        toast.success("Nómina revocada correctamente");
        setReason("");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error ?? "Error al revocar");
      }
    } catch {
      toast.error("Error al revocar la nómina");
    } finally {
      setIsRevoking(false);
    }
  };

  const employeeName = item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : "Empleado desconocido";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Undo2 className="h-5 w-5" />
            Revocar acceso a nómina
          </DialogTitle>
          <DialogDescription>El empleado dejará de ver esta nómina en su portal.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-muted-foreground rounded-lg border p-3 text-sm">
            <div>
              <strong>Empleado:</strong> {employeeName}
            </div>
            {item.originalFileName && (
              <div>
                <strong>Archivo:</strong> {item.originalFileName}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-reason">Motivo de la revocación (opcional)</Label>
            <Textarea
              id="item-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Error en los datos, nómina incorrecta..."
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRevoking}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking}>
            {isRevoking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revocando...
              </>
            ) : (
              <>
                <Undo2 className="mr-2 h-4 w-4" />
                Revocar acceso
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

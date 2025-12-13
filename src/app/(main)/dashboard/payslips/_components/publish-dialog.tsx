"use client";

import { useState } from "react";

import { AlertTriangle, CheckCircle2, Loader2, Send, UserX, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { publishBatch, type PayslipBatchListItem } from "@/server/actions/payslips";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: PayslipBatchListItem;
  onSuccess: () => void;
}

export function PublishDialog({ open, onOpenChange, batch, onSuccess }: PublishDialogProps) {
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const result = await publishBatch(batch.id);
      if (result.success) {
        toast.success(`${result.publishedCount} nóminas publicadas correctamente`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error ?? "Error al publicar");
      }
    } catch {
      toast.error("Error al publicar el lote");
    } finally {
      setIsPublishing(false);
    }
  };

  const hasBlockedItems = batch.blockedInactive > 0;
  const hasPendingItems = batch.pendingCount > 0;
  const hasErrors = batch.errorCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Confirmar publicación del lote
          </DialogTitle>
          <DialogDescription>Revisa el resumen antes de publicar las nóminas para los empleados.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumen de contadores */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 font-medium">Resumen del lote</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Listos para publicar:</span>
                <Badge variant="outline" className="ml-auto">
                  {batch.readyCount}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Pendientes de revisión:</span>
                <Badge variant="outline" className="ml-auto">
                  {batch.pendingCount}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-500" />
                <span className="text-sm">Empleado inactivo:</span>
                <Badge variant="outline" className="ml-auto">
                  {batch.blockedInactive}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Con errores:</span>
                <Badge variant="outline" className="ml-auto">
                  {batch.errorCount}
                </Badge>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {hasBlockedItems && (
            <Alert variant="destructive">
              <UserX className="h-4 w-4" />
              <AlertTitle>Empleados inactivos detectados</AlertTitle>
              <AlertDescription>
                Se detectaron {batch.blockedInactive} nóminas para empleados inactivos. Estas NO se publicarán.
              </AlertDescription>
            </Alert>
          )}

          {hasPendingItems && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Items pendientes de revisión</AlertTitle>
              <AlertDescription>
                Hay {batch.pendingCount} nóminas pendientes de revisión que NO se publicarán. Revisa y asigna antes de
                publicar.
              </AlertDescription>
            </Alert>
          )}

          {hasErrors && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Errores en el lote</AlertTitle>
              <AlertDescription>Hay {batch.errorCount} nóminas con errores que NO se publicarán.</AlertDescription>
            </Alert>
          )}

          {/* Mensaje de confirmación */}
          {batch.readyCount > 0 ? (
            <div className="text-muted-foreground rounded-lg bg-blue-50 p-4 text-sm dark:bg-blue-950/30">
              <strong className="text-foreground">
                Solo se publicarán las {batch.readyCount} nóminas que están listas.
              </strong>{" "}
              Los empleados recibirán una notificación y podrán ver sus nóminas en su portal.
            </div>
          ) : (
            <div className="text-muted-foreground rounded-lg bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
              <strong className="text-foreground">No hay nóminas listas para publicar.</strong> Revisa y asigna las
              nóminas pendientes antes de publicar.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPublishing}>
            Cancelar
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing || batch.readyCount === 0}>
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Publicar {batch.readyCount} nóminas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

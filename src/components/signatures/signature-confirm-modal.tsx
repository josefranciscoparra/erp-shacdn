"use client";

import { AlertCircle, FileSignature } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignatureConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  documentTitle: string;
  isLoading?: boolean;
}

export function SignatureConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  documentTitle,
  isLoading = false,
}: SignatureConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-full p-2">
              <FileSignature className="text-primary h-5 w-5" />
            </div>
            <DialogTitle>Confirmar Firma Electrónica</DialogTitle>
          </div>
          <DialogDescription>Estás a punto de firmar electrónicamente este documento</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/30 rounded-lg border p-4">
            <p className="mb-1 text-sm font-medium">Documento:</p>
            <p className="text-muted-foreground text-sm">{documentTitle}</p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-1 font-medium">Esta acción es irreversible</p>
              <p className="text-sm">
                Una vez firmado el documento, no podrás modificar tu firma. El documento firmado quedará registrado de
                forma permanente con evidencias de auditoría.
              </p>
            </AlertDescription>
          </Alert>

          <div className="text-muted-foreground space-y-1 text-sm">
            <p>✓ Has dado tu consentimiento</p>
            <p>✓ Has revisado el contenido del documento</p>
            <p>✓ Comprendes que esta firma tiene validez legal</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="bg-primary">
            {isLoading ? <span className="animate-pulse">Firmando documento...</span> : "Firmar Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

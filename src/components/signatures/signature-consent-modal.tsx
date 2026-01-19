"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignatureConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  documentTitle: string;
  isLoading?: boolean;
}

export function SignatureConsentModal({
  open,
  onOpenChange,
  onConfirm,
  documentTitle,
  isLoading = false,
}: SignatureConsentModalProps) {
  const [consentGiven, setConsentGiven] = useState(false);

  const handleConfirm = async () => {
    if (!consentGiven) return;
    await onConfirm();
    setConsentGiven(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-h-[90vh] flex-col overflow-hidden p-4 sm:max-w-[500px] sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Declaración de Consentimiento</DialogTitle>
          <DialogDescription>
            Para firmar el documento &quot;{documentTitle}&quot;, debes aceptar los siguientes términos
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <div className="bg-muted/50 rounded-lg border p-4 text-sm">
            <p className="mb-2 font-medium">Declaro que:</p>
            <ul className="text-muted-foreground list-disc space-y-2 pl-5">
              <li>He leído y comprendido el contenido completo de este documento</li>
              <li>Acepto los términos y condiciones establecidos en el mismo</li>
              <li>Firmo este documento de forma voluntaria y con pleno conocimiento</li>
              <li>
                Autorizo que se registre mi firma electrónica junto con la fecha, hora e información de identificación
              </li>
              <li>Esta firma tiene el mismo valor legal que una firma manuscrita</li>
            </ul>
          </div>

          <div className="border-primary/20 bg-primary/5 flex items-start space-x-3 rounded-lg border p-4">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsentGiven(checked === true)}
              className="mt-1"
            />
            <label htmlFor="consent" className="cursor-pointer text-sm leading-relaxed font-medium select-none">
              He leído y acepto todos los términos anteriores. Confirmo que deseo proceder con la firma electrónica de
              este documento.
            </label>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!consentGiven || isLoading}>
            {isLoading ? "Registrando..." : "Aceptar y Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

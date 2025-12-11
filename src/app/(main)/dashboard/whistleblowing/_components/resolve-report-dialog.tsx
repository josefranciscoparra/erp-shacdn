"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { resolveReport } from "@/server/actions/whistleblowing";

interface ResolveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  onSuccess: () => void;
}

const resolutionTypes = [
  { value: "SUBSTANTIATED", label: "Fundada", description: "Los hechos denunciados se han confirmado" },
  { value: "UNSUBSTANTIATED", label: "No fundada", description: "No se han podido confirmar los hechos" },
  { value: "PARTIALLY_SUBSTANTIATED", label: "Parcialmente fundada", description: "Algunos hechos se han confirmado" },
  { value: "NO_ACTION", label: "Sin acción", description: "No procede actuación" },
] as const;

export function ResolveReportDialog({ open, onOpenChange, reportId, onSuccess }: ResolveReportDialogProps) {
  const [resolutionType, setResolutionType] = useState<string>("");
  const [resolution, setResolution] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!resolutionType || !resolution.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await resolveReport(
        reportId,
        resolutionType as "SUBSTANTIATED" | "UNSUBSTANTIATED" | "PARTIALLY_SUBSTANTIATED" | "NO_ACTION",
        resolution.trim(),
      );
      if (result.success) {
        setResolutionType("");
        setResolution("");
        onSuccess();
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setResolutionType("");
      setResolution("");
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolver denuncia</DialogTitle>
          <DialogDescription>
            Registra la resolución de esta denuncia. Esta acción cambiará el estado a &quot;Resuelta&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resolution-type">Tipo de resolución</Label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger id="resolution-type">
                <SelectValue placeholder="Selecciona el tipo de resolución" />
              </SelectTrigger>
              <SelectContent>
                {resolutionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-muted-foreground text-xs">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution-text">Descripción de la resolución</Label>
            <Textarea
              id="resolution-text"
              placeholder="Describe las conclusiones de la investigación y las medidas adoptadas..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-muted-foreground text-xs">
              Esta información quedará registrada en el expediente de la denuncia.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!resolutionType || !resolution.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resolver denuncia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

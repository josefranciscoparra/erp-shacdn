"use client";

import { useEffect, useState } from "react";

import { Download, FileText, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type PayslipUploadItemDetail } from "@/server/actions/payslips";

interface ItemPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PayslipUploadItemDetail | null;
}

export function ItemPreviewDialog({ open, onOpenChange, item }: ItemPreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && item) {
      loadPreview();
    } else {
      setPreviewUrl(null);
      setError(null);
    }
  }, [open, item]);

  const loadPreview = async () => {
    if (!item) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payslips/items/${item.id}/preview`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else {
        setError("No se pudo cargar la vista previa");
      }
    } catch {
      setError("Error al cargar la vista previa");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!item) return;

    try {
      const response = await fetch(`/api/payslips/items/${item.id}/preview`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.originalFileName ?? `nomina_${item.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Error silencioso
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {item.originalFileName ?? `Página ${item.pageNumber ?? "?"}`}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              {item.detectedDni && <Badge variant="outline">DNI: {item.detectedDni}</Badge>}
              {item.detectedName && <Badge variant="secondary">Nombre: {item.detectedName}</Badge>}
              <Badge
                variant="outline"
                className={
                  item.confidenceScore >= 0.8
                    ? "border-green-500 text-green-600"
                    : item.confidenceScore >= 0.5
                      ? "border-amber-500 text-amber-600"
                      : "border-red-500 text-red-600"
                }
              >
                Confianza: {Math.round(item.confidenceScore * 100)}%
              </Badge>
              {item.employee && (
                <Badge variant="default" className="bg-green-600">
                  Asignado a: {item.employee.firstName} {item.employee.lastName}
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Preview area */}
          <div className="bg-muted/30 relative min-h-[500px] overflow-hidden rounded-lg border">
            {isLoading ? (
              <div className="flex h-full min-h-[500px] items-center justify-center">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                <span className="text-muted-foreground ml-2">Cargando vista previa...</span>
              </div>
            ) : error ? (
              <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-4">
                <FileText className="text-muted-foreground h-16 w-16" />
                <p className="text-muted-foreground">{error}</p>
                <Button variant="outline" onClick={loadPreview}>
                  Reintentar
                </Button>
              </div>
            ) : previewUrl ? (
              <iframe src={previewUrl} className="h-full min-h-[500px] w-full" title="Vista previa del PDF" />
            ) : (
              <div className="flex h-full min-h-[500px] items-center justify-center">
                <FileText className="text-muted-foreground h-16 w-16" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

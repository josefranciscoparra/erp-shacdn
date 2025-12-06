"use client";

import { useEffect, useState } from "react";

import { Download, FileText, Loader2, Maximize2 } from "lucide-react";
import { toast } from "sonner";

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
        const data = await response.json();
        if (data.success && data.url) {
          setPreviewUrl(data.url);
        } else {
          setError("No se pudo obtener la URL del documento");
        }
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
      // 1. Obtener URL firmada
      const response = await fetch(`/api/payslips/items/${item.id}/preview`);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.success || !data.url) return;

      // 2. Descargar el archivo desde la URL firmada
      const fileResponse = await fetch(data.url);
      const blob = await fileResponse.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = item.originalFileName ?? `nomina_${item.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al descargar el archivo");
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <FileText className="text-primary h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {item.originalFileName ?? `Página ${item.pageNumber ?? "?"}`}
                </DialogTitle>
                <DialogDescription className="sr-only">Vista previa del documento</DialogDescription>
                <div className="mt-1 flex items-center gap-2">
                  {item.detectedDni && (
                    <Badge variant="outline" className="text-xs">
                      DNI: {item.detectedDni}
                    </Badge>
                  )}
                  {item.detectedName && (
                    <Badge variant="secondary" className="text-xs">
                      Nombre: {item.detectedName}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      item.confidenceScore >= 0.8
                        ? "border-green-500 text-green-600"
                        : item.confidenceScore >= 0.5
                          ? "border-amber-500 text-amber-600"
                          : "border-red-500 text-red-600"
                    }`}
                  >
                    Confianza: {Math.round(item.confidenceScore * 100)}%
                  </Badge>
                  {item.employee && (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      Asignado a: {item.employee.firstName} {item.employee.lastName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-muted/10 relative flex flex-1 flex-col overflow-hidden p-4">
          {isLoading ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <Loader2 className="text-primary h-10 w-10 animate-spin" />
              <span className="text-muted-foreground font-medium">Cargando documento...</span>
            </div>
          ) : error ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <div className="bg-destructive/10 rounded-full p-4">
                <FileText className="text-destructive h-12 w-12" />
              </div>
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" onClick={loadPreview}>
                Reintentar carga
              </Button>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full flex-1 rounded-md border bg-white shadow-sm"
              title="Vista previa del PDF"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center">
              No se pudo cargar la vista previa
            </div>
          )}
        </div>

        <DialogFooter className="flex shrink-0 items-center justify-between border-t p-4 sm:justify-between">
          <div className="text-muted-foreground hidden text-xs sm:block">ID: {item.id}</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

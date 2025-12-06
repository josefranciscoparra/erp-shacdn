"use client";

import { useState } from "react";

import { Calendar, ChevronLeft, ChevronRight, Download, Eye, FileText, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface Payslip {
  id: string;
  fileName: string;
  month: number | null;
  year: number | null;
  createdAt: Date;
}

interface PayslipListProps {
  payslips: Payslip[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

function formatPeriod(month: number | null, year: number | null) {
  if (!month || !year) return "Sin periodo";
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PayslipList({ payslips, total, page, onPageChange, isLoading }: PayslipListProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const handlePreview = async (payslip: Payslip) => {
    setPreviewId(payslip.id);
    setIsLoadingPreview(true);

    try {
      const response = await fetch(`/api/employees/documents/${payslip.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch {
      // Error silencioso
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDownload = async (payslip: Payslip) => {
    try {
      const response = await fetch(`/api/employees/documents/${payslip.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = payslip.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Error silencioso
    }
  };

  const closePreview = () => {
    setPreviewId(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const currentPayslip = payslips.find((p) => p.id === previewId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Nóminas disponibles</CardTitle>
          <CardDescription>
            {total} nómina{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de nóminas */}
          <div className="divide-y rounded-lg border">
            {payslips.map((payslip) => (
              <div key={payslip.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <FileText className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{formatPeriod(payslip.month, payslip.year)}</div>
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      Subida el {formatDate(payslip.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    PDF
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => handlePreview(payslip)} title="Ver nómina">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(payslip)} title="Descargar">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} de {total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages || isLoading}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de preview */}
      <Dialog open={!!previewId} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {currentPayslip ? formatPeriod(currentPayslip.month, currentPayslip.year) : "Nómina"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Preview area */}
            <div className="bg-muted/30 relative min-h-[500px] overflow-hidden rounded-lg border">
              {isLoadingPreview ? (
                <div className="flex h-full min-h-[500px] items-center justify-center">
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                  <span className="text-muted-foreground ml-2">Cargando...</span>
                </div>
              ) : previewUrl ? (
                <iframe src={previewUrl} className="h-full min-h-[500px] w-full" title="Vista previa de nómina" />
              ) : (
                <div className="flex h-full min-h-[500px] items-center justify-center">
                  <FileText className="text-muted-foreground h-16 w-16" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closePreview}>
                Cerrar
              </Button>
              {currentPayslip && (
                <Button onClick={() => handleDownload(currentPayslip)}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

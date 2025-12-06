"use client";

import { Calendar, ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const handleDownload = async (payslip: Payslip) => {
    try {
      const response = await fetch(`/api/me/documents/${payslip.id}/download`);
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

  return (
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
                <Button variant="outline" size="sm" onClick={() => handleDownload(payslip)} title="Descargar nómina">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
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
  );
}

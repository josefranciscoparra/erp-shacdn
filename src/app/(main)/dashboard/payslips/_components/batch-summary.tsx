"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileArchive,
  FileText,
  Send,
  Tag,
  User,
  UserX,
  Undo2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type PayslipBatchListItem } from "@/server/actions/payslips";

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

interface BatchSummaryProps {
  batch: PayslipBatchListItem;
}

function formatStatusLabel(status: string) {
  return status.toLowerCase().replace(/_/g, " ");
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PROCESSING":
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Procesando
        </Badge>
      );
    case "REVIEW":
      return (
        <Badge variant="secondary" className="gap-1">
          <User className="h-3 w-3" />
          Pendiente revisión
        </Badge>
      );
    case "READY_TO_PUBLISH":
      return (
        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
          <Send className="h-3 w-3" />
          Listo para publicar
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Completado
        </Badge>
      );
    case "PARTIAL":
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-500">
          <AlertCircle className="h-3 w-3" />
          Parcial
        </Badge>
      );
    case "ERROR":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="secondary" className="gap-1 line-through">
          <XCircle className="h-3 w-3" />
          Cancelado
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="capitalize">
          {formatStatusLabel(status)}
        </Badge>
      );
  }
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BatchSummary({ batch }: BatchSummaryProps) {
  // Progreso: publicados + revocados (procesados) vs total
  const processedCount = batch.publishedCount + batch.revokedCount;
  const progress = batch.totalFiles > 0 ? Math.round((processedCount / batch.totalFiles) * 100) : 0;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Info del archivo */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Archivo</CardTitle>
          <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg">
            {batch.originalFileType === "ZIP" ? <FileArchive className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-foreground truncate text-lg font-bold">{batch.originalFileName}</div>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatPeriod(batch.month, batch.year)}</span>
          </div>
          {batch.label && (
            <div className="bg-muted/50 text-muted-foreground mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs">
              <Tag className="h-3 w-3" />
              {batch.label}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estado y progreso */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Estado</CardTitle>
          {getStatusBadge(batch.status)}
        </CardHeader>
        <CardContent>
          <div className="mt-2 flex items-center gap-3">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="min-w-[3ch] text-sm font-medium">{progress}%</span>
          </div>
          <div className="text-muted-foreground mt-2 text-xs">
            <span className="text-foreground font-medium">{processedCount}</span> de{" "}
            <span className="text-foreground font-medium">{batch.totalFiles}</span> procesados
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <Card className="shadow-sm sm:col-span-2 lg:col-span-1 xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Distribución</CardTitle>
          <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg">
            <FileText className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-x-2 gap-y-4 text-center">
            <div className="space-y-1">
              <div className="text-lg font-bold text-blue-600">{batch.readyCount}</div>
              <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Listos</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-green-600">{batch.publishedCount}</div>
              <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Publicados</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-amber-600">{batch.pendingCount}</div>
              <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Pendientes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fecha y usuario */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Subido por</CardTitle>
          <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg">
            <User className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="truncate text-base font-medium">{batch.uploadedBy.name ?? batch.uploadedBy.email}</div>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(batch.createdAt)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

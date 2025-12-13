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
    <div className="grid gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
      {/* Info del archivo */}
      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Archivo</CardTitle>
          {batch.originalFileType === "ZIP" ? (
            <FileArchive className="text-muted-foreground h-4 w-4" />
          ) : (
            <FileText className="text-muted-foreground h-4 w-4" />
          )}
        </CardHeader>
        <CardContent>
          <div className="truncate text-lg font-bold">{batch.originalFileName}</div>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3" />
            {formatPeriod(batch.month, batch.year)}
          </div>
          {batch.label && (
            <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
              <Tag className="h-3 w-3" />
              {batch.label}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estado y progreso */}
      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estado</CardTitle>
          {getStatusBadge(batch.status)}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="flex-1" />
            <span className="text-muted-foreground text-sm">{progress}%</span>
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            {processedCount} de {batch.totalFiles} procesados
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Distribución</CardTitle>
          <FileText className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-center @xl/main:grid-cols-3">
            <div>
              <div className="flex items-center justify-center gap-1">
                <Send className="h-3 w-3 text-blue-600" />
                <span className="text-xl font-bold text-blue-600">{batch.readyCount}</span>
              </div>
              <div className="text-muted-foreground text-xs">Listos</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span className="text-xl font-bold text-green-600">{batch.publishedCount}</span>
              </div>
              <div className="text-muted-foreground text-xs">Publicados</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-600" />
                <span className="text-xl font-bold text-amber-600">{batch.pendingCount}</span>
              </div>
              <div className="text-muted-foreground text-xs">Pendientes</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <UserX className="h-3 w-3 text-red-600" />
                <span className="text-xl font-bold text-red-600">{batch.blockedInactive}</span>
              </div>
              <div className="text-muted-foreground text-xs">Bloqueados</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Undo2 className="h-3 w-3 text-gray-500" />
                <span className="text-xl font-bold text-gray-500">{batch.revokedCount}</span>
              </div>
              <div className="text-muted-foreground text-xs">Revocados</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                <span className="text-xl font-bold text-red-600">{batch.errorCount}</span>
              </div>
              <div className="text-muted-foreground text-xs">Errores</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fecha y usuario */}
      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Subido por</CardTitle>
          <User className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="truncate font-medium">{batch.uploadedBy.name ?? batch.uploadedBy.email}</div>
          <div className="text-muted-foreground mt-1 text-xs">{formatDate(batch.createdAt)}</div>
        </CardContent>
      </Card>
    </div>
  );
}

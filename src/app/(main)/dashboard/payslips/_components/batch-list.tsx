"use client";

import Link from "next/link";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileArchive,
  FileText,
  RefreshCw,
  Send,
  Tag,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PayslipBatchListItem } from "@/server/actions/payslips";

interface BatchListProps {
  batches: PayslipBatchListItem[];
  onRefresh: () => void;
}

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
          <Users className="h-3 w-3" />
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
          <AlertCircle className="h-3 w-3" />
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

export function BatchList({ batches, onRefresh }: BatchListProps) {
  const stats = batches.reduce(
    (acc, batch) => ({
      totalBatches: acc.totalBatches + 1,
      totalFiles: acc.totalFiles + batch.totalFiles,
      totalReady: acc.totalReady + batch.readyCount,
      totalPublished: acc.totalPublished + batch.publishedCount,
      totalPending: acc.totalPending + batch.pendingCount + batch.blockedInactive,
    }),
    { totalBatches: 0, totalFiles: 0, totalReady: 0, totalPublished: 0, totalPending: 0 },
  );

  return (
    <div className="space-y-6">
      {/* Estadísticas globales */}
      <div className="grid gap-4 @xl/main:grid-cols-4">
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lotes</CardTitle>
            <FileArchive className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBatches}</div>
          </CardContent>
        </Card>
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos totales</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
          </CardContent>
        </Card>
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listos para publicar</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalReady}</div>
            <p className="text-muted-foreground mt-1 text-xs">Pendientes de revisión: {stats.totalPending}</p>
          </CardContent>
        </Card>
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalPublished}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de lotes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lotes de Nóminas</CardTitle>
            <CardDescription>Historial de subidas masivas</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Subido por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const completedCount = batch.publishedCount + batch.revokedCount;
                  const managedCount = completedCount + batch.readyCount;
                  const reviewCount = batch.pendingCount + batch.blockedInactive;
                  const progress =
                    batch.totalFiles > 0 ? Math.min(100, Math.round((managedCount / batch.totalFiles) * 100)) : 0;

                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {batch.originalFileType === "ZIP" ? (
                              <FileArchive className="text-muted-foreground h-4 w-4" />
                            ) : (
                              <FileText className="text-muted-foreground h-4 w-4" />
                            )}
                            <span className="font-medium">{batch.originalFileName}</span>
                          </div>
                          {batch.label && (
                            <div className="text-muted-foreground flex items-center gap-1 text-xs">
                              <Tag className="h-3 w-3" />
                              {batch.label}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="text-muted-foreground h-3 w-3" />
                          {formatPeriod(batch.month, batch.year)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="w-24" />
                            <span className="text-muted-foreground text-xs">
                              {managedCount}/{batch.totalFiles}
                            </span>
                          </div>
                          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            <span>Listos: {batch.readyCount}</span>
                            <span>Publicados: {batch.publishedCount}</span>
                            <span>Pendientes: {reviewCount}</span>
                            {batch.errorCount > 0 && <span className="text-red-500">Errores: {batch.errorCount}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {batch.uploadedBy.name ?? batch.uploadedBy.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">{formatDate(batch.createdAt)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/payslips/${batch.id}`}>
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Ver detalles
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

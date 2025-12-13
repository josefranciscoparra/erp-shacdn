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
  const hasPeriod = month != null && year != null;
  if (!hasPeriod) return "Sin periodo";
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
    <div className="space-y-8">
      {/* Estadísticas globales */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Lotes</CardTitle>
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
              <FileArchive className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBatches}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Documentos</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Para publicar</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10">
              <Send className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.totalReady}</div>
            <p className="text-muted-foreground mt-1 text-xs">Pendientes revisión: {stats.totalPending}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Publicados</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalPublished}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de lotes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Historial de Lotes</h2>
            <p className="text-muted-foreground text-sm">Gestina y revisa tus subidas de nóminas</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} className="h-8">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Actualizar
          </Button>
        </div>

        <div className="bg-card text-card-foreground overflow-hidden rounded-xl border shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Archivo</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Subido por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="pr-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const completedCount = batch.publishedCount + batch.revokedCount;
                const managedCount = completedCount + batch.readyCount;
                const reviewCount = batch.pendingCount + batch.blockedInactive;
                const errorCount = batch.errorCount ?? 0;
                const showIssues = reviewCount + errorCount > 0;
                const progress =
                  batch.totalFiles > 0 ? Math.min(100, Math.round((managedCount / batch.totalFiles) * 100)) : 0;

                return (
                  <TableRow key={batch.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-background text-muted-foreground flex h-9 w-9 items-center justify-center rounded-lg border">
                          {batch.originalFileType === "ZIP" ? (
                            <FileArchive className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-foreground leading-none font-medium">{batch.originalFileName}</p>
                          {batch.label && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <Tag className="text-muted-foreground h-3 w-3" />
                              <span className="text-muted-foreground text-xs">{batch.label}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatPeriod(batch.month, batch.year)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>
                      <div className="w-[140px] space-y-1.5">
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>
                            {managedCount}/{batch.totalFiles}
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                        {showIssues && (
                          <div className="flex gap-2 text-[10px]">
                            {reviewCount > 0 && <span className="font-medium text-amber-600">{reviewCount} rev.</span>}
                            {errorCount > 0 && <span className="text-destructive font-medium">{errorCount} err.</span>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium">
                          {batch.uploadedBy.name?.charAt(0) ?? batch.uploadedBy.email.charAt(0)}
                        </div>
                        <span className="max-w-[120px] truncate">
                          {batch.uploadedBy.name ?? batch.uploadedBy.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-xs">{formatDate(batch.createdAt)}</span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button variant="ghost" size="sm" asChild className="transition-opacity">
                        <Link href={`/dashboard/payslips/${batch.id}`}>
                          Ver detalles
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

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
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PayslipBatch {
  id: string;
  originalFileName: string;
  originalFileType: string;
  month: number | null;
  year: number | null;
  status: string;
  totalFiles: number;
  assignedCount: number;
  pendingCount: number;
  errorCount: number;
  createdAt: Date;
  uploadedBy: {
    name: string | null;
    email: string;
  };
}

interface BatchListProps {
  batches: PayslipBatch[];
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
  // Calcular estadísticas globales
  const stats = batches.reduce(
    (acc, batch) => ({
      totalBatches: acc.totalBatches + 1,
      totalFiles: acc.totalFiles + batch.totalFiles,
      totalAssigned: acc.totalAssigned + batch.assignedCount,
      totalPending: acc.totalPending + batch.pendingCount,
      totalErrors: acc.totalErrors + batch.errorCount,
    }),
    { totalBatches: 0, totalFiles: 0, totalAssigned: 0, totalPending: 0, totalErrors: 0 },
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
            <CardTitle className="text-sm font-medium">Nóminas Totales</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
          </CardContent>
        </Card>
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asignadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalAssigned}</div>
          </CardContent>
        </Card>
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.totalPending}</div>
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
                  const progress =
                    batch.totalFiles > 0 ? Math.round((batch.assignedCount / batch.totalFiles) * 100) : 0;

                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {batch.originalFileType === "ZIP" ? (
                            <FileArchive className="text-muted-foreground h-4 w-4" />
                          ) : (
                            <FileText className="text-muted-foreground h-4 w-4" />
                          )}
                          <span className="font-medium">{batch.originalFileName}</span>
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
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="w-20" />
                            <span className="text-muted-foreground text-xs">
                              {batch.assignedCount}/{batch.totalFiles}
                            </span>
                          </div>
                          {batch.errorCount > 0 && (
                            <span className="text-xs text-red-500">{batch.errorCount} errores</span>
                          )}
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

"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { SignatureBatchStatus } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ExternalLink, FileSignature, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listBatches, type BatchStats } from "@/server/actions/signature-batch";

import { BatchStatusBadge } from "./_components/batch-status-badge";

type StatusFilter = "ALL" | SignatureBatchStatus;

export default function BatchesPage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Lotes de Firmas" />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );
  const router = useRouter();
  const [batches, setBatches] = useState<BatchStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [error, setError] = useState<string | null>(null);

  const loadBatches = useCallback(async (status?: SignatureBatchStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listBatches({ status, page: 1, pageSize: 50 });

      if (result.success && result.data) {
        setBatches(result.data);
      } else {
        setError(result.error ?? "Error al cargar los lotes");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches(statusFilter === "ALL" ? undefined : statusFilter);
  }, [statusFilter, loadBatches]);

  const handleRefresh = () => {
    startTransition(() => {
      loadBatches(statusFilter === "ALL" ? undefined : statusFilter);
    });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
  };

  if (isLoading && batches.length === 0) {
    return (
      <PermissionGuard permission="manage_documents" fallback={permissionFallback}>
        <div className="@container/main flex min-h-[400px] items-center justify-center">
          <div className="space-y-2 text-center">
            <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Cargando lotes de firma...</p>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="manage_documents" fallback={permissionFallback}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/signatures")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <SectionHeader title="Lotes de Firma Masiva" description="Gestiona lotes de firma para múltiples empleados" />
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs desktop / Select móvil */}
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] @lg/main:hidden">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="COMPLETED">Completados</SelectItem>
                <SelectItem value="CANCELLED">Cancelados</SelectItem>
                <SelectItem value="EXPIRED">Expirados</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={statusFilter} onValueChange={handleStatusChange} className="hidden @lg/main:block">
              <TabsList>
                <TabsTrigger value="ALL">Todos</TabsTrigger>
                <TabsTrigger value="DRAFT">Borrador</TabsTrigger>
                <TabsTrigger value="ACTIVE">Activos</TabsTrigger>
                <TabsTrigger value="COMPLETED">Completados</TabsTrigger>
                <TabsTrigger value="CANCELLED">Cancelados</TabsTrigger>
                <TabsTrigger value="EXPIRED">Expirados</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Lista de lotes */}
        {batches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileSignature className="text-muted-foreground mb-4 h-12 w-12" />
              <p className="text-lg font-medium">No hay lotes de firma</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {statusFilter === "ALL"
                  ? "Crea un nuevo lote desde la página de firmas"
                  : `No hay lotes con estado "${statusFilter}"`}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/signatures")}>
                Ir a Gestión de Firmas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            {batches.map((batch) => (
              <Card
                key={batch.batchId}
                className="from-primary/5 to-card hover:border-primary/50 cursor-pointer bg-gradient-to-t transition-colors"
                onClick={() => router.push(`/dashboard/signatures/batches/${batch.batchId}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-base">{batch.name}</CardTitle>
                    <BatchStatusBadge status={batch.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progreso */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-medium">{batch.progressPercentage}%</span>
                    </div>
                    <Progress value={batch.progressPercentage} className="h-2" />
                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                      <span>
                        {batch.signedCount} de {batch.totalRecipients} firmados
                      </span>
                      {batch.rejectedCount > 0 && (
                        <span className="text-red-500">{batch.rejectedCount} rechazados</span>
                      )}
                    </div>
                  </div>

                  {/* Fecha de expiración */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expira</span>
                    <span
                      className={batch.daysUntilExpiration <= 3 ? "font-medium text-amber-600 dark:text-amber-400" : ""}
                    >
                      {format(new Date(batch.expiresAt), "dd MMM yyyy", { locale: es })}
                      {batch.daysUntilExpiration > 0 && (
                        <span className="text-muted-foreground ml-1">({batch.daysUntilExpiration}d)</span>
                      )}
                    </span>
                  </div>

                  {/* Acciones */}
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full" asChild onClick={(e) => e.stopPropagation()}>
                      <Link href={`/dashboard/signatures/batches/${batch.batchId}`}>
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Ver detalle
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

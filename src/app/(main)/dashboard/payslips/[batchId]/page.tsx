"use client";

import { use, useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { AlertTriangle, ArrowLeft, Loader2, Pencil, Send, ShieldAlert, Undo2, UserX } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { getBatchWithItems, type PayslipBatchListItem, type PayslipUploadItemDetail } from "@/server/actions/payslips";

import { BatchSummary } from "../_components/batch-summary";
import { EditBatchMetaDialog } from "../_components/edit-batch-meta-dialog";
import { PublishDialog } from "../_components/publish-dialog";
import { ReviewTable } from "../_components/review-table";
import { RevokeBatchDialog } from "../_components/revoke-dialog";

interface Props {
  params: Promise<{ batchId: string }>;
}

function formatStatusLabel(status: string) {
  return status.toLowerCase().replace(/_/g, " ");
}

export default function PayslipBatchDetailPage({ params }: Props) {
  const { batchId } = use(params);
  const [batch, setBatch] = useState<PayslipBatchListItem | null>(null);
  const [items, setItems] = useState<PayslipUploadItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pollCount, setPollCount] = useState(0);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { hasPermission } = usePermissions();
  const canManagePayslips = hasPermission("manage_payslips");

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const result = await getBatchWithItems(batchId, {
          status: statusFilter,
          page,
          pageSize: 50,
        });
        if (result.success && result.batch && result.items) {
          setBatch(result.batch);
          setItems(result.items);
          setTotal(result.total ?? 0);
        } else {
          setError(result.error ?? "Error desconocido");
        }
      } catch {
        setError("Error al cargar el lote");
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [batchId, statusFilter, page],
  );

  // Carga inicial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresco (Polling) si está procesando
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (batch?.status === "PROCESSING" && pollCount < 60) {
      interval = setInterval(() => {
        loadData(true); // Carga silenciosa
        setPollCount((prev) => prev + 1);
      }, 5000); // Cada 5 segundos
    }

    return () => clearInterval(interval);
  }, [batch?.status, pollCount, loadData]);

  if (isLoading && !batch) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Detalle del Lote" subtitle="Cargando..." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando lote...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Detalle del Lote"
          subtitle="Error"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/payslips">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
          }
        />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!batch) {
    return null;
  }

  return (
    <PermissionGuard
      permissions={["view_payroll", "manage_payroll"]}
      fallback={
        <div className="@container/main mx-auto flex w-full max-w-[1600px] flex-col gap-8">
          <SectionHeader title="Detalle del Lote" subtitle="Acceso denegado" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver nóminas"
          />
        </div>
      }
    >
      <div className="@container/main mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <SectionHeader
          title={batch.originalFileName}
          subtitle={`Lote de nóminas · ${formatStatusLabel(batch.status)}`}
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="h-9">
                <Link href="/dashboard/payslips">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Link>
              </Button>
              {canManagePayslips && (
                <Button variant="secondary" size="sm" onClick={() => setShowEditDialog(true)} className="h-9">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar periodo
                </Button>
              )}
              {/* Botón Publicar - solo si hay items listos y no está completado/cancelado */}
              {canManagePayslips &&
                batch.readyCount > 0 &&
                batch.status !== "COMPLETED" &&
                batch.status !== "CANCELLED" && (
                  <Button size="sm" onClick={() => setShowPublishDialog(true)} className="h-9">
                    <Send className="mr-2 h-4 w-4" />
                    Publicar lote
                  </Button>
                )}
              {/* Botón Revocar - solo si hay items publicados */}
              {canManagePayslips && batch.publishedCount > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setShowRevokeDialog(true)} className="h-9">
                  <Undo2 className="mr-2 h-4 w-4" />
                  Revocar lote
                </Button>
              )}
            </div>
          }
        />

        {/* Alertas de estado */}
        <div className="space-y-4">
          {batch.blockedInactive > 0 && (
            <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
              <UserX className="h-4 w-4" />
              <AlertTitle>Empleados inactivos detectados</AlertTitle>
              <AlertDescription>
                Se detectaron <strong>{batch.blockedInactive}</strong> nóminas para empleados inactivos. Estas nóminas
                NO se publicarán automáticamente. Revisa cada caso antes de continuar.
              </AlertDescription>
            </Alert>
          )}

          {batch.pendingCount > 0 && batch.status !== "PROCESSING" && (
            <Alert className="border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">Nóminas pendientes de revisión</AlertTitle>
              <AlertDescription className="text-amber-800/90 dark:text-amber-200/90">
                Hay <strong>{batch.pendingCount}</strong> nóminas que requieren revisión manual antes de poder
                publicarse. Asigna o descarta estas nóminas para continuar.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <BatchSummary batch={batch} />

        <ReviewTable
          items={items}
          total={total}
          page={page}
          statusFilter={statusFilter}
          onStatusFilterChange={(status) => {
            setStatusFilter(status);
            setPage(1);
          }}
          onPageChange={setPage}
          onRefresh={() => {
            setPollCount(0); // Reset polling on manual refresh
            loadData();
          }}
          isLoading={isLoading}
        />

        {/* Diálogos */}
        {canManagePayslips && (
          <PublishDialog
            open={showPublishDialog}
            onOpenChange={setShowPublishDialog}
            batch={batch}
            onSuccess={() => {
              setPollCount(0);
              loadData();
            }}
          />
        )}

        {canManagePayslips && (
          <RevokeBatchDialog
            open={showRevokeDialog}
            onOpenChange={setShowRevokeDialog}
            batch={batch}
            onSuccess={() => {
              setPollCount(0);
              loadData();
            }}
          />
        )}
        {canManagePayslips && (
          <EditBatchMetaDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            batch={batch}
            onSuccess={() => {
              setPollCount(0);
              loadData();
            }}
          />
        )}
      </div>
    </PermissionGuard>
  );
}

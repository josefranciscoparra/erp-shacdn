"use client";

import { use, useCallback, useEffect, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, Ban, Bell, Calendar, Download, FileText, Loader2, Users2 } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cancelBatch, getBatchDetail, resendBatchReminders, type BatchDetail } from "@/server/actions/signature-batch";

import { BatchRecipientsTable } from "../_components/batch-recipients-table";
import { BatchStatsCards } from "../_components/batch-stats-cards";
import { BatchStatusBadge } from "../_components/batch-status-badge";

interface BatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function BatchDetailPage({ params }: BatchDetailPageProps) {
  const resolvedParams = use(params);
  const batchId = resolvedParams.id;
  const router = useRouter();

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, startCancelTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();

  const loadBatch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getBatchDetail(batchId);

      if (result.success && result.data) {
        setBatch(result.data);
      } else {
        setError(result.error ?? "Error al cargar el lote");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  const handleCancel = () => {
    startCancelTransition(async () => {
      const result = await cancelBatch(batchId);

      if (result.success) {
        toast.success("Lote cancelado correctamente");
        loadBatch();
      } else {
        toast.error(result.error ?? "Error al cancelar el lote");
      }
    });
  };

  const handleResendReminders = () => {
    startResendTransition(async () => {
      const result = await resendBatchReminders(batchId);

      if (result.success && result.data) {
        toast.success(`Se enviaron ${result.data.sent} recordatorios`);
        loadBatch();
      } else {
        toast.error(result.error ?? "Error al enviar recordatorios");
      }
    });
  };

  const handleExport = () => {
    if (!batch) return;

    const data = {
      batchId: batch.batchId,
      name: batch.name,
      description: batch.description,
      status: batch.status,
      documentTitle: batch.documentTitle,
      requireDoubleSignature: batch.requireDoubleSignature,
      secondSignerRole: batch.secondSignerRole,
      totalRecipients: batch.totalRecipients,
      signedCount: batch.signedCount,
      pendingCount: batch.pendingCount,
      rejectedCount: batch.rejectedCount,
      expiresAt: batch.expiresAt,
      createdAt: batch.createdAt,
      createdByName: batch.createdByName,
      requests: batch.requests.map((r) => ({
        id: r.id,
        employeeName: r.employeeName,
        status: r.status,
        secondSignerMissing: r.secondSignerMissing,
        signers: r.signers.map((s) => ({
          order: s.order,
          signerName: s.signerName,
          status: s.status,
          signedAt: s.signedAt,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lote-${batch.batchId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="@container/main flex min-h-[400px] items-center justify-center">
        <div className="space-y-2 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando detalle del lote...</p>
        </div>
      </div>
    );
  }

  if (error ?? !batch) {
    return (
      <div className="@container/main flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <p className="text-lg font-medium">{error ?? "Lote no encontrado"}</p>
          <Button variant="outline" onClick={() => router.push("/dashboard/signatures/batches")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  const missingSecondSignerCount = batch.requests.filter((r) => r.secondSignerMissing).length;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/signatures/batches")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <SectionHeader title={batch.name} description={batch.description ?? undefined} />
            <BatchStatusBadge status={batch.status} />
          </div>
        </div>
      </div>

      {/* Alerta si hay firmantes faltantes */}
      {missingSecondSignerCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {missingSecondSignerCount} solicitud(es) sin segundo firmante
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Algunos empleados no tienen manager asignado. Revisa la tabla de destinatarios para identificarlos.
            </p>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <BatchStatsCards
        totalRecipients={batch.totalRecipients}
        signedCount={batch.signedCount}
        pendingCount={batch.pendingCount}
        rejectedCount={batch.rejectedCount}
        progressPercentage={batch.progressPercentage}
        daysUntilExpiration={batch.daysUntilExpiration}
      />

      {/* Info del lote */}
      <div className="grid gap-4 @xl/main:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Documento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Título</span>
              <span className="font-medium">{batch.documentTitle}</span>
            </div>
            {batch.requireDoubleSignature && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doble firma</span>
                <span className="font-medium">
                  {batch.secondSignerRole === "MANAGER"
                    ? "Manager directo"
                    : batch.secondSignerRole === "HR"
                      ? "Equipo HR"
                      : "Usuario específico"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado por</span>
              <span className="font-medium">{batch.createdByName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha creación</span>
              <span>{format(new Date(batch.createdAt), "dd MMM yyyy HH:mm", { locale: es })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha expiración</span>
              <span className={batch.daysUntilExpiration <= 3 ? "font-medium text-amber-600 dark:text-amber-400" : ""}>
                {format(new Date(batch.expiresAt), "dd MMM yyyy", { locale: es })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        {batch.status === "ACTIVE" && (
          <>
            <Button
              variant="outline"
              onClick={handleResendReminders}
              disabled={isResending || batch.pendingCount === 0}
            >
              {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
              Reenviar recordatorios ({batch.pendingCount})
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isCancelling}>
                  {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                  Cancelar lote
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar este lote de firma?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción marcará todas las solicitudes pendientes como expiradas. Los empleados no podrán firmar
                    el documento después de cancelar. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, mantener activo</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Sí, cancelar lote</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar JSON
        </Button>
      </div>

      <Separator />

      {/* Tabla de destinatarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Destinatarios
          </CardTitle>
          <CardDescription>Lista de empleados incluidos en este lote de firma</CardDescription>
        </CardHeader>
        <CardContent>
          <BatchRecipientsTable recipients={batch.requests} requireDoubleSignature={batch.requireDoubleSignature} />
        </CardContent>
      </Card>
    </div>
  );
}

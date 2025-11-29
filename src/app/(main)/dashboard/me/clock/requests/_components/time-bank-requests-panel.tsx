"use client";

import { useEffect, useMemo, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTimeBankRequestsStore } from "@/stores/time-bank-requests-store";
import { useTimeBankStore } from "@/stores/time-bank-store";

import { TimeBankRequestDialog } from "./time-bank-request-dialog";

const STATUS_LABELS = {
  PENDING: "Pendientes",
  APPROVED: "Aprobadas",
  REJECTED: "Rechazadas",
  CANCELLED: "Canceladas",
} as const;

type StatusKey = keyof typeof STATUS_LABELS;

function formatMinutes(minutes: number, type: string) {
  const hours = (minutes / 60).toFixed(1);
  const sign = type === "RECOVERY" ? "-" : "+";
  return `${sign}${hours}h`;
}

export function TimeBankRequestsPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<StatusKey>("PENDING");
  const { requests, totals, isLoading, isSubmitting, loadRequests, cancelRequest, error } = useTimeBankRequestsStore();
  const refreshSummary = useTimeBankStore((state) => state.refresh);

  useEffect(() => {
    loadRequests(activeStatus);
  }, [activeStatus, loadRequests]);

  const hasRequests = requests.length > 0;
  const statusTotals = useMemo(
    () => ({
      PENDING: totals.pending,
      APPROVED: totals.approved,
      REJECTED: totals.rejected,
      CANCELLED: totals.cancelled,
    }),
    [totals],
  );

  const handleCancel = async (id: string) => {
    try {
      await cancelRequest(id);
      await refreshSummary();
      toast.success("Solicitud cancelada");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar";
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Solicitudes de Bolsa de Horas</CardTitle>
          <p className="text-muted-foreground text-sm">Recuperaciones y compensaciones que has solicitado.</p>
        </div>
        <TimeBankRequestDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeStatus} onValueChange={(value) => setActiveStatus(value as StatusKey)}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4">
            {(Object.keys(STATUS_LABELS) as StatusKey[]).map((status) => (
              <TabsTrigger key={status} value={status} className="gap-2">
                {STATUS_LABELS[status]}
                {statusTotals[status] > 0 && <Badge>{statusTotals[status]}</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(STATUS_LABELS) as StatusKey[]).map((status) => (
            <TabsContent key={status} value={status} className="mt-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !hasRequests ? (
                <div className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm">
                  <Clock className="h-4 w-4" /> No hay solicitudes {STATUS_LABELS[status]?.toLowerCase()}
                </div>
              ) : (
                requests.map((request) => (
                  <div key={request.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {format(new Date(request.date), "dd MMM yyyy", { locale: es })}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {request.type === "RECOVERY" ? "Recuperar horas" : "Compensar festivo"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            request.type === "RECOVERY" ? "text-destructive" : "text-emerald-600"
                          }`}
                        >
                          {formatMinutes(request.requestedMinutes, request.type)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {request.status === "PENDING"
                            ? "Pendiente de revisión"
                            : request.status === "APPROVED"
                              ? "Aprobada"
                              : request.status === "REJECTED"
                                ? "Rechazada"
                                : "Cancelada"}
                        </p>
                      </div>
                    </div>
                    {request.reason && <p className="text-muted-foreground mt-2 text-sm">{request.reason}</p>}
                    <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
                      <span>
                        Enviado el{" "}
                        {format(new Date(request.submittedAt ?? request.createdAt), "dd/MM HH:mm", { locale: es })}
                      </span>
                      {request.status === "APPROVED" && request.approvedAt && (
                        <span>Aprobado el {format(new Date(request.approvedAt), "dd/MM HH:mm", { locale: es })}</span>
                      )}
                      {request.status === "REJECTED" && request.rejectedAt && (
                        <span>Rechazado el {format(new Date(request.rejectedAt), "dd/MM HH:mm", { locale: es })}</span>
                      )}
                    </div>
                    {request.status === "PENDING" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleCancel(request.id)}
                          disabled={isSubmitting}
                        >
                          <XCircle className="h-4 w-4" />
                          Cancelar solicitud
                        </Button>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <AlertCircle className="h-3.5 w-3.5" />
                          En revisión por RRHH
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>

        {error && (
          <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

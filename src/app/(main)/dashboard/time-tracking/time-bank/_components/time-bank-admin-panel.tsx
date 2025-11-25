"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Loader2, PiggyBank, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getTimeBankRequestsForReview,
  reviewTimeBankRequest,
  type TimeBankRequestWithEmployee,
} from "@/server/actions/time-bank";

import type { TimeBankRequestStatus } from "@prisma/client";

const REVIEW_STATUSES: TimeBankRequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const STATUS_COLORS: Record<TimeBankRequestStatus, string> = {
  PENDING: "text-amber-600",
  APPROVED: "text-emerald-600",
  REJECTED: "text-destructive",
  CANCELLED: "text-muted-foreground",
  APPLIED: "text-emerald-600",
};

export function TimeBankAdminPanel() {
  const [requests, setRequests] = useState<TimeBankRequestWithEmployee[]>([]);
  const [statusFilter, setStatusFilter] = useState<TimeBankRequestStatus>("PENDING");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadRequests = async (status: TimeBankRequestStatus) => {
    setIsLoading(true);
    try {
      const data = await getTimeBankRequestsForReview(status);
      setRequests(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar solicitudes";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(statusFilter);
  }, [statusFilter]);

  const totals = useMemo(() => {
    const summary: Record<TimeBankRequestStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
      APPLIED: 0,
    };
    requests.forEach((request) => {
      summary[request.status] = (summary[request.status] ?? 0) + 1;
    });
    return summary;
  }, [requests]);

  const handleReview = (requestId: string, action: "APPROVE" | "REJECT") => {
    startTransition(async () => {
      try {
        await reviewTimeBankRequest({ requestId, action });
        toast.success(action === "APPROVE" ? "Solicitud aprobada" : "Solicitud rechazada");
        await loadRequests(statusFilter);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo procesar";
        toast.error(message);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Solicitudes de Bolsa de Horas</CardTitle>
          <p className="text-muted-foreground text-sm">Gestiona recuperaciones, festivos y ajustes enviados por el equipo.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadRequests(statusFilter)} disabled={isLoading || isPending}>
          <RefreshCw className="mr-2 h-4 w-4" /> Recargar
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as TimeBankRequestStatus)}>
          <TabsList className="grid grid-cols-3">
            {REVIEW_STATUSES.map((status) => (
              <TabsTrigger key={status} value={status} className="gap-2">
                {status === "PENDING" ? "Pendientes" : status === "APPROVED" ? "Aprobadas" : "Rechazadas"}
                {statusFilter === status && totals[status] > 0 && <Badge>{totals[status]}</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
          {REVIEW_STATUSES.map((status) => (
            <TabsContent key={status} value={status} className="mt-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
                  No hay solicitudes en este estado.
                </div>
              ) : (
                requests.map((request) => (
                  <div key={request.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <PiggyBank className="text-primary h-4 w-4" />
                          {request.employee.firstName} {request.employee.lastName}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {request.employee.employeeNumber ? `Empleado ${request.employee.employeeNumber}` : "Sin número"}
                        </p>
                        <p className="mt-2 text-sm font-medium">
                          {request.type === "RECOVERY" ? "Recuperar horas" : "Compensar festivo"} ·
                          {format(new Date(request.date), "dd MMM yyyy", { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Solicitado el {format(new Date(request.submittedAt ?? request.createdAt), "dd/MM HH:mm", { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${STATUS_COLORS[request.status]}`}>{
                          request.type === "RECOVERY"
                            ? `-${(request.requestedMinutes / 60).toFixed(1)}h`
                            : `+${(request.requestedMinutes / 60).toFixed(1)}h`
                        }</div>
                        <p className="text-xs text-muted-foreground">{request.status}</p>
                      </div>
                    </div>
                    {request.reason && <p className="text-muted-foreground mt-3 text-sm">{request.reason}</p>}

                    {request.status === "PENDING" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => handleReview(request.id, "APPROVE")}
                          disabled={isPending}
                        >
                          <CheckCircle className="h-4 w-4" /> Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleReview(request.id, "REJECT")}
                          disabled={isPending}
                        >
                          <XCircle className="h-4 w-4" /> Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>

        {isPending && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando solicitud...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { TimeBankRequestStatus } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Loader2, PiggyBank, RefreshCw, Search, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getTimeBankRequestsForReview,
  reviewTimeBankRequest,
  type TimeBankRequestWithEmployee,
} from "@/server/actions/time-bank";

const REVIEW_STATUSES: TimeBankRequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const STATUS_COLORS: Record<TimeBankRequestStatus, string> = {
  PENDING: "text-amber-600",
  APPROVED: "text-emerald-600",
  REJECTED: "text-destructive",
  CANCELLED: "text-muted-foreground",
  APPLIED: "text-emerald-600",
};

const PAGE_SIZE = 10;

function RequestCard({
  request,
  isPending,
  onApprove,
  onReject,
}: {
  request: TimeBankRequestWithEmployee;
  isPending: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <PiggyBank className="text-primary h-4 w-4" />
            {request.employee.firstName} {request.employee.lastName}
          </div>
          <p className="text-muted-foreground text-xs">
            {request.employee.employeeNumber ? `Empleado ${request.employee.employeeNumber}` : "Sin número"}
          </p>
          <p className="mt-2 text-sm font-medium">
            {request.type === "RECOVERY" ? "Recuperar horas" : "Compensar festivo"} ·{" "}
            {format(new Date(request.date), "dd MMM yyyy", { locale: es })}
          </p>
          <p className="text-muted-foreground text-xs">
            Solicitado el {format(new Date(request.submittedAt ?? request.createdAt), "dd/MM HH:mm", { locale: es })}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-lg font-semibold ${STATUS_COLORS[request.status]}`}>
            {request.type === "RECOVERY"
              ? `-${(request.requestedMinutes / 60).toFixed(1)}h`
              : `+${(request.requestedMinutes / 60).toFixed(1)}h`}
          </div>
          <p className="text-muted-foreground text-xs">{request.status}</p>
        </div>
      </div>
      {request.reason && <p className="text-muted-foreground mt-3 text-sm">{request.reason}</p>}
      {request.status === "REJECTED" && (request.metadata as Record<string, string> | null)?.reviewerComments && (
        <div className="mt-3 rounded-md bg-red-50 p-3 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Motivo del rechazo:</p>
          <p className="text-sm text-red-600 dark:text-red-300">
            {(request.metadata as Record<string, string>).reviewerComments}
          </p>
        </div>
      )}

      {request.status === "PENDING" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="gap-2" onClick={() => onApprove(request.id)} disabled={isPending}>
            <CheckCircle className="h-4 w-4" /> Aprobar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => onReject(request.id)}
            disabled={isPending}
          >
            <XCircle className="h-4 w-4" /> Rechazar
          </Button>
        </div>
      )}
    </div>
  );
}

export function TimeBankAdminPanel() {
  const [requests, setRequests] = useState<TimeBankRequestWithEmployee[]>([]);
  const [statusFilter, setStatusFilter] = useState<TimeBankRequestStatus>("PENDING");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Paginación y búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  // Estado para el Dialog de rechazo
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const loadRequests = async (status: TimeBankRequestStatus) => {
    setIsLoading(true);
    try {
      const data = await getTimeBankRequestsForReview(status);
      setRequests(data);
      setCurrentPage(0); // Reset página al cambiar filtro
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

  // Reset página cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  // Filtrar por búsqueda
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;

    const query = searchQuery.toLowerCase();
    return requests.filter((r) => {
      const fullName = `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase();
      const empNumber = r.employee.employeeNumber?.toLowerCase() ?? "";
      return fullName.includes(query) || empNumber.includes(query);
    });
  }, [requests, searchQuery]);

  // Paginación
  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE);
  const paginatedRequests = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [filteredRequests, currentPage]);

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

  const handleApprove = (requestId: string) => {
    startTransition(async () => {
      try {
        await reviewTimeBankRequest({ requestId, action: "APPROVE" });
        toast.success("Solicitud aprobada");
        await loadRequests(statusFilter);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo procesar";
        toast.error(message);
      }
    });
  };

  const openRejectDialog = (requestId: string) => {
    setRejectingRequestId(requestId);
    setRejectComment("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!rejectingRequestId) return;

    startTransition(async () => {
      try {
        await reviewTimeBankRequest({
          requestId: rejectingRequestId,
          action: "REJECT",
          reviewerComments: rejectComment.trim() || undefined,
        });
        toast.success("Solicitud rechazada");
        setRejectDialogOpen(false);
        setRejectingRequestId(null);
        setRejectComment("");
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
          <p className="text-muted-foreground text-sm">
            Gestiona recuperaciones, festivos y ajustes enviados por el equipo.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadRequests(statusFilter)}
          disabled={isLoading || isPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Recargar
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as TimeBankRequestStatus)}>
          {/* Tabs en desktop, Select en móvil */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:hidden">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TimeBankRequestStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pendientes ({totals.PENDING})</SelectItem>
                  <SelectItem value="APPROVED">Aprobadas ({totals.APPROVED})</SelectItem>
                  <SelectItem value="REJECTED">Rechazadas ({totals.REJECTED})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TabsList className="hidden sm:grid sm:grid-cols-3">
              {REVIEW_STATUSES.map((status) => (
                <TabsTrigger key={status} value={status} className="gap-2">
                  {status === "PENDING" ? "Pendientes" : status === "APPROVED" ? "Aprobadas" : "Rechazadas"}
                  {totals[status] > 0 && <Badge variant="secondary">{totals[status]}</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar empleado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {REVIEW_STATUSES.map((status) => (
            <TabsContent key={status} value={status} className="mt-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : paginatedRequests.length === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
                  {searchQuery ? "No se encontraron solicitudes." : "No hay solicitudes en este estado."}
                </div>
              ) : (
                paginatedRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    isPending={isPending}
                    onApprove={handleApprove}
                    onReject={openRejectDialog}
                  />
                ))
              )}

              {/* Paginación */}
              {filteredRequests.length > PAGE_SIZE && (
                <div className="flex items-center justify-between gap-2 pt-4">
                  <p className="text-muted-foreground text-sm">
                    Mostrando {paginatedRequests.length} de {filteredRequests.length} solicitudes
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {currentPage + 1} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {isPending && (
          <div className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando solicitud...
          </div>
        )}
      </CardContent>

      {/* Dialog de rechazo con comentario */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="text-destructive h-5 w-5" />
              Rechazar solicitud
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas rechazar esta solicitud? Puedes añadir un comentario para informar al empleado
              del motivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-comment">Motivo del rechazo (opcional)</Label>
              <Textarea
                id="reject-comment"
                placeholder="Ej: No se dispone de saldo suficiente, el día solicitado no es válido..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleReject} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rechazando...
                </>
              ) : (
                "Confirmar rechazo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
      <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Clock, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useApproverManualTimeEntryStore,
  type ManualTimeEntryRequestToApprove,
} from "@/stores/approver-manual-time-entry-store";

export default function ManualTimeEntryApprovalsPage() {
  const { requests, totals, isLoading, loadRequests, approveRequest, rejectRequest } =
    useApproverManualTimeEntryStore();

  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  // Estado para dialogs de aprobación/rechazo
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    request: ManualTimeEntryRequestToApprove | null;
  }>({
    open: false,
    request: null,
  });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; request: ManualTimeEntryRequestToApprove | null }>({
    open: false,
    request: null,
  });
  const [approverComments, setApproverComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadRequests(activeTab);
  }, [activeTab, loadRequests]);

  const handleApprove = async () => {
    if (!approveDialog.request) return;

    try {
      await approveRequest(approveDialog.request.id, approverComments);
      toast.success("Solicitud aprobada correctamente");
      setApproveDialog({ open: false, request: null });
      setApproverComments("");
    } catch (error) {
      toast.error("Error al aprobar solicitud");
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.request) return;

    if (!rejectionReason || rejectionReason.trim().length < 10) {
      toast.error("El motivo del rechazo debe tener al menos 10 caracteres");
      return;
    }

    try {
      await rejectRequest(rejectDialog.request.id, rejectionReason);
      toast.success("Solicitud rechazada");
      setRejectDialog({ open: false, request: null });
      setRejectionReason("");
    } catch (error) {
      toast.error("Error al rechazar solicitud");
    }
  };

  const getStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendiente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Aprobado
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rechazado
          </Badge>
        );
    }
  };

  const formatTime = (date: Date) => {
    return format(new Date(date), "HH:mm", { locale: es });
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd MMM yyyy", { locale: es });
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Aprobaciones de fichaje manual"
        description="Gestiona las solicitudes de fichaje manual de tu equipo"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between gap-4">
          {/* Select para móvil */}
          <div className="flex @4xl/main:hidden">
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">
                  Pendientes
                  {totals.pending > 0 && <Badge className="ml-2">{totals.pending}</Badge>}
                </SelectItem>
                <SelectItem value="APPROVED">
                  Aprobadas
                  {totals.approved > 0 && <Badge className="ml-2">{totals.approved}</Badge>}
                </SelectItem>
                <SelectItem value="REJECTED">
                  Rechazadas
                  {totals.rejected > 0 && <Badge className="ml-2">{totals.rejected}</Badge>}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="PENDING" className="gap-2">
              Pendientes
              {totals.pending > 0 && <Badge variant="secondary">{totals.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="APPROVED" className="gap-2">
              Aprobadas
              {totals.approved > 0 && <Badge variant="secondary">{totals.approved}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="REJECTED" className="gap-2">
              Rechazadas
              {totals.rejected > 0 && <Badge variant="secondary">{totals.rejected}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Contenido de tabs */}
        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground text-sm">Cargando solicitudes...</div>
            </div>
          ) : requests.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Clock className="text-muted-foreground mb-4 h-12 w-12" />
              <p className="text-muted-foreground text-sm">
                {activeTab === "PENDING" && "No hay solicitudes pendientes"}
                {activeTab === "APPROVED" && "No hay solicitudes aprobadas"}
                {activeTab === "REJECTED" && "No hay solicitudes rechazadas"}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {requests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex flex-col gap-4 @lg/main:flex-row @lg/main:items-start @lg/main:justify-between">
                    {/* Info principal */}
                    <div className="flex-1 space-y-3">
                      {/* Empleado y estado */}
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {request.employee.firstName} {request.employee.lastName}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {request.employee.employeeNumber && `#${request.employee.employeeNumber} • `}
                            {request.employee.email}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {/* Fecha y horas */}
                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-muted-foreground text-xs font-medium">Fecha y horario solicitado</p>
                        <div className="mt-2 flex gap-6">
                          <div>
                            <span className="text-sm font-medium">{formatDate(request.date)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Entrada:</span>{" "}
                            <span className="font-medium">{formatTime(request.clockInTime)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Salida:</span>{" "}
                            <span className="font-medium">{formatTime(request.clockOutTime)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Motivo */}
                      <div className="rounded-md border p-3">
                        <p className="text-muted-foreground text-xs font-medium">Justificación</p>
                        <p className="mt-1 text-sm">{request.reason}</p>
                      </div>

                      {/* Información de aprobación/rechazo */}
                      {request.status === "APPROVED" && request.approverComments && (
                        <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                          <p className="text-xs font-medium text-green-900 dark:text-green-100">Tus comentarios</p>
                          <p className="mt-1 text-sm text-green-800 dark:text-green-200">{request.approverComments}</p>
                        </div>
                      )}

                      {request.status === "REJECTED" && request.rejectionReason && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                          <p className="text-xs font-medium text-red-900 dark:text-red-100">Motivo del rechazo</p>
                          <p className="mt-1 text-sm text-red-800 dark:text-red-200">{request.rejectionReason}</p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="text-muted-foreground text-xs">Solicitado: {formatDate(request.submittedAt)}</div>
                    </div>

                    {/* Acciones */}
                    {request.status === "PENDING" && (
                      <div className="flex gap-2 @lg/main:flex-col">
                        <Button
                          size="sm"
                          onClick={() => setApproveDialog({ open: true, request })}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectDialog({ open: true, request })}
                          className="flex-1"
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de aprobación */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog({ open, request: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar solicitud de fichaje manual</DialogTitle>
            <DialogDescription>
              Estás aprobando la solicitud de{" "}
              {approveDialog.request &&
                `${approveDialog.request.employee.firstName} ${approveDialog.request.employee.lastName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approverComments">Comentarios (opcional)</Label>
              <Textarea
                id="approverComments"
                placeholder="Añade comentarios si lo deseas..."
                value={approverComments}
                onChange={(e) => setApproverComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false, request: null })}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Aprobar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de rechazo */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, request: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud de fichaje manual</DialogTitle>
            <DialogDescription>
              Estás rechazando la solicitud de{" "}
              {rejectDialog.request &&
                `${rejectDialog.request.employee.firstName} ${rejectDialog.request.employee.lastName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Motivo del rechazo (obligatorio)</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Explica por qué rechazas esta solicitud..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-muted-foreground text-xs">{rejectionReason.length}/10 caracteres mínimo</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, request: null })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Rechazar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

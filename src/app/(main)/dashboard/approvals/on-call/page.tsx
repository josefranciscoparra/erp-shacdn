"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Clock, ShieldAlert, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApproverOnCallStore, type OnCallInterventionToApprove } from "@/stores/approver-on-call-store";

export default function OnCallApprovalsPage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Aprobaciones de intervenciones" />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );

  const { requests, totals, isLoading, loadRequests, approveRequest, rejectRequest } = useApproverOnCallStore();
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    request: OnCallInterventionToApprove | null;
  }>({
    open: false,
    request: null,
  });
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    request: OnCallInterventionToApprove | null;
  }>({
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
      toast.success("Intervención aprobada");
      setApproveDialog({ open: false, request: null });
      setApproverComments("");
    } catch {
      toast.error("Error al aprobar la intervención");
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.request) return;
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      toast.error("El motivo del rechazo debe tener al menos 5 caracteres");
      return;
    }
    try {
      await rejectRequest(rejectDialog.request.id, rejectionReason);
      toast.success("Intervención rechazada");
      setRejectDialog({ open: false, request: null });
      setRejectionReason("");
    } catch {
      toast.error("Error al rechazar la intervención");
    }
  };

  const getStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    if (status === "PENDING") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pendiente
        </Badge>
      );
    }
    if (status === "APPROVED") {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Aprobada
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Rechazada
      </Badge>
    );
  };

  return (
    <PermissionGuard permission="approve_requests" fallback={permissionFallback}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Aprobaciones de intervenciones"
          description="Revisa y valida intervenciones realizadas durante guardias"
        />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <div className="flex items-center justify-between gap-4">
            <TabsList>
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

          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground text-sm">Cargando intervenciones...</div>
              </div>
            ) : requests.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-12">
                <Clock className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                  {activeTab === "PENDING" && "No hay intervenciones pendientes"}
                  {activeTab === "APPROVED" && "No hay intervenciones aprobadas"}
                  {activeTab === "REJECTED" && "No hay intervenciones rechazadas"}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {requests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex flex-col gap-4 @lg/main:flex-row @lg/main:items-start @lg/main:justify-between">
                      <div className="flex-1 space-y-3">
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

                        <div className="bg-muted/50 rounded-md p-3">
                          <p className="text-sm font-medium">Detalle de la intervención</p>
                          <p className="text-muted-foreground text-sm">
                            {format(new Date(request.startAt), "dd MMM yyyy", { locale: es })} ·{" "}
                            {format(new Date(request.startAt), "HH:mm", { locale: es })} -{" "}
                            {format(new Date(request.endAt), "HH:mm", { locale: es })}
                          </p>
                          {request.notes && <p className="text-muted-foreground mt-1 text-xs">{request.notes}</p>}
                        </div>
                      </div>

                      {request.status === "PENDING" && (
                        <div className="flex flex-col gap-2">
                          <Button variant="default" size="sm" onClick={() => setApproveDialog({ open: true, request })}>
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            Aprobar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setRejectDialog({ open: true, request })}>
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
      </div>

      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => setApproveDialog({ open, request: approveDialog.request })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar intervención</DialogTitle>
            <DialogDescription>Opcional: añade un comentario para el empleado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Comentario</Label>
            <Textarea value={approverComments} onChange={(event) => setApproverComments(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveDialog({ open: false, request: null })}>
              Cancelar
            </Button>
            <Button onClick={handleApprove}>Aprobar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog({ open, request: rejectDialog.request })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar intervención</DialogTitle>
            <DialogDescription>Indica el motivo del rechazo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialog({ open: false, request: null })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}

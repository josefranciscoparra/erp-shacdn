"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Clock, ShieldAlert, XCircle } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/services/schedules";
import { useApproverOvertimeStore, type OvertimeRequestStatus } from "@/stores/approver-overtime-store";

type CompensationType = "TIME" | "PAY" | "MIXED" | "NONE";

function formatCandidateType(type?: string | null) {
  switch (type) {
    case "NON_WORKDAY":
      return "No laborable";
    case "COMPLEMENTARY":
      return "Complementarias";
    case "DEFICIT":
      return "Déficit";
    default:
      return "Extra";
  }
}

export default function OvertimeApprovalsPage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Aprobaciones de horas extra" />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );

  const { requests, totals, isLoading, loadRequests, approveRequest, rejectRequest } = useApproverOvertimeStore();
  const [activeTab, setActiveTab] = useState<OvertimeRequestStatus>("PENDING");

  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    requestId: string | null;
    defaultCompensation: CompensationType;
  }>({ open: false, requestId: null, defaultCompensation: "TIME" });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; requestId: string | null }>({
    open: false,
    requestId: null,
  });
  const [compensationType, setCompensationType] = useState<CompensationType>("TIME");
  const [approverComments, setApproverComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadRequests(activeTab);
  }, [activeTab, loadRequests]);

  const handleApprove = async () => {
    if (!approveDialog.requestId) return;
    try {
      await approveRequest(approveDialog.requestId, compensationType, approverComments);
      toast.success("Horas extra aprobadas");
      setApproveDialog({ open: false, requestId: null, defaultCompensation: "TIME" });
      setApproverComments("");
    } catch {
      toast.error("No se pudo aprobar");
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.requestId) return;
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      toast.error("El motivo debe tener al menos 10 caracteres");
      return;
    }
    try {
      await rejectRequest(rejectDialog.requestId, rejectionReason);
      toast.success("Horas extra rechazadas");
      setRejectDialog({ open: false, requestId: null });
      setRejectionReason("");
    } catch {
      toast.error("No se pudo rechazar");
    }
  };

  return (
    <PermissionGuard permission="approve_requests" fallback={permissionFallback}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Aprobaciones de horas extra" description="Gestiona las horas extra de tu equipo" />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OvertimeRequestStatus)}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex @4xl/main:hidden">
              <Select value={activeTab} onValueChange={(value) => setActiveTab(value as OvertimeRequestStatus)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">
                    Pendientes {totals.pending > 0 && <Badge className="ml-2">{totals.pending}</Badge>}
                  </SelectItem>
                  <SelectItem value="APPROVED">
                    Aprobadas {totals.approved > 0 && <Badge className="ml-2">{totals.approved}</Badge>}
                  </SelectItem>
                  <SelectItem value="REJECTED">
                    Rechazadas {totals.rejected > 0 && <Badge className="ml-2">{totals.rejected}</Badge>}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsList className="hidden @4xl/main:flex">
              <TabsTrigger value="PENDING" className="gap-2">
                Pendientes {totals.pending > 0 && <Badge variant="secondary">{totals.pending}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="APPROVED" className="gap-2">
                Aprobadas {totals.approved > 0 && <Badge variant="secondary">{totals.approved}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="REJECTED" className="gap-2">
                Rechazadas {totals.rejected > 0 && <Badge variant="secondary">{totals.rejected}</Badge>}
              </TabsTrigger>
            </TabsList>
          </div>

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
                {requests.map((request) => {
                  const candidateMinutesFinal = request.candidate ? request.candidate.candidateMinutesFinal : null;
                  const candidateMinutes = candidateMinutesFinal ?? request.minutesApproved;
                  return (
                    <Card key={request.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            {request.employee.firstName} {request.employee.lastName}
                            {request.organization && (
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {request.organization.name ?? "Organización"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {request.employee.employeeNumber
                              ? `Empleado ${request.employee.employeeNumber}`
                              : "Sin número"}
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            {format(new Date(request.date), "dd MMM yyyy", { locale: es })}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Solicitado el {format(new Date(request.requestedAt), "dd/MM HH:mm", { locale: es })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {candidateMinutes >= 0 ? "+" : "-"}
                            {formatDuration(Math.abs(candidateMinutes))}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatCandidateType(request.candidate?.candidateType)}
                          </p>
                        </div>
                      </div>
                      {request.justification && (
                        <p className="text-muted-foreground mt-3 text-sm">{request.justification}</p>
                      )}

                      {request.status === "PENDING" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setCompensationType(request.compensationType as CompensationType);
                              setApproveDialog({
                                open: true,
                                requestId: request.id,
                                defaultCompensation: request.compensationType as CompensationType,
                              });
                            }}
                          >
                            <CheckCircle className="h-4 w-4" /> Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => setRejectDialog({ open: true, requestId: request.id })}
                          >
                            <XCircle className="h-4 w-4" /> Rechazar
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog((prev) => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprobar horas extra</DialogTitle>
              <DialogDescription>Define la compensación y añade comentarios si aplica.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Compensación</Label>
                <Select
                  value={compensationType}
                  onValueChange={(value) => setCompensationType(value as CompensationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TIME">Tiempo (bolsa)</SelectItem>
                    <SelectItem value="PAY">Pago en nómina</SelectItem>
                    <SelectItem value="MIXED">Mixto</SelectItem>
                    <SelectItem value="NONE">Registrar sin compensar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Comentarios</Label>
                <Textarea
                  placeholder="Opcional"
                  value={approverComments}
                  onChange={(e) => setApproverComments(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setApproveDialog({ open: false, requestId: null, defaultCompensation: "TIME" })}
              >
                Cancelar
              </Button>
              <Button onClick={handleApprove}>Aprobar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar horas extra</DialogTitle>
              <DialogDescription>Indica el motivo del rechazo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                placeholder="Motivo del rechazo (mínimo 10 caracteres)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog({ open: false, requestId: null })}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Rechazar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}

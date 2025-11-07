"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Clock, XCircle, Trash2, Calendar as CalendarIcon, List } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useManualTimeEntryStore } from "@/stores/manual-time-entry-store";

import { ManualTimeEntryDialog } from "../_components/manual-time-entry-dialog";

import { TimeBalanceSidebar } from "./_components/time-balance-sidebar";
import { TimeCalendarView } from "./_components/time-calendar-view";

export default function MyManualTimeEntryRequestsPage() {
  const { requests, totals, isLoading, loadRequests, cancelRequest } = useManualTimeEntryStore();
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  useEffect(() => {
    loadRequests(activeTab);
  }, [activeTab, loadRequests]);

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("¿Estás seguro de que quieres cancelar esta solicitud?")) {
      return;
    }

    try {
      await cancelRequest(requestId);
      toast.success("Solicitud cancelada");
    } catch {
      toast.error("Error al cancelar solicitud");
    }
  };

  const getStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
          >
            <Clock className="h-3 w-3" />
            Pendiente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
          >
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
        title="Mis fichajes"
        description="Calendario, balance de horas y solicitudes de fichaje manual"
        action={
          <div className="flex gap-2">
            <Button
              variant={viewMode === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Calendario
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
              <List className="mr-2 h-4 w-4" />
              Solicitudes
            </Button>
          </div>
        }
      />

      <ManualTimeEntryDialog open={manualDialogOpen} onOpenChange={setManualDialogOpen} />

      {viewMode === "calendar" ? (
        <div className="flex flex-col gap-6">
          <TimeCalendarView />
          <TimeBalanceSidebar />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <div className="flex flex-col gap-4">
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

              {/* Botón nueva solicitud */}
              <Button onClick={() => setManualDialogOpen(true)}>Nueva solicitud</Button>
            </div>
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
                <p className="text-muted-foreground text-sm">No hay solicitudes {activeTab.toLowerCase()}</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {requests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex flex-col gap-4 @lg/main:flex-row @lg/main:items-start @lg/main:justify-between">
                      {/* Info principal */}
                      <div className="flex-1 space-y-3">
                        {/* Fecha y estado */}
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{formatDate(request.date)}</h3>
                          {getStatusBadge(request.status)}
                        </div>

                        {/* Horas */}
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="text-muted-foreground">Entrada:</span>{" "}
                            <span className="font-medium">{formatTime(request.clockInTime)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Salida:</span>{" "}
                            <span className="font-medium">{formatTime(request.clockOutTime)}</span>
                          </div>
                        </div>

                        {/* Motivo */}
                        <div className="bg-muted/50 rounded-md p-3">
                          <p className="text-muted-foreground text-xs font-medium">Motivo</p>
                          <p className="mt-1 text-sm">{request.reason}</p>
                        </div>

                        {/* Información de aprobación/rechazo */}
                        {request.status === "APPROVED" && request.approverComments && (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                            <p className="text-xs font-medium text-green-700 dark:text-green-300">
                              Comentario del aprobador
                            </p>
                            <p className="text-muted-foreground mt-1 text-sm">{request.approverComments}</p>
                          </div>
                        )}

                        {request.status === "REJECTED" && request.rejectionReason && (
                          <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                            <p className="text-xs font-medium text-red-700 dark:text-red-300">Motivo del rechazo</p>
                            <p className="text-muted-foreground mt-1 text-sm">{request.rejectionReason}</p>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="text-muted-foreground flex gap-4 text-xs">
                          <span>Solicitado: {formatDate(request.submittedAt)}</span>
                          {request.approverName && <span>Aprobador: {request.approverName}</span>}
                        </div>
                      </div>

                      {/* Acciones */}
                      {request.status === "PENDING" && (
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelRequest(request.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancelar
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
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Clock, XCircle, Trash2, Calendar as CalendarIcon, List } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useManualTimeEntryStore } from "@/stores/manual-time-entry-store";

import { ManualTimeEntryDialog } from "../../_components/manual-time-entry-dialog";

import { TimeBankRequestsPanel } from "./time-bank-requests-panel";
import { TimeCalendarView } from "./time-calendar-view";

export function ManualRequestsContent() {
  const { requests, totals, isLoading, loadRequests, cancelRequest } = useManualTimeEntryStore();
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const getStatusText = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    switch (status) {
      case "PENDING":
        return "pendientes";
      case "APPROVED":
        return "aprobadas";
      case "REJECTED":
        return "rechazadas";
    }
  };

  useEffect(() => {
    loadRequests(activeTab);
    setCurrentPage(1); // Reset página al cambiar tab
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
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          >
            <Clock className="h-3 w-3" />
            Pendiente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="secondary"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          >
            <CheckCircle className="h-3 w-3" />
            Aprobado
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="secondary"
            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
          >
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

  // Calcular paginación
  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = requests.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 @xl/main:flex-row @xl/main:items-start @xl/main:justify-between">
        <div></div> {/* Spacer to push buttons to right if needed, or removed if handled by parent */}
        <div className="ml-auto flex gap-2">
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
      </div>

      <ManualTimeEntryDialog open={manualDialogOpen} onOpenChange={setManualDialogOpen} />

      {viewMode === "calendar" ? (
        <div className="flex flex-col gap-6">
          <TimeCalendarView />
          <TimeBankRequestsPanel />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
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
              <Button onClick={() => setManualDialogOpen(true)} className="w-full @4xl/main:w-auto">
                Nueva solicitud
              </Button>
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
                <p className="text-muted-foreground text-sm">No hay solicitudes {getStatusText(activeTab)}</p>
              </Card>
            ) : (
              <>
                <div className="grid gap-3">
                  {paginatedRequests.map((request) => (
                    <Card
                      key={request.id}
                      className="group border-border/60 hover:bg-muted/30 dark:bg-card dark:hover:bg-muted/20 rounded-xl bg-white p-4 shadow-sm transition-colors duration-150"
                    >
                      <div className="space-y-3.5">
                        {/* Fila superior: Fecha + Badge + Botón cancelar */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-[15px] leading-none font-semibold">{formatDate(request.date)}</h3>
                            {getStatusBadge(request.status)}
                          </div>

                          {/* Botón cancelar más discreto */}
                          {request.status === "PENDING" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelRequest(request.id)}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="ml-1.5 text-xs">Cancelar</span>
                            </Button>
                          )}
                        </div>

                        {/* Segunda fila: Entrada y Salida en misma línea */}
                        <div className="flex items-center gap-6">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-muted-foreground text-xs">Entrada:</span>
                            <span className="text-sm font-medium">{formatTime(request.clockInTime)}</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-muted-foreground text-xs">Salida:</span>
                            <span className="text-sm font-medium">{formatTime(request.clockOutTime)}</span>
                          </div>
                        </div>

                        {/* Motivo sin fondo gris */}
                        <div>
                          <p className="text-muted-foreground mb-1 text-xs">Motivo</p>
                          <p className="text-sm leading-relaxed">{request.reason}</p>
                        </div>

                        {/* Información de aprobación/rechazo */}
                        {request.status === "APPROVED" && request.approverComments && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              Comentario del aprobador
                            </p>
                            <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                              {request.approverComments}
                            </p>
                          </div>
                        )}

                        {request.status === "REJECTED" && request.rejectionReason && (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                            <p className="text-xs font-medium text-red-700 dark:text-red-300">Motivo del rechazo</p>
                            <p className="mt-1 text-sm text-red-900/80 dark:text-red-100/80">
                              {request.rejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Metadata discreta al final */}
                        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                          <span>Solicitado {formatDate(request.submittedAt)}</span>
                          {request.approverName && (
                            <>
                              <span className="text-border">•</span>
                              <span>Aprobador: {request.approverName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <div className="text-muted-foreground text-sm">
                      Mostrando {startIndex + 1}-{Math.min(endIndex, requests.length)} de {requests.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <div className="text-sm">
                        Página {currentPage} de {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

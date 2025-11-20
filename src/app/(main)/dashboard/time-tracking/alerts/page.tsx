"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTable } from "@/components/data-table/data-table";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
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
import { Textarea } from "@/components/ui/textarea";

import { alertColumns, type AlertRow } from "./_components/alert-columns";
import { getActiveAlerts, resolveAlert, dismissAlert, getAlertStats } from "@/server/actions/alert-detection";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type AlertStats = {
  total: number;
  active: number;
  resolved: number;
  dismissed: number;
  bySeverity: { severity: string; count: number }[];
  byType: { type: string; count: number }[];
};

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "resolved" | "dismissed">("active");
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);
  const [actionDialog, setActionDialog] = useState<"resolve" | "dismiss" | "details" | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Cargar alertas y estadísticas
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [alertsData, statsData] = await Promise.all([
        getActiveAlerts(),
        getAlertStats(),
      ]);

      setAlerts(alertsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error al cargar alertas:", error);
      alert("Error: No se pudieron cargar las alertas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar alertas por tab activo
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (activeTab === "active") return alert.status === "ACTIVE";
      if (activeTab === "resolved") return alert.status === "RESOLVED";
      if (activeTab === "dismissed") return alert.status === "DISMISSED";
      return true;
    });
  }, [alerts, activeTab]);

  // Memoizar meta functions para evitar recrear la tabla
  const tableMeta = useMemo(() => ({
    onResolve: (alert: AlertRow) => {
      setSelectedAlert(alert);
      setActionDialog("resolve");
      setComment("");
    },
    onDismiss: (alert: AlertRow) => {
      setSelectedAlert(alert);
      setActionDialog("dismiss");
      setComment("");
    },
    onViewDetails: (alert: AlertRow) => {
      setSelectedAlert(alert);
      setActionDialog("details");
    },
  }), []);

  // Configurar tabla
  const table = useReactTable({
    data: filteredAlerts,
    columns: alertColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: tableMeta,
  });

  // Manejar resolver alerta
  const handleResolve = async () => {
    if (!selectedAlert) return;

    try {
      setProcessing(true);
      await resolveAlert(selectedAlert.id, comment);

      alert("Alerta resuelta correctamente");

      setActionDialog(null);
      setSelectedAlert(null);
      setComment("");
      loadData();
    } catch (error) {
      console.error("Error al resolver alerta:", error);
      alert("Error: No se pudo resolver la alerta");
    } finally {
      setProcessing(false);
    }
  };

  // Manejar descartar alerta
  const handleDismiss = async () => {
    if (!selectedAlert) return;

    try {
      setProcessing(true);
      await dismissAlert(selectedAlert.id, comment);

      alert("Alerta descartada correctamente");

      setActionDialog(null);
      setSelectedAlert(null);
      setComment("");
      loadData();
    } catch (error) {
      console.error("Error al descartar alerta:", error);
      alert("Error: No se pudo descartar la alerta");
    } finally {
      setProcessing(false);
    }
  };

  // Configuración de severidad para el modal de detalles
  const severityConfig = {
    INFO: { icon: Info, color: "text-blue-600 dark:text-blue-400" },
    WARNING: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400" },
    CRITICAL: { icon: AlertCircle, color: "text-red-600 dark:text-red-400" },
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <SectionHeader title="Sistema de Alertas de Fichajes" />

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <div className="rounded-lg border bg-gradient-to-t from-primary/5 to-card p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Activas</p>
                <h3 className="mt-2 text-3xl font-bold">{stats.active}</h3>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-t from-primary/5 to-card p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resueltas</p>
                <h3 className="mt-2 text-3xl font-bold">{stats.resolved}</h3>
              </div>
              <Info className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-t from-primary/5 to-card p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Descartadas</p>
                <h3 className="mt-2 text-3xl font-bold">{stats.dismissed}</h3>
              </div>
              <AlertTriangle className="h-8 w-8 text-gray-500" />
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-t from-primary/5 to-card p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <h3 className="mt-2 text-3xl font-bold">{stats.total}</h3>
              </div>
              <Info className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs con DataTable */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <div className="flex items-center justify-between">
          {/* Select para móvil */}
          <Select value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <SelectTrigger className="w-[200px] @4xl/main:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                Activas <Badge variant="default">{stats?.active ?? 0}</Badge>
              </SelectItem>
              <SelectItem value="resolved">
                Resueltas <Badge variant="secondary">{stats?.resolved ?? 0}</Badge>
              </SelectItem>
              <SelectItem value="dismissed">
                Descartadas <Badge variant="outline">{stats?.dismissed ?? 0}</Badge>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Tabs para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="active">
              Activas <Badge className="ml-2" variant="default">{stats?.active ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resueltas <Badge className="ml-2" variant="secondary">{stats?.resolved ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="dismissed">
              Descartadas <Badge className="ml-2" variant="outline">{stats?.dismissed ?? 0}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Opciones de columnas */}
          <div className="flex gap-2">
            <DataTableViewOptions table={table} />
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">Cargando alertas...</p>
              </div>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="h-10 w-10" />}
              title="No hay alertas"
              description={`No hay alertas ${
                activeTab === "active"
                  ? "activas"
                  : activeTab === "resolved"
                    ? "resueltas"
                    : "descartadas"
              } en este momento.`}
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={alertColumns} />
              </div>
              <DataTablePagination table={table} />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para resolver alerta */}
      <Dialog open={actionDialog === "resolve"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Alerta</DialogTitle>
            <DialogDescription>
              Marcar esta alerta como resuelta. Puedes añadir un comentario explicando la solución.
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="font-medium">{selectedAlert.title}</p>
                <p className="text-sm text-muted-foreground">{selectedAlert.description}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Empleado:</span> {selectedAlert.employee.firstName}{" "}
                  {selectedAlert.employee.lastName}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Fecha:</span>{" "}
                  {format(new Date(selectedAlert.date), "PPP", { locale: es })}
                </p>
              </div>

              <div>
                <Label htmlFor="comment">Comentario (opcional)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Añade un comentario sobre cómo se resolvió..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={processing}>
              Cancelar
            </Button>
            <Button onClick={handleResolve} disabled={processing}>
              {processing ? "Resolviendo..." : "Resolver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para descartar alerta */}
      <Dialog open={actionDialog === "dismiss"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar Alerta</DialogTitle>
            <DialogDescription>
              Descartar esta alerta. Puedes añadir un comentario explicando el motivo.
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="font-medium">{selectedAlert.title}</p>
                <p className="text-sm text-muted-foreground">{selectedAlert.description}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Empleado:</span> {selectedAlert.employee.firstName}{" "}
                  {selectedAlert.employee.lastName}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Fecha:</span>{" "}
                  {format(new Date(selectedAlert.date), "PPP", { locale: es })}
                </p>
              </div>

              <div>
                <Label htmlFor="comment-dismiss">Comentario (opcional)</Label>
                <Textarea
                  id="comment-dismiss"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Añade un comentario sobre por qué se descarta..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={processing}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDismiss} disabled={processing}>
              {processing ? "Descartando..." : "Descartar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalles */}
      <Dialog open={actionDialog === "details"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Alerta</DialogTitle>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              {/* Información del empleado y fecha */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Empleado</p>
                    <p className="text-base font-semibold mt-1">
                      {selectedAlert.employee.firstName} {selectedAlert.employee.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedAlert.employee.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</p>
                    <p className="text-base font-semibold mt-1">
                      {format(new Date(selectedAlert.date), "PPP", { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAlert.costCenter?.name ?? "Sin centro de coste"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Incidencias detalladas si es DAILY_SUMMARY */}
              {selectedAlert.type === "DAILY_SUMMARY" && selectedAlert.incidents && selectedAlert.incidents.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Incidencias del día ({selectedAlert.incidents.length})</h3>
                  <div className="space-y-3">
                    {selectedAlert.incidents.map((incident: any, index: number) => {
                      const isLate = incident.type.includes("LATE_ARRIVAL");
                      const isEarly = incident.type.includes("EARLY_DEPARTURE");
                      const hours = Math.floor(Math.abs(incident.deviationMinutes || 0) / 60);
                      const mins = Math.abs(incident.deviationMinutes || 0) % 60;

                      return (
                        <div
                          key={index}
                          className={`rounded-lg border-2 p-4 ${
                            incident.severity === "CRITICAL"
                              ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                              : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={incident.severity === "CRITICAL" ? "destructive" : "warning"}
                                >
                                  {incident.severity}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {isLate ? "Llegada Tarde" : isEarly ? "Salida Temprana" : "Incidencia"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium">Hora del fichaje</p>
                                  <p className="text-xl font-bold font-mono">
                                    {format(new Date(incident.time), "HH:mm:ss", { locale: es })}
                                  </p>
                                </div>
                                {incident.deviationMinutes && (
                                  <div>
                                    <p className="text-xs text-muted-foreground font-medium">
                                      {isLate ? "Tiempo de retraso" : isEarly ? "Tiempo de adelanto" : "Desviación"}
                                    </p>
                                    <p className={`text-2xl font-bold ${
                                      incident.severity === "CRITICAL" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
                                    }`}>
                                      {isLate ? "↓ " : isEarly ? "↑ " : ""}
                                      {hours > 0 ? `${hours}h ` : ""}{mins}min
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground">{incident.description}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Alerta normal (no DAILY_SUMMARY) */
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = severityConfig[selectedAlert.severity as keyof typeof severityConfig];
                      const Icon = config.icon;
                      return <Icon className={`h-5 w-5 ${config.color}`} />;
                    })()}
                    <Badge
                      variant={
                        selectedAlert.severity === "CRITICAL"
                          ? "destructive"
                          : selectedAlert.severity === "WARNING"
                            ? "warning"
                            : "default"
                      }
                    >
                      {selectedAlert.severity}
                    </Badge>
                    <Badge variant="outline">{selectedAlert.type.replace(/_/g, " ")}</Badge>
                  </div>

                  <div>
                    <p className="text-base font-semibold">{selectedAlert.title}</p>
                    {selectedAlert.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedAlert.description}</p>
                    )}
                  </div>

                  {selectedAlert.deviationMinutes !== null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Desviación</p>
                      <p className="text-xl font-mono font-bold">
                        {Math.floor(Math.abs(selectedAlert.deviationMinutes) / 60)}h{" "}
                        {Math.abs(selectedAlert.deviationMinutes) % 60}min
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Información de resolución */}
              {selectedAlert.status !== "ACTIVE" && (
                <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <Badge variant={selectedAlert.status === "RESOLVED" ? "secondary" : "outline"}>
                      {selectedAlert.status === "RESOLVED" ? "Resuelta" : "Descartada"}
                    </Badge>
                  </div>
                  {selectedAlert.resolvedAt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {selectedAlert.status === "RESOLVED" ? "Resuelta el" : "Descartada el"}
                      </p>
                      <p className="text-sm">
                        {format(new Date(selectedAlert.resolvedAt), "PPP", { locale: es })}
                      </p>
                      {selectedAlert.resolver && (
                        <p className="text-xs text-muted-foreground">por {selectedAlert.resolver.name}</p>
                      )}
                    </div>
                  )}
                  {selectedAlert.resolutionComment && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Comentario</p>
                      <p className="text-sm">{selectedAlert.resolutionComment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setActionDialog(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

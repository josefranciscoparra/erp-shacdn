"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, AlertTriangle, CheckCircle2, Filter, Info, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getActiveAlerts,
  resolveAlert,
  dismissAlert,
  getAlertStats,
  getAvailableAlertFilters,
} from "@/server/actions/alert-detection";
import { getMySubscriptions } from "@/server/actions/alerts";
import { getActiveContext, getAvailableScopes } from "@/server/actions/user-context";

import { alertColumns, type AlertRow } from "./_components/alert-columns";

type AlertStats = {
  total: number;
  active: number;
  resolved: number;
  dismissed: number;
  bySeverity: { severity: string; count: number }[];
  byType: { type: string; count: number }[];
};

type AvailableFilters = {
  costCenters: { id: string; name: string; code: string | null }[];
  teams: { id: string; name: string; code: string | null; costCenter: { name: string } }[];
  severities: readonly ["INFO", "WARNING", "CRITICAL"];
};

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

const ALERT_TYPES = [
  { value: "LATE_ARRIVAL", label: "Entrada tardía" },
  { value: "CRITICAL_LATE_ARRIVAL", label: "Entrada crítica" },
  { value: "EARLY_DEPARTURE", label: "Salida temprana" },
  { value: "CRITICAL_EARLY_DEPARTURE", label: "Salida crítica" },
  { value: "MISSING_CLOCK_IN", label: "Falta entrada" },
  { value: "MISSING_CLOCK_OUT", label: "Falta salida" },
  { value: "NON_WORKDAY_CLOCK_IN", label: "Fichaje día no laboral" },
  { value: "EXCESSIVE_HOURS", label: "Horas excesivas" },
];

export default function AlertsPage() {
  // ========== SCOPE MODE: "mine" (mis suscripciones) | "all" (según contexto activo) ==========
  const [scopeMode, setScopeMode] = useState<"mine" | "all">("mine");

  // ========== CONTEXT SELECTOR ==========
  const [activeContext, setActiveContext] = useState<any>(null);
  const [hasSubscriptions, setHasSubscriptions] = useState(false);

  const [activeTab, setActiveTab] = useState<"active" | "resolved" | "dismissed">("active");
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);
  const [actionDialog, setActionDialog] = useState<"resolve" | "dismiss" | "details" | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  // Filtros disponibles según scope del usuario
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({
    costCenters: [],
    teams: [],
    severities: ["INFO", "WARNING", "CRITICAL"],
  });

  // UI Filter States
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Cargar contexto activo y scopes disponibles al montar
  useEffect(() => {
    const loadContext = async () => {
      try {
        const [context, , subscriptions] = await Promise.all([
          getActiveContext(),
          getAvailableScopes(),
          getMySubscriptions(),
        ]);

        setActiveContext(context);
        setHasSubscriptions(subscriptions.length > 0);

        // Si no tiene suscripciones, mostrar "all" por defecto
        if (subscriptions.length === 0) {
          setScopeMode("all");
        }
      } catch (error) {
        console.error("Error al cargar contexto:", error);
      }
    };
    loadContext();
  }, []);

  // Cargar filtros disponibles al montar
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const filters = await getAvailableAlertFilters();
        setAvailableFilters(filters);
      } catch (error) {
        console.error("Error al cargar filtros:", error);
      }
    };
    loadFilters();
  }, []);

  // Cargar alertas y estadísticas con filtros aplicados
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Construir filtros dinámicos
      const filters: any = {};
      if (selectedCenter !== "all") filters.costCenterId = selectedCenter;
      if (selectedSeverity !== "all") filters.severity = selectedSeverity;
      if (selectedType !== "all") filters.alertType = selectedType;
      if (dateRange.from) filters.dateFrom = dateRange.from.toISOString();
      if (dateRange.to) filters.dateTo = dateRange.to.toISOString();

      const [alertsData, statsData] = await Promise.all([getActiveAlerts(filters), getAlertStats()]);

      setAlerts(alertsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error al cargar alertas:", error);
      toast.error("Error al cargar las alertas");
    } finally {
      setLoading(false);
    }
  }, [selectedCenter, selectedSeverity, selectedType, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar alertas por tab activo y equipo (cliente-side)
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Tab Filter
      let matchesTab = false;
      if (activeTab === "active") matchesTab = alert.status === "ACTIVE";
      else if (activeTab === "resolved") matchesTab = alert.status === "RESOLVED";
      else if (activeTab === "dismissed") matchesTab = alert.status === "DISMISSED";

      // Team Filter (cliente-side porque ya tenemos las alertas filtradas por scope)
      const matchesTeam = selectedTeam === "all" || alert.teamId === selectedTeam;

      return matchesTab && matchesTeam;
    });
  }, [alerts, activeTab, selectedTeam]);

  // Memoizar meta functions para evitar recrear la tabla
  const tableMeta = useMemo(
    () => ({
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
    }),
    [],
  );

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

      toast.success("Alerta resuelta correctamente");

      setActionDialog(null);
      setSelectedAlert(null);
      setComment("");
      loadData();
    } catch (error) {
      console.error("Error al resolver alerta:", error);
      toast.error("No se pudo resolver la alerta");
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

      toast.success("Alerta descartada correctamente");

      setActionDialog(null);
      setSelectedAlert(null);
      setComment("");
      loadData();
    } catch (error) {
      console.error("Error al descartar alerta:", error);
      toast.error("No se pudo descartar la alerta");
    } finally {
      setProcessing(false);
    }
  };

  // Configuración de severidad para el modal de detalles
  const severityConfig = {
    INFO: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
    WARNING: {
      icon: AlertTriangle,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
    },
    CRITICAL: { icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
  };

  // Obtener label del contexto activo
  const getContextLabel = () => {
    if (!activeContext) return "Todo";
    if (activeContext.activeScope === "ALL") return "Todo";
    if (activeContext.activeScope === "ORGANIZATION") return "Organización";
    if (activeContext.activeScope === "DEPARTMENT" && activeContext.department) return activeContext.department.name;
    if (activeContext.activeScope === "COST_CENTER" && activeContext.costCenter) return activeContext.costCenter.name;
    if (activeContext.activeScope === "TEAM" && activeContext.team) return activeContext.team.name;
    return "Todo";
  };

  return (
    <div className="animate-in fade-in mx-auto flex max-w-screen-2xl flex-col gap-6 p-6 duration-500 md:p-8">
      {/* Header con acciones */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeader
            title="Panel de Alertas"
            description="Gestiona las incidencias de fichajes y control horario."
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Tabs superiores: Mis Alertas | Todas las Alertas */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Selector de modo */}
              <Tabs value={scopeMode} onValueChange={(value: any) => setScopeMode(value)} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                  <TabsTrigger value="mine" disabled={!hasSubscriptions}>
                    Mis Alertas
                    {!hasSubscriptions && (
                      <Badge variant="outline" className="ml-2 h-5 text-xs">
                        Sin suscripciones
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="all">Todas las Alertas</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Indicador de contexto activo (solo en modo "all") */}
              {scopeMode === "all" && (
                <div className="flex items-center gap-2 text-sm">
                  <Target className="text-primary h-4 w-4" />
                  <span className="text-muted-foreground">Mostrando:</span>
                  <Badge variant="secondary">{getContextLabel()}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas mejoradas */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-red-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Alertas Activas</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-muted-foreground text-xs">Requieren atención inmediata</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Resueltas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
              <p className="text-muted-foreground text-xs">Incidencias solucionadas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Descartadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dismissed}</div>
              <p className="text-muted-foreground text-xs">Falsos positivos o irrelevantes</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Total Histórico</CardTitle>
              <Info className="text-primary h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-muted-foreground text-xs">Registradas en el sistema</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros Globales Dinámicos */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              Filtrar por:
            </div>

            {/* Fila 1: Filtros principales */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Filtro por Centro */}
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {availableFilters.costCenters.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      <span className="block max-w-[200px] truncate md:max-w-[140px] lg:max-w-[180px]">
                        {center.name} {center.code ? `(${center.code})` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por Equipo */}
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los equipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los equipos</SelectItem>
                  {availableFilters.teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <span className="block max-w-[200px] truncate md:max-w-[140px] lg:max-w-[180px]">
                        {team.name} {team.code ? `(${team.code})` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por Severidad */}
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas las severidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las severidades</SelectItem>
                  <SelectItem value="CRITICAL">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      Críticas
                    </div>
                  </SelectItem>
                  <SelectItem value="WARNING">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      Advertencias
                    </div>
                  </SelectItem>
                  <SelectItem value="INFO">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      Informativas
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por Tipo de Alerta */}
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {ALERT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fila 2: Búsqueda y fecha */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Búsqueda por empleado */}
              <div className="relative">
                <Input
                  placeholder="Buscar empleado..."
                  className="w-full"
                  value={(table.getColumn("employee")?.getFilterValue() as string) || ""}
                  onChange={(event) => table.getColumn("employee")?.setFilterValue(event.target.value)}
                />
              </div>

              {/* Filtro por rango de fechas */}
              <DateRangePicker
                date={dateRange}
                onDateChange={(newRange) => {
                  setDateRange(newRange ?? { from: undefined, to: undefined });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs con DataTable */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="active">Activas</TabsTrigger>
            <TabsTrigger value="resolved">Resueltas</TabsTrigger>
            <TabsTrigger value="dismissed">Descartadas</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <DataTableViewOptions table={table} />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="bg-card flex h-64 items-center justify-center rounded-md border">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="text-primary h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm">Cargando alertas...</p>
              </div>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-card rounded-md border p-8">
              <EmptyState
                icon={<AlertCircle className="text-muted-foreground h-10 w-10" />}
                title="No hay alertas"
                description={`No se encontraron alertas ${
                  activeTab === "active" ? "activas" : activeTab === "resolved" ? "resueltas" : "descartadas"
                } con los filtros actuales.`}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card rounded-md border">
                <DataTable table={table} columns={alertColumns} />
              </div>
              <DataTablePagination table={table} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs - Keeping functionality but cleaning up UI structure */}

      {/* Dialog para resolver alerta */}
      <Dialog open={actionDialog === "resolve"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolver Alerta</DialogTitle>
            <DialogDescription>
              Justifica la resolución de esta incidencia. Esta acción quedará registrada.
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4 py-2">
              <div className="bg-muted space-y-2 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{selectedAlert.title}</span>
                  <Badge variant={selectedAlert.severity as any}>{selectedAlert.severity}</Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Empleado:</span>
                    <p className="font-medium">
                      {selectedAlert.employee.firstName} {selectedAlert.employee.lastName}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha:</span>
                    <p className="font-medium">{format(new Date(selectedAlert.date), "PPP", { locale: es })}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comentario de resolución</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ej: El empleado ha justificado el retraso por transporte..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialog(null)} disabled={processing}>
              Cancelar
            </Button>
            <Button onClick={handleResolve} disabled={processing || !comment.trim()}>
              {processing ? "Procesando..." : "Marcar como Resuelta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para descartar alerta */}
      <Dialog open={actionDialog === "dismiss"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Descartar Alerta
            </DialogTitle>
            <DialogDescription>Esta alerta será marcada como descartada/falso positivo.</DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm font-medium">{selectedAlert.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{selectedAlert.description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment-dismiss">Motivo del descarte (Opcional)</Label>
                <Textarea
                  id="comment-dismiss"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ej: Error del sistema, fichaje duplicado..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialog(null)} disabled={processing}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDismiss} disabled={processing}>
              {processing ? "Descartando..." : "Descartar Alerta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalles */}
      <Dialog open={actionDialog === "details"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Incidencia</DialogTitle>
            <DialogDescription>Información completa de la alerta registrada.</DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-card flex items-start gap-4 rounded-lg border p-4">
                <div
                  className={`shrink-0 rounded-full p-2 ${severityConfig[selectedAlert.severity as keyof typeof severityConfig]?.bg || "bg-gray-100"}`}
                >
                  {(() => {
                    const config = severityConfig[selectedAlert.severity as keyof typeof severityConfig];
                    const Icon = config?.icon || Info;
                    return <Icon className={`h-6 w-6 ${config?.color}`} />;
                  })()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{selectedAlert.title}</h3>
                    <Badge variant="outline">{selectedAlert.type.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{selectedAlert.description}</p>
                </div>
              </div>

              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs font-medium uppercase">Empleado</span>
                  <p className="text-sm font-medium">
                    {selectedAlert.employee.firstName} {selectedAlert.employee.lastName}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs font-medium uppercase">Centro</span>
                  <p className="text-sm font-medium">{selectedAlert.costCenter?.name ?? "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs font-medium uppercase">Fecha Incidencia</span>
                  <p className="text-sm font-medium">{format(new Date(selectedAlert.date), "PPP", { locale: es })}</p>
                </div>
                {selectedAlert.deviationMinutes !== null && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs font-medium uppercase">Desviación Total</span>
                    <p className="text-primary font-mono text-sm font-bold">
                      {Math.floor(Math.abs(selectedAlert.deviationMinutes) / 60)}h{" "}
                      {Math.abs(selectedAlert.deviationMinutes) % 60}min
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Incidencias detalladas si es DAILY_SUMMARY */}
              {selectedAlert.type === "DAILY_SUMMARY" &&
                selectedAlert.incidents &&
                selectedAlert.incidents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <AlertCircle className="h-4 w-4" />
                      Desglose de Incidencias ({selectedAlert.incidents.length})
                    </h4>
                    <div className="space-y-3">
                      {selectedAlert.incidents.map((incident: any, index: number) => {
                        const isLate = incident.type.includes("LATE_ARRIVAL");
                        const isEarly = incident.type.includes("EARLY_DEPARTURE");
                        const hours = Math.floor(Math.abs(incident.deviationMinutes ?? 0) / 60);
                        const mins = Math.abs(incident.deviationMinutes ?? 0) % 60;

                        return (
                          <div key={index} className="bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                            <div className="mt-1">
                              <Badge
                                variant={incident.severity === "CRITICAL" ? "destructive" : "warning"}
                                className="h-5 px-1.5 text-[10px]"
                              >
                                {incident.severity}
                              </Badge>
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm leading-none font-medium">
                                  {isLate ? "Llegada Tarde" : isEarly ? "Salida Temprana" : "Incidencia"}
                                </p>
                                <span className="text-muted-foreground font-mono text-xs">
                                  {format(new Date(incident.time), "HH:mm", { locale: es })}
                                </span>
                              </div>
                              {incident.deviationMinutes && (
                                <p className="text-sm font-bold">
                                  {isLate ? "Retraso: " : "Adelanto: "}
                                  <span
                                    className={
                                      incident.severity === "CRITICAL" ? "text-destructive" : "text-yellow-600"
                                    }
                                  >
                                    {hours > 0 ? `${hours}h ` : ""}
                                    {mins}min
                                  </span>
                                </p>
                              )}
                              <p className="text-muted-foreground text-xs">{incident.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Información de resolución si existe */}
              {selectedAlert.status !== "ACTIVE" && (
                <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-900/30 dark:bg-green-950/20">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Resolución</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Estado:</span>{" "}
                      {selectedAlert.status === "RESOLVED" ? "Resuelta" : "Descartada"}
                    </p>
                    {selectedAlert.resolvedAt && (
                      <p>
                        <span className="text-muted-foreground">Fecha:</span>{" "}
                        {format(new Date(selectedAlert.resolvedAt), "PPP p", { locale: es })}
                      </p>
                    )}
                    {selectedAlert.resolutionComment && (
                      <p className="text-muted-foreground mt-2 italic">&quot;{selectedAlert.resolutionComment}&quot;</p>
                    )}
                  </div>
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

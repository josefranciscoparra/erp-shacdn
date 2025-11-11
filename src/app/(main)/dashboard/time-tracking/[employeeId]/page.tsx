"use client";

import { useState, useEffect } from "react";

import { useParams, useRouter } from "next/navigation";

import { startOfDay, endOfDay, format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, ArrowLeft, ShieldAlert, List, Map } from "lucide-react";
import { DateRange } from "react-day-picker";

import { TimeEntriesMap } from "@/app/(main)/dashboard/me/clock/_components/time-entries-map-wrapper";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportToCSV } from "@/lib/export-csv";
import {
  getEmployeeWeeklySummary,
  getEmployeeMonthlySummary,
  getEmployeeYearlySummary,
  getEmployeeDailyDetail,
} from "@/server/actions/admin-time-tracking";

import { DayCard } from "../_components/day-card";
import { monthlyColumns, type MonthlySummary } from "../_components/monthly-columns";
import { QuickPeriodFilter } from "../_components/quick-period-filter";
import { weeklyColumns, type WeeklySummary } from "../_components/weekly-columns";
import { yearlyColumns, type YearlySummary } from "../_components/yearly-columns";

// Import del wrapper del mapa (ya maneja SSR internamente)

type TabValue = "detail" | "week" | "month" | "year";
type PeriodOption = "today" | "7days" | "30days" | "thisMonth" | "lastMonth" | "custom";

interface DayDetailData {
  id: string;
  date: Date;
  clockIn?: Date | null;
  clockOut?: Date | null;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT";
  expectedHours: number;
  actualHours: number;
  compliance: number;
  timeEntries: {
    id: string;
    entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
    timestamp: Date;
    location?: string | null;
    notes?: string | null;
    isManual: boolean;
    // Campos de cancelación
    isCancelled?: boolean;
    cancellationReason?: string | null;
    cancellationNotes?: string | null;
    // Campos GPS
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    isWithinAllowedArea?: boolean | null;
    requiresReview?: boolean;
  }[];
}

export default function EmployeeTimeTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.employeeId as string;

  const [activeTab, setActiveTab] = useState<TabValue>("detail");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("today");
  const [dailyDetailRecords, setDailyDetailRecords] = useState<DayDetailData[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklySummary[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlySummary[]>([]);
  const [yearlyRecords, setYearlyRecords] = useState<YearlySummary[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeImage, setEmployeeImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Tablas separadas para cada tipo de datos
  const weeklyTable = useDataTableInstance({
    data: weeklyRecords,
    columns: weeklyColumns,
    getRowId: (row) => row.weekStart.toISOString(),
  });

  const monthlyTable = useDataTableInstance({
    data: monthlyRecords,
    columns: monthlyColumns,
    getRowId: (row) => row.month.toISOString(),
  });

  const yearlyTable = useDataTableInstance({
    data: yearlyRecords,
    columns: yearlyColumns,
    getRowId: (row) => row.year.toString(),
  });

  const loadData = async (tab: TabValue) => {
    setIsLoading(true);
    try {
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      // Para el tab de detalle, usar el dateRange que viene del filtro de período
      if (tab === "detail") {
        if (dateRange?.from) {
          dateFrom = startOfDay(dateRange.from);
        }
        if (dateRange?.to) {
          dateTo = endOfDay(dateRange.to);
        }
      } else {
        // Para los tabs de resumen, usar todo el historial
        // O podríamos filtrar por año actual, etc.
      }

      // Cargar datos según el tab
      if (tab === "detail") {
        const data = await getEmployeeDailyDetail(employeeId, dateFrom, dateTo);
        setDailyDetailRecords(data.days);

        // Actualizar información del empleado
        setEmployeeName(data.employee.name);
        setEmployeeImage(data.employee.image);
      } else if (tab === "week") {
        const data = await getEmployeeWeeklySummary(employeeId, dateFrom, dateTo);
        setWeeklyRecords(data);
      } else if (tab === "month") {
        const data = await getEmployeeMonthlySummary(employeeId, dateFrom, dateTo);
        setMonthlyRecords(data);
      } else if (tab === "year") {
        const data = await getEmployeeYearlySummary(employeeId, dateFrom, dateTo);
        setYearlyRecords(data);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab, employeeId, dateRange]);

  // Inicializar con "hoy" en el primer render
  useEffect(() => {
    const today = new Date();
    setDateRange({
      from: startOfDay(today),
      to: startOfDay(today),
    });
  }, []);

  const handlePeriodChange = (period: PeriodOption, newDateRange?: DateRange) => {
    setSelectedPeriod(period);
    if (newDateRange) {
      setDateRange(newDateRange);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleExport = () => {
    const today = new Date();
    const dateStr = format(today, "yyyy-MM-dd", { locale: es });
    const employeeSlug = employeeName.toLowerCase().replace(/\s+/g, "-");

    switch (activeTab) {
      case "detail": {
        // Exportación detallada con formato jerárquico
        const detailData: any[] = [];

        dailyDetailRecords.forEach((day) => {
          // Fila de encabezado del día
          detailData.push({
            Fecha: format(new Date(day.date), "dd/MM/yyyy", { locale: es }),
            Tipo: "RESUMEN",
            Hora: "",
            "Horas Esperadas": `${day.expectedHours}h`,
            "Horas Trabajadas": `${day.actualHours}h`,
            Cumplimiento: `${day.compliance}%`,
            Estado:
              day.status === "COMPLETED"
                ? "Completado"
                : day.status === "IN_PROGRESS"
                  ? "En progreso"
                  : day.status === "INCOMPLETE"
                    ? "Incompleto"
                    : "Ausente",
            Observaciones: "",
          });

          const typeLabels = {
            CLOCK_IN: "Entrada",
            CLOCK_OUT: "Salida",
            BREAK_START: "Inicio pausa",
            BREAK_END: "Fin pausa",
          };

          // Separar fichajes activos y cancelados
          const activeEntries = day.timeEntries.filter((e) => !e.isCancelled);
          const cancelledEntries = day.timeEntries.filter((e) => e.isCancelled);

          // Fichajes activos
          activeEntries.forEach((entry) => {
            const estado = entry.isManual ? "Manual" : "Automático";

            detailData.push({
              Fecha: "",
              Tipo: typeLabels[entry.entryType],
              Hora: format(new Date(entry.timestamp), "HH:mm", { locale: es }),
              "Horas Esperadas": "",
              "Horas Trabajadas": "",
              Cumplimiento: "",
              Estado: estado,
              Observaciones: entry.notes ?? "",
            });
          });

          // Separador si hay fichajes cancelados
          if (cancelledEntries.length > 0) {
            detailData.push({
              Fecha: "",
              Tipo: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
              Hora: "",
              "Horas Esperadas": "",
              "Horas Trabajadas": "",
              Cumplimiento: "",
              Estado: "",
              Observaciones: "INVALIDADOS POR RECTIFICACIÓN",
            });

            // Fichajes cancelados
            cancelledEntries.forEach((entry) => {
              const estado = entry.isManual ? "CANCELADO - Manual" : "CANCELADO - Automático";

              detailData.push({
                Fecha: "",
                Tipo: typeLabels[entry.entryType],
                Hora: format(new Date(entry.timestamp), "HH:mm", { locale: es }),
                "Horas Esperadas": "",
                "Horas Trabajadas": "",
                Cumplimiento: "",
                Estado: estado,
                Observaciones: entry.cancellationNotes ?? "",
              });
            });
          }

          // Fila en blanco para separar días
          detailData.push({
            Fecha: "",
            Tipo: "",
            Hora: "",
            "Horas Esperadas": "",
            "Horas Trabajadas": "",
            Cumplimiento: "",
            Estado: "",
            Observaciones: "",
          });
        });

        exportToCSV(detailData, `fichajes-${employeeSlug}-detalle-${dateStr}`);
        break;
      }

      case "week": {
        const weeklyData = weeklyRecords.map((record) => ({
          Semana: `${format(record.weekStart, "dd/MM", { locale: es })} - ${format(record.weekEnd, "dd/MM/yyyy", { locale: es })}`,
          "Días Trabajados": `${record.daysWorked}/${record.expectedDays}`,
          "Horas Trabajadas": `${record.actualHours}h`,
          "Horas Esperadas": `${record.expectedHours}h`,
          Cumplimiento: `${record.compliance}%`,
          "Promedio Diario": `${record.averageDaily}h`,
        }));
        exportToCSV(weeklyData, `fichajes-${employeeSlug}-semanas-${dateStr}`);
        break;
      }

      case "month": {
        const monthlyData = monthlyRecords.map((record) => ({
          Mes: format(record.month, "MMMM yyyy", { locale: es }),
          "Días Trabajados": `${record.daysWorked}/${record.expectedDays}`,
          "Horas Trabajadas": `${record.actualHours}h`,
          "Horas Esperadas": `${record.expectedHours}h`,
          Cumplimiento: `${record.compliance}%`,
          "Promedio Semanal": `${record.averageWeekly}h`,
        }));
        exportToCSV(monthlyData, `fichajes-${employeeSlug}-meses-${dateStr}`);
        break;
      }

      case "year": {
        const yearlyData = yearlyRecords.map((record) => ({
          Año: record.year.toString(),
          "Días Trabajados": `${record.daysWorked}/${record.expectedDays}`,
          "Horas Trabajadas": `${record.actualHours}h`,
          "Horas Esperadas": `${record.expectedHours}h`,
          "Promedio Mensual": `${record.averageMonthly}h`,
        }));
        exportToCSV(yearlyData, `fichajes-${employeeSlug}-años-${dateStr}`);
        break;
      }
    }
  };

  // Calcular fichajes con GPS (solo para tab de detalle)
  const allTimeEntries = activeTab === "detail" ? dailyDetailRecords.flatMap((day) => day.timeEntries) : [];
  const entriesWithGPS = allTimeEntries.filter((e) => e.latitude && e.longitude).length;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-96 items-center justify-center">
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      );
    }

    if (activeTab === "detail") {
      if (dailyDetailRecords.length === 0) {
        return (
          <EmptyState
            icon="clock"
            title="No hay fichajes"
            description="No se encontraron registros para el período seleccionado"
          />
        );
      }

      // Vista de mapa
      if (viewMode === "map") {
        return <TimeEntriesMap entries={allTimeEntries} />;
      }

      // Vista de lista
      return (
        <div className="space-y-4">
          {dailyDetailRecords.map((day) => (
            <DayCard key={day.id} day={day} />
          ))}
        </div>
      );
    }

    const tabConfig = {
      week: { data: weeklyRecords, table: weeklyTable, columns: weeklyColumns, emptyMsg: "esta semana" },
      month: { data: monthlyRecords, table: monthlyTable, columns: monthlyColumns, emptyMsg: "este mes" },
      year: { data: yearlyRecords, table: yearlyTable, columns: yearlyColumns, emptyMsg: "este año" },
    };

    const config = tabConfig[activeTab];

    if (config.data.length === 0) {
      return (
        <EmptyState
          icon="clock"
          title="No hay datos"
          description={`No se encontraron registros para ${config.emptyMsg}`}
        />
      );
    }

    return (
      <>
        <div className="overflow-hidden rounded-lg border">
          <DataTableNew table={config.table} columns={config.columns} />
        </div>
        <DataTablePagination table={config.table} />
      </>
    );
  };

  return (
    <PermissionGuard
      permission="view_time_tracking"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Control Horario" description="Historial de fichajes" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        {/* Header con info del empleado */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/time-tracking")}>
            <ArrowLeft />
            Volver
          </Button>

          {employeeName && (
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={employeeImage ?? undefined} alt={employeeName} />
                <AvatarFallback>{getInitials(employeeName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-lg font-semibold">{employeeName}</span>
                <span className="text-muted-foreground text-sm">Historial de fichajes</span>
              </div>
            </div>
          )}
        </div>

        {/* Filtros de período (solo para tab Detalle) */}
        {activeTab === "detail" && (
          <div className="flex flex-col gap-4">
            <QuickPeriodFilter selectedPeriod={selectedPeriod} onPeriodChange={handlePeriodChange} />
            {selectedPeriod === "custom" && (
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                placeholder="Seleccionar rango de fechas"
              />
            )}
          </div>
        )}

        {/* DataTable con Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="w-full flex-col justify-start gap-6"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="view-selector" className="sr-only">
              Período
            </Label>
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
              <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
                <SelectValue placeholder="Seleccionar vista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detail">Detalle</SelectItem>
                <SelectItem value="week">Resumen Semanal</SelectItem>
                <SelectItem value="month">Resumen Mensual</SelectItem>
                <SelectItem value="year">Resumen Anual</SelectItem>
              </SelectContent>
            </Select>

            <TabsList className="hidden @4xl/main:flex">
              <TabsTrigger value="detail">Detalle</TabsTrigger>
              <TabsTrigger value="week">Resumen Semanal</TabsTrigger>
              <TabsTrigger value="month">Resumen Mensual</TabsTrigger>
              <TabsTrigger value="year">Resumen Anual</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {/* Toggle Lista/Mapa solo para tab detalle con GPS */}
              {activeTab === "detail" && entriesWithGPS > 0 && !isLoading && (
                <div className="flex items-center gap-1 rounded-lg border p-1">
                  <Button
                    size="sm"
                    variant={viewMode === "list" ? "default" : "ghost"}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="mr-1.5 h-4 w-4" />
                    Lista
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "map" ? "default" : "ghost"}
                    onClick={() => setViewMode("map")}
                  >
                    <Map className="mr-1.5 h-4 w-4" />
                    Mapa ({entriesWithGPS})
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={
                  isLoading ||
                  (activeTab === "detail"
                    ? dailyDetailRecords.length === 0
                    : activeTab === "week"
                      ? weeklyRecords.length === 0
                      : activeTab === "month"
                        ? monthlyRecords.length === 0
                        : yearlyRecords.length === 0)
                }
              >
                <Download className="size-4" />
                Exportar CSV
              </Button>

              {activeTab !== "detail" && (
                <DataTableViewOptions
                  table={activeTab === "week" ? weeklyTable : activeTab === "month" ? monthlyTable : yearlyTable}
                />
              )}
            </div>
          </div>

          {["detail", "week", "month", "year"].map((tab) => (
            <TabsContent key={tab} value={tab} className="relative flex flex-col gap-4">
              {renderContent()}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

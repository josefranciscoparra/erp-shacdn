"use client";

import { useState, useEffect } from "react";

import { useParams, useRouter } from "next/navigation";

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { Download, ArrowLeft, ShieldAlert, FileText, Clock, TrendingUp, CheckCircle } from "lucide-react";
import { DateRange } from "react-day-picker";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportToCSV } from "@/lib/export-csv";
import {
  getEmployeeTimeTrackingHistory,
  getEmployeeWeeklySummary,
  getEmployeeMonthlySummary,
  getEmployeeYearlySummary,
  getTimeTrackingStats,
} from "@/server/actions/admin-time-tracking";

import { columns, type TimeTrackingRecord } from "../_components/columns";
import { monthlyColumns, type MonthlySummary } from "../_components/monthly-columns";
import { weeklyColumns, type WeeklySummary } from "../_components/weekly-columns";
import { yearlyColumns, type YearlySummary } from "../_components/yearly-columns";

type TabValue = "today" | "week" | "month" | "year" | "all";

export default function EmployeeTimeTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.employeeId as string;

  const [activeTab, setActiveTab] = useState<TabValue>("today");
  const [dailyRecords, setDailyRecords] = useState<TimeTrackingRecord[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklySummary[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlySummary[]>([]);
  const [yearlyRecords, setYearlyRecords] = useState<YearlySummary[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [stats, setStats] = useState({
    totalRecords: 0,
    totalWorkedHours: 0,
    totalBreakHours: 0,
    statusCounts: { IN_PROGRESS: 0, COMPLETED: 0, INCOMPLETE: 0, ABSENT: 0 },
    averageWorkedMinutesPerDay: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeImage, setEmployeeImage] = useState<string | null>(null);

  // Tablas separadas para cada tipo de datos
  const dailyTable = useDataTableInstance({
    data: dailyRecords,
    columns,
    getRowId: (row) => row.id,
  });

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
      const today = new Date();
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      switch (tab) {
        case "today":
          dateFrom = startOfDay(today);
          dateTo = endOfDay(today);
          break;
        case "week":
          dateFrom = startOfWeek(today, { weekStartsOn: 1 });
          dateTo = endOfWeek(today, { weekStartsOn: 1 });
          break;
        case "month":
          dateFrom = startOfMonth(today);
          dateTo = endOfMonth(today);
          break;
        case "year":
          dateFrom = startOfYear(today);
          dateTo = endOfYear(today);
          break;
        case "all":
          // Usar el rango de fechas seleccionado si existe
          if (dateRange?.from) {
            dateFrom = startOfDay(dateRange.from);
          }
          if (dateRange?.to) {
            dateTo = endOfDay(dateRange.to);
          }
          break;
      }

      // Cargar datos según el tab
      if (tab === "today" || tab === "all") {
        const [recordsData, statsData] = await Promise.all([
          getEmployeeTimeTrackingHistory(employeeId, { dateFrom, dateTo }),
          getTimeTrackingStats(dateFrom, dateTo),
        ]);
        setDailyRecords(recordsData);
        setStats(statsData);

        if (recordsData.length > 0) {
          setEmployeeName(recordsData[0].employee.user.name || "Sin nombre");
          setEmployeeImage(recordsData[0].employee.user.image ?? null);
        }
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
      case "today":
      case "all": {
        const dailyData = dailyRecords.map((record) => ({
          Fecha: format(new Date(record.date), "dd/MM/yyyy", { locale: es }),
          "Hora Entrada": record.clockIn ? format(new Date(record.clockIn), "HH:mm", { locale: es }) : "",
          "Hora Salida": record.clockOut ? format(new Date(record.clockOut), "HH:mm", { locale: es }) : "",
          "Horas Trabajadas": `${record.totalWorkedHours}h`,
          Pausas: `${record.totalBreakHours}h`,
          Estado:
            record.status === "COMPLETED"
              ? "Completado"
              : record.status === "IN_PROGRESS"
                ? "En progreso"
                : record.status === "INCOMPLETE"
                  ? "Incompleto"
                  : "Ausente",
        }));
        exportToCSV(dailyData, `fichajes-${employeeSlug}-${activeTab === "today" ? "hoy" : "historico"}-${dateStr}`);
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

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="flex h-96 items-center justify-center">
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      );
    }

    const tabConfig = {
      today: { data: dailyRecords, table: dailyTable, columns, emptyMsg: "hoy" },
      week: { data: weeklyRecords, table: weeklyTable, columns: weeklyColumns, emptyMsg: "esta semana" },
      month: { data: monthlyRecords, table: monthlyTable, columns: monthlyColumns, emptyMsg: "este mes" },
      year: { data: yearlyRecords, table: yearlyTable, columns: yearlyColumns, emptyMsg: "este año" },
      all: { data: dailyRecords, table: dailyTable, columns, emptyMsg: "el período seleccionado" },
    };

    const config = tabConfig[activeTab];

    if (config.data.length === 0) {
      return (
        <EmptyState
          icon="clock"
          title="No hay fichajes"
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

        {/* Stats Cards (solo para vista diaria) */}
        {(activeTab === "today" || activeTab === "all") && (
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <Card className="dark:to-card border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm dark:border-blue-900 dark:from-blue-950">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-blue-600 dark:text-blue-400">Total Registros</span>
                  <span className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.totalRecords}</span>
                </div>
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50">
                  <FileText className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="dark:to-card border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm dark:border-purple-900 dark:from-purple-950">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-purple-600 dark:text-purple-400">Horas Trabajadas</span>
                  <span className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                    {stats.totalWorkedHours}h
                  </span>
                </div>
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/50">
                  <Clock className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            <Card className="dark:to-card border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-900 dark:from-amber-950">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-amber-600 dark:text-amber-400">Promedio Diario</span>
                  <span className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                    {Math.floor(stats.averageWorkedMinutesPerDay / 60)}h
                  </span>
                </div>
                <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/50">
                  <TrendingUp className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </Card>

            <Card className="dark:to-card border-green-200 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm dark:border-green-900 dark:from-green-950">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-green-600 dark:text-green-400">Completados</span>
                  <span className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {stats.statusCounts.COMPLETED}
                  </span>
                </div>
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/50">
                  <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
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
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Semanas</SelectItem>
                <SelectItem value="month">Meses</SelectItem>
                <SelectItem value="year">Años</SelectItem>
                <SelectItem value="all">Histórico</SelectItem>
              </SelectContent>
            </Select>

            <TabsList className="hidden @4xl/main:flex">
              <TabsTrigger value="today">Hoy</TabsTrigger>
              <TabsTrigger value="week">Semanas</TabsTrigger>
              <TabsTrigger value="month">Meses</TabsTrigger>
              <TabsTrigger value="year">Años</TabsTrigger>
              <TabsTrigger value="all">Histórico</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {activeTab === "all" && (
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  placeholder="Filtrar por fecha"
                />
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={
                  isLoading ||
                  (activeTab === "today"
                    ? dailyRecords.length === 0
                    : activeTab === "week"
                      ? weeklyRecords.length === 0
                      : activeTab === "month"
                        ? monthlyRecords.length === 0
                        : activeTab === "year"
                          ? yearlyRecords.length === 0
                          : dailyRecords.length === 0)
                }
              >
                <Download className="size-4" />
                Exportar CSV
              </Button>

              {(activeTab === "today" || activeTab === "week" || activeTab === "month" || activeTab === "year") && (
                <>
                  {activeTab !== "today" && (
                    <DataTableViewOptions
                      table={
                        activeTab === "week"
                          ? weeklyTable
                          : activeTab === "month"
                            ? monthlyTable
                            : activeTab === "year"
                              ? yearlyTable
                              : dailyTable
                      }
                    />
                  )}
                  {activeTab === "today" && <DataTableViewOptions table={dailyTable} />}
                </>
              )}
              {activeTab === "all" && <DataTableViewOptions table={dailyTable} />}
            </div>
          </div>

          {["today", "week", "month", "year", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="relative flex flex-col gap-4">
              {renderTable()}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

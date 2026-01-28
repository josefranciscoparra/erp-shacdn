"use client";

import { useState, useEffect } from "react";

import { useParams, useRouter } from "next/navigation";

import { addDays, endOfMonth, endOfYear, format, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportToCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import {
  getEmployeeWeeklySummary,
  getEmployeeMonthlySummary,
  getEmployeeYearlySummary,
  getEmployeeDailyDetail,
} from "@/server/actions/admin-time-tracking";
import { getEmployeeAlertsByDateRange } from "@/server/actions/alert-detection";

import { CalendarDateRangePicker } from "../_components/calendar-date-range-picker";
import { DayCard } from "../_components/day-card";
import { monthlyColumns, type MonthlySummary } from "../_components/monthly-columns";
import { weeklyColumns, type WeeklySummary } from "../_components/weekly-columns";
import { yearlyColumns, type YearlySummary } from "../_components/yearly-columns";

// Import del wrapper del mapa (ya maneja SSR internamente)

type TabValue = "detail" | "week" | "month" | "year";
type PeriodOption = "today" | "7days" | "30days" | "thisMonth" | "lastMonth" | "custom";

type CrossingCounts = {
  toNext: number;
  fromPrevious: number;
};

type CrossingMaps = {
  weekCounts: Map<string, CrossingCounts>;
  monthCounts: Map<string, CrossingCounts>;
  yearCounts: Map<string, CrossingCounts>;
  rangeStart: Date;
  rangeEnd: Date;
  limited: boolean;
};

const MAX_CROSSING_RANGE_DAYS = 370;

function getLocalDateKey(date: Date): string {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DayDetailData {
  id: string;
  date: Date;
  clockIn?: Date | null;
  clockOut?: Date | null;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT" | "HOLIDAY" | "NON_WORKDAY";
  expectedHours: number;
  actualHours: number;
  compliance: number;
  // Nuevos campos
  isWorkingDay: boolean;
  isFlexibleTotal?: boolean;
  weeklyTargetMinutes?: number | null;
  isHoliday: boolean;
  holidayName?: string;
  crossedMidnight?: boolean;
  crossedMidnightToNext?: boolean;
  crossedMidnightFromPrevious?: boolean;
  isOutsideContract?: boolean;
  timeEntries: {
    id: string;
    entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | "PROJECT_SWITCH";
    timestamp: Date;
    location?: string | null;
    notes?: string | null;
    isManual: boolean;
    projectId?: string | null;
    project?: {
      id: string;
      name: string;
      code: string | null;
      color: string | null;
    } | null;
    task?: string | null;
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
  // Alertas
  alerts?: {
    total: number;
    bySeverity: Record<string, number>;
  };
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
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const formatCrossingSummary = (counts: CrossingCounts | undefined, isInRange: boolean) => {
    if (!isInRange) {
      return "N/D";
    }

    const toNext = counts?.toNext ?? 0;
    const fromPrevious = counts?.fromPrevious ?? 0;

    if (toNext === 0 && fromPrevious === 0) {
      return "No";
    }

    if (fromPrevious === 0) {
      return `Termina: ${toNext}`;
    }

    if (toNext === 0) {
      return `Viene: ${fromPrevious}`;
    }

    return `Termina: ${toNext} / Viene: ${fromPrevious}`;
  };

  const clampCrossingRange = (rangeStart: Date, rangeEnd: Date) => {
    const maxStart = addDays(rangeEnd, -(MAX_CROSSING_RANGE_DAYS - 1));
    if (rangeStart < maxStart) {
      return {
        rangeStart: maxStart,
        rangeEnd,
        limited: true,
      };
    }

    return {
      rangeStart,
      rangeEnd,
      limited: false,
    };
  };

  const buildCrossingMaps = async (rangeStart: Date, rangeEnd: Date): Promise<CrossingMaps> => {
    const clamped = clampCrossingRange(rangeStart, rangeEnd);
    const detail = await getEmployeeDailyDetail(employeeId, clamped.rangeStart, clamped.rangeEnd);

    const weekCounts = new Map<string, CrossingCounts>();
    const monthCounts = new Map<string, CrossingCounts>();
    const yearCounts = new Map<string, CrossingCounts>();

    const ensureCounts = (map: Map<string, CrossingCounts>, key: string) => {
      const existing = map.get(key);
      if (existing) {
        return existing;
      }

      const fresh = { toNext: 0, fromPrevious: 0 };
      map.set(key, fresh);
      return fresh;
    };

    detail.days.forEach((day) => {
      const dayDate = new Date(day.date);
      const weekKey = startOfWeek(dayDate, { weekStartsOn: 1 }).toISOString();
      const monthKey = format(dayDate, "yyyy-MM", { locale: es });
      const yearKey = dayDate.getFullYear().toString();

      const weekCount = ensureCounts(weekCounts, weekKey);
      const monthCount = ensureCounts(monthCounts, monthKey);
      const yearCount = ensureCounts(yearCounts, yearKey);

      if (day.crossedMidnightToNext) {
        weekCount.toNext += 1;
        monthCount.toNext += 1;
        yearCount.toNext += 1;
      }

      if (day.crossedMidnightFromPrevious) {
        weekCount.fromPrevious += 1;
        monthCount.fromPrevious += 1;
        yearCount.fromPrevious += 1;
      }
    });

    return {
      weekCounts,
      monthCounts,
      yearCounts,
      rangeStart: clamped.rangeStart,
      rangeEnd: clamped.rangeEnd,
      limited: clamped.limited,
    };
  };

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
          // IMPORTANTE: Normalizar a mediodía UTC para evitar problemas de timezone
          // Si enviamos "17 nov 00:00 UTC+1", el servidor puede verlo como "16 nov 23:00 UTC"
          const year = dateRange.from.getFullYear();
          const month = dateRange.from.getMonth();
          const day = dateRange.from.getDate();
          dateFrom = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
        }
        if (dateRange?.to) {
          const year = dateRange.to.getFullYear();
          const month = dateRange.to.getMonth();
          const day = dateRange.to.getDate();
          dateTo = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
        }
      } else {
        // Para los tabs de resumen, usar todo el historial
        // O podríamos filtrar por año actual, etc.
      }

      // Cargar datos según el tab
      if (tab === "detail") {
        const data = await getEmployeeDailyDetail(employeeId, dateFrom, dateTo);

        // Obtener alertas para el rango de fechas
        let alertsByDate: Record<string, { total: number; bySeverity: Record<string, number> }> = {};
        if (dateFrom && dateTo) {
          try {
            alertsByDate = await getEmployeeAlertsByDateRange(employeeId, dateFrom, dateTo);
          } catch (error) {
            console.error("Error al cargar alertas:", error);
            // Continuar sin alertas si falla
          }
        }

        // Enriquecer los días con información de alertas y aplicar corrección visual
        const daysWithAlerts = data.days.map((day) => {
          const dateKey = getLocalDateKey(new Date(day.date));

          // Corrección visual para días no laborables (ej: fines de semana)
          // Si no se esperaba trabajar y no se trabajó, forzar estado NON_WORKDAY
          // Esto evita que aparezcan como "Completado" o "Incompleto" erróneamente en la UI
          const isFlexibleTotal = day.isFlexibleTotal === true;
          let displayStatus = day.status;
          if (!isFlexibleTotal && day.expectedHours === 0 && day.actualHours === 0 && day.timeEntries.length === 0) {
            displayStatus = "NON_WORKDAY";
          }

          return {
            ...day,
            status: displayStatus,
            alerts: alertsByDate[dateKey],
          };
        });

        setDailyDetailRecords(daysWithAlerts);

        // Actualizar información del empleado
        setEmployeeName(data.employee.name);
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

  const handleExport = async () => {
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
            Estado: day.isOutsideContract
              ? "Sin contrato"
              : day.status === "COMPLETED"
                ? "Completado"
                : day.status === "IN_PROGRESS"
                  ? "En progreso"
                  : day.status === "INCOMPLETE"
                    ? "Incompleto"
                    : "Ausente",
            "Termina al día siguiente": day.crossedMidnightToNext
              ? "Sí"
              : day.crossedMidnightFromPrevious
                ? "Viene del día anterior"
                : "No",
            Observaciones: "",
          });

          const typeLabels = {
            CLOCK_IN: "Entrada",
            CLOCK_OUT: "Salida",
            BREAK_START: "Inicio pausa",
            BREAK_END: "Fin pausa",
          };

          // Separar fichajes activos y cancelados
          const normalizedEntries = day.timeEntries.filter((entry) => entry.entryType !== "PROJECT_SWITCH");
          const activeEntries = normalizedEntries.filter((e) => !e.isCancelled);
          const cancelledEntries = normalizedEntries.filter((e) => e.isCancelled);

          // Fichajes activos
          activeEntries.forEach((entry) => {
            const estado = entry.isManual ? "Rectificado" : "";

            detailData.push({
              Fecha: "",
              Tipo: typeLabels[entry.entryType],
              Hora: format(new Date(entry.timestamp), "HH:mm", { locale: es }),
              "Horas Esperadas": "",
              "Horas Trabajadas": "",
              Cumplimiento: "",
              Estado: estado,
              "Termina al día siguiente": "",
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
              "Termina al día siguiente": "",
              Observaciones: "INVALIDADOS POR RECTIFICACIÓN",
            });

            // Fichajes cancelados
            cancelledEntries.forEach((entry) => {
              const estado = entry.isManual ? "CANCELADO - Rectificado" : "CANCELADO";

              detailData.push({
                Fecha: "",
                Tipo: typeLabels[entry.entryType],
                Hora: format(new Date(entry.timestamp), "HH:mm", { locale: es }),
                "Horas Esperadas": "",
                "Horas Trabajadas": "",
                Cumplimiento: "",
                Estado: estado,
                "Termina al día siguiente": "",
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
            "Termina al día siguiente": "",
            Observaciones: "",
          });
        });

        exportToCSV(detailData, `fichajes-${employeeSlug}-detalle-${dateStr}`);
        break;
      }

      case "week": {
        let crossingMaps: CrossingMaps | undefined;
        if (weeklyRecords.length > 0) {
          const rangeStart = weeklyRecords.reduce(
            (min, record) => (record.weekStart < min ? record.weekStart : min),
            weeklyRecords[0].weekStart,
          );
          const rangeEnd = weeklyRecords.reduce(
            (max, record) => (record.weekEnd > max ? record.weekEnd : max),
            weeklyRecords[0].weekEnd,
          );
          crossingMaps = await buildCrossingMaps(rangeStart, rangeEnd);
        }

        const weeklyData = weeklyRecords.map((record) => ({
          Semana: `${format(record.weekStart, "dd/MM", { locale: es })} - ${format(record.weekEnd, "dd/MM/yyyy", { locale: es })}`,
          "Días Trabajados": `${record.daysWorked}/${record.expectedDays}`,
          "Horas Trabajadas": `${record.actualHours}h`,
          "Horas Esperadas": `${record.expectedHours}h`,
          Cumplimiento: `${record.compliance}%`,
          "Promedio Diario": `${record.averageDaily}h`,
          "Termina al día siguiente": crossingMaps
            ? formatCrossingSummary(
                crossingMaps.weekCounts.get(record.weekStart.toISOString()),
                record.weekEnd >= crossingMaps.rangeStart && record.weekStart <= crossingMaps.rangeEnd,
              )
            : "N/D",
        }));
        exportToCSV(weeklyData, `fichajes-${employeeSlug}-semanas-${dateStr}`);
        break;
      }

      case "month": {
        let crossingMaps: CrossingMaps | undefined;
        if (monthlyRecords.length > 0) {
          const rangeStart = monthlyRecords.reduce((min, record) => {
            const monthStart = startOfMonth(record.month);
            return monthStart < min ? monthStart : min;
          }, startOfMonth(monthlyRecords[0].month));
          const rangeEnd = monthlyRecords.reduce((max, record) => {
            const monthEnd = endOfMonth(record.month);
            return monthEnd > max ? monthEnd : max;
          }, endOfMonth(monthlyRecords[0].month));
          crossingMaps = await buildCrossingMaps(rangeStart, rangeEnd);
        }

        const monthlyData = monthlyRecords.map((record) => ({
          Mes: format(record.month, "MMMM yyyy", { locale: es }),
          "Días Trabajados": `${record.daysWorked}/${record.expectedDays}`,
          "Horas Trabajadas": `${record.actualHours}h`,
          "Horas Esperadas": `${record.expectedHours}h`,
          Cumplimiento: `${record.compliance}%`,
          "Promedio Semanal": `${record.averageWeekly}h`,
          "Termina al día siguiente": crossingMaps
            ? formatCrossingSummary(
                crossingMaps.monthCounts.get(format(record.month, "yyyy-MM")),
                endOfMonth(record.month) >= crossingMaps.rangeStart &&
                  startOfMonth(record.month) <= crossingMaps.rangeEnd,
              )
            : "N/D",
        }));
        exportToCSV(monthlyData, `fichajes-${employeeSlug}-meses-${dateStr}`);
        break;
      }

      case "year": {
        let crossingMaps: CrossingMaps | undefined;
        if (yearlyRecords.length > 0) {
          const minYear = yearlyRecords.reduce(
            (min, record) => (record.year < min ? record.year : min),
            yearlyRecords[0].year,
          );
          const maxYear = yearlyRecords.reduce(
            (max, record) => (record.year > max ? record.year : max),
            yearlyRecords[0].year,
          );
          const rangeStart = startOfYear(new Date(minYear, 0, 1));
          const rangeEnd = endOfYear(new Date(maxYear, 0, 1));
          crossingMaps = await buildCrossingMaps(rangeStart, rangeEnd);
        }

        const yearlyData = yearlyRecords.map((record) => ({
          Año: record.year.toString(),
          "Días Trabajados": `${record.daysWorked}/${record.expectedDays}`,
          "Horas Trabajadas": `${record.actualHours}h`,
          "Horas Esperadas": `${record.expectedHours}h`,
          "Promedio Mensual": `${record.averageMonthly}h`,
          "Termina al día siguiente": crossingMaps
            ? formatCrossingSummary(
                crossingMaps.yearCounts.get(record.year.toString()),
                endOfYear(new Date(record.year, 0, 1)) >= crossingMaps.rangeStart &&
                  startOfYear(new Date(record.year, 0, 1)) <= crossingMaps.rangeEnd,
              )
            : "N/D",
        }));
        exportToCSV(yearlyData, `fichajes-${employeeSlug}-años-${dateStr}`);
        break;
      }
    }
  };

  // Calcular fichajes con GPS (solo para tab de detalle)
  const allTimeEntries =
    activeTab === "detail"
      ? dailyDetailRecords.flatMap((day) => day.timeEntries.filter((entry) => entry.entryType !== "PROJECT_SWITCH"))
      : [];
  const entriesWithGPS = allTimeEntries.filter((e) => e.latitude && e.longitude).length;

  // Cambiar automáticamente a vista lista si no hay GPS entries y estamos en vista mapa
  useEffect(() => {
    if (activeTab === "detail" && viewMode === "map" && entriesWithGPS === 0 && !isLoading) {
      setViewMode("list");
    }
  }, [activeTab, viewMode, entriesWithGPS, isLoading]);

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
      permissions={["view_time_tracking", "manage_time_tracking"]}
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
        {/* Header con info del empleado - Rediseñado */}
        <div className="flex flex-col gap-4">
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push("/dashboard/time-tracking")}
            className="text-muted-foreground hover:text-foreground -ml-4 w-fit"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>

          {employeeName && (
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{employeeName}</h1>
              <p className="text-muted-foreground text-sm">Historial de fichajes</p>
            </div>
          )}
        </div>

        {/* Filtros de período (solo para tab Detalle) - Rediseñado */}
        {activeTab === "detail" && (
          <div className="flex items-center justify-between gap-4">
            <CalendarDateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              selectedPeriod={selectedPeriod}
              onPeriodChange={(period) => {
                setSelectedPeriod(period as PeriodOption);
              }}
            />
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
              {/* Toggle Lista/Mapa solo para tab detalle - Rediseñado como segmented control */}
              {activeTab === "detail" && !isLoading && (
                <div className="bg-muted inline-flex items-center gap-0.5 rounded-lg p-0.5">
                  <Button
                    size="sm"
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("list")}
                    className={cn("h-8 rounded-md px-3", viewMode === "list" && "bg-background shadow-sm")}
                  >
                    <List className="mr-1.5 h-4 w-4" />
                    Lista
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "map" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("map")}
                    disabled={entriesWithGPS === 0}
                    className={cn("h-8 rounded-md px-3", viewMode === "map" && "bg-background shadow-sm")}
                  >
                    <Map className="mr-1.5 h-4 w-4" />
                    Mapa {entriesWithGPS > 0 && `(${entriesWithGPS})`}
                  </Button>
                </div>
              )}

              {/* Botón Exportar CSV - Mejorado visualmente */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleExport()}
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
                className="h-8"
              >
                <Download className="mr-1.5 h-4 w-4" />
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

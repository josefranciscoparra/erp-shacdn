"use client";

/**
 * Tab de Estadísticas de Organización
 * Sprint 6
 */

import { useState, useEffect } from "react";

import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  Download,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { exportOrgStatsToCSV, exportOrgStatsToExcel } from "@/lib/shifts/export-utils";
import { cn } from "@/lib/utils";
import { getShiftStatsForOrg } from "@/server/actions/shift-reports";

export function OrganizationStatsTab() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await getShiftStatsForOrg(dateRange.from, dateRange.to);
      setStats(data);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Selector de fecha */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "dd MMM", { locale: es })} -{" "}
                {format(dateRange.to, "dd MMM yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={() =>
              setDateRange({
                from: startOfMonth(new Date()),
                to: endOfMonth(new Date()),
              })
            }
          >
            Mes actual
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              setDateRange({
                from: subDays(new Date(), 30),
                to: new Date(),
              })
            }
          >
            Últimos 30 días
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!stats}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => exportOrgStatsToCSV(stats, dateRange)}>Exportar a CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportOrgStatsToExcel(stats, dateRange)}>
              Exportar a Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards de estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Turnos</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShifts}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.shiftsByStatus.PUBLISHED ?? 0} publicados, {stats.shiftsByStatus.CLOSED ?? 0} cerrados
            </p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Asignaciones</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            <p className="text-muted-foreground mt-1 text-xs">{stats.assignmentsWithAnomalies} con anomalías</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Tasa de Cumplimiento</CardTitle>
            {stats.complianceRate >= 90 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceRate}%</div>
            <p className="text-muted-foreground mt-1 text-xs">Sin retrasos ni ausencias</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Tasa de Ausencias</CardTitle>
            <AlertCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absenceRate}%</div>
            <p className="text-muted-foreground mt-1 text-xs">{stats.absences} ausencias totales</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Retrasos</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delays}</div>
            <p className="text-muted-foreground mt-1 text-xs">~{Math.round(stats.avgDelayMinutes)} min promedio</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Horas Planificadas</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlannedHours}h</div>
            <p className="text-muted-foreground mt-1 text-xs">Tiempo estimado</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Horas Trabajadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkedHours}h</div>
            <p className="text-muted-foreground mt-1 text-xs">Tiempo real fichado</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Diferencia</CardTitle>
            {stats.totalWorkedHours >= stats.totalPlannedHours ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-orange-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalWorkedHours >= stats.totalPlannedHours ? "+" : ""}
              {Math.round((stats.totalWorkedHours - stats.totalPlannedHours) * 10) / 10}h
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.totalWorkedHours >= stats.totalPlannedHours ? "Tiempo extra" : "Déficit"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

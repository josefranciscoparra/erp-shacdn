"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { startOfDay, subDays } from "date-fns";
import { ArrowLeft, Clock, ExternalLink, FileBarChart, Loader2, TrendingUp, Users } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type DailyProjectHours,
  type EmployeeProjectHours,
  getProjectById,
  getProjectDailyHours,
  getProjectEmployeeHours,
  getProjectTimeReport,
  type ProjectTimeReport,
} from "@/server/actions/projects";

import { CalendarDateRangePicker } from "../../../time-tracking/_components/calendar-date-range-picker";

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Inicializar con últimos 7 días por defecto
function getInitialDateRange(): DateRange {
  const today = new Date();
  return {
    from: startOfDay(subDays(today, 6)),
    to: startOfDay(today),
  };
}

export default function ProjectReportsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [dateRange, setDateRange] = useState<DateRange | undefined>(getInitialDateRange);
  const [selectedPeriod, setSelectedPeriod] = useState("last7Days");
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState<string>("");
  const [projectColor, setProjectColor] = useState<string | null>(null);
  const [report, setReport] = useState<ProjectTimeReport | null>(null);
  const [employees, setEmployees] = useState<EmployeeProjectHours[]>([]);
  const [dailyHours, setDailyHours] = useState<DailyProjectHours[]>([]);

  const loadData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setIsLoading(true);
    try {
      const startDate = dateRange.from;
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);

      const [projectResult, reportResult, employeesResult, dailyResult] = await Promise.all([
        getProjectById(projectId),
        getProjectTimeReport(projectId, startDate, endDate),
        getProjectEmployeeHours(projectId, startDate, endDate),
        getProjectDailyHours(projectId, startDate, endDate),
      ]);

      if (projectResult.success && projectResult.project) {
        setProjectName(projectResult.project.name);
        setProjectColor(projectResult.project.color);
      }

      if (reportResult.success && reportResult.report) {
        setReport(reportResult.report);
      } else {
        setReport(null);
      }

      if (employeesResult.success && employeesResult.employees) {
        setEmployees(employeesResult.employees);
      } else {
        setEmployees([]);
      }

      if (dailyResult.success && dailyResult.days) {
        setDailyHours(dailyResult.days);
      } else {
        setDailyHours([]);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcular máximo de horas para la barra de progreso
  const maxEmployeeHours = employees.length > 0 ? Math.max(...employees.map((e) => e.totalHours)) : 0;
  const maxDailyHours = dailyHours.length > 0 ? Math.max(...dailyHours.map((d) => d.totalHours)) : 0;

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 p-4 md:gap-6 md:p-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Cards skeleton */}
        <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>

        {/* Tables skeleton */}
        <div className="grid gap-4 @3xl/main:grid-cols-2">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @xl/main:flex-row @xl/main:items-center @xl/main:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {projectColor && (
              <div className="h-10 w-10 shrink-0 rounded-full" style={{ backgroundColor: projectColor }} />
            )}
            <div>
              <h1 className="text-xl font-semibold">{projectName}</h1>
              <p className="text-muted-foreground text-sm">Informes de tiempo</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CalendarDateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
          <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horas Totales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report ? formatHours(report.totalHours) : "0h 0m"}</div>
            <p className="text-muted-foreground text-xs">{report?.totalMinutes ?? 0} minutos</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Empleados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.employeesCount ?? 0}</div>
            <p className="text-muted-foreground text-xs">han trabajado en el proyecto</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              Fichajes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.entriesCount ?? 0}</div>
            <p className="text-muted-foreground text-xs">entradas registradas</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Media Diaria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyHours.length > 0
                ? formatHours(dailyHours.reduce((acc, d) => acc + d.totalHours, 0) / dailyHours.length)
                : "0h 0m"}
            </div>
            <p className="text-muted-foreground text-xs">en {dailyHours.length} días con actividad</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid gap-4 @3xl/main:grid-cols-2">
        {/* Horas por Empleado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Horas por Empleado
            </CardTitle>
            <CardDescription>Top empleados por tiempo trabajado</CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                No hay datos para el período seleccionado
              </div>
            ) : (
              <div className="space-y-4">
                {employees.slice(0, 10).map((emp, index) => (
                  <div key={emp.employeeId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-5 w-5 justify-center p-0 text-xs">
                          {index + 1}
                        </Badge>
                        <Link
                          href={`/dashboard/employees/${emp.employeeId}`}
                          className="hover:text-primary flex items-center gap-1 font-medium transition-colors hover:underline"
                        >
                          {emp.employeeName}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </Link>
                        {emp.employeeNumber && (
                          <span className="text-muted-foreground text-xs">({emp.employeeNumber})</span>
                        )}
                      </div>
                      <span className="text-muted-foreground">{formatHours(emp.totalHours)}</span>
                    </div>
                    <Progress
                      value={maxEmployeeHours > 0 ? (emp.totalHours / maxEmployeeHours) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Horas por Día */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Actividad Diaria
            </CardTitle>
            <CardDescription>Horas trabajadas por día</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyHours.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                No hay datos para el período seleccionado
              </div>
            ) : (
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead className="text-right">Fichajes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyHours.slice(-15).map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress
                              value={maxDailyHours > 0 ? (day.totalHours / maxDailyHours) * 100 : 0}
                              className="h-2 w-16"
                            />
                            <span className="text-muted-foreground w-14 text-right text-xs">
                              {formatHours(day.totalHours)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right">{day.entriesCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

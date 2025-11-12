"use client";

/**
 * Tab de Informes por Centro de Coste
 * Sprint 6
 */

import { useState, useEffect } from "react";

import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Download, Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getCostCenters } from "@/server/actions/cost-centers";
import { getShiftReportByCostCenter } from "@/server/actions/shift-reports";

const weekdayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function CostCenterReportsTab() {
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCostCenters();
  }, []);

  useEffect(() => {
    if (selectedCostCenterId) {
      loadReport();
    }
  }, [selectedCostCenterId, dateRange]);

  async function loadCostCenters() {
    try {
      const data = await getCostCenters();
      setCostCenters(data);
      if (data.length > 0) {
        setSelectedCostCenterId(data[0].id);
      }
    } catch (error) {
      console.error("Error cargando centros:", error);
    }
  }

  async function loadReport() {
    if (!selectedCostCenterId) return;

    setLoading(true);
    try {
      const data = await getShiftReportByCostCenter(selectedCostCenterId, dateRange.from, dateRange.to);
      setReport(data);
    } catch (error) {
      console.error("Error cargando informe:", error);
    } finally {
      setLoading(false);
    }
  }

  if (costCenters.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground">No hay centros de coste disponibles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedCostCenterId} onValueChange={setSelectedCostCenterId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Seleccionar centro" />
          </SelectTrigger>
          <SelectContent>
            {costCenters.map((cc) => (
              <SelectItem key={cc.id} value={cc.id}>
                {cc.code} - {cc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.from, "dd MMM", { locale: es })} - {format(dateRange.to, "dd MMM yyyy", { locale: es })}
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

        <div className="flex-1" />

        <Button variant="outline" size="sm" disabled={!report}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
      ) : report ? (
        <>
          {/* Datos del centro */}
          <Card>
            <CardHeader>
              <CardTitle>
                {report.costCenter.code} - {report.costCenter.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground text-sm">
                Período: {format(new Date(report.period.startDate), "dd MMM", { locale: es })} -{" "}
                {format(new Date(report.period.endDate), "dd MMM yyyy", { locale: es })} ({report.period.days} días)
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">Turnos Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.totalShifts}</div>
                <p className="text-muted-foreground mt-1 text-xs">{report.stats.publishedShifts} publicados</p>
              </CardContent>
            </Card>

            <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">Empleados Únicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.uniqueEmployees}</div>
                <p className="text-muted-foreground mt-1 text-xs">{report.stats.totalAssignments} asignaciones</p>
              </CardContent>
            </Card>

            <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">Cumplimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.complianceRate}%</div>
                <p className="text-muted-foreground mt-1 text-xs">{report.stats.absences} ausencias</p>
              </CardContent>
            </Card>

            <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">Horas Trabajadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.totalWorkedHours}h</div>
                <p className="text-muted-foreground mt-1 text-xs">de {report.stats.totalPlannedHours}h planificadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Distribución por día de la semana */}
          <Card>
            <CardHeader>
              <CardTitle>Turnos por Día de la Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const count = report.shiftsByWeekday[day] ?? 0;
                  const maxCount = Math.max(...Object.values(report.shiftsByWeekday).map((v: any) => v ?? 0));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={day} className="flex flex-col items-center gap-2">
                      <div className="text-muted-foreground text-xs font-medium">{weekdayNames[day]}</div>
                      <div
                        className="bg-primary/20 flex w-full items-end justify-center rounded-t-lg pb-2"
                        style={{ height: "120px" }}
                      >
                        <div
                          className="bg-primary text-primary-foreground flex w-full items-end justify-center rounded-t-lg pb-1 text-xs font-bold"
                          style={{ height: `${percentage}%`, minHeight: count > 0 ? "24px" : "0px" }}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Listado de turnos recientes */}
          <Card>
            <CardHeader>
              <CardTitle>Turnos Recientes ({report.shifts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.shifts.slice(0, 10).map((shift: any) => (
                  <div key={shift.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1">
                      <div className="font-medium">{format(new Date(shift.date), "dd MMM yyyy", { locale: es })}</div>
                      <div className="text-muted-foreground text-sm">
                        {shift.startTime} - {shift.endTime}
                        {shift.position && ` · ${shift.position}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground text-sm">
                        {shift.assignedEmployees}/{shift.requiredEmployees} empleados
                      </div>
                      <Badge variant={shift.status === "CLOSED" ? "default" : "secondary"}>{shift.status}</Badge>
                      {shift.assignments.some((a: any) => a.wasAbsent ?? a.hasDelay) && (
                        <Badge variant="destructive">Anomalías</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

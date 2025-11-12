"use client";

/**
 * Tab de Informes por Empleado
 * Sprint 6
 */

import { useState, useEffect } from "react";

import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportEmployeeReportToCSV, exportEmployeeReportToExcel } from "@/lib/shifts/export-utils";
import { cn } from "@/lib/utils";
import { getActiveEmployees } from "@/server/actions/employees";
import { getShiftReportByEmployee } from "@/server/actions/shift-reports";

export function EmployeeReportsTab() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadReport();
    }
  }, [selectedEmployeeId, dateRange]);

  async function loadEmployees() {
    try {
      const data = await getActiveEmployees();
      setEmployees(data);
      if (data.length > 0) {
        setSelectedEmployeeId(data[0].id);
      }
    } catch (error) {
      console.error("Error cargando empleados:", error);
    }
  }

  async function loadReport() {
    if (!selectedEmployeeId) return;

    setLoading(true);
    try {
      const data = await getShiftReportByEmployee(selectedEmployeeId, dateRange.from, dateRange.to);
      setReport(data);
    } catch (error) {
      console.error("Error cargando informe:", error);
    } finally {
      setLoading(false);
    }
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground">No hay empleados disponibles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Seleccionar empleado" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.employeeNumber} - {emp.firstName} {emp.lastName}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!report}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => exportEmployeeReportToCSV(report)}>Exportar a CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportEmployeeReportToExcel(report)}>Exportar a Excel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
          {/* Datos del empleado */}
          <Card>
            <CardHeader>
              <CardTitle>
                {report.employee.firstName} {report.employee.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Número:</span>{" "}
                  <span className="font-medium">{report.employee.employeeNumber}</span>
                </div>
                {report.employee.department && (
                  <div>
                    <span className="text-muted-foreground">Departamento:</span>{" "}
                    <span className="font-medium">{report.employee.department}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Período:</span>{" "}
                  <span className="font-medium">
                    {format(new Date(report.period.startDate), "dd MMM", { locale: es })} -{" "}
                    {format(new Date(report.period.endDate), "dd MMM yyyy", { locale: es })} ({report.period.days} días)
                  </span>
                </div>
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
                <p className="text-muted-foreground mt-1 text-xs">{report.stats.completedShifts} completados</p>
              </CardContent>
            </Card>

            <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">Cumplimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.complianceRate}%</div>
                <p className="text-muted-foreground mt-1 text-xs">{report.stats.delays} retrasos</p>
              </CardContent>
            </Card>

            <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">Ausencias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.absences}</div>
                <p className="text-muted-foreground mt-1 text-xs">{report.stats.absenceRate}% del total</p>
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

          {/* Tabla de asignaciones */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Turnos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Planificado</TableHead>
                      <TableHead className="text-right">Trabajado</TableHead>
                      <TableHead>Anomalías</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.assignments.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                        <TableCell>{format(new Date(assignment.date), "dd MMM", { locale: es })}</TableCell>
                        <TableCell className="text-xs">
                          {assignment.startTime} - {assignment.endTime}
                        </TableCell>
                        <TableCell className="text-xs">{assignment.costCenter}</TableCell>
                        <TableCell className="text-xs">{assignment.position ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              assignment.status === "COMPLETED"
                                ? "default"
                                : assignment.status === "ABSENT"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {assignment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {Math.round((assignment.plannedMinutes / 60) * 10) / 10}h
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {assignment.actualWorkedMinutes
                            ? `${Math.round((assignment.actualWorkedMinutes / 60) * 10) / 10}h`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {assignment.wasAbsent && (
                              <Badge variant="destructive" className="text-xs">
                                Ausencia
                              </Badge>
                            )}
                            {assignment.hasDelay && (
                              <Badge variant="secondary" className="text-xs">
                                +{assignment.delayMinutes}min
                              </Badge>
                            )}
                            {assignment.hasEarlyDeparture && (
                              <Badge variant="secondary" className="text-xs">
                                Salida -{assignment.earlyDepartureMinutes}min
                              </Badge>
                            )}
                            {assignment.workedOutsideShift && (
                              <Badge variant="outline" className="text-xs">
                                Fuera turno
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

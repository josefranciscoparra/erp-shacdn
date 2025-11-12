"use client";

/**
 * Tab de Gráfico de Cumplimiento
 * Sprint 6
 */

import { useState, useEffect } from "react";

import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getCostCenters } from "@/server/actions/cost-centers";
import { getComplianceChartData, getEmployeeComplianceRanking } from "@/server/actions/shift-reports";

export function ComplianceChartTab() {
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCostCenters();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCostCenterId, dateRange]);

  async function loadCostCenters() {
    try {
      const data = await getCostCenters();
      setCostCenters(data);
    } catch (error) {
      console.error("Error cargando centros:", error);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [chartResult, rankingResult] = await Promise.all([
        getComplianceChartData(
          dateRange.from,
          dateRange.to,
          selectedCostCenterId !== "all" ? selectedCostCenterId : undefined,
        ),
        getEmployeeComplianceRanking(dateRange.from, dateRange.to, 10),
      ]);

      setChartData(chartResult);
      setRanking(rankingResult);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedCostCenterId} onValueChange={setSelectedCostCenterId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filtrar por centro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los centros</SelectItem>
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
              from: subDays(new Date(), 30),
              to: new Date(),
            })
          }
        >
          Últimos 30 días
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            setDateRange({
              from: subDays(new Date(), 7),
              to: new Date(),
            })
          }
        >
          Última semana
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Gráfico de línea de cumplimiento */}
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Cumplimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), "dd MMM", { locale: es })} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), "dd MMM yyyy", { locale: es })}
                    formatter={(value: any) => [`${value}%`, "Cumplimiento"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="complianceRate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Tasa de Cumplimiento"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de barras de anomalías */}
          <Card>
            <CardHeader>
              <CardTitle>Anomalías Diarias</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), "dd MMM", { locale: es })} />
                  <YAxis />
                  <Tooltip labelFormatter={(value) => format(new Date(value), "dd MMM yyyy", { locale: es })} />
                  <Legend />
                  <Bar dataKey="absences" fill="hsl(var(--destructive))" name="Ausencias" />
                  <Bar dataKey="delays" fill="hsl(var(--warning))" name="Retrasos" />
                  <Bar dataKey="earlyDepartures" fill="hsl(var(--muted))" name="Salidas Anticipadas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ranking de empleados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top 10 Empleados por Cumplimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-center">Turnos</TableHead>
                      <TableHead className="text-center">Cumplimiento</TableHead>
                      <TableHead className="text-center">Ausencias</TableHead>
                      <TableHead className="text-center">Retrasos</TableHead>
                      <TableHead className="text-right">Retraso Prom.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((employee, index) => (
                      <TableRow key={employee.employeeId}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.employeeName}</div>
                            <div className="text-muted-foreground text-xs">{employee.employeeNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{employee.totalShifts}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              employee.complianceRate >= 95
                                ? "default"
                                : employee.complianceRate >= 85
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {employee.complianceRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {employee.absences > 0 ? (
                            <Badge variant="destructive">{employee.absences}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {employee.delays > 0 ? (
                            <Badge variant="secondary">{employee.delays}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {employee.avgDelayMinutes > 0 ? `${employee.avgDelayMinutes} min` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

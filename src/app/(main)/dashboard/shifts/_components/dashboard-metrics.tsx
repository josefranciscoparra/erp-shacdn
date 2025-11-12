/**
 * Métricas Principales del Dashboard de Turnos
 *
 * 4 cards con métricas clave y gráficas radiales
 * Estilo basado en my-space-metrics.tsx
 */

"use client";

import { Calendar, Users, Clock, TrendingUp } from "lucide-react";
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { DashboardMetrics } from "../_lib/dashboard-utils";

interface DashboardMetricsProps {
  metrics: DashboardMetrics | null;
  isLoading?: boolean;
}

export function DashboardMetricsCards({ metrics, isLoading }: DashboardMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-8 w-24" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-sm font-medium">No se pudieron cargar las métricas</p>
      </Card>
    );
  }

  // Calcular porcentajes
  const coverageProgress = Math.round(metrics.averageCoverage);
  const employeesProgress =
    metrics.totalEmployees > 0 ? Math.round((metrics.employeesWithShifts / metrics.totalEmployees) * 100) : 0;
  const hoursProgress =
    metrics.totalHoursContracted > 0
      ? Math.round((metrics.totalHoursAssigned / metrics.totalHoursContracted) * 100)
      : 0;

  // Datos para gráficas
  const coverageChartData = [{ value: Math.min(coverageProgress, 100), fill: "var(--color-coverage)" }];
  const employeesChartData = [{ value: Math.min(employeesProgress, 100), fill: "var(--color-employees)" }];
  const hoursChartData = [{ value: Math.min(hoursProgress, 100), fill: "var(--color-hours)" }];

  const chartConfig = {
    coverage: {
      label: "Cobertura",
      color: "var(--primary)",
    },
    employees: {
      label: "Empleados",
      color: "var(--primary)",
    },
    hours: {
      label: "Horas",
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* Card 1: Estado de Turnos */}
      <Card>
        <CardHeader>
          <CardDescription>Estado de Turnos</CardDescription>
          <div className="flex flex-col gap-2">
            <h4 className="font-display text-2xl lg:text-3xl">{metrics.totalShifts}</h4>
            <div className="text-muted-foreground text-sm">Total de turnos asignados</div>
          </div>
          <CardAction>
            <div className="flex gap-2">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
                <Calendar className="size-5" />
              </div>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {metrics.draftShifts > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
              >
                <span className="text-xs font-semibold">{metrics.draftShifts}</span>
                <span className="text-xs">Borrador</span>
              </Badge>
            )}
            {metrics.publishedShifts > 0 && (
              <Badge variant="default" className="gap-1">
                <span className="text-xs font-semibold">{metrics.publishedShifts}</span>
                <span className="text-xs">Publicado</span>
              </Badge>
            )}
            {metrics.conflictShifts > 0 && (
              <Badge variant="destructive" className="gap-1">
                <span className="text-xs font-semibold">{metrics.conflictShifts}</span>
                <span className="text-xs">Conflictos</span>
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Cobertura Promedio */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {coverageProgress >= 100
              ? "Cobertura completa"
              : coverageProgress >= 70
                ? "Cobertura adecuada"
                : "Cobertura insuficiente"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[60px]">
                <RadialBarChart
                  data={coverageChartData}
                  startAngle={0}
                  endAngle={250}
                  innerRadius={25}
                  outerRadius={20}
                >
                  <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[86, 74]} />
                  <RadialBar dataKey="value" background cornerRadius={10} />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-bold">
                                {coverageProgress}%
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            </div>
            <p className="text-muted-foreground text-sm">
              Cobertura promedio de{" "}
              <span
                className={cn(
                  coverageProgress >= 100
                    ? "text-green-600"
                    : coverageProgress >= 70
                      ? "text-orange-500"
                      : "text-red-600",
                )}
              >
                {coverageProgress}%
              </span>{" "}
              en todas las zonas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Empleados con Turnos */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {employeesProgress >= 100
              ? "Todos asignados"
              : employeesProgress >= 70
                ? "Mayoría asignada"
                : "Muchos sin asignar"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[60px]">
                <RadialBarChart
                  data={employeesChartData}
                  startAngle={0}
                  endAngle={250}
                  innerRadius={25}
                  outerRadius={20}
                >
                  <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[86, 74]} />
                  <RadialBar dataKey="value" background cornerRadius={10} />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-bold">
                                {employeesProgress}%
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            </div>
            <p className="text-muted-foreground text-sm">
              <span
                className={cn(
                  employeesProgress >= 100
                    ? "text-green-600"
                    : employeesProgress >= 70
                      ? "text-orange-500"
                      : "text-red-600",
                )}
              >
                {metrics.employeesWithShifts} de {metrics.totalEmployees}
              </span>{" "}
              empleados tienen turnos asignados
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Horas Asignadas */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {hoursProgress >= 100 ? "Horas completas" : hoursProgress >= 70 ? "Horas adecuadas" : "Horas insuficientes"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[60px]">
                <RadialBarChart data={hoursChartData} startAngle={0} endAngle={250} innerRadius={25} outerRadius={20}>
                  <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[86, 74]} />
                  <RadialBar dataKey="value" background cornerRadius={10} />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-bold">
                                {hoursProgress}%
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            </div>
            <p className="text-muted-foreground text-sm">
              <span
                className={cn(
                  hoursProgress >= 100 ? "text-green-600" : hoursProgress >= 70 ? "text-orange-500" : "text-red-600",
                )}
              >
                {Math.round(metrics.totalHoursAssigned)}h de {Math.round(metrics.totalHoursContracted)}h
              </span>{" "}
              contratadas asignadas
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

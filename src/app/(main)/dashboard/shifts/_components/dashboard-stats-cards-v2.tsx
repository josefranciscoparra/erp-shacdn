/**
 * Tarjetas de Estadísticas del Dashboard (Rediseño v2)
 *
 * 4 cards modernas con diseño limpio nivel Factorial/Notion
 * Con iconos, KPIs grandes y mini gráficos
 */

"use client";

import { Calendar, AlertTriangle, Users, Clock } from "lucide-react";
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { MockStats } from "../_lib/dashboard-mock-data";

interface DashboardStatsCardsProps {
  stats: MockStats;
  isLoading?: boolean;
}

export function DashboardStatsCardsV2({ stats, isLoading }: DashboardStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="mt-4 h-10 w-20" />
              <Skeleton className="mt-2 h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const coverageProgress = Math.round(stats.coverage);
  const employeesProgress =
    stats.totalEmployees > 0
      ? Math.round(((stats.totalEmployees - stats.employeesWithoutShifts) / stats.totalEmployees) * 100)
      : 0;
  const hoursProgress = stats.hoursContracted > 0 ? Math.round((stats.hoursAssigned / stats.hoursContracted) * 100) : 0;

  const chartConfig = {
    value: {
      label: "Progreso",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* Card 1: Estado de Turnos */}
      <Card className="rounded-xl border-slate-200 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          {/* Header con icono */}
          <div className="flex items-start justify-between">
            <div className="bg-primary/10 rounded-full p-3">
              <Calendar className="text-primary size-6" />
            </div>
            {stats.conflictShifts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {stats.conflictShifts} conflictos
              </Badge>
            )}
          </div>

          {/* KPI */}
          <div className="mt-4">
            <p className="font-display text-4xl font-bold">{stats.totalShifts}</p>
            <p className="text-muted-foreground mt-1 text-sm">Turnos asignados</p>
          </div>

          {/* Badges de estado */}
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.draftShifts > 0 && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-xs text-amber-700">
                {stats.draftShifts} borradores
              </Badge>
            )}
            {stats.publishedShifts > 0 && (
              <Badge variant="outline" className="text-xs">
                {stats.publishedShifts} publicados
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Cobertura */}
      <Card className="rounded-xl border-slate-200 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="size-6 text-red-600" />
            </div>
          </div>

          {/* KPI con mini gráfico */}
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="font-display text-4xl font-bold">{coverageProgress}%</p>
              <p className="text-muted-foreground mt-1 text-sm">Cobertura promedio</p>
            </div>

            {/* Mini RadialChart */}
            <ChartContainer config={chartConfig} className="aspect-square h-[50px]">
              <RadialBarChart
                data={[{ value: Math.min(coverageProgress, 100), fill: "var(--primary)" }]}
                startAngle={0}
                endAngle={250}
                innerRadius={18}
                outerRadius={15}
              >
                <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[30, 20]} />
                <RadialBar dataKey="value" background cornerRadius={10} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xs font-bold">
                              {coverageProgress}
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

          {/* Badge de estado */}
          <div className="mt-3">
            <Badge
              variant={coverageProgress >= 80 ? "default" : "secondary"}
              className={cn(
                "text-xs",
                coverageProgress < 70 && "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20",
              )}
            >
              {coverageProgress >= 80 ? "✓ Adecuada" : "⚠ Insuficiente"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Empleados sin asignar */}
      <Card className="rounded-xl border-slate-200 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="rounded-full bg-amber-100 p-3">
              <Users className="size-6 text-amber-600" />
            </div>
          </div>

          {/* KPI con mini gráfico */}
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="font-display text-4xl font-bold">{stats.employeesWithoutShifts}</p>
              <p className="text-muted-foreground mt-1 text-sm">Sin turnos</p>
            </div>

            {/* Mini RadialChart */}
            <ChartContainer config={chartConfig} className="aspect-square h-[50px]">
              <RadialBarChart
                data={[{ value: Math.min(employeesProgress, 100), fill: "var(--primary)" }]}
                startAngle={0}
                endAngle={250}
                innerRadius={18}
                outerRadius={15}
              >
                <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[30, 20]} />
                <RadialBar dataKey="value" background cornerRadius={10} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xs font-bold">
                              {employeesProgress}
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

          {/* Detalles */}
          <div className="mt-3">
            <p className="text-muted-foreground text-xs">
              {stats.totalEmployees - stats.employeesWithoutShifts} de {stats.totalEmployees} con turnos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Horas asignadas */}
      <Card className="rounded-xl border-slate-200 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="rounded-full bg-blue-100 p-3">
              <Clock className="size-6 text-blue-600" />
            </div>
          </div>

          {/* KPI con mini gráfico */}
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="font-display text-4xl font-bold">{stats.hoursAssigned}h</p>
              <p className="text-muted-foreground mt-1 text-sm">Horas asignadas</p>
            </div>

            {/* Mini RadialChart */}
            <ChartContainer config={chartConfig} className="aspect-square h-[50px]">
              <RadialBarChart
                data={[{ value: Math.min(hoursProgress, 100), fill: "var(--primary)" }]}
                startAngle={0}
                endAngle={250}
                innerRadius={18}
                outerRadius={15}
              >
                <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[30, 20]} />
                <RadialBar dataKey="value" background cornerRadius={10} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xs font-bold">
                              {hoursProgress}
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

          {/* Detalles */}
          <div className="mt-3">
            <p className="text-muted-foreground text-xs">
              de {stats.hoursContracted}h contratadas ({hoursProgress}%)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

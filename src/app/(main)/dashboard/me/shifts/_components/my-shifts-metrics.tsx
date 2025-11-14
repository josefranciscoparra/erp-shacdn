/**
 * Métricas Personales de Mis Turnos
 *
 * 4 cards con RadialBarCharts mostrando:
 * - Horas asignadas esta semana
 * - Próximo turno (countdown)
 * - Turnos este mes
 * - Balance semanal
 *
 * Estilo basado en my-space-metrics.tsx
 */

"use client";

import { Calendar, TrendingUp, CalendarClock } from "lucide-react";
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import { formatShiftTime, formatDateShort } from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { MyShiftsMetrics } from "../_lib/my-shifts-types";
import { formatHoursDetailed, getBalanceStatusColor, getWeekProgressColor } from "../_lib/my-shifts-utils";

interface MyShiftsMetricsProps {
  metrics: MyShiftsMetrics | null;
  isLoading?: boolean;
}

export function MyShiftsMetricsCards({ metrics, isLoading }: MyShiftsMetricsProps) {
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

  // Datos para gráficas radiales
  const weekProgressChartData = [{ value: Math.min(metrics.weekProgress, 100), fill: "var(--color-week)" }];

  const chartConfig = {
    week: {
      label: "Progreso",
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* Card 1: Horas Asignadas Esta Semana */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {metrics.weekProgress >= 100
              ? "Horas completas"
              : metrics.weekProgress >= 70
                ? "Horas adecuadas"
                : "Horas insuficientes"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[60px]">
                <RadialBarChart
                  data={weekProgressChartData}
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
                                {metrics.weekProgress}%
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
              Has completado{" "}
              <span className={cn("font-semibold", getWeekProgressColor(metrics.weekProgress))}>
                {formatHoursDetailed(metrics.weekHoursAssigned)}
              </span>{" "}
              de {formatHoursDetailed(metrics.weekHoursContracted)} asignadas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Próximo Turno */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {metrics.nextShift ? "Próximo turno" : "Sin turnos próximos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <CalendarClock className="size-5" />
            </div>
            <div className="flex-1">
              {metrics.nextShift ? (
                <>
                  <p className="text-sm font-semibold">
                    {formatShiftTime(metrics.nextShift.startTime, metrics.nextShift.endTime)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {formatDateShort(new Date(metrics.nextShift.date))} · En{" "}
                    <span className="text-foreground font-semibold">{Math.abs(metrics.hoursUntilNextShift)}h</span>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No tienes turnos asignados próximamente</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Turnos Este Mes */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Turnos este mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <Calendar className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {metrics.monthTotalShifts} turno{metrics.monthTotalShifts !== 1 ? "s" : ""}
              </p>
              <p className="text-muted-foreground text-sm">{formatHoursDetailed(metrics.monthTotalHours)} totales</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Balance Semanal */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Balance semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <TrendingUp className="size-5" />
            </div>
            <div className="flex-1">
              <p className={cn("text-sm font-semibold", getBalanceStatusColor(metrics.weekBalanceStatus))}>
                {metrics.weekBalance >= 0 ? "+" : ""}
                {formatHoursDetailed(Math.abs(metrics.weekBalance))}
              </p>
              <p className="text-muted-foreground text-sm">
                {metrics.weekBalanceStatus === "under" && "Menos de lo esperado"}
                {metrics.weekBalanceStatus === "ok" && "Dentro del rango"}
                {metrics.weekBalanceStatus === "over" && "Más de lo esperado"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { CalendarDays } from "lucide-react";
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface MySpaceMetricsProps {
  data: MySpaceDashboard | null;
  isLoading?: boolean;
}

/**
 * Formatea minutos a un formato legible de horas y minutos
 * Ejemplos: 65 min → "1h 5m", 480 min → "8h", 0 min → "0h"
 */
function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

export function MySpaceMetrics({ data, isLoading }: MySpaceMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
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

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-sm font-medium">No se pudieron cargar las métricas</p>
      </Card>
    );
  }

  const { timeTracking, pto } = data;
  const isFlexToday = timeTracking.today.isFlexibleTotal;
  const isFlexWeek = timeTracking.week.isFlexibleTotal;

  // Formatear tiempo trabajado y esperado
  const todayHours = formatMinutesToTime(timeTracking.today.workedMinutes);
  const todayExpectedHours = formatMinutesToTime(timeTracking.today.expectedMinutes);
  const weekHours = formatMinutesToTime(timeTracking.week.totalWorkedMinutes);
  const weekExpectedHours = formatMinutesToTime(timeTracking.week.expectedMinutes);

  // Calcular porcentaje de progreso (evitar NaN si expectedMinutes es 0)
  const todayProgress =
    !isFlexToday && timeTracking.today.expectedMinutes > 0
      ? Math.round((timeTracking.today.workedMinutes / timeTracking.today.expectedMinutes) * 100)
      : 0;
  const weekProgress =
    timeTracking.week.expectedMinutes > 0
      ? Math.round((timeTracking.week.totalWorkedMinutes / timeTracking.week.expectedMinutes) * 100)
      : 0;

  // Configuración de gráficas radiales
  const todayChartData = [{ value: Math.min(todayProgress, 100), fill: "var(--color-today)" }];
  const weekChartData = [{ value: Math.min(weekProgress, 100), fill: "var(--color-week)" }];

  const chartConfig = {
    today: {
      label: "Hoy",
      color: "var(--primary)",
    },
    week: {
      label: "Semana",
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Horas trabajadas hoy */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {isFlexToday
              ? "Horario flexible"
              : todayProgress >= 100
                ? "Objetivo de hoy cumplido"
                : "Objetivo de hoy incompleto"}
          </CardTitle>
          {isFlexToday && <CardDescription>Sin objetivo diario, se controla por semana</CardDescription>}
        </CardHeader>
        <CardContent>
          {isFlexToday ? (
            <p className="text-muted-foreground text-sm">
              Has trabajado <span className="text-foreground font-medium">{todayHours}</span> hoy.
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <div>
                <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[60px]">
                  <RadialBarChart data={todayChartData} startAngle={0} endAngle={250} innerRadius={25} outerRadius={20}>
                    <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[86, 74]} />
                    <RadialBar dataKey="value" background cornerRadius={10} />
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-bold">
                                  {todayProgress}%
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
                <span className={todayProgress >= 100 ? "text-green-600" : "text-orange-500"}>{todayHours}</span> de{" "}
                <span className={todayProgress >= 100 ? "text-green-600" : "text-orange-500"}>
                  {todayExpectedHours}
                </span>{" "}
                de tu jornada de hoy
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horas esta semana */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {weekProgress >= 100 ? "Objetivo semanal cumplido" : "Objetivo semanal incompleto"}
          </CardTitle>
          {isFlexWeek && <CardDescription>Flexible total: objetivo semanal</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[60px]">
                <RadialBarChart data={weekChartData} startAngle={0} endAngle={250} innerRadius={25} outerRadius={20}>
                  <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[86, 74]} />
                  <RadialBar dataKey="value" background cornerRadius={10} />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-bold">
                                {weekProgress}%
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
              <span className={weekProgress >= 100 ? "text-green-600" : "text-orange-500"}>{weekHours}</span> de{" "}
              <span className={weekProgress >= 100 ? "text-green-600" : "text-orange-500"}>{weekExpectedHours}</span> de
              tu jornada semanal
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Días de vacaciones disponibles */}
      <Card>
        <CardHeader>
          <CardDescription>Vacaciones</CardDescription>
          {pto ? (
            <>
              <div className="flex flex-col gap-2">
                <h4 className="font-display text-2xl lg:text-3xl">{Math.round(pto.daysAvailable)} días</h4>
                <div className="text-muted-foreground text-sm">
                  Te quedan {Math.round(pto.daysAvailable)} días de vacaciones
                </div>
              </div>
              <CardAction>
                <div className="flex gap-4">
                  <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
                    <CalendarDays className="size-5" />
                  </div>
                </div>
              </CardAction>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h4 className="text-muted-foreground font-display text-2xl lg:text-3xl">-</h4>
                <div className="text-muted-foreground text-sm">Sin contrato activo</div>
              </div>
              <CardAction>
                <div className="flex gap-4">
                  <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
                    <CalendarDays className="size-5" />
                  </div>
                </div>
              </CardAction>
            </>
          )}
        </CardHeader>
      </Card>
    </div>
  );
}

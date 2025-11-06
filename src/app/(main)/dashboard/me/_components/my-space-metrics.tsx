"use client";

import { Clock, CalendarDays, Hourglass } from "lucide-react";
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface MySpaceMetricsProps {
  data: MySpaceDashboard | null;
  isLoading?: boolean;
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

  // Convertir minutos a horas
  const todayHours = (timeTracking.today.workedMinutes / 60).toFixed(1);
  const todayExpectedHours = (timeTracking.today.expectedMinutes / 60).toFixed(1);
  const weekHours = (timeTracking.week.totalWorkedMinutes / 60).toFixed(1);
  const weekExpectedHours = (timeTracking.week.expectedMinutes / 60).toFixed(1);

  // Calcular porcentaje de progreso
  const todayProgress = Math.round((timeTracking.today.workedMinutes / timeTracking.today.expectedMinutes) * 100);
  const weekProgress = Math.round((timeTracking.week.totalWorkedMinutes / timeTracking.week.expectedMinutes) * 100);

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
            {todayProgress >= 100 ? "Objetivo de hoy cumplido" : "Objetivo de hoy incompleto"}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <span className={todayProgress >= 100 ? "text-green-600" : "text-orange-500"}>
                {todayHours}h de {todayExpectedHours}h
              </span>{" "}
              de tu jornada de hoy
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Horas esta semana */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {weekProgress >= 100 ? "Objetivo semanal cumplido" : "Objetivo semanal incompleto"}
          </CardTitle>
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
              <span className={weekProgress >= 100 ? "text-green-600" : "text-orange-500"}>
                {weekHours}h de {weekExpectedHours}h
              </span>{" "}
              de tu jornada semanal
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

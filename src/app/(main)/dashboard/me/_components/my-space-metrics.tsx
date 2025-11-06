"use client";

import { Clock, CalendarDays, Hourglass } from "lucide-react";
import { Bar, BarChart, Line, LineChart, LabelList } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface MySpaceMetricsProps {
  data: MySpaceDashboard | null;
  isLoading?: boolean;
}

export function MySpaceMetrics({ data, isLoading }: MySpaceMetricsProps) {
  if (isLoading) {
    return (
      <div className="gap-4 space-y-4 lg:grid lg:grid-cols-3 lg:space-y-0">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </CardContent>
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

  // Calcular porcentaje de progreso diario
  const todayProgress = Math.min(100, (timeTracking.today.workedMinutes / timeTracking.today.expectedMinutes) * 100);

  // Badge de estado de fichaje
  const statusBadge = () => {
    switch (timeTracking.today.status) {
      case "CLOCKED_IN":
        return <Badge variant="success">Trabajando</Badge>;
      case "ON_BREAK":
        return <Badge variant="info">En pausa</Badge>;
      case "CLOCKED_OUT":
        return <Badge variant="outline">Sin fichar</Badge>;
    }
  };

  // Datos para gráficas
  const todayChartData = [
    { time: "0h", hours: 0 },
    {
      time: "2h",
      hours: timeTracking.today.workedMinutes > 0 ? Math.min(2, timeTracking.today.workedMinutes / 60) : 0,
    },
    {
      time: "4h",
      hours:
        timeTracking.today.workedMinutes > 120
          ? Math.min(4, timeTracking.today.workedMinutes / 60)
          : timeTracking.today.workedMinutes / 60,
    },
    {
      time: "6h",
      hours:
        timeTracking.today.workedMinutes > 240
          ? Math.min(6, timeTracking.today.workedMinutes / 60)
          : timeTracking.today.workedMinutes / 60,
    },
    { time: "8h", hours: Math.min(8, timeTracking.today.workedMinutes / 60) },
  ];

  const weekChartData = [
    { day: "L", hours: timeTracking.week.totalWorkedMinutes > 0 ? timeTracking.week.totalWorkedMinutes / 60 / 5 : 0 },
    { day: "M", hours: timeTracking.week.totalWorkedMinutes > 0 ? timeTracking.week.totalWorkedMinutes / 60 / 5 : 0 },
    { day: "X", hours: timeTracking.week.totalWorkedMinutes > 0 ? timeTracking.week.totalWorkedMinutes / 60 / 5 : 0 },
    { day: "J", hours: timeTracking.week.totalWorkedMinutes > 0 ? timeTracking.week.totalWorkedMinutes / 60 / 5 : 0 },
    { day: "V", hours: timeTracking.week.totalWorkedMinutes > 0 ? timeTracking.week.totalWorkedMinutes / 60 / 5 : 0 },
  ];

  const ptoChartData = pto
    ? [
        { category: "Usados", days: Math.round(pto.daysUsed) },
        { category: "Disponibles", days: Math.round(pto.daysAvailable) },
      ]
    : [];

  const chartConfig = {
    hours: {
      label: "Horas",
      color: "var(--primary)",
    },
    days: {
      label: "Días",
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  return (
    <div className="gap-4 space-y-4 lg:grid lg:grid-cols-3 lg:space-y-0">
      {/* Horas trabajadas hoy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Horas hoy
          </CardTitle>
          {statusBadge()}
        </CardHeader>
        <CardContent>
          <div className="font-display text-3xl leading-6">
            {todayHours}h<span className="text-muted-foreground ml-2 text-lg font-normal">/ {todayExpectedHours}h</span>
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">{Math.round(todayProgress)}% completado</p>
          <ChartContainer className="mt-4 h-[80px] w-full" config={chartConfig}>
            <LineChart data={todayChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Line type="monotone" dataKey="hours" stroke="var(--color-hours)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Horas esta semana */}
      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <Hourglass className="h-4 w-4" />
            Horas esta semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-display text-3xl leading-6">{weekHours}h</div>
          <p className="text-muted-foreground mt-1.5 text-xs">Esperadas: {weekExpectedHours}h</p>
          <ChartContainer className="mt-4 h-[80px] w-full" config={chartConfig}>
            <BarChart data={weekChartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="hours" fill="var(--color-hours)" radius={5}>
                <LabelList position="top" offset={8} className="fill-foreground" fontSize={10} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Días de vacaciones disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4" />
            Vacaciones disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pto ? (
            <>
              <div className="font-display text-3xl leading-6">{Math.round(pto.daysAvailable)}</div>
              <p className="text-muted-foreground mt-1.5 text-xs">
                {Math.round(pto.daysUsed)} usados de {Math.round(pto.annualAllowance)}
              </p>
              <ChartContainer className="mt-4 h-[80px] w-full" config={chartConfig}>
                <BarChart data={ptoChartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="days" fill="var(--color-days)" radius={5}>
                    <LabelList position="top" offset={8} className="fill-foreground" fontSize={10} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </>
          ) : (
            <>
              <div className="text-muted-foreground font-display text-3xl leading-6">-</div>
              <p className="text-muted-foreground mt-1.5 text-xs">Sin contrato activo</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

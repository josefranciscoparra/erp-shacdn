"use client";

import { useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle, Clock, PiggyBank, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeBankStore } from "@/stores/time-bank-store";
import { useTimeCalendarStore } from "@/stores/time-calendar-store";

const ORIGIN_LABELS: Record<string, string> = {
  AUTO_DAILY: "Cálculo diario",
  AUTO_FESTIVE: "Festivo trabajado",
  AUTO_DEFICIT: "Déficit automático",
  MANUAL_ADMIN: "Ajuste RRHH",
  EMPLOYEE_REQUEST: "Solicitud del empleado",
  OVERTIME_AUTHORIZATION: "Horas extra autorizadas",
  FLEX_WINDOW: "Jornada flexible",
  CORRECTION: "Corrección de fichaje",
};

function formatMinutesLabel(minutes: number): string {
  const hours = minutes / 60;
  const prefix = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  return `${prefix}${Math.abs(hours).toFixed(1)}h`;
}

export function TimeBalanceSidebar() {
  const { monthlyData, selectedMonth, selectedYear, isLoading, loadMonthlyData } = useTimeCalendarStore();
  const {
    summary: timeBankSummary,
    isLoading: isTimeBankLoading,
    error: timeBankError,
    loadSummary: loadTimeBankSummary,
  } = useTimeBankStore();

  useEffect(() => {
    loadMonthlyData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadMonthlyData]);

  useEffect(() => {
    loadTimeBankSummary();
  }, [loadTimeBankSummary]);

  if (isLoading || !monthlyData) {
    return (
      <Card className="p-6">
        <div className="text-muted-foreground text-center text-sm">Cargando...</div>
      </Card>
    );
  }

  const { totalExpectedHours, totalWorkedHours, balance, stats } = monthlyData;
  const compliance = totalExpectedHours > 0 ? (totalWorkedHours / totalExpectedHours) * 100 : 0;
  const isPositive = balance >= 0;

  // Días problemáticos (ausentes o incompletos) - SOLO DÍAS PASADOS
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const problematicDays = monthlyData.days.filter((d) => {
    const dayDate = new Date(d.date);
    dayDate.setHours(0, 0, 0, 0);

    // Solo días pasados (no futuros) que estén ausentes o incompletos
    return dayDate < today && (d.status === "ABSENT" || d.status === "INCOMPLETE");
  });

  const hasProblematicDays = problematicDays.length > 0;

  const timeBankMinutes = timeBankSummary?.totalMinutes ?? 0;
  const maxPositiveMinutes = timeBankSummary?.limits?.maxPositiveMinutes ?? 0;
  const maxNegativeMinutes = timeBankSummary?.limits?.maxNegativeMinutes ?? 0;
  const progress = maxPositiveMinutes > 0 ? (timeBankMinutes / maxPositiveMinutes) * 100 : 0;
  const lastMovements = timeBankSummary?.lastMovements ?? [];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <PiggyBank className="size-5 text-primary" />
            <CardTitle className="text-base">Bolsa de Horas</CardTitle>
          </div>
          <div className="text-xs text-muted-foreground">
            Límite +{(maxPositiveMinutes / 60).toFixed(1)}h / -{(maxNegativeMinutes / 60).toFixed(1)}h
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTimeBankLoading && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          )}

          {!isTimeBankLoading && timeBankSummary && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Saldo actual</p>
                  <p
                    className={`text-3xl font-semibold ${
                      timeBankMinutes >= 0 ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    {formatMinutesLabel(timeBankMinutes)}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  Ventana permitida
                  <p className="text-sm font-medium text-foreground">
                    +{(maxPositiveMinutes / 60).toFixed(1)}h / -{(maxNegativeMinutes / 60).toFixed(1)}h
                  </p>
                </div>
              </div>
              <Progress value={Math.max(0, Math.min(100, progress))} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase text-muted-foreground">Solicitudes</p>
                  <p className="text-lg font-semibold">{timeBankSummary.pendingRequests}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase text-muted-foreground">Movimiento hoy</p>
                  <p
                    className={`text-lg font-semibold ${
                      (timeBankSummary.todaysMinutes ?? 0) >= 0 ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    {formatMinutesLabel(timeBankSummary.todaysMinutes ?? 0)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Últimos movimientos</p>
                {lastMovements.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Sin movimientos recientes</div>
                ) : (
                  lastMovements.slice(0, 3).map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(movement.date), "dd MMM", { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.description ?? ORIGIN_LABELS[movement.origin] ?? movement.origin}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          movement.minutes >= 0 ? "text-emerald-500" : "text-destructive"
                        }`}
                      >
                        {formatMinutesLabel(movement.minutes)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {timeBankError && !isTimeBankLoading && !timeBankSummary && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {timeBankError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de balance con gráfico circular */}
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="px-6 pt-3 pb-2">
          <ChartContainer
            config={{
              worked: {
                label: "Trabajadas",
                color: "var(--chart-2)",
              },
              pending: {
                label: "Pendientes",
                color: "var(--chart-5)",
              },
            }}
            className="mx-auto aspect-square max-h-[170px]"
          >
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={[
                  { name: "worked", value: totalWorkedHours, fill: "var(--color-worked)" },
                  {
                    name: "pending",
                    value: Math.max(0, totalExpectedHours - totalWorkedHours),
                    fill: "var(--color-pending)",
                  },
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-display text-3xl">
                            {compliance.toFixed(0)}%
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground text-xs">
                            Cumplimiento
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardContent className="flex-col items-start justify-start gap-3 border-t p-3">
          <div className="flex w-full items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-full border"
              style={{
                borderColor: "oklch(var(--chart-1) / 0.4)",
                backgroundColor: "oklch(var(--chart-1) / 0.2)",
              }}
            >
              <Calendar className="size-4" />
            </div>
            <div className="flex flex-1 flex-row justify-between">
              <div className="text-sm">Esperadas</div>
              <div className="text-muted-foreground text-sm">{totalExpectedHours.toFixed(1)}h</div>
            </div>
          </div>
          <div className="flex w-full items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-full border"
              style={{
                borderColor: "oklch(var(--chart-2) / 0.4)",
                backgroundColor: "oklch(var(--chart-2) / 0.2)",
              }}
            >
              <Clock className="size-4" />
            </div>
            <div className="flex flex-1 flex-row justify-between">
              <div className="text-sm">Trabajadas</div>
              <div className="text-muted-foreground text-sm">{totalWorkedHours.toFixed(1)}h</div>
            </div>
          </div>
          <div className="flex w-full items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-full border"
              style={{
                borderColor: isPositive ? "oklch(var(--chart-2) / 0.4)" : "oklch(var(--chart-5) / 0.4)",
                backgroundColor: isPositive ? "oklch(var(--chart-2) / 0.2)" : "oklch(var(--chart-5) / 0.2)",
              }}
            >
              {isPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            </div>
            <div className="flex flex-1 flex-row justify-between">
              <div className="text-sm">Balance</div>
              <div
                className="text-sm font-semibold"
                style={{ color: isPositive ? "oklch(var(--chart-2))" : "oklch(var(--chart-5))" }}
              >
                {isPositive ? "+" : ""}
                {balance.toFixed(1)}h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas de días */}
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumen mensual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estadísticas principales */}
          <div className="space-y-2">
            <div className="bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: "oklch(var(--chart-2))" }} />
                <span className="text-sm">Completos</span>
              </div>
              <span className="font-semibold">{stats.completedDays}</span>
            </div>

            <div className="bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" style={{ color: "oklch(var(--chart-3))" }} />
                <span className="text-sm">Incompletos</span>
              </div>
              <span className="font-semibold">{stats.incompleteDays}</span>
            </div>

            <div className="bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" style={{ color: "oklch(var(--chart-5))" }} />
                <span className="text-sm">Ausentes</span>
              </div>
              <span className="font-semibold">{stats.absentDays}</span>
            </div>
          </div>

          {/* Total de días laborables */}
          <div className="border-t pt-3">
            <div className="bg-primary/5 flex items-center justify-between rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Clock className="text-primary h-4 w-4" />
                <span className="text-sm font-medium">Total laborables</span>
              </div>
              <span className="text-primary font-bold">{stats.workdays}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Días pendientes</CardTitle>
        </CardHeader>
        {hasProblematicDays ? (
          <CardContent className="space-y-2">
            {problematicDays.slice(0, 4).map((day) => (
              <div
                key={format(day.date, "yyyy-MM-dd")}
                className="bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {day.status === "ABSENT" ? (
                    <XCircle className="h-4 w-4" style={{ color: "oklch(var(--chart-5))" }} />
                  ) : (
                    <AlertCircle className="h-4 w-4" style={{ color: "oklch(var(--chart-3))" }} />
                  )}
                  <span className="text-sm font-medium">{format(day.date, "dd MMM", { locale: es })}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {day.status === "ABSENT" ? "Sin fichaje" : `${day.workedHours.toFixed(1)}h`}
                </span>
              </div>
            ))}

            {problematicDays.length > 4 && (
              <p className="text-muted-foreground pt-1 text-center text-xs">+{problematicDays.length - 4} más</p>
            )}
          </CardContent>
        ) : (
          <CardContent className="text-muted-foreground flex h-full items-center justify-center text-sm">
            No hay días pendientes
          </CardContent>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle, Clock, TrendingDown, TrendingUp, XCircle, Loader2 } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useTimeBankStore } from "@/stores/time-bank-store";
import { useTimeCalendarStore } from "@/stores/time-calendar-store";

interface TimeBalanceSidebarProps {
  variant?: "horizontal" | "vertical";
}

export function TimeBalanceSidebar({ variant = "horizontal" }: TimeBalanceSidebarProps) {
  const { monthlyData, isLoading } = useTimeCalendarStore();
  const { loadSummary: loadTimeBankSummary } = useTimeBankStore();

  useEffect(() => {
    loadTimeBankSummary();
  }, [loadTimeBankSummary]);

  if (isLoading || !monthlyData) {
    return (
      <Card className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </Card>
    );
  }

  const { totalExpectedHours, totalWorkedHours, balance, stats } = monthlyData;
  const compliance = totalExpectedHours > 0 ? (totalWorkedHours / totalExpectedHours) * 100 : 0;
  const isPositive = balance >= 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const problematicDays = monthlyData.days.filter((d) => {
    const dayDate = new Date(d.date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate < today && (d.status === "ABSENT" || d.status === "INCOMPLETE");
  });

  const hasProblematicDays = problematicDays.length > 0;

  // Vertical layout for sidebar
  if (variant === "vertical") {
    return (
      <div className="space-y-4">
        {/* Compliance chart */}
        <Card>
          <CardContent className="p-4">
            <ChartContainer
              config={{
                worked: { label: "Trabajadas", color: "var(--chart-2)" },
                pending: { label: "Pendientes", color: "var(--chart-5)" },
              }}
              className="mx-auto aspect-square max-h-[160px]"
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
                  innerRadius={50}
                  outerRadius={65}
                  strokeWidth={4}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) - 4}
                              className="fill-foreground text-2xl font-bold"
                            >
                              {compliance.toFixed(0)}%
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 16}
                              className="fill-muted-foreground text-[10px]"
                            >
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

            {/* Stats */}
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="size-3.5" />
                  Esperadas
                </span>
                <span className="font-medium">{totalExpectedHours.toFixed(1)}h</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="size-3.5" />
                  Trabajadas
                </span>
                <span className="font-medium">{totalWorkedHours.toFixed(1)}h</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  {isPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  Balance
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {balance.toFixed(1)}h
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Resumen mensual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                Completos
              </span>
              <span className="font-semibold">{stats.completedDays}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                Incompletos
              </span>
              <span className="font-semibold">{stats.incompleteDays}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <XCircle className="size-4 text-red-600 dark:text-red-400" />
                Ausentes
              </span>
              <span className="font-semibold">{stats.absentDays}</span>
            </div>
            <div className="bg-primary/5 mt-2 flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Clock className="text-primary size-4" />
                Total laborables
              </span>
              <span className="text-primary font-bold">{stats.workdays}</span>
            </div>
          </CardContent>
        </Card>

        {/* Problematic days */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Días pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            {hasProblematicDays ? (
              <div className="space-y-2">
                {problematicDays.slice(0, 5).map((day) => (
                  <div
                    key={format(day.date, "yyyy-MM-dd")}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {day.status === "ABSENT" ? (
                        <XCircle className="size-4 text-red-500" />
                      ) : (
                        <AlertCircle className="size-4 text-amber-500" />
                      )}
                      <span className="text-sm font-medium">{format(day.date, "dd MMM", { locale: es })}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {day.status === "ABSENT" ? "Sin fichaje" : `${day.workedHours.toFixed(1)}h`}
                    </span>
                  </div>
                ))}
                {problematicDays.length > 5 && (
                  <p className="text-muted-foreground pt-1 text-center text-xs">+{problematicDays.length - 5} más</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle className="text-muted-foreground/30 mb-2 size-8" />
                <p className="text-muted-foreground text-sm">No hay días pendientes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Card de balance con gráfico circular */}
      <Card className="group hover:shadow-primary/5 transition-all duration-300 hover:shadow-lg">
        <CardContent className="px-6 pt-4 pb-2">
          <ChartContainer
            config={{
              worked: { label: "Trabajadas", color: "var(--chart-2)" },
              pending: { label: "Pendientes", color: "var(--chart-5)" },
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
                innerRadius={55}
                outerRadius={70}
                strokeWidth={4}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) - 4}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {compliance.toFixed(0)}%
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-xs">
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
        <CardContent className="space-y-3 border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-blue-500/10">
              <Calendar className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-1 justify-between">
              <span className="text-muted-foreground text-sm">Esperadas</span>
              <span className="text-sm font-medium">{totalExpectedHours.toFixed(1)}h</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10">
              <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-1 justify-between">
              <span className="text-muted-foreground text-sm">Trabajadas</span>
              <span className="text-sm font-medium">{totalWorkedHours.toFixed(1)}h</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-full",
                isPositive ? "bg-emerald-500/10" : "bg-red-500/10",
              )}
            >
              {isPositive ? (
                <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="size-4 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="flex flex-1 justify-between">
              <span className="text-muted-foreground text-sm">Balance</span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                )}
              >
                {isPositive ? "+" : ""}
                {balance.toFixed(1)}h
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas de días */}
      <Card className="group hover:shadow-primary/5 transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Resumen mensual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm">Completos</span>
            </div>
            <span className="font-semibold">{stats.completedDays}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm">Incompletos</span>
            </div>
            <span className="font-semibold">{stats.incompleteDays}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <XCircle className="size-4 text-red-600 dark:text-red-400" />
              <span className="text-sm">Ausentes</span>
            </div>
            <span className="font-semibold">{stats.absentDays}</span>
          </div>
          <div className="mt-2 border-t pt-3">
            <div className="bg-primary/5 flex items-center justify-between rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Clock className="text-primary size-4" />
                <span className="text-sm font-medium">Total laborables</span>
              </div>
              <span className="text-primary font-bold">{stats.workdays}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Días pendientes */}
      <Card className="group hover:shadow-primary/5 transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Días pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {hasProblematicDays ? (
            <div className="space-y-2">
              {problematicDays.slice(0, 4).map((day) => (
                <div
                  key={format(day.date, "yyyy-MM-dd")}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {day.status === "ABSENT" ? (
                      <XCircle className="size-4 text-red-500" />
                    ) : (
                      <AlertCircle className="size-4 text-amber-500" />
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
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-muted mb-3 rounded-full p-3">
                <CheckCircle className="text-muted-foreground size-6" />
              </div>
              <p className="text-sm font-medium">Todo al día</p>
              <p className="text-muted-foreground mt-1 text-xs">No hay días pendientes de revisión</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

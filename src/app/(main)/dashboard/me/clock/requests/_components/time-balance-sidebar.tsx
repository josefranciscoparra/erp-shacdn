"use client";

import { useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown, Calendar } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimeCalendarStore } from "@/stores/time-calendar-store";

export function TimeBalanceSidebar() {
  const { monthlyData, selectedMonth, selectedYear, isLoading, loadMonthlyData } = useTimeCalendarStore();

  useEffect(() => {
    loadMonthlyData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadMonthlyData]);

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

  return (
    <div className="space-y-4">
      {/* Cards de resumen estilo hospital-management */}
      <div className="overflow-hidden rounded-md border">
        <div className="grid divide-y">
          {/* Horas esperadas */}
          <Card className="hover:bg-muted rounded-none border-0 transition-colors">
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
              <CardTitle>Horas esperadas</CardTitle>
              <div
                className="absolute end-4 top-0 flex size-12 items-center justify-center rounded-full p-4"
                style={{ backgroundColor: "oklch(var(--chart-1) / 0.2)" }}
              >
                <Calendar className="size-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="font-display text-3xl">{totalExpectedHours.toFixed(1)}h</div>
              <p className="text-muted-foreground text-xs">Para este mes</p>
            </CardContent>
          </Card>

          {/* Horas trabajadas */}
          <Card className="hover:bg-muted rounded-none border-0 transition-colors">
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
              <CardTitle>Horas trabajadas</CardTitle>
              <div
                className="absolute end-4 top-0 flex size-12 items-center justify-center rounded-full p-4"
                style={{ backgroundColor: "oklch(var(--chart-2) / 0.2)" }}
              >
                <Clock className="size-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="font-display text-3xl">{totalWorkedHours.toFixed(1)}h</div>
              <p className="text-muted-foreground text-xs">
                <span style={{ color: compliance >= 100 ? "oklch(var(--chart-2))" : "oklch(var(--chart-5))" }}>
                  {compliance.toFixed(1)}%
                </span>{" "}
                de cumplimiento
              </p>
            </CardContent>
          </Card>

          {/* Balance */}
          <Card className="hover:bg-muted rounded-none border-0 transition-colors">
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
              <CardTitle>Balance</CardTitle>
              <div
                className="absolute end-4 top-0 flex size-12 items-center justify-center rounded-full p-4"
                style={{
                  backgroundColor: isPositive
                    ? "oklch(var(--chart-2) / 0.2)"
                    : "oklch(var(--chart-5) / 0.2)",
                }}
              >
                {isPositive ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div
                className="font-display text-3xl"
                style={{ color: isPositive ? "oklch(var(--chart-2))" : "oklch(var(--chart-5))" }}
              >
                {isPositive ? "+" : ""}
                {balance.toFixed(1)}h
              </div>
              <p className="text-muted-foreground text-xs">
                {isPositive ? "Horas trabajadas de más" : "Horas faltantes"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Estadísticas de días */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Días laborables</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" style={{ color: "oklch(var(--chart-2))" }} />
              <span className="text-sm">Completos</span>
            </div>
            <span className="font-medium">{stats.completedDays}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" style={{ color: "oklch(var(--chart-3))" }} />
              <span className="text-sm">Incompletos</span>
            </div>
            <span className="font-medium">{stats.incompleteDays}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" style={{ color: "oklch(var(--chart-5))" }} />
              <span className="text-sm">Ausentes</span>
            </div>
            <span className="font-medium">{stats.absentDays}</span>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-primary h-4 w-4" />
                <span className="text-sm font-medium">Total días laborables</span>
              </div>
              <span className="font-semibold">{stats.workdays}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Días problemáticos */}
      {problematicDays.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Días pendientes</h3>

          <div className="space-y-2">
            {problematicDays.slice(0, 5).map((day) => (
              <div
                key={format(day.date, "yyyy-MM-dd")}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div className="flex items-center gap-2">
                  {day.status === "ABSENT" ? (
                    <XCircle className="h-3 w-3" style={{ color: "oklch(var(--chart-5))" }} />
                  ) : (
                    <AlertCircle className="h-3 w-3" style={{ color: "oklch(var(--chart-3))" }} />
                  )}
                  <span className="text-sm">{format(day.date, "dd MMM", { locale: es })}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {day.status === "ABSENT" ? "Sin fichaje" : `${day.workedHours.toFixed(1)}h`}
                </span>
              </div>
            ))}

            {problematicDays.length > 5 && (
              <p className="text-muted-foreground text-center text-xs">+{problematicDays.length - 5} más</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

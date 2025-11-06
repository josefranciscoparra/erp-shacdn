"use client";

import { useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown, Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
      {/* Estadísticas de días - Card unificada */}
      <Card>
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

          {/* Días pendientes */}
          {problematicDays.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <h4 className="text-sm font-semibold">Días pendientes</h4>
              <div className="space-y-2">
                {problematicDays.slice(0, 3).map((day) => (
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

                {problematicDays.length > 3 && (
                  <p className="text-muted-foreground pt-1 text-center text-xs">+{problematicDays.length - 3} más</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de balance - Estilo website-analytics */}
      <div className="grid gap-3">
        {/* Horas esperadas */}
        <Card className="hover:bg-muted/50 p-4 transition-colors">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground text-sm font-medium">Horas esperadas</dt>
              <Calendar className="text-muted-foreground size-4" />
            </div>
            <dd className="text-foreground font-display mt-2 text-2xl font-semibold">
              {totalExpectedHours.toFixed(1)}h
            </dd>
          </CardContent>
        </Card>

        {/* Horas trabajadas */}
        <Card className="hover:bg-muted/50 p-4 transition-colors">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground text-sm font-medium">Horas trabajadas</dt>
              <Badge
                variant="outline"
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 ps-2.5 text-xs font-medium",
                  compliance >= 100
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
                )}
              >
                {compliance >= 100 ? (
                  <TrendingUp className="mr-0.5 -ml-1 h-4 w-4 shrink-0 self-center text-green-500" />
                ) : (
                  <Clock className="mr-0.5 -ml-1 h-4 w-4 shrink-0 self-center text-orange-500" />
                )}
                <span className="sr-only">{compliance >= 100 ? "Cumplimiento completo" : "Cumplimiento parcial"}</span>
                {compliance.toFixed(1)}%
              </Badge>
            </div>
            <dd className="text-foreground font-display mt-2 text-2xl font-semibold">{totalWorkedHours.toFixed(1)}h</dd>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className="hover:bg-muted/50 p-4 transition-colors">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground text-sm font-medium">Balance</dt>
              <Badge
                variant="outline"
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 ps-2.5 text-xs font-medium",
                  isPositive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="mr-0.5 -ml-1 h-4 w-4 shrink-0 self-center text-green-500" />
                ) : (
                  <TrendingDown className="mr-0.5 -ml-1 h-4 w-4 shrink-0 self-center text-red-500" />
                )}
                <span className="sr-only">{isPositive ? "Superávit" : "Déficit"}</span>
                {isPositive ? "+" : ""}
                {Math.abs(balance).toFixed(1)}h
              </Badge>
            </div>
            <dd
              className="font-display mt-2 text-2xl font-semibold"
              style={{ color: isPositive ? "oklch(var(--chart-2))" : "oklch(var(--chart-5))" }}
            >
              {isPositive ? "+" : ""}
              {balance.toFixed(1)}h
            </dd>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

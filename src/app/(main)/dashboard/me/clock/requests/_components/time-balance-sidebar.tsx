"use client";

import { useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
      {/* Resumen general */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Resumen del mes</h3>

        <div className="space-y-4">
          {/* Horas esperadas */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Horas esperadas</span>
              <span className="text-lg font-semibold">{totalExpectedHours.toFixed(1)}h</span>
            </div>
          </div>

          {/* Horas trabajadas */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Horas trabajadas</span>
              <span className="text-lg font-semibold">{totalWorkedHours.toFixed(1)}h</span>
            </div>
          </div>

          {/* Balance */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Balance</span>
              <span className={cn("text-xl font-bold", isPositive ? "text-green-600" : "text-red-600")}>
                {isPositive ? "+" : ""}
                {balance.toFixed(1)}h
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {isPositive ? "Horas trabajadas de más" : "Horas faltantes"}
            </p>
          </div>

          {/* Progreso */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Cumplimiento</span>
              <span className="text-sm font-medium">{compliance.toFixed(1)}%</span>
            </div>
            <Progress value={compliance} className="h-2" />
          </div>
        </div>
      </Card>

      {/* Estadísticas de días */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Días laborables</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Completos</span>
            </div>
            <span className="font-medium">{stats.completedDays}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">Incompletos</span>
            </div>
            <span className="font-medium">{stats.incompleteDays}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm">Ausentes</span>
            </div>
            <span className="font-medium">{stats.absentDays}</span>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
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
                    <XCircle className="h-3 w-3 text-red-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-yellow-600" />
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

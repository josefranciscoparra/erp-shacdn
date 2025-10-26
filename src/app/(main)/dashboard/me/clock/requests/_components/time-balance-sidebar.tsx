"use client";

import { useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTimeCalendarStore } from "@/stores/time-calendar-store";

export function TimeBalanceSidebar() {
  const { monthlyData, isLoading } = useTimeCalendarStore();

  if (isLoading || !monthlyData) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <Skeleton className="h-6 w-3/4" />
          <div className="mt-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-1/2" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  const { totalExpectedHours, totalWorkedHours, balance, stats } = monthlyData;
  const isPositive = balance >= 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Balance del mes</h3>
        <div className="flex items-center justify-center gap-4 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/30">
          <div className={cn("text-4xl font-bold", isPositive ? "text-green-600" : "text-red-600")}>
            {isPositive ? "+" : ""}
            {balance.toFixed(2)}h
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-1 rounded-lg border p-3">
            <span className="text-muted-foreground text-xs">Esperadas</span>
            <span className="font-semibold">{totalExpectedHours.toFixed(2)}h</span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border p-3">
            <span className="text-muted-foreground text-xs">Trabajadas</span>
            <span className="font-semibold">{totalWorkedHours.toFixed(2)}h</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Estadísticas</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Completos</span>
            </div>
            <span className="font-medium">{stats.completedDays}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Incompletos</span>
            </div>
            <span className="font-medium">{stats.incompleteDays}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Ausentes</span>
            </div>
            <span className="font-medium">{stats.absentDays}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between font-medium">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>Días laborables</span>
              </div>
              <span>{stats.workdays}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

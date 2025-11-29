"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowRight, Loader2, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTimeBankStore } from "@/stores/time-bank-store";

function formatMinutesLabel(minutes: number): string {
  const hours = minutes / 60;
  const prefix = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  return `${prefix}${Math.abs(hours).toFixed(1)}h`;
}

export function TimeBankWidget() {
  const { summary, isLoading, error, loadSummary } = useTimeBankStore();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      loadSummary();
      setHasLoaded(true);
    }
  }, [hasLoaded, loadSummary]);

  if (error) {
    return null; // No mostrar widget si hay error
  }

  const totalMinutes = summary?.totalMinutes ?? 0;
  const maxPositive = summary?.limits?.maxPositiveMinutes ?? 4800;
  const maxNegative = summary?.limits?.maxNegativeMinutes ?? 480;
  const pendingRequests = summary?.pendingRequests ?? 0;

  // Calcular progreso como porcentaje del máximo permitido
  const progress =
    totalMinutes >= 0 ? (totalMinutes / maxPositive) * 100 : (Math.abs(totalMinutes) / maxNegative) * 100;
  const isPositive = totalMinutes >= 0;
  const isNearLimit = progress >= 80;

  return (
    <Card className="from-primary/5 to-card col-span-full bg-gradient-to-t shadow-xs @xl/main:col-span-1">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full",
                isPositive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30",
              )}
            >
              <PiggyBank className={cn("size-5", isPositive ? "text-emerald-600" : "text-red-600")} />
            </div>

            <div>
              <p className="text-muted-foreground text-xs font-medium">Bolsa de Horas</p>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">Cargando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xl font-bold",
                      isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {formatMinutesLabel(totalMinutes)}
                  </span>
                  {isPositive ? (
                    <TrendingUp className="size-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="size-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          <Link href="/dashboard/me/time-bank">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Ver más
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>

        {!isLoading && (
          <div className="mt-3 space-y-2">
            <Progress
              value={Math.min(100, Math.abs(progress))}
              className={cn("h-1.5", !isPositive && "[&>div]:bg-red-500")}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {isPositive
                  ? `Límite: +${(maxPositive / 60).toFixed(0)}h`
                  : `Límite: -${(maxNegative / 60).toFixed(0)}h`}
              </span>
              {pendingRequests > 0 && (
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {pendingRequests} solicitud{pendingRequests > 1 ? "es" : ""} pendiente{pendingRequests > 1 ? "s" : ""}
                </span>
              )}
              {isNearLimit && pendingRequests === 0 && (
                <span className="font-medium text-amber-600 dark:text-amber-400">Cerca del límite</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

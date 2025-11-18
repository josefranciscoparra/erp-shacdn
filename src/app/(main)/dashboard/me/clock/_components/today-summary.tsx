"use client";

import { memo, useCallback, useEffect, useState } from "react";

import { CheckCircle2, Clock, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDuration } from "@/lib/schedule-helpers";
import { getTodaySummary } from "@/server/actions/employee-schedule";

interface TodaySummaryData {
  expectedMinutes: number | null;
  workedMinutes: number;
  deviationMinutes: number | null;
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE";
  hasFinished: boolean;
}

function TodaySummaryComponent() {
  const [summary, setSummary] = useState<TodaySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getTodaySummary();

      console.log("[TodaySummary] Result:", result);

      if (result.success && result.summary) {
        console.log("[TodaySummary] Summary loaded:", result.summary);
        setSummary(result.summary);
      } else {
        console.log("[TodaySummary] Error:", result.error);
        setError(result.error ?? "Error al cargar resumen");
      }
    } catch (err) {
      setError("Error al cargar resumen");
      console.error("[TodaySummary] Exception:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Resumen del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="bg-muted relative h-24 w-full overflow-hidden rounded-lg">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error ?? !summary) {
    console.log("[TodaySummary] Hidden - error or no summary:", { error, summary });
    return null; // No mostrar nada si hay error
  }

  // Si no ha fichado hoy, no mostrar nada
  if (summary.workedMinutes === 0) {
    console.log("[TodaySummary] Hidden - no worked minutes");
    return null;
  }

  // Si no tiene horario esperado, no mostrar
  if (summary.expectedMinutes === null) {
    console.log("[TodaySummary] Hidden - no expected minutes");
    return null;
  }

  console.log("[TodaySummary] Showing card with:", summary);

  const deviation = summary.deviationMinutes ?? 0;
  const isPositive = deviation > 0;
  const isNegative = deviation < 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Resumen del Día
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Estado */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Estado:</span>
            <Badge
              variant={
                summary.status === "COMPLETED"
                  ? "default"
                  : summary.status === "INCOMPLETE"
                    ? "destructive"
                    : "secondary"
              }
            >
              {summary.status === "COMPLETED" && (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Completado
                </>
              )}
              {summary.status === "INCOMPLETE" && "Incompleto"}
              {summary.status === "IN_PROGRESS" && "En progreso"}
            </Badge>
          </div>

          <Separator />

          {/* Comparativa */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Horas esperadas:</span>
              <span className="font-medium">{formatDuration(summary.expectedMinutes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Horas trabajadas:</span>
              <span className="font-medium">{formatDuration(summary.workedMinutes)}</span>
            </div>
          </div>

          <Separator />

          {/* Desviación */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              {isPositive && <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />}
              {isNegative && <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />}
              <span className="text-sm font-medium">Desviación:</span>
            </div>
            <Badge
              variant="outline"
              className={
                isPositive
                  ? "border-green-200 bg-green-50/50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400"
                  : isNegative
                    ? "border-red-200 bg-red-50/50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                    : ""
              }
            >
              {isPositive && "+"}
              {formatDuration(Math.abs(deviation))}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Memoizar el componente para evitar re-renders innecesarios cuando el padre se actualiza
export const TodaySummary = memo(TodaySummaryComponent);

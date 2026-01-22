"use client";

import { memo, useCallback, useEffect, useState } from "react";

import { AlertTriangle, CheckCircle2, Clock, TrendingDown, TrendingUp, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getTodaySummary } from "@/server/actions/employee-schedule";
import { formatDuration } from "@/services/schedules";

interface TodaySummaryData {
  expectedMinutes: number | null;
  workedMinutes: number;
  deviationMinutes: number | null;
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE";
  hasFinished: boolean;
  validationWarnings: string[];
  validationErrors: string[];
  overtime?: {
    calcStatus: string | null;
    candidateStatus: string | null;
    candidateMinutes: number | null;
    candidateType: string | null;
    requiresApproval: boolean;
    compensationType: string | null;
  };
}

/**
 * Formatea los mensajes de validación reemplazando "X minutos" con formato legible
 * Ejemplo: "383 minutos de retraso" → "6h 23min de retraso"
 */
function formatValidationMessage(message: string): string {
  return message.replace(/(\d+) minutos/g, (_, minutes) => {
    return formatDuration(parseInt(minutes, 10));
  });
}

function TodaySummaryComponent() {
  const [summary, setSummary] = useState<TodaySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getTodaySummary();

      if (result.success && result.summary) {
        setSummary(result.summary);
      } else {
        setError(result.error ?? "Error al cargar resumen");
      }
    } catch (err) {
      setError("Error al cargar resumen");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!summary?.overtime?.calcStatus) return;
    if (summary.overtime.calcStatus === "DIRTY" || summary.overtime.calcStatus === "CALCULATING") {
      const timeout = setTimeout(() => {
        loadSummary();
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [summary, loadSummary]);

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
    return null; // No mostrar nada si hay error
  }

  // Si no ha fichado hoy, no mostrar nada
  if (summary.workedMinutes === 0) {
    return null;
  }

  // Si no tiene horario esperado, no mostrar
  if (summary.expectedMinutes === null) {
    return null;
  }

  const deviation = summary.deviationMinutes ?? 0;
  const isPositive = deviation > 0;
  const isNegative = deviation < 0;
  const overtime = summary.overtime;
  const overtimeMinutes = overtime ? (overtime.candidateMinutes ?? 0) : 0;
  const overtimeHasData = overtime && overtimeMinutes !== 0;

  const overtimeBadge = (() => {
    if (!overtime) {
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Sin datos
        </Badge>
      );
    }

    if (overtime.calcStatus === "DIRTY" || overtime.calcStatus === "CALCULATING") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Calculando...
        </Badge>
      );
    }

    if (overtime.candidateStatus === "PENDING_APPROVAL") {
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50/50 text-amber-700">
          Pendiente de aprobación
        </Badge>
      );
    }

    if (overtime.candidateStatus === "REJECTED") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Rechazado
        </Badge>
      );
    }

    if (!overtimeHasData || overtime.candidateStatus === "SKIPPED") {
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Sin exceso
        </Badge>
      );
    }

    const label =
      overtime.candidateType === "DEFICIT"
        ? "Déficit"
        : overtime.candidateType === "COMPLEMENTARY"
          ? "Complementarias"
          : overtime.candidateType === "NON_WORKDAY"
            ? "No laborable"
            : "Extra";

    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
      >
        {label} · {formatDuration(Math.abs(overtimeMinutes))}
      </Badge>
    );
  })();

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

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Horas extra:</span>
            {overtimeBadge}
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
              <span className="font-medium">{formatDuration(Math.round(summary.workedMinutes))}</span>
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
              {formatDuration(Math.round(Math.abs(deviation)))}
            </Badge>
          </div>

          {/* Validaciones */}
          {(summary.validationWarnings.length > 0 || summary.validationErrors.length > 0) && (
            <>
              <Separator />
              <div className="space-y-2">
                {summary.validationErrors.map((error, index) => (
                  <div
                    key={`error-${index}`}
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900 dark:bg-red-950/30"
                  >
                    <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <span className="text-xs text-red-700 dark:text-red-300">{formatValidationMessage(error)}</span>
                  </div>
                ))}
                {summary.validationWarnings.map((warning, index) => (
                  <div
                    key={`warning-${index}`}
                    className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-900 dark:bg-amber-950/30"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      {formatValidationMessage(warning)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Memoizar el componente para evitar re-renders innecesarios cuando el padre se actualiza
export const TodaySummary = memo(TodaySummaryComponent);

/**
 * Hero Card Compacta del Dashboard (Rediseño v3 - Factorial Style)
 *
 * Single hero card con KPI principal + métricas secundarias
 * Diseño limpio, storytelling visual, altura consistente con dashboard principal
 */

"use client";

import { AlertCircle, Calendar, Clock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { MockStats } from "../_lib/dashboard-mock-data";

interface DashboardStatsCardsProps {
  stats: MockStats;
  isLoading?: boolean;
}

export function DashboardStatsCardsV2({ stats, isLoading }: DashboardStatsCardsProps) {
  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-24" />
          <Skeleton className="mt-4 h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const coverageStatus = stats.coverage >= 80 ? "Adecuada" : stats.coverage >= 60 ? "Moderada" : "Insuficiente";
  const hasCriticalIssues = stats.conflictShifts > 0 || stats.coverage < 70 || stats.employeesWithoutShifts > 5;

  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">Estado de Cobertura (Semana Actual)</CardTitle>
          <CardDescription className="text-xs">Resumen de turnos y asignaciones</CardDescription>
        </div>
        {hasCriticalIssues && (
          <Badge
            variant="outline"
            className="gap-1 border-orange-200 bg-orange-50/30 text-xs text-orange-700/80 dark:border-orange-800/30 dark:bg-orange-950/10 dark:text-orange-300/70"
          >
            <AlertCircle className="size-3" />
            Requiere atención
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {/* KPI Principal */}
        <div className="mb-4 flex items-baseline gap-2">
          <div className="font-display text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.coverage}%
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              stats.coverage >= 80 &&
                "border-orange-200 bg-orange-50/30 text-orange-700/80 dark:border-orange-800/30 dark:bg-orange-950/10 dark:text-orange-300/70",
              stats.coverage >= 70 &&
                stats.coverage < 80 &&
                "border-orange-200 bg-orange-50/30 text-orange-700/80 dark:border-orange-800/30 dark:bg-orange-950/10 dark:text-orange-300/70",
              stats.coverage < 70 &&
                "border-orange-200 bg-orange-50/30 text-orange-700/80 dark:border-orange-800/30 dark:bg-orange-950/10 dark:text-orange-300/70",
            )}
          >
            {coverageStatus}
          </Badge>
        </div>

        {/* Métricas Secundarias */}
        <div className="grid gap-3 @lg/card:grid-cols-3">
          {/* Turnos asignados */}
          <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
            <div className="bg-primary/10 rounded-full p-2">
              <Calendar className="text-primary size-4" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold tabular-nums">{stats.totalShifts}</p>
              <p className="text-muted-foreground text-xs">turnos asignados</p>
              {stats.conflictShifts > 0 && (
                <Badge
                  variant="outline"
                  className="mt-1 border-orange-200 bg-orange-50/30 text-xs text-orange-700/80 dark:border-orange-800/30 dark:bg-orange-950/10 dark:text-orange-300/70"
                >
                  {stats.conflictShifts} {stats.conflictShifts === 1 ? "conflicto" : "conflictos"}
                </Badge>
              )}
            </div>
          </div>

          {/* Empleados sin turno */}
          <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
            <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
              <Users className="size-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold tabular-nums">{stats.employeesWithoutShifts}</p>
              <p className="text-muted-foreground text-xs">sin turnos</p>
              <p className="text-muted-foreground text-xs">
                {stats.totalEmployees - stats.employeesWithoutShifts}/{stats.totalEmployees} asignados
              </p>
            </div>
          </div>

          {/* Horas asignadas */}
          <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
            <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
              <Clock className="size-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold tabular-nums">{stats.hoursAssigned}h</p>
              <p className="text-muted-foreground text-xs">horas asignadas</p>
              <p className="text-muted-foreground text-xs">
                de {stats.hoursContracted}h (
                {stats.hoursContracted > 0 ? Math.round((stats.hoursAssigned / stats.hoursContracted) * 100) : 0}
                %)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

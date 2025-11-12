"use client";

import { useEffect, useState } from "react";

import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, TrendingUp, AlertTriangle, CheckCircle2, Users } from "lucide-react";

import { CoverageHeatmap } from "@/components/shifts/coverage-heatmap";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useShiftCoverageStore } from "@/stores/shift-coverage-store";

import { UnderstaffedShiftsList } from "./understaffed-shifts-list";

export function CoverageAnalysis() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const {
    weekAnalysis,
    stats,
    heatmap,
    understaffedShifts,
    isLoading,
    fetchWeekAnalysis,
    fetchStats,
    fetchHeatmap,
    fetchUnderstaffedShifts,
  } = useShiftCoverageStore();

  useEffect(() => {
    // Cargar datos de la semana actual
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    fetchWeekAnalysis(currentWeekStart);
    fetchStats(currentWeekStart, weekEnd);
    fetchHeatmap(currentWeekStart);
    fetchUnderstaffedShifts(currentWeekStart, weekEnd);
  }, [currentWeekStart, fetchWeekAnalysis, fetchStats, fetchHeatmap, fetchUnderstaffedShifts]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis de Cobertura</h1>
          <p className="text-muted-foreground">Visualiza y analiza la cobertura de turnos por día y hora</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Semana del {format(currentWeekStart, "d 'de' MMMM yyyy", { locale: es })}
        </h2>
        {weekAnalysis && (
          <Badge variant={weekAnalysis.averageCoverage >= 80 ? "default" : "destructive"}>
            {weekAnalysis.averageCoverage.toFixed(0)}% Cobertura Media
          </Badge>
        )}
      </div>

      {/* Stats cards */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:gap-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
          <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Turnos</CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalShifts ?? 0}</div>
              <p className="text-muted-foreground text-xs">{stats?.publishedShifts ?? 0} publicados</p>
            </CardContent>
          </Card>

          <Card className="to-card bg-gradient-to-t from-green-500/5 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalmente Cubiertos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.fullyStaffedShifts ?? 0}</div>
              <p className="text-muted-foreground text-xs">
                {stats?.totalShifts ? (((stats.fullyStaffedShifts ?? 0) / stats.totalShifts) * 100).toFixed(0) : 0}% del
                total
              </p>
            </CardContent>
          </Card>

          <Card className="to-card bg-gradient-to-t from-amber-500/5 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Déficit</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.partiallyStaffedShifts ?? 0) + (stats?.unstaffedShifts ?? 0)}
              </div>
              <p className="text-muted-foreground text-xs">Requieren asignación</p>
            </CardContent>
          </Card>

          <Card className="to-card bg-gradient-to-t from-blue-500/5 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posiciones Cubiertas</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalPositionsFilled ?? 0} / {stats?.totalPositionsRequired ?? 0}
              </div>
              <p className="text-muted-foreground text-xs">
                {stats?.averageStaffingPercentage.toFixed(0) ?? 0}% del total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical alerts */}
      {weekAnalysis && weekAnalysis.criticalDays.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Días con cobertura crítica (&lt;80%)</AlertTitle>
          <AlertDescription>
            Los siguientes días tienen cobertura insuficiente: <strong>{weekAnalysis.criticalDays.join(", ")}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Optimal days */}
      {weekAnalysis && weekAnalysis.optimalDays.length > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Días con cobertura óptima (100%+)</AlertTitle>
          <AlertDescription>
            Los siguientes días tienen cobertura completa: <strong>{weekAnalysis.optimalDays.join(", ")}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Heatmap */}
      {heatmap && <CoverageHeatmap days={heatmap.days} hours={heatmap.hours} data={heatmap.data} />}

      {/* Understaffed shifts */}
      {understaffedShifts.length > 0 && <UnderstaffedShiftsList shifts={understaffedShifts} />}

      {understaffedShifts.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
              <p className="text-muted-foreground mt-2 text-sm">¡Todos los turnos están completamente cubiertos!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

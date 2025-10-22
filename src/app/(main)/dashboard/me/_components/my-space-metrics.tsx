"use client";

import { Clock, Calendar, CalendarDays, Hourglass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface MySpaceMetricsProps {
  data: MySpaceDashboard | null;
  isLoading?: boolean;
}

export function MySpaceMetrics({ data, isLoading }: MySpaceMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="flex flex-col gap-2 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-xs dark:from-blue-950/20 dark:to-blue-900/10"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-sm font-medium">No se pudieron cargar las métricas</p>
      </Card>
    );
  }

  const { timeTracking, pto } = data;

  // Convertir minutos a horas
  const todayHours = (timeTracking.today.workedMinutes / 60).toFixed(1);
  const todayExpectedHours = (timeTracking.today.expectedMinutes / 60).toFixed(1);
  const weekHours = (timeTracking.week.totalWorkedMinutes / 60).toFixed(1);
  const weekExpectedHours = (timeTracking.week.expectedMinutes / 60).toFixed(1);

  // Calcular porcentaje de progreso diario
  const todayProgress = Math.min(100, (timeTracking.today.workedMinutes / timeTracking.today.expectedMinutes) * 100);

  // Badge de estado de fichaje
  const statusBadge = () => {
    switch (timeTracking.today.status) {
      case "CLOCKED_IN":
        return (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
          >
            Trabajando
          </Badge>
        );
      case "ON_BREAK":
        return (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
          >
            En pausa
          </Badge>
        );
      case "CLOCKED_OUT":
        return (
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400"
          >
            Sin fichar
          </Badge>
        );
    }
  };

  return (
    <div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
      {/* Horas trabajadas hoy */}
      <Card className="flex flex-col gap-2 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-xs transition-shadow duration-300 hover:shadow-md dark:from-blue-950/20 dark:to-blue-900/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
            <Clock className="h-4 w-4" />
            Horas hoy
          </div>
          {statusBadge()}
        </div>
        <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
          {todayHours}h<span className="text-muted-foreground ml-2 text-lg font-normal">/ {todayExpectedHours}h</span>
        </div>
        <div className="space-y-1.5">
          <Progress value={todayProgress} className="h-1.5 bg-blue-100 dark:bg-blue-950/50" />
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70">{Math.round(todayProgress)}% completado</div>
        </div>
      </Card>

      {/* Horas esta semana */}
      <Card className="flex flex-col gap-2 bg-gradient-to-br from-green-50 to-green-100/50 p-6 shadow-xs transition-shadow duration-300 hover:shadow-md dark:from-green-950/20 dark:to-green-900/10">
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <Hourglass className="h-4 w-4" />
          Horas esta semana
        </div>
        <div className="text-3xl font-bold text-green-900 dark:text-green-100">{weekHours}h</div>
        <div className="text-xs text-green-600/70 dark:text-green-400/70">Esperadas: {weekExpectedHours}h</div>
      </Card>

      {/* Días de vacaciones disponibles */}
      <Card className="flex flex-col gap-2 bg-gradient-to-br from-amber-50 to-amber-100/50 p-6 shadow-xs transition-shadow duration-300 hover:shadow-md dark:from-amber-950/20 dark:to-amber-900/10">
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <CalendarDays className="h-4 w-4" />
          Vacaciones disponibles
        </div>
        {pto ? (
          <>
            <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">{Math.round(pto.daysAvailable)}</div>
            <div className="text-xs text-amber-600/70 dark:text-amber-400/70">
              {Math.round(pto.daysUsed)} usados de {Math.round(pto.annualAllowance)}
            </div>
          </>
        ) : (
          <>
            <div className="text-muted-foreground text-3xl font-bold">-</div>
            <div className="text-muted-foreground text-xs">Sin contrato activo</div>
          </>
        )}
      </Card>

      {/* Próximos eventos */}
      <Card className="flex flex-col gap-2 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 shadow-xs transition-shadow duration-300 hover:shadow-md dark:from-purple-950/20 dark:to-purple-900/10">
        <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400">
          <Calendar className="h-4 w-4" />
          Próximos eventos
        </div>
        <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{data.upcomingEvents.length}</div>
        <div className="text-xs text-purple-600/70 dark:text-purple-400/70">
          {data.upcomingEvents.length > 0
            ? `Próximo: ${new Date(data.upcomingEvents[0].date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
            : "Sin eventos próximos"}
        </div>
      </Card>
    </div>
  );
}

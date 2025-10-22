"use client";

import { Clock, Calendar, CalendarDays, Hourglass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface MySpaceMetricsProps {
  data: MySpaceDashboard | null;
  isLoading?: boolean;
}

export function MySpaceMetrics({ data, isLoading }: MySpaceMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="from-primary/5 to-card flex flex-col gap-3 bg-gradient-to-t p-5 shadow-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2 w-full" />
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
    <div className="grid gap-4 md:gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      {/* Horas trabajadas hoy */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="group dark:via-card relative overflow-hidden border-slate-200/50 bg-gradient-to-br from-slate-50 via-white to-slate-50/30 p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:border-slate-800/30 dark:from-slate-950/30 dark:to-slate-950/10">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-slate-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 transition-colors group-hover:bg-slate-500/15">
                      <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-400">Horas hoy</span>
                  </div>
                  {statusBadge()}
                </div>
                <div className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {todayHours}h
                  <span className="text-muted-foreground ml-2 text-lg font-normal">/ {todayExpectedHours}h</span>
                </div>
                <div className="space-y-1.5">
                  <Progress value={todayProgress} className="h-1.5 bg-slate-100 dark:bg-slate-950/50" />
                  <div className="text-xs font-medium text-slate-600/70 dark:text-slate-400/70">
                    {Math.round(todayProgress)}% completado
                  </div>
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tiempo trabajado hoy vs. jornada esperada</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Horas esta semana */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="group dark:via-card relative overflow-hidden border-indigo-200/50 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/30 p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:border-indigo-900/30 dark:from-indigo-950/30 dark:to-indigo-950/10">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-indigo-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 transition-colors group-hover:bg-indigo-500/15">
                    <Hourglass className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Horas esta semana</span>
                </div>
                <div className="mb-1 text-3xl font-bold tracking-tight text-indigo-900 dark:text-indigo-100">
                  {weekHours}h
                </div>
                <div className="text-xs font-medium text-indigo-600/70 dark:text-indigo-400/70">
                  Esperadas: {weekExpectedHours}h
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total de horas trabajadas en la semana actual</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Días de vacaciones disponibles */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="group dark:via-card relative overflow-hidden border-violet-200/50 bg-gradient-to-br from-violet-50 via-white to-violet-50/30 p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:border-violet-900/30 dark:from-violet-950/30 dark:to-violet-950/10">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-violet-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 transition-colors group-hover:bg-violet-500/15">
                    <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-sm font-medium text-violet-700 dark:text-violet-400">
                    Vacaciones disponibles
                  </span>
                </div>
                {pto ? (
                  <>
                    <div className="mb-1 text-3xl font-bold tracking-tight text-violet-900 dark:text-violet-100">
                      {Math.round(pto.daysAvailable)}
                    </div>
                    <div className="text-xs font-medium text-violet-600/70 dark:text-violet-400/70">
                      {Math.round(pto.daysUsed)} usados de {Math.round(pto.annualAllowance)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-muted-foreground mb-1 text-3xl font-bold">-</div>
                    <div className="text-muted-foreground text-xs">Sin contrato activo</div>
                  </>
                )}
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Días de vacaciones que puedes solicitar ahora</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Próximos eventos */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="group dark:via-card relative overflow-hidden border-sky-200/50 bg-gradient-to-br from-sky-50 via-white to-sky-50/30 p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:border-sky-900/30 dark:from-sky-950/30 dark:to-sky-950/10">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-sky-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 transition-colors group-hover:bg-sky-500/15">
                    <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <span className="text-sm font-medium text-sky-700 dark:text-sky-400">Próximos eventos</span>
                </div>
                <div className="mb-1 text-3xl font-bold tracking-tight text-sky-900 dark:text-sky-100">
                  {data.upcomingEvents.length}
                </div>
                <div className="text-xs font-medium text-sky-600/70 dark:text-sky-400/70">
                  {data.upcomingEvents.length > 0
                    ? `Próximo: ${new Date(data.upcomingEvents[0].date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
                    : "Sin eventos próximos"}
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Eventos próximos en tu calendario</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

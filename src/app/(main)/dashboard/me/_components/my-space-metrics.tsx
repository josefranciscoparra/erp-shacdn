"use client";

import { Clock, Calendar, CalendarDays, TrendingUp, Hourglass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface MySpaceMetricsProps {
  data: MySpaceDashboard | null;
  isLoading?: boolean;
}

export function MySpaceMetrics({ data, isLoading }: MySpaceMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
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
          <Badge variant="outline" className="border-green-500 text-green-600">
            Trabajando
          </Badge>
        );
      case "ON_BREAK":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            En pausa
          </Badge>
        );
      case "CLOCKED_OUT":
        return <Badge variant="outline">Sin fichar</Badge>;
    }
  };

  return (
    <div className="grid gap-4 md:gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
      {/* Horas trabajadas hoy */}
      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            Horas hoy
          </div>
          {statusBadge()}
        </div>
        <div className="text-3xl font-bold">
          {todayHours}h<span className="text-muted-foreground ml-2 text-lg font-normal">/ {todayExpectedHours}h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
            <div className="bg-primary h-full transition-all" style={{ width: `${todayProgress}%` }} />
          </div>
          <span className="text-muted-foreground text-xs">{todayProgress.toFixed(0)}%</span>
        </div>
      </Card>

      {/* Horas esta semana */}
      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Hourglass className="h-4 w-4" />
          Horas esta semana
        </div>
        <div className="text-3xl font-bold">{weekHours}h</div>
        <div className="text-muted-foreground text-xs">Esperadas: {weekExpectedHours}h</div>
      </Card>

      {/* Días de vacaciones disponibles */}
      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4" />
          Vacaciones disponibles
        </div>
        {pto ? (
          <>
            <div className="text-3xl font-bold">{pto.daysAvailable.toFixed(1)}</div>
            <div className="text-muted-foreground text-xs">
              {pto.daysUsed.toFixed(1)} usados de {pto.annualAllowance.toFixed(1)}
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
      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          Próximos eventos
        </div>
        <div className="text-3xl font-bold">{data.upcomingEvents.length}</div>
        <div className="text-muted-foreground text-xs">
          {data.upcomingEvents.length > 0
            ? `Próximo: ${new Date(data.upcomingEvents[0].date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
            : "Sin eventos próximos"}
        </div>
      </Card>
    </div>
  );
}

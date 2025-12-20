"use client";

import { Calendar, CalendarDays, CheckCircle2, Clock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatWorkingDays } from "@/services/pto/pto-helpers-client";

interface PtoBalance {
  id: string;
  year: number;
  annualAllowance: number;
  daysUsed: number;
  daysPending: number;
  daysAvailable: number;
}

interface EmployeePtoSummaryProps {
  balance: PtoBalance | null;
  isLoading?: boolean;
  error?: string | null;
}

export function EmployeePtoSummary({ balance, isLoading, error }: EmployeePtoSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  if (error ?? !balance) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-sm font-medium">No se pudo cargar el balance de vacaciones</p>
        {error && <p className="text-muted-foreground mt-2 text-xs">{error}</p>}
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          Días asignados
        </div>
        <div className="text-3xl font-bold">{formatWorkingDays(balance.annualAllowance)}</div>
        <div className="text-muted-foreground text-xs">Año {balance.year}</div>
      </Card>

      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          Días usados
        </div>
        <div className="text-3xl font-bold">{formatWorkingDays(balance.daysUsed)}</div>
        <div className="text-muted-foreground text-xs">
          {balance.annualAllowance > 0
            ? `${((balance.daysUsed / balance.annualAllowance) * 100).toFixed(0)}% del total`
            : "Sin asignación"}
        </div>
      </Card>

      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          Días pendientes
        </div>
        <div className="text-3xl font-bold">{formatWorkingDays(balance.daysPending)}</div>
        <div className="text-muted-foreground text-xs">En revisión</div>
      </Card>

      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4" />
          Días disponibles
        </div>
        <div className="text-3xl font-bold">{formatWorkingDays(balance.daysAvailable)}</div>
        <div className="text-muted-foreground text-xs">Puede solicitar</div>
      </Card>
    </div>
  );
}

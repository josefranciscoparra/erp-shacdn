"use client";

import { CalendarDays, CheckCircle2, Clock, Calendar } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePtoStore } from "@/stores/pto-store";

interface PtoBalanceCardsProps {
  error?: string | null;
}

export function PtoBalanceCards({ error }: PtoBalanceCardsProps) {
  const { balance, isLoadingBalance } = usePtoStore();

  if (isLoadingBalance) {
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

  if (!balance) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-sm font-medium">No se pudo cargar el balance de vacaciones</p>
        {error && <p className="text-muted-foreground mt-2 text-xs">{error}</p>}
        {!error && <p className="text-muted-foreground mt-2 text-xs">Si el problema persiste, contacta con RRHH.</p>}
      </Card>
    );
  }

  if (balance.hasActiveContract === false) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-sm font-medium">
          {balance.hasProvisionalContract
            ? "Tu contrato está pendiente de completar. Contacta con RRHH para que registren los detalles."
            : "Aún no tienes un contrato activo asignado."}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Cuando RRHH registre tu contrato, verás aquí tus días disponibles.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
      <Card className="flex flex-col gap-2 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-xs transition-shadow duration-300 hover:shadow-md dark:from-blue-950/20 dark:to-blue-900/10">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
          <Calendar className="h-4 w-4" />
          Días asignados
        </div>
        <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{balance.annualAllowance.toFixed(1)}</div>
        <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Año {balance.year}</div>
      </Card>

      <Card className="flex flex-col gap-2 bg-gradient-to-br from-green-50 to-green-100/50 p-6 shadow-xs transition-shadow duration-300 hover:shadow-md dark:from-green-950/20 dark:to-green-900/10">
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Días usados
        </div>
        <div className="text-3xl font-bold text-green-900 dark:text-green-100">{balance.daysUsed.toFixed(1)}</div>
        <div className="text-xs text-green-600/70 dark:text-green-400/70">
          {balance.annualAllowance > 0
            ? `${((balance.daysUsed / balance.annualAllowance) * 100).toFixed(0)}% del total`
            : "A la espera de asignación"}
        </div>
      </Card>

      <Card className="flex flex-col gap-2 bg-gradient-to-br from-amber-50 to-amber-100/50 p-6 shadow-xs transition-shadow duration-300 hover:shadow-md dark:from-amber-950/20 dark:to-amber-900/10">
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <Clock className="h-4 w-4" />
          Días pendientes
        </div>
        <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">{balance.daysPending.toFixed(1)}</div>
        <div className="text-xs text-amber-600/70 dark:text-amber-400/70">En revisión</div>
      </Card>

      <Card className="flex flex-col gap-2 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 shadow-xs transition-shadow duration-300 hover:shadow-md dark:from-purple-950/20 dark:to-purple-900/10">
        <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400">
          <CalendarDays className="h-4 w-4" />
          Días disponibles
        </div>
        <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
          {balance.daysAvailable.toFixed(1)}
        </div>
        <div className="text-xs text-purple-600/70 dark:text-purple-400/70">Puedes solicitar</div>
      </Card>
    </div>
  );
}

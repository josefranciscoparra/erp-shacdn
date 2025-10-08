"use client";

import { Card } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, Clock, Calendar } from "lucide-react";
import { usePtoStore } from "@/stores/pto-store";
import { Skeleton } from "@/components/ui/skeleton";

interface PtoBalanceCardsProps {
  error?: string | null;
}

export function PtoBalanceCards({ error }: PtoBalanceCardsProps) {
  const { balance, isLoadingBalance } = usePtoStore();

  if (isLoadingBalance) {
    return (
      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  if (!balance) {
    return (
      <Card className="p-6">
        <p className="text-sm font-medium text-muted-foreground">
          No se pudo cargar el balance de vacaciones
        </p>
        {error && (
          <p className="mt-2 text-xs text-muted-foreground">
            {error}
          </p>
        )}
        {!error && (
          <p className="mt-2 text-xs text-muted-foreground">
            Si el problema persiste, contacta con RRHH.
          </p>
        )}
      </Card>
    );
  }

  if (balance.hasActiveContract === false) {
    return (
      <Card className="p-6">
        <p className="text-sm font-medium text-muted-foreground">
          {balance.hasProvisionalContract
            ? "Tu contrato está pendiente de completar. Contacta con RRHH para que registren los detalles."
            : "Aún no tienes un contrato activo asignado."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Cuando RRHH registre tu contrato, verás aquí tus días disponibles.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-4">
      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Días asignados
        </div>
        <div className="text-3xl font-bold">{balance.annualAllowance.toFixed(1)}</div>
        <div className="text-xs text-muted-foreground">
          Año {balance.year}
        </div>
      </Card>

      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4" />
          Días usados
        </div>
        <div className="text-3xl font-bold">{balance.daysUsed.toFixed(1)}</div>
        <div className="text-xs text-muted-foreground">
          {balance.annualAllowance > 0
            ? `${((balance.daysUsed / balance.annualAllowance) * 100).toFixed(0)}% del total`
            : "A la espera de asignación"}
        </div>
      </Card>

      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Días pendientes
        </div>
        <div className="text-3xl font-bold">{balance.daysPending.toFixed(1)}</div>
        <div className="text-xs text-muted-foreground">
          En revisión
        </div>
      </Card>

      <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Días disponibles
        </div>
        <div className="text-3xl font-bold">{balance.daysAvailable.toFixed(1)}</div>
        <div className="text-xs text-muted-foreground">
          Puedes solicitar
        </div>
      </Card>
    </div>
  );
}

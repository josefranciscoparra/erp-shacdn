"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, TrendingUp, Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePtoStore } from "@/stores/pto-store";

interface PtoBalanceCardsProps {
  error?: string | null;
}

export function PtoBalanceCards({ error }: PtoBalanceCardsProps) {
  const { balance, isLoadingBalance, requests } = usePtoStore();

  if (isLoadingBalance) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </CardHeader>
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

  // Redondear días hacia abajo
  const daysAvailable = Math.floor(balance.daysAvailable);
  const daysUsed = Math.floor(balance.daysUsed);
  const daysTotal = Math.floor(balance.annualAllowance);
  const daysPending = Math.floor(balance.daysPending);

  // Calcular porcentajes
  const usagePercentage = daysTotal > 0 ? Math.round((daysUsed / daysTotal) * 100) : 0;
  const pendingPercentage = daysTotal > 0 ? Math.round((daysPending / daysTotal) * 100) : 0;

  // Calcular anchos de barras (usados + pendientes no debe superar 100%)
  const usedBarWidth = Math.min(usagePercentage, 100);
  const pendingBarWidth = Math.min(pendingPercentage, 100 - usedBarWidth);

  // Filtrar próximas vacaciones aprobadas (futuras)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingVacations = requests
    .filter((r) => r.status === "APPROVED" && new Date(r.startDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  // Siguiente vacación más cercana
  const nextVacation = upcomingVacations[0];
  const daysUntilVacation = nextVacation
    ? Math.floor((new Date(nextVacation.startDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: Próximas vacaciones destacadas */}
      <Card className="h-full">
        <CardHeader>
          <CardDescription>Próximas vacaciones</CardDescription>
          <CardAction>
            <Calendar className="text-primary size-4" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {nextVacation ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              {/* Icono central */}
              <div
                className="flex size-16 items-center justify-center rounded-full"
                style={{ backgroundColor: "oklch(var(--chart-2) / 0.1)" }}
              >
                <CalendarDays className="size-8" style={{ color: "oklch(var(--chart-2))" }} />
              </div>

              {/* Fechas */}
              <div className="text-center">
                <p className="font-display text-xl font-semibold">
                  {format(new Date(nextVacation.startDate), "d MMM", { locale: es })} -{" "}
                  {format(new Date(nextVacation.endDate), "d MMM yyyy", { locale: es })}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {daysUntilVacation === 0
                    ? "¡Hoy comienzan!"
                    : daysUntilVacation === 1
                      ? "Faltan 1 día"
                      : `Faltan ${daysUntilVacation} días`}
                </p>
              </div>

              {/* Detalles */}
              <div className="flex w-full flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Días laborables</span>
                  <span className="font-display text-lg font-semibold">
                    {Math.floor(nextVacation.days)} {Math.floor(nextVacation.days) === 1 ? "día" : "días"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Estado</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    Aprobada
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 py-4">
              <div className="bg-muted flex size-16 items-center justify-center rounded-full">
                <Calendar className="text-muted-foreground size-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Sin vacaciones programadas</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Tienes {daysAvailable} {daysAvailable === 1 ? "día disponible" : "días disponibles"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Próximas vacaciones */}
      <Card className="h-full">
        <CardHeader>
          <CardDescription>Próximas vacaciones</CardDescription>
          <CardAction>
            <Calendar className="text-primary size-4" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {upcomingVacations.length > 0 ? (
            <div className="space-y-3">
              {upcomingVacations.map((vacation) => {
                const startDate = new Date(vacation.startDate);
                const endDate = new Date(vacation.endDate);
                const days = Math.floor(vacation.days);

                return (
                  <div key={vacation.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">
                        {format(startDate, "d MMM", { locale: es })} - {format(endDate, "d MMM", { locale: es })}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {days} {days === 1 ? "día" : "días"}
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      Aprobada
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">No hay vacaciones programadas</p>
                <p className="text-muted-foreground mt-1 text-xs">Tus próximas vacaciones aparecerán aquí</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Resumen del año */}
      <Card>
        <CardHeader>
          <CardDescription>Resumen del año {balance.year}</CardDescription>
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <span className="text-muted-foreground text-sm">Total asignado</span>
              <span className="font-display text-2xl">{daysTotal}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <span className="text-muted-foreground text-sm">Días usados</span>
              <span className="font-display text-2xl">{daysUsed}</span>
            </div>
            {daysPending > 0 && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <span className="text-muted-foreground text-sm">Pendientes</span>
                <span className="font-display text-2xl text-orange-600">{daysPending}</span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border-2 border-green-500/20 bg-green-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                  <CalendarDays className="text-primary size-5" />
                </div>
                <span className="text-sm font-medium">Vacaciones disponibles</span>
              </div>
              <span className="font-display text-3xl text-green-600">{daysAvailable}</span>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

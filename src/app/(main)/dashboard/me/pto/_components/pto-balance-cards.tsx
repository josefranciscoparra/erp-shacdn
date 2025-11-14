"use client";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Calendar, FileCheck } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePtoStore } from "@/stores/pto-store";

interface PtoBalanceCardsProps {
  error?: string | null;
}

export function PtoBalanceCards({ error }: PtoBalanceCardsProps) {
  const { balance, isLoadingBalance, requests } = usePtoStore();

  if (isLoadingBalance) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="gap-2">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
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

  // Filtrar próximas vacaciones aprobadas (futuras)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingVacations = requests
    .filter((r) => r.status === "APPROVED" && new Date(r.startDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Siguiente vacación más cercana
  const nextVacation = upcomingVacations[0];

  // Filtrar solicitudes pendientes
  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  // Calcular última solicitud
  const lastRequest = requests
    .filter((r) => r.submittedAt)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

  const daysAgoLastRequest = lastRequest
    ? Math.floor((today.getTime() - new Date(lastRequest.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Card 1: Estado de solicitudes */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Estado de solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <FileCheck className="size-5" />
            </div>
            <p className="text-muted-foreground text-sm">
              {pendingRequests.length > 0 ? (
                <>
                  Tienes{" "}
                  <span className="text-orange-600">
                    {pendingRequests.length}{" "}
                    {pendingRequests.length === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
                  </span>
                </>
              ) : (
                <>
                  Todas las solicitudes <span className="text-green-600">procesadas</span>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Próximas vacaciones */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {nextVacation ? "Próximas vacaciones" : "Sin vacaciones programadas"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextVacation ? (
            <div className="flex items-center gap-2">
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
                <Calendar className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {format(new Date(nextVacation.startDate), "d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-muted-foreground text-sm">
                  {(() => {
                    const daysUntil = Math.floor(
                      (new Date(nextVacation.startDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                    );
                    if (daysUntil === 0) return "Hoy empiezan · 🏖️";
                    if (daysUntil === 1) return "Mañana · 🔥";
                    if (daysUntil <= 7) return `Dentro de ${daysUntil} días · 🌴`;
                    if (daysUntil <= 30) return `Dentro de ${daysUntil} días · ⛱️`;
                    return `Dentro de ${daysUntil} días · 🗓️`;
                  })()}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
                <Calendar className="size-5" />
              </div>
              <p className="text-muted-foreground text-sm">No tienes vacaciones programadas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Días disponibles */}
      <Card>
        <CardHeader>
          <CardDescription>Vacaciones</CardDescription>
          <div className="flex flex-col gap-2">
            <h4 className="font-display text-2xl lg:text-3xl">{daysAvailable} días</h4>
            <div className="text-muted-foreground text-sm">
              Te quedan {daysAvailable} {daysAvailable === 1 ? "día" : "días"} de vacaciones
            </div>
          </div>
          <CardAction>
            <div className="flex gap-4">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
                <CalendarDays className="size-5" />
              </div>
            </div>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}

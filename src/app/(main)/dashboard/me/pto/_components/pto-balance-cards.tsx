"use client";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Calendar, FileCheck } from "lucide-react";

import { minutesToTime } from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVacationBalance } from "@/services/pto/pto-helpers-client";
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

  // ✅ SISTEMA DE BALANCE EN MINUTOS - Usar campos en minutos y formatear
  const workdayMinutes = balance.workdayMinutesSnapshot ?? 480;
  const roundingUnit = balance.roundingUnit ?? 0.1;
  const roundingMode = balance.roundingMode ?? "NEAREST";
  const displayOptions = { fractionStep: roundingUnit, roundingMode };
  const availableDisplay = formatVacationBalance(balance.minutesAvailable ?? 0, workdayMinutes, displayOptions);
  const usedDisplay = formatVacationBalance(balance.minutesUsed ?? 0, workdayMinutes, displayOptions);
  const totalDisplay = formatVacationBalance(balance.annualAllowanceMinutes ?? 0, workdayMinutes, displayOptions);

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
      <Card className="group gap-2 transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="font-display text-xl">Estado de solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div
              className={`flex size-12 shrink-0 items-center justify-center rounded-full border transition-colors ${
                pendingRequests.length > 0
                  ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
              }`}
            >
              <FileCheck className="size-5" />
            </div>
            <p className="text-muted-foreground text-sm">
              {pendingRequests.length > 0 ? (
                <>
                  Tienes{" "}
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {pendingRequests.length}{" "}
                    {pendingRequests.length === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
                  </span>
                </>
              ) : (
                <>
                  Todas las solicitudes{" "}
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">procesadas</span>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Próximas vacaciones */}
      <Card className="group gap-2 transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {nextVacation ? "Próximas vacaciones" : "Sin vacaciones programadas"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextVacation ? (
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 transition-colors dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400">
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
                    let timeText = "";

                    if (daysUntil === 0) timeText = "Hoy empiezan · 🏖️";
                    else if (daysUntil === 1) timeText = "Mañana · 🔥";
                    else if (daysUntil <= 7) timeText = `Dentro de ${daysUntil} días · 🌴`;
                    else if (daysUntil <= 30) timeText = `Dentro de ${daysUntil} días · ⛱️`;
                    else timeText = `Dentro de ${daysUntil} días · 🗓️`;

                    // Mostrar horario si es parcial
                    const isPartial =
                      nextVacation.startTime !== null &&
                      nextVacation.startTime !== undefined &&
                      nextVacation.endTime !== null &&
                      nextVacation.endTime !== undefined;

                    return (
                      <>
                        {timeText}
                        {isPartial && (
                          <span className="ml-2 inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-600/20 ring-inset dark:bg-orange-900/20 dark:text-orange-300 dark:ring-orange-400/30">
                            {minutesToTime(nextVacation.startTime!)} - {minutesToTime(nextVacation.endTime!)}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
                <Calendar className="size-5" />
              </div>
              <p className="text-muted-foreground text-sm">No tienes vacaciones programadas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Balance disponible */}
      <Card className="group from-primary/5 to-card bg-gradient-to-br transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardDescription>Vacaciones</CardDescription>
          <div className="flex flex-col gap-2">
            <h4
              className="font-display text-2xl lg:text-3xl"
              title={availableDisplay.detailLabel}
              aria-label={availableDisplay.detailLabel}
            >
              {availableDisplay.primaryLabel}
            </h4>
            <p
              className="text-muted-foreground text-sm"
              title={`Totales exactos: ${totalDisplay.detailLabel} · usados ${usedDisplay.detailLabel}`}
            >
              Disponibles de {totalDisplay.primaryLabel} anuales (usados: {usedDisplay.primaryLabel})
            </p>
          </div>
          <CardAction>
            <div className="flex gap-4">
              <div className="bg-primary/10 text-primary border-primary/20 flex size-12 items-center justify-center rounded-full border">
                <CalendarDays className="size-5" />
              </div>
            </div>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}

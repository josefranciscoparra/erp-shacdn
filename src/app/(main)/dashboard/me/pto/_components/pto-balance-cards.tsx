"use client";

import { useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, TrendingUp, Calendar, X, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePtoStore } from "@/stores/pto-store";

interface PtoBalanceCardsProps {
  error?: string | null;
}

export function PtoBalanceCards({ error }: PtoBalanceCardsProps) {
  const { balance, isLoadingBalance, requests, cancelRequest } = usePtoStore();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  // Filtrar solicitudes pendientes
  const pendingRequests = requests
    .filter((r) => r.status === "PENDING")
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 3);

  // Manejar cancelación de solicitud
  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("¿Estás seguro de que quieres cancelar esta solicitud?")) {
      return;
    }

    setCancellingId(requestId);
    try {
      await cancelRequest(requestId, "Cancelada por el usuario");
    } catch (error) {
      console.error("Error al cancelar solicitud:", error);
      alert("Error al cancelar la solicitud. Por favor, inténtalo de nuevo.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: Solicitudes Pendientes */}
      <Card className="h-full">
        <CardHeader>
          <CardDescription>Solicitudes Pendientes</CardDescription>
          <CardAction>
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
              {pendingRequests.length}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((request) => {
                const startDate = new Date(request.startDate);
                const endDate = new Date(request.endDate);
                const days = Math.floor(request.workingDays);
                const submittedAt = new Date(request.submittedAt);

                // Normalizar fechas a medianoche para evitar problemas de zona horaria
                const todayNormalized = new Date(today);
                todayNormalized.setHours(0, 0, 0, 0);
                const submittedNormalized = new Date(submittedAt);
                submittedNormalized.setHours(0, 0, 0, 0);

                const daysAgo = Math.floor(
                  (todayNormalized.getTime() - submittedNormalized.getTime()) / (1000 * 60 * 60 * 24),
                );

                // Generar mensaje seguro
                let timeAgoMessage = "hoy";
                if (daysAgo < 0) {
                  timeAgoMessage = "hoy"; // Si es futuro (no debería pasar), mostrar "hoy"
                } else if (daysAgo === 0) {
                  timeAgoMessage = "hoy";
                } else if (daysAgo === 1) {
                  timeAgoMessage = "hace 1 día";
                } else {
                  timeAgoMessage = `hace ${daysAgo} días`;
                }

                const isCancelling = cancellingId === request.id;

                return (
                  <div key={request.id} className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-1 flex-col gap-1">
                        <span className="text-sm font-medium">
                          {format(startDate, "d MMM", { locale: es })} - {format(endDate, "d MMM", { locale: es })}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {days} {days === 1 ? "día" : "días"}
                        </span>
                      </div>
                      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                        Pendiente
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">Solicitado {timeAgoMessage}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelRequest(request.id)}
                        disabled={isCancelling}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 px-2 text-xs"
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="mr-1 size-3 animate-spin" />
                            Cancelando...
                          </>
                        ) : (
                          <>
                            <X className="mr-1 size-3" />
                            Cancelar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-8">
              <div className="bg-muted flex size-16 items-center justify-center rounded-full">
                <CalendarDays className="text-muted-foreground size-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Todo al día</p>
                <p className="text-muted-foreground mt-1 text-xs">No tienes solicitudes pendientes de aprobación</p>
              </div>
              <div className="mt-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="bg-background flex size-8 items-center justify-center rounded-full border">
                    <span className="text-sm">✓</span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-green-600">Estado: OK</p>
                    <p className="text-muted-foreground text-xs">Todas tus solicitudes han sido procesadas</p>
                  </div>
                </div>
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

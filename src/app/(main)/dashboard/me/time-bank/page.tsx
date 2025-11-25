"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  PiggyBank,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTimeBankRequestsStore } from "@/stores/time-bank-requests-store";
import { useTimeBankStore } from "@/stores/time-bank-store";

import { TimeBankRequestDialog } from "./_components/time-bank-request-dialog";

const ORIGIN_LABELS: Record<string, string> = {
  AUTO_DAILY: "Cálculo diario",
  AUTO_FESTIVE: "Festivo trabajado",
  AUTO_DEFICIT: "Déficit automático",
  MANUAL_ADMIN: "Ajuste RRHH",
  EMPLOYEE_REQUEST: "Solicitud aprobada",
  OVERTIME_AUTHORIZATION: "Horas extra",
  FLEX_WINDOW: "Jornada flexible",
  CORRECTION: "Corrección",
};

function formatMinutesLabel(minutes: number): string {
  const hours = minutes / 60;
  const prefix = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  return `${prefix}${Math.abs(hours).toFixed(1)}h`;
}

function formatMinutesToHours(minutes: number): string {
  const hours = Math.abs(minutes) / 60;
  return `${hours.toFixed(1)}h`;
}

export default function MyTimeBankPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING");

  const { summary, isLoading: isSummaryLoading, error: summaryError, loadSummary } = useTimeBankStore();
  const {
    requests,
    totals,
    isLoading: isRequestsLoading,
    loadRequests,
    cancelRequest,
  } = useTimeBankRequestsStore();

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (activeTab === "PENDING") {
      loadRequests("PENDING");
    } else {
      // Cargar todas las no pendientes para historial
      loadRequests("APPROVED");
    }
  }, [activeTab, loadRequests]);

  const handleRefresh = () => {
    loadSummary();
    if (activeTab === "PENDING") {
      loadRequests("PENDING");
    } else {
      loadRequests("APPROVED");
    }
    toast.success("Datos actualizados");
  };

  const handleCancelRequest = async (id: string) => {
    try {
      await cancelRequest(id);
      toast.success("Solicitud cancelada");
      await loadSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar";
      toast.error(message);
    }
  };

  const totalMinutes = summary?.totalMinutes ?? 0;
  const maxPositive = summary?.limits?.maxPositiveMinutes ?? 4800;
  const maxNegative = summary?.limits?.maxNegativeMinutes ?? 480;
  const todaysMinutes = summary?.todaysMinutes ?? 0;
  const pendingRequests = summary?.pendingRequests ?? 0;
  const lastMovements = summary?.lastMovements ?? [];

  const isPositive = totalMinutes >= 0;
  const progress = isPositive ? (totalMinutes / maxPositive) * 100 : (Math.abs(totalMinutes) / maxNegative) * 100;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @xl/main:flex-row @xl/main:items-center @xl/main:justify-between">
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" asChild>
                  <Link href="/dashboard/me/clock">
                    <ArrowLeft />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Volver a Fichar</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <SectionHeader
            title="Mi Bolsa de Horas"
            description="Gestiona tu saldo de horas, recuperaciones y compensaciones."
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isSummaryLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isSummaryLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva solicitud
          </Button>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid gap-4 @xl/main:grid-cols-3">
        {/* Saldo actual */}
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Saldo Actual</CardTitle>
              <PiggyBank className={cn("h-5 w-5", isPositive ? "text-emerald-500" : "text-red-500")} />
            </div>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">Cargando...</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-3xl font-bold",
                      isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {formatMinutesLabel(totalMinutes)}
                  </span>
                  {isPositive ? (
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <Progress
                  value={Math.min(100, Math.abs(progress))}
                  className={cn("mt-3 h-2", !isPositive && "[&>div]:bg-red-500")}
                />
                <p className="text-muted-foreground mt-2 text-xs">
                  Límite: {isPositive ? `+${formatMinutesToHours(maxPositive)}` : `-${formatMinutesToHours(maxNegative)}`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Movimiento de hoy */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Hoy</CardTitle>
              <Calendar className="text-muted-foreground h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    todaysMinutes >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatMinutesLabel(todaysMinutes)}
                </span>
                <p className="text-muted-foreground mt-1 text-xs">
                  {todaysMinutes === 0
                    ? "Sin movimientos hoy"
                    : todaysMinutes > 0
                      ? "Tiempo extra acumulado"
                      : "Tiempo a recuperar"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Solicitudes pendientes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Solicitudes Pendientes</CardTitle>
              <Clock className="text-muted-foreground h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                <span className="text-2xl font-bold">{pendingRequests}</span>
                <p className="text-muted-foreground mt-1 text-xs">
                  {pendingRequests === 0
                    ? "No tienes solicitudes en revisión"
                    : pendingRequests === 1
                      ? "Solicitud en revisión por RRHH"
                      : "Solicitudes en revisión por RRHH"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal: Movimientos y Solicitudes */}
      <div className="grid gap-4 @3xl/main:grid-cols-2">
        {/* Últimos movimientos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : lastMovements.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">Sin movimientos recientes</div>
            ) : (
              <div className="space-y-3">
                {lastMovements.slice(0, 6).map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full",
                          movement.minutes >= 0
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-red-100 dark:bg-red-900/30",
                        )}
                      >
                        {movement.minutes >= 0 ? (
                          <TrendingUp className="size-4 text-emerald-600" />
                        ) : (
                          <TrendingDown className="size-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(movement.date), "dd MMM yyyy", { locale: es })}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {movement.description ?? ORIGIN_LABELS[movement.origin] ?? movement.origin}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        movement.minutes >= 0 ? "text-emerald-600" : "text-red-600",
                      )}
                    >
                      {formatMinutesLabel(movement.minutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Solicitudes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Mis Solicitudes</CardTitle>
              {totals.pending > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {totals.pending} pendiente{totals.pending > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="PENDING" className="gap-2">
                  Pendientes
                  {totals.pending > 0 && <Badge variant="secondary">{totals.pending}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="HISTORY">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="PENDING" className="mt-4 space-y-3">
                {isRequestsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm">No tienes solicitudes pendientes</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {format(new Date(request.date), "dd MMM yyyy", { locale: es })}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {request.type === "RECOVERY" ? "Recuperar horas" : "Compensar festivo"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            request.type === "RECOVERY" ? "text-red-600" : "text-emerald-600",
                          )}
                        >
                          {request.type === "RECOVERY" ? "-" : "+"}
                          {formatMinutesToHours(request.requestedMinutes)}
                        </span>
                      </div>
                      {request.reason && (
                        <p className="text-muted-foreground mt-2 text-xs">{request.reason}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">
                          Enviado {format(new Date(request.submittedAt ?? request.createdAt), "dd/MM HH:mm", { locale: es })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="HISTORY" className="mt-4 space-y-3">
                {isRequestsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center text-sm">Sin historial de solicitudes</div>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">
                              {format(new Date(request.date), "dd MMM yyyy", { locale: es })}
                            </p>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                request.status === "APPROVED" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                request.status === "REJECTED" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                request.status === "CANCELLED" && "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
                              )}
                            >
                              {request.status === "APPROVED" && "Aprobada"}
                              {request.status === "REJECTED" && "Rechazada"}
                              {request.status === "CANCELLED" && "Cancelada"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {request.type === "RECOVERY" ? "Recuperar horas" : "Compensar festivo"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            request.type === "RECOVERY" ? "text-red-600" : "text-emerald-600",
                          )}
                        >
                          {request.type === "RECOVERY" ? "-" : "+"}
                          {formatMinutesToHours(request.requestedMinutes)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de nueva solicitud */}
      <TimeBankRequestDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

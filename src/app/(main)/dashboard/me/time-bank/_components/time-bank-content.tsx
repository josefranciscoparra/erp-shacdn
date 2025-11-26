"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Filter,
  History,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTimeBankRequestsStore } from "@/stores/time-bank-requests-store";
import { useTimeBankStore } from "@/stores/time-bank-store";

import { TimeBankHeroCard } from "./time-bank-hero-card";
import { TimeBankRequestDialog } from "./time-bank-request-dialog";

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

export function TimeBankContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING");

  const { summary, isLoading: isSummaryLoading, loadSummary } = useTimeBankStore();
  const { requests, totals, isLoading: isRequestsLoading, loadRequests, cancelRequest } = useTimeBankRequestsStore();

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (activeTab === "PENDING") {
      loadRequests("PENDING");
    } else {
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

  // Datos para Hero Card
  const totalMinutes = summary?.totalMinutes ?? 0;
  const maxPositive = summary?.limits?.maxPositiveMinutes ?? 4800;
  const maxNegative = summary?.limits?.maxNegativeMinutes ?? 480;
  const todaysMinutes = summary?.todaysMinutes ?? 0;
  const pendingRequestsCount = summary?.pendingRequests ?? 0;
  const lastMovements = summary?.lastMovements ?? [];

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Mi Bolsa de Horas"
          description="Gestiona tu saldo de horas, recuperaciones y compensaciones."
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isSummaryLoading} className="h-9">
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isSummaryLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-9 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Nueva Solicitud
          </Button>
        </div>
      </div>

      {/* 1. Stats Row (New Hero) */}
      <TimeBankHeroCard
        totalMinutes={totalMinutes}
        maxPositive={maxPositive}
        maxNegative={maxNegative}
        todaysMinutes={todaysMinutes}
        pendingRequests={pendingRequestsCount}
        isLoading={isSummaryLoading}
      />

      {/* 2. Grid de Contenido Principal */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna Izquierda: Últimos Movimientos */}
        <Card className="lg:bg-card h-full border-none bg-transparent shadow-none lg:border lg:shadow-sm">
          <CardHeader className="px-0 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Últimos Movimientos</CardTitle>
                <CardDescription className="mt-1">Registro de cambios en tu saldo</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground h-8 text-xs">
                Ver todo <History className="ml-2 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0 lg:px-6">
            {isSummaryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : lastMovements.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                <History className="text-muted-foreground/20 h-8 w-8" />
                <p className="text-muted-foreground mt-2 text-sm">No hay movimientos recientes</p>
              </div>
            ) : (
              <div className="space-y-1">
                {lastMovements.slice(0, 8).map((movement) => (
                  <div
                    key={movement.id}
                    className="group hover:border-border dark:bg-muted/20 flex items-center justify-between rounded-md border border-transparent bg-white px-3 py-2.5 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-full",
                          movement.minutes > 0 && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20",
                          movement.minutes < 0 && "bg-red-100 text-red-600 dark:bg-red-900/20",
                          movement.minutes === 0 && "bg-slate-100 text-slate-500 dark:bg-slate-800",
                        )}
                      >
                        {movement.minutes > 0 ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : movement.minutes < 0 ? (
                          <ArrowDown className="h-4 w-4" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm leading-none font-medium">
                          {movement.description ?? ORIGIN_LABELS[movement.origin] ?? movement.origin}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(movement.date), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-sm font-medium tabular-nums",
                        movement.minutes > 0
                          ? "text-emerald-600"
                          : movement.minutes < 0
                            ? "text-red-600"
                            : "text-muted-foreground",
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

        {/* Columna Derecha: Solicitudes */}
        <Card className="lg:bg-card h-full border-none bg-transparent shadow-none lg:border lg:shadow-sm">
          <CardHeader className="px-0 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Mis Solicitudes</CardTitle>
                <CardDescription className="mt-1">Estado de tus peticiones</CardDescription>
              </div>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-auto">
                <TabsList className="bg-muted/50 h-8 p-0.5">
                  <TabsTrigger
                    value="PENDING"
                    className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Pendientes ({totals.pending})
                  </TabsTrigger>
                  <TabsTrigger
                    value="HISTORY"
                    className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Historial
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="px-0 lg:px-6">
            {isRequestsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                <CheckCircle2 className="text-muted-foreground/20 h-8 w-8" />
                <p className="text-muted-foreground mt-2 text-sm">
                  {activeTab === "PENDING" ? "No tienes solicitudes pendientes" : "No hay historial disponible"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-card relative flex flex-col gap-3 rounded-lg border p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    {/* Header Request */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-9 items-center justify-center rounded-md",
                            request.type === "RECOVERY" ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600",
                          )}
                        >
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {request.type === "RECOVERY" ? "Recuperar Horas" : "Compensar Festivo"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {format(new Date(request.date), "EEEE d MMMM", { locale: es })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "px-2 py-0.5 font-mono text-xs",
                          request.type === "RECOVERY"
                            ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
                            : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50",
                        )}
                        variant="outline"
                      >
                        {request.type === "RECOVERY" ? "-" : "+"}
                        {formatMinutesToHours(request.requestedMinutes)}
                      </Badge>
                    </div>

                    {/* Footer Request (Estado/Acciones) */}
                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-2">
                        {activeTab === "HISTORY" ? (
                          <Badge
                            variant={
                              request.status === "APPROVED"
                                ? "default"
                                : request.status === "REJECTED"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={cn(
                              "h-5 px-1.5 text-[10px] font-medium",
                              request.status === "APPROVED" && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                              request.status === "REJECTED" && "bg-red-100 text-red-700 hover:bg-red-100",
                              request.status === "CANCELLED" && "bg-slate-100 text-slate-600 hover:bg-slate-100",
                            )}
                          >
                            {request.status === "APPROVED"
                              ? "Aprobada"
                              : request.status === "REJECTED"
                                ? "Rechazada"
                                : "Cancelada"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="h-5 border-amber-200 bg-amber-100 px-2 text-[10px] text-amber-700 hover:bg-amber-100"
                          >
                            En revisión
                          </Badge>
                        )}
                        <span className="text-muted-foreground ml-1 text-[10px]">
                          Solicitado el {format(new Date(request.createdAt), "d MMM")}
                        </span>
                      </div>

                      {request.status === "PENDING" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="-mr-2 h-7 w-7">
                              <MoreHorizontal className="text-muted-foreground h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleCancelRequest(request.id)}
                              className="text-red-600 focus:bg-red-50 focus:text-red-700"
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Cancelar solicitud
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de nueva solicitud */}
      <TimeBankRequestDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

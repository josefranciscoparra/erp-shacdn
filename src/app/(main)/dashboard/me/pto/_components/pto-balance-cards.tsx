"use client";

import { CalendarDays, CheckCircle2, Clock, Calendar, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePtoStore } from "@/stores/pto-store";

interface PtoBalanceCardsProps {
  error?: string | null;
}

export function PtoBalanceCards({ error }: PtoBalanceCardsProps) {
  const { balance, isLoadingBalance } = usePtoStore();

  if (isLoadingBalance) {
    return (
      <div className="grid gap-5 md:gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="from-primary/5 to-card flex flex-col gap-3 bg-gradient-to-t p-7 shadow-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-2 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (!balance) {
    return (
      <Card className="bg-muted/30 border-dashed p-8 text-center">
        <div className="bg-destructive/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Calendar className="text-destructive h-6 w-6" />
        </div>
        <p className="text-foreground mt-4 text-sm font-semibold">No se pudo cargar tu balance de vacaciones</p>
        {error && <p className="text-muted-foreground mt-2 text-xs">{error}</p>}
        {!error && (
          <p className="text-muted-foreground mt-2 text-xs">Si el problema persiste, contacta con tu gestor de RRHH.</p>
        )}
      </Card>
    );
  }

  if (balance.hasActiveContract === false) {
    return (
      <Card className="bg-muted/30 border-dashed p-8 text-center">
        <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Sparkles className="text-primary h-6 w-6" />
        </div>
        <p className="text-foreground mt-4 text-sm font-semibold">
          {balance.hasProvisionalContract ? "Tu contrato está casi listo" : "¡Bienvenido a TimeNow!"}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          {balance.hasProvisionalContract
            ? "Tu contrato está pendiente de completar. En cuanto RRHH añada los detalles, podrás ver tus días disponibles aquí."
            : "Cuando RRHH registre tu contrato, verás aquí tus días de vacaciones disponibles."}
        </p>
      </Card>
    );
  }

  const usagePercentage = balance.annualAllowance > 0 ? (balance.daysUsed / balance.annualAllowance) * 100 : 0;

  return (
    <div className="grid gap-4 md:gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      {/* Días asignados */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="group dark:via-card relative overflow-hidden border-blue-200/50 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:border-blue-900/30 dark:from-blue-950/30 dark:to-blue-950/10">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-blue-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 transition-colors group-hover:bg-blue-500/15">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Días asignados</span>
                </div>
                <div className="mb-1 text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
                  {Math.round(balance.annualAllowance)}
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-blue-600/70 dark:text-blue-400/70">
                  <Calendar className="h-3 w-3" />
                  Año {balance.year}
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total de días de vacaciones asignados para {balance.year}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Días usados */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="group dark:via-card relative overflow-hidden border-green-200/50 bg-gradient-to-br from-green-50 via-white to-green-50/30 p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:border-green-900/30 dark:from-green-950/30 dark:to-green-950/10">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-green-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 transition-colors group-hover:bg-green-500/15">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Días usados</span>
                </div>
                <div className="mb-2 text-3xl font-bold tracking-tight text-green-900 dark:text-green-100">
                  {Math.round(balance.daysUsed)}
                </div>
                <div className="space-y-1.5">
                  <Progress value={usagePercentage} className="h-1.5 bg-green-100 dark:bg-green-950/50" />
                  <div className="text-xs font-medium text-green-600/70 dark:text-green-400/70">
                    {balance.annualAllowance > 0
                      ? `${Math.round(usagePercentage)}% del total utilizado`
                      : "A la espera de asignación"}
                  </div>
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Días que ya has disfrutado este año</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Días pendientes */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="group dark:via-card relative overflow-hidden border-amber-200/50 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:border-amber-900/30 dark:from-amber-950/30 dark:to-amber-950/10">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-amber-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 transition-colors group-hover:bg-amber-500/15">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Días pendientes</span>
                </div>
                <div className="mb-1 text-3xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
                  {Math.round(balance.daysPending)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  <div className="text-xs font-medium text-amber-600/70 dark:text-amber-400/70">
                    Esperando aprobación
                  </div>
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Solicitudes que están siendo revisadas por tu responsable</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Días disponibles */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="group dark:via-card relative overflow-hidden border-purple-200/50 bg-gradient-to-br from-purple-50 via-white to-purple-50/30 p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:border-purple-900/30 dark:from-purple-950/30 dark:to-purple-950/10">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-purple-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 transition-colors group-hover:bg-purple-500/15">
                    <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Días disponibles</span>
                </div>
                <div className="mb-1 text-3xl font-bold tracking-tight text-purple-900 dark:text-purple-100">
                  {Math.round(balance.daysAvailable)}
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-purple-600/70 dark:text-purple-400/70">
                  <Sparkles className="h-3 w-3" />
                  Listos para solicitar
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Días que puedes solicitar ahora mismo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

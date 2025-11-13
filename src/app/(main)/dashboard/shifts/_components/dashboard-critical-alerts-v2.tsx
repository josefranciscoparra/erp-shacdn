/**
 * Alertas Críticas del Dashboard (Rediseño v2)
 *
 * Card con lista de alertas que requieren atención
 * Diseño limpio estilo Notion/Linear
 */

"use client";

import { AlertTriangle, AlertCircle, Info, Calendar, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { MockAlert } from "../_lib/dashboard-mock-data";

interface DashboardCriticalAlertsProps {
  alerts: MockAlert[];
  isLoading?: boolean;
}

function getAlertIcon(type: MockAlert["type"]) {
  switch (type) {
    case "conflict":
    case "coverage":
      return AlertTriangle;
    case "unpublished":
    case "hours":
    case "no_shifts":
      return AlertCircle;
    default:
      return Info;
  }
}

export function DashboardCriticalAlertsV2({ alerts, isLoading }: DashboardCriticalAlertsProps) {
  if (isLoading) {
    return (
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-xl font-semibold">⚠️ Requieren Atención</CardTitle>
          <CardDescription>Cargando avisos...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const errorAlerts = alerts.filter((a) => a.severity === "error");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");
  const hasAlerts = alerts.length > 0;

  return (
    <Card className="rounded-xl border-slate-200 shadow-sm">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <AlertTriangle className="size-5 text-red-600" />
              Requieren Atención
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              {hasAlerts
                ? `${alerts.length} ${alerts.length === 1 ? "aviso detectado" : "avisos detectados"}`
                : "Todo en orden"}
            </CardDescription>
          </div>
          {hasAlerts && errorAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorAlerts.length} crítico{errorAlerts.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        {!hasAlerts ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
              <Info className="text-muted-foreground size-5" />
            </div>
            <p className="text-muted-foreground text-sm">No hay avisos pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mostrar solo los primeros 3 avisos más críticos */}
            {[...errorAlerts, ...warningAlerts].slice(0, 3).map((alert) => {
              const Icon = getAlertIcon(alert.type);
              const hasEmployees = alert.affectedEmployees && alert.affectedEmployees.length > 0;

              return (
                <Card
                  key={alert.id}
                  className={cn(
                    "rounded-lg border shadow-none",
                    alert.severity === "error" && "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
                    alert.severity === "warning" &&
                      "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {/* Icono */}
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-full border",
                          alert.severity === "error" &&
                            "border-red-300 bg-red-100 dark:border-red-800 dark:bg-red-900/30",
                          alert.severity === "warning" &&
                            "border-amber-300 bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4",
                            alert.severity === "error" && "text-red-600 dark:text-red-400",
                            alert.severity === "warning" && "text-amber-600 dark:text-amber-400",
                          )}
                        />
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-sm font-semibold">{alert.title}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">{alert.description}</p>
                        </div>

                        {/* Semana display prominente */}
                        {alert.weekDisplay && (
                          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/50 px-3 py-1.5">
                            <Calendar className="text-primary size-3" />
                            <span className="text-xs font-medium">{alert.weekDisplay}</span>
                          </div>
                        )}

                        {/* Empleados afectados */}
                        {hasEmployees && (
                          <Collapsible>
                            <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors">
                              <span>
                                {alert.affectedEmployees.length}{" "}
                                {alert.affectedEmployees.length === 1 ? "empleado afectado" : "empleados afectados"}
                              </span>
                              <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="flex flex-wrap gap-1">
                                {alert.affectedEmployees.slice(0, 6).map((name, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {name}
                                  </Badge>
                                ))}
                                {alert.affectedEmployees.length > 6 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{alert.affectedEmployees.length - 6} más
                                  </Badge>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer con "Ver más" si hay más de 3 avisos */}
        {alerts.length > 3 && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
              Ver {alerts.length - 3} más →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

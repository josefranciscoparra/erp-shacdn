/**
 * Alertas Críticas del Dashboard (Rediseño v3 - Factorial Style)
 *
 * Card con lista de alertas accionables
 * Diseño limpio, CTAs claros, menos ruido visual
 */

"use client";

import { AlertCircle, AlertTriangle, ArrowRight, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">Requiere Atención</CardTitle>
          <CardDescription className="text-xs">
            {hasAlerts
              ? `${errorAlerts.length + warningAlerts.length} ${errorAlerts.length + warningAlerts.length === 1 ? "aviso pendiente" : "avisos pendientes"}`
              : "Todo en orden"}
          </CardDescription>
        </div>
        {errorAlerts.length > 0 && (
          <Badge
            variant="outline"
            className="gap-1 border-orange-200 bg-orange-50/30 text-xs text-orange-700/80 dark:border-orange-800/30 dark:bg-orange-950/10 dark:text-orange-300/70"
          >
            <AlertTriangle className="size-3" />
            {errorAlerts.length} {errorAlerts.length === 1 ? "crítico" : "críticos"}
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {!hasAlerts ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Info className="text-muted-foreground size-5" />
            </div>
            <p className="text-muted-foreground text-sm">No hay avisos pendientes</p>
            <p className="text-muted-foreground text-xs">Todas las asignaciones están en orden</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Mostrar solo los primeros 4 avisos más críticos */}
            {[...errorAlerts, ...warningAlerts].slice(0, 4).map((alert) => {
              const Icon = getAlertIcon(alert.type);

              return (
                <div
                  key={alert.id}
                  className="group hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-3 transition-colors"
                >
                  {/* Icono */}
                  <div className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Icon className="text-muted-foreground size-4" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm leading-tight font-medium">{alert.title}</p>
                    <p className="text-muted-foreground text-xs leading-tight">{alert.description}</p>

                    {/* Empleados afectados si existen */}
                    {alert.affectedEmployees.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        {alert.affectedEmployees.length}{" "}
                        {alert.affectedEmployees.length === 1 ? "empleado afectado" : "empleados afectados"}
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 gap-1 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Resolver
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              );
            })}

            {/* Footer con "Ver todos" si hay más avisos */}
            {alerts.length > 4 && (
              <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">
                Ver todos los avisos ({alerts.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

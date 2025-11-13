/**
 * Avisos Críticos del Dashboard
 *
 * Card con lista de alertas que requieren atención
 * Clickeables para navegar al detalle
 */

"use client";

import Link from "next/link";

import { AlertTriangle, ChevronRight, AlertCircle, Info, Clock, Users, Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { CriticalAlert } from "../_lib/dashboard-utils";

interface CriticalAlertsProps {
  alerts: CriticalAlert[];
  isLoading?: boolean;
}

/**
 * Obtiene el icono según el tipo de alerta
 */
function getAlertIcon(type: CriticalAlert["type"]) {
  switch (type) {
    case "conflict":
      return AlertTriangle;
    case "coverage":
      return AlertCircle;
    case "unpublished":
      return Clock;
    case "no_shifts":
      return Users;
    case "hours":
      return Clock;
    default:
      return Info;
  }
}

/**
 * Obtiene el color del badge según la severidad
 */
function getAlertBadgeVariant(severity: CriticalAlert["severity"]): "destructive" | "warning" | "default" {
  switch (severity) {
    case "error":
      return "destructive";
    case "warning":
      return "warning" as any; // Usamos "secondary" con clases custom
    case "info":
      return "default";
    default:
      return "default";
  }
}

export function CriticalAlerts({ alerts, isLoading }: CriticalAlertsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>⚠️ Requieren Atención</CardTitle>
          <CardDescription>Cargando avisos...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Separar por severidad
  const errorAlerts = alerts.filter((a) => a.severity === "error");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");
  const infoAlerts = alerts.filter((a) => a.severity === "info");

  const hasAlerts = alerts.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>⚠️ Requieren Atención</CardTitle>
            <CardDescription>
              {hasAlerts
                ? `${alerts.length} ${alerts.length === 1 ? "aviso" : "avisos"} detectado${alerts.length === 1 ? "" : "s"}`
                : "No hay avisos pendientes"}
            </CardDescription>
          </div>
          {hasAlerts && (
            <Badge variant={errorAlerts.length > 0 ? "destructive" : "secondary"} className="text-xs">
              {errorAlerts.length > 0
                ? `${errorAlerts.length} crítico${errorAlerts.length === 1 ? "" : "s"}`
                : "Todo OK"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!hasAlerts ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
              <Info className="text-muted-foreground size-5" />
            </div>
            <p className="text-muted-foreground text-sm">No hay avisos pendientes</p>
            <p className="text-muted-foreground text-xs">Todos los turnos están en orden</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Avisos críticos (error) */}
            {errorAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}

            {/* Avisos de advertencia (warning) */}
            {warningAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}

            {/* Avisos informativos (info) */}
            {infoAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Card individual de alerta
 */
function AlertCard({ alert }: { alert: CriticalAlert }) {
  const Icon = getAlertIcon(alert.type);
  const hasEmployees = alert.affectedEmployees && alert.affectedEmployees.length > 0;

  const content = (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
        alert.linkTo && "hover:bg-accent cursor-pointer",
        alert.severity === "error" && "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
        alert.severity === "warning" && "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
      )}
    >
      {/* Header con icono y título */}
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border",
            alert.severity === "error" && "border-red-300 bg-red-100 dark:border-red-800 dark:bg-red-900/30",
            alert.severity === "warning" && "border-amber-300 bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30",
            alert.severity === "info" && "bg-muted border",
          )}
        >
          <Icon
            className={cn(
              "size-5",
              alert.severity === "error" && "text-red-600 dark:text-red-400",
              alert.severity === "warning" && "text-amber-600 dark:text-amber-400",
              alert.severity === "info" && "text-muted-foreground",
            )}
          />
        </div>

        {/* Título y descripción */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{alert.title}</p>
            {alert.count !== undefined && (
              <Badge
                variant={alert.severity === "error" ? "destructive" : "secondary"}
                className={cn(
                  "text-xs",
                  alert.severity === "warning" && "border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-950/30",
                )}
              >
                {alert.count}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{alert.description}</p>
        </div>

        {/* Icono de navegación */}
        {alert.linkTo && <ChevronRight className="text-muted-foreground size-4 shrink-0" />}
      </div>

      {/* Semana (prominente) */}
      {alert.weekDisplay && (
        <div className="bg-background/50 flex items-center gap-2 rounded-md border px-3 py-2">
          <Calendar className="text-primary size-4" />
          <span className="text-foreground text-sm font-medium">{alert.weekDisplay}</span>
        </div>
      )}

      {/* Empleados afectados */}
      {hasEmployees && (
        <Collapsible>
          <CollapsibleTrigger className="hover:bg-accent group bg-background/50 flex w-full items-center justify-between rounded-md border px-3 py-2 transition-colors">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground size-4" />
              <span className="text-muted-foreground text-xs font-medium">
                {alert.affectedEmployees.length}{" "}
                {alert.affectedEmployees.length === 1 ? "empleado afectado" : "empleados afectados"}
              </span>
            </div>
            <ChevronRight className="text-muted-foreground size-3 transition-transform group-data-[state=open]:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-background/30 flex flex-wrap gap-1.5 rounded-md border p-2">
              {alert.affectedEmployees.map((employeeName, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {employeeName}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  if (alert.linkTo) {
    return <Link href={alert.linkTo}>{content}</Link>;
  }

  return content;
}

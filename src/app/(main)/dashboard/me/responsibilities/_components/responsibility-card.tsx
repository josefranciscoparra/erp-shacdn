"use client";

import { useState } from "react";

import Link from "next/link";

import { Bell, BellOff, Building2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResponsibilityWithSubscription } from "@/server/actions/responsibilities";

type ResponsibilityCardProps = {
  responsibility: ResponsibilityWithSubscription;
  onSubscribe: () => void;
  onEditSubscription: () => void;
};

export function ResponsibilityCard({ responsibility, onSubscribe, onEditSubscription }: ResponsibilityCardProps) {
  const [loading, setLoading] = useState(false);

  const { scope, subscription, employeesCount, activeAlertsCount } = responsibility;

  // Obtener el título y subtítulo según el scope
  const getTitle = () => {
    if (scope === "ORGANIZATION" && responsibility.organization) {
      return responsibility.organization.name;
    }
    if (scope === "DEPARTMENT" && responsibility.department) {
      return responsibility.department.name;
    }
    if (scope === "COST_CENTER" && responsibility.costCenter) {
      return responsibility.costCenter.name;
    }
    if (scope === "TEAM" && responsibility.team) {
      return responsibility.team.name;
    }
    return "Área desconocida";
  };

  const getSubtitle = () => {
    if (scope === "ORGANIZATION") {
      return "Ámbito: Toda la organización";
    }
    if (scope === "DEPARTMENT") {
      const costCenter = responsibility.costCenter?.name;
      return costCenter ? `Centro: ${costCenter}` : "Departamento";
    }
    if (scope === "COST_CENTER") {
      const code = responsibility.costCenter?.code;
      return code ? `Código: ${code}` : "Centro de coste";
    }
    if (scope === "TEAM") {
      const parts = [];
      if (responsibility.costCenter) parts.push(`Centro: ${responsibility.costCenter.name}`);
      if (responsibility.department) parts.push(`Depto: ${responsibility.department.name}`);
      return parts.length > 0 ? parts.join(" · ") : "Equipo";
    }
    return "";
  };

  const getIcon = () => {
    if (scope === "ORGANIZATION") return <Building2 className="h-5 w-5" />;
    return <Users className="h-5 w-5" />;
  };

  const getScopeLabel = () => {
    if (scope === "ORGANIZATION") return "Organización";
    if (scope === "DEPARTMENT") return "Departamento";
    if (scope === "COST_CENTER") return "Centro";
    if (scope === "TEAM") return "Equipo";
    return scope;
  };

  // URL del dashboard filtrado
  const getDashboardUrl = () => {
    const base = "/dashboard/time-tracking/alerts";
    // TODO: Agregar parámetros de filtro cuando se implemente el filtrado por contexto
    return base;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="text-muted-foreground mt-0.5">{getIcon()}</div>
            <div className="space-y-1">
              <CardTitle className="text-base">{getTitle()}</CardTitle>
              <CardDescription>{getSubtitle()}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0">
            {getScopeLabel()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Métricas */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{employeesCount}</span>
            <span className="text-muted-foreground">empleados</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bell className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{activeAlertsCount}</span>
            <span className="text-muted-foreground">alertas activas</span>
          </div>
        </div>

        {/* Estado de suscripción */}
        {subscription ? (
          <div className="bg-muted/50 space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">Suscrito a alertas</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {subscription.severityLevels.length > 0 && (
                <Badge variant="outline">Filtros: {subscription.severityLevels.join(", ")}</Badge>
              )}
              {subscription.alertTypes.length > 0 && (
                <Badge variant="outline">{subscription.alertTypes.length} tipos de alerta</Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2">
              <BellOff className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-sm">No suscrito a alertas</span>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          <Button onClick={subscription ? onEditSubscription : onSubscribe} disabled={loading} className="flex-1">
            Configurar Alertas
          </Button>
          <Button variant="outline" asChild>
            <Link href={getDashboardUrl()}>Ver Dashboard →</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

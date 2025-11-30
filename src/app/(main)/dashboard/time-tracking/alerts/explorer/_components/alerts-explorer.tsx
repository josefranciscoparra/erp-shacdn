"use client";

import { useMemo, useState } from "react";

import { AlertTriangle, Bell, Layers, Radio, Shield, ShieldCheck } from "lucide-react";

import { SubscriptionDialog } from "@/app/(main)/dashboard/me/responsibilities/_components/subscription-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ResponsibilityWithSubscription } from "@/server/actions/responsibilities";

import type { AlertRow } from "../../_components/alert-columns";

type AlertStats = {
  total: number;
  active: number;
  resolved: number;
  dismissed: number;
  bySeverity: { severity: string; count: number }[];
  byType: { type: string; count: number }[];
};

type BaseNode<TScope extends ResponsibilityWithSubscription["scope"]> = {
  id: string;
  name: string;
  code?: string | null;
  scope: TScope;
  stats: AlertStats;
};

type ExplorerProps = {
  org: { id: string; name: string; stats: AlertStats };
  departments: Array<{ id: string; name: string; stats: AlertStats }>;
  costCenters: Array<{ id: string; name: string; code: string | null; stats: AlertStats }>;
  teams: Array<{ id: string; name: string; code: string | null; stats: AlertStats }>;
  subscriptions: Array<{
    id: string;
    scope: ResponsibilityWithSubscription["scope"];
    departmentId: string | null;
    costCenterId: string | null;
    teamId: string | null;
    severityLevels: string[];
    alertTypes: string[];
    notifyByEmail: boolean;
  }>;
  latestAlerts: AlertRow[];
};

export function AlertsExplorer({ org, departments, costCenters, teams, subscriptions, latestAlerts }: ExplorerProps) {
  const [selected, setSelected] = useState<{ scope: ResponsibilityWithSubscription["scope"]; id: string }>({
    scope: "ORGANIZATION",
    id: org.id,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogResponsibility, setDialogResponsibility] = useState<ResponsibilityWithSubscription | null>(null);

  const sortedDepartments = useMemo(
    () => [...departments].sort((a, b) => b.stats.active - a.stats.active),
    [departments],
  );
  const sortedCostCenters = useMemo(
    () => [...costCenters].sort((a, b) => b.stats.active - a.stats.active),
    [costCenters],
  );
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => b.stats.active - a.stats.active), [teams]);

  const selectedStats = useMemo(() => {
    if (selected.scope === "ORGANIZATION") return org.stats;
    if (selected.scope === "DEPARTMENT") return departments.find((d) => d.id === selected.id)?.stats ?? org.stats;
    if (selected.scope === "COST_CENTER") return costCenters.find((c) => c.id === selected.id)?.stats ?? org.stats;
    if (selected.scope === "TEAM") return teams.find((t) => t.id === selected.id)?.stats ?? org.stats;
    return org.stats;
  }, [selected, org.stats, departments, costCenters, teams]);

  const selectedName = useMemo(() => {
    if (selected.scope === "ORGANIZATION") return org.name;
    if (selected.scope === "DEPARTMENT") return departments.find((d) => d.id === selected.id)?.name ?? "";
    if (selected.scope === "COST_CENTER") return costCenters.find((c) => c.id === selected.id)?.name ?? "";
    if (selected.scope === "TEAM") return teams.find((t) => t.id === selected.id)?.name ?? "";
    return "";
  }, [selected, org.name, departments, costCenters, teams]);

  const selectedAlerts = useMemo(() => {
    return latestAlerts
      .filter((alert) => {
        if (selected.scope === "ORGANIZATION") return true;
        if (selected.scope === "DEPARTMENT") return alert.department?.id === selected.id;
        if (selected.scope === "COST_CENTER") return alert.costCenter?.id === selected.id;
        if (selected.scope === "TEAM") return alert.team?.id === selected.id;
        return true;
      })
      .slice(0, 8);
  }, [latestAlerts, selected]);

  const openSubscriptionDialog = (node: BaseNode<ResponsibilityWithSubscription["scope"]>) => {
    const matched = subscriptions.find((sub) => {
      if (node.scope === "ORGANIZATION") return sub.scope === "ORGANIZATION";
      if (node.scope === "DEPARTMENT") return sub.scope === "DEPARTMENT" && sub.departmentId === node.id;
      if (node.scope === "COST_CENTER") return sub.scope === "COST_CENTER" && sub.costCenterId === node.id;
      if (node.scope === "TEAM") return sub.scope === "TEAM" && sub.teamId === node.id;
      return false;
    });

    const responsibility: ResponsibilityWithSubscription = {
      id: `explorer-${node.scope}-${node.id}`,
      scope: node.scope,
      isActive: true,
      organization: node.scope === "ORGANIZATION" ? { id: org.id, name: org.name } : null,
      department: node.scope === "DEPARTMENT" ? { id: node.id, name: node.name } : null,
      costCenter: node.scope === "COST_CENTER" ? { id: node.id, name: node.name, code: node.code ?? null } : null,
      team: node.scope === "TEAM" ? { id: node.id, name: node.name, code: node.code ?? null } : null,
      subscription: matched
        ? {
            id: matched.id,
            severityLevels: matched.severityLevels,
            alertTypes: matched.alertTypes,
            notifyByEmail: matched.notifyByEmail,
          }
        : null,
      employeesCount: 0,
      activeAlertsCount: node.stats.active,
    };

    setDialogResponsibility(responsibility);
    setDialogOpen(true);
  };

  const renderStatBadge = (stats: AlertStats) => {
    const severityCount = stats.bySeverity.reduce(
      (acc, curr) => ({ ...acc, [curr.severity]: curr.count }),
      {} as Record<string, number>,
    );
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Activas: {stats.active}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Crit: {severityCount.CRITICAL ?? 0}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Warn: {severityCount.WARNING ?? 0}
        </Badge>
      </div>
    );
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Jerarquía
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs uppercase">Organización</p>
              <button
                className={`hover:border-primary w-full rounded-md border p-3 text-left transition ${selected.scope === "ORGANIZATION" ? "border-primary bg-primary/5" : "border-border"}`}
                onClick={() => setSelected({ scope: "ORGANIZATION", id: org.id })}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{org.name}</span>
                  <Badge variant="outline">Total: {org.stats.active}</Badge>
                </div>
                <div className="mt-2">{renderStatBadge(org.stats)}</div>
              </button>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs uppercase">Departamentos</p>
              {sortedDepartments.map((dept) => (
                <button
                  key={dept.id}
                  className={`hover:border-primary w-full rounded-md border p-3 text-left transition ${selected.scope === "DEPARTMENT" && selected.id === dept.id ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => setSelected({ scope: "DEPARTMENT", id: dept.id })}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{dept.name}</span>
                    <Badge variant="secondary">{dept.stats.active}</Badge>
                  </div>
                  <div className="mt-1">{renderStatBadge(dept.stats)}</div>
                </button>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs uppercase">Centros</p>
              {sortedCostCenters.map((cc) => (
                <button
                  key={cc.id}
                  className={`hover:border-primary w-full rounded-md border p-3 text-left transition ${selected.scope === "COST_CENTER" && selected.id === cc.id ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => setSelected({ scope: "COST_CENTER", id: cc.id })}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {cc.name} {cc.code ? `(${cc.code})` : ""}
                    </span>
                    <Badge variant="secondary">{cc.stats.active}</Badge>
                  </div>
                  <div className="mt-1">{renderStatBadge(cc.stats)}</div>
                </button>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs uppercase">Equipos</p>
              {sortedTeams.map((team) => (
                <button
                  key={team.id}
                  className={`hover:border-primary w-full rounded-md border p-3 text-left transition ${selected.scope === "TEAM" && selected.id === team.id ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => setSelected({ scope: "TEAM", id: team.id })}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {team.name} {team.code ? `(${team.code})` : ""}
                    </span>
                    <Badge variant="secondary">{team.stats.active}</Badge>
                  </div>
                  <div className="mt-1">{renderStatBadge(team.stats)}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-4 w-4" />
                {selectedName || "Selección"}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {selected.scope === "ORGANIZATION"
                  ? "Ámbito: Organización"
                  : selected.scope === "DEPARTMENT"
                    ? "Ámbito: Departamento"
                    : selected.scope === "COST_CENTER"
                      ? "Ámbito: Centro de Coste"
                      : "Ámbito: Equipo"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  openSubscriptionDialog({
                    id: selected.id,
                    name: selectedName,
                    scope: selected.scope,
                    stats: selectedStats,
                  })
                }
              >
                <Bell className="mr-2 h-4 w-4" />
                Configurar alertas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Activas" value={selectedStats.active} />
              <StatTile label="Resueltas" value={selectedStats.resolved} />
              <StatTile label="Descartadas" value={selectedStats.dismissed} />
              <StatTile label="Total" value={selectedStats.total} />
            </div>

            <Separator />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Por severidad</p>
                {selectedStats.bySeverity.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin datos.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedStats.bySeverity.map((item) => (
                      <div
                        key={item.severity}
                        className="flex items-center justify-between rounded-md border p-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-primary h-2 w-2 rounded-full" />
                          {item.severity}
                        </div>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Top tipos</p>
                {selectedStats.byType.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin datos.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedStats.byType
                      .slice()
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5)
                      .map((item) => (
                        <div
                          key={item.type}
                          className="flex items-center justify-between rounded-md border p-2 text-sm"
                        >
                          <span>{item.type.replace(/_/g, " ")}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Últimas alertas</p>
              {selectedAlerts.length === 0 ? (
                <div className="text-muted-foreground text-sm">No hay alertas recientes en este ámbito.</div>
              ) : (
                <div className="space-y-2">
                  {selectedAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between rounded-md border p-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle severity={alert.severity} />
                        <div>
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="text-muted-foreground text-xs">{alert.description ?? "Sin descripción"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        responsibility={dialogResponsibility}
        onSuccess={() => setDialogOpen(false)}
      />
    </>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function AlertCircle({ severity }: { severity: string }) {
  if (severity === "CRITICAL") return <AlertTriangle className="text-destructive h-4 w-4" />;
  if (severity === "WARNING") return <Shield className="h-4 w-4 text-amber-500" />;
  return <ShieldCheck className="h-4 w-4 text-blue-500" />;
}

"use client";

import { useMemo, useState } from "react";

import { Users } from "lucide-react";

import { SubscriptionDialog } from "@/app/(main)/dashboard/me/responsibilities/_components/subscription-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ALLOWED_RESPONSIBLE_ROLES } from "@/lib/role-hierarchy";
import {
  assignResponsibility,
  removeResponsibility,
  searchUsersForResponsibility,
} from "@/server/actions/area-responsibilities";
import type { ResponsibilityWithSubscription } from "@/server/actions/responsibilities";

type ScopedResponsible = ResponsibilityWithSubscription & { responsibilityId: string };

type ManagerProps = {
  org: { id: string; name: string };
  departments: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; name: string; code: string | null }>;
  teams: Array<{ id: string; name: string; code: string | null }>;
  responsibles: {
    organization: ScopedResponsible[];
    departments: ScopedResponsible[];
    costCenters: ScopedResponsible[];
    teams: ScopedResponsible[];
  };
  subscriptions: Array<{
    id: string;
    userId: string;
    scope: ResponsibilityWithSubscription["scope"];
    departmentId: string | null;
    costCenterId: string | null;
    teamId: string | null;
    severityLevels: string[];
    alertTypes: string[];
    notifyByEmail: boolean;
  }>;
};

export function ResponsiblesManager({
  org,
  departments,
  costCenters,
  teams,
  responsibles,
  subscriptions,
}: ManagerProps) {
  const [selected, setSelected] = useState<{ scope: ResponsibilityWithSubscription["scope"]; id: string | null }>({
    scope: "ORGANIZATION",
    id: org.id,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogResponsibility, setDialogResponsibility] = useState<ResponsibilityWithSubscription | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; role: string }>>(
    [],
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  const scopedList = useMemo(() => {
    if (selected.scope === "ORGANIZATION") return responsibles.organization;
    if (selected.scope === "DEPARTMENT") {
      return responsibles.departments.filter((r) => r.department?.id === selected.id);
    }
    if (selected.scope === "COST_CENTER") {
      return responsibles.costCenters.filter((r) => r.costCenter?.id === selected.id);
    }
    if (selected.scope === "TEAM") {
      return responsibles.teams.filter((r) => r.team?.id === selected.id);
    }
    return [];
  }, [selected, responsibles]);

  const selectedName = useMemo(() => {
    if (selected.scope === "ORGANIZATION") return org.name;
    if (selected.scope === "DEPARTMENT") return departments.find((d) => d.id === selected.id)?.name ?? "";
    if (selected.scope === "COST_CENTER") return costCenters.find((c) => c.id === selected.id)?.name ?? "";
    if (selected.scope === "TEAM") return teams.find((t) => t.id === selected.id)?.name ?? "";
    return "";
  }, [selected, org.name, departments, costCenters, teams]);

  const subscriptionFor = (responsible: ScopedResponsible) => {
    return subscriptions.find((sub) => {
      if (responsible.scope === "ORGANIZATION")
        return sub.scope === "ORGANIZATION" && sub.userId === responsible.user?.id;
      if (responsible.scope === "DEPARTMENT")
        return (
          sub.scope === "DEPARTMENT" &&
          sub.departmentId === responsible.department?.id &&
          sub.userId === responsible.user?.id
        );
      if (responsible.scope === "COST_CENTER")
        return (
          sub.scope === "COST_CENTER" &&
          sub.costCenterId === responsible.costCenter?.id &&
          sub.userId === responsible.user?.id
        );
      if (responsible.scope === "TEAM")
        return sub.scope === "TEAM" && sub.teamId === responsible.team?.id && sub.userId === responsible.user?.id;
      return false;
    });
  };

  const handleRemove = async (responsibilityId: string) => {
    setBusyId(responsibilityId);
    try {
      await removeResponsibility(responsibilityId);
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  };

  const openSubscriptionDialog = (responsible: ScopedResponsible) => {
    const sub = subscriptionFor(responsible);
    setDialogResponsibility({
      id: responsible.id,
      scope: responsible.scope,
      isActive: true,
      organization: responsible.scope === "ORGANIZATION" ? { id: org.id, name: org.name } : null,
      department:
        responsible.scope === "DEPARTMENT"
          ? { id: responsible.department?.id ?? "", name: responsible.department?.name ?? "" }
          : null,
      costCenter:
        responsible.scope === "COST_CENTER"
          ? {
              id: responsible.costCenter?.id ?? "",
              name: responsible.costCenter?.name ?? "",
              code: responsible.costCenter?.code ?? null,
            }
          : null,
      team:
        responsible.scope === "TEAM"
          ? { id: responsible.team?.id ?? "", name: responsible.team?.name ?? "", code: responsible.team?.code ?? null }
          : null,
      subscription: sub
        ? {
            id: sub.id,
            severityLevels: sub.severityLevels,
            alertTypes: sub.alertTypes,
            notifyByEmail: sub.notifyByEmail,
          }
        : null,
      employeesCount: 0,
      activeAlertsCount: 0,
    });
    setDialogOpen(true);
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    setSelectedUser(null);
    if (term.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const res = await searchUsersForResponsibility(term.trim());
    setSearchLoading(false);
    if (res.success && res.users) {
      setSearchResults(res.users);
    } else {
      setSearchResults([]);
    }
  };

  const handleAssign = async () => {
    if (!selected.scope || !selectedUser) return;
    const scopeId =
      selected.scope === "ORGANIZATION"
        ? null
        : selected.scope === "DEPARTMENT"
          ? selected.id
          : selected.scope === "COST_CENTER"
            ? selected.id
            : selected.scope === "TEAM"
              ? selected.id
              : null;

    setBusyId(selectedUser.id);
    const res = await assignResponsibility({
      userId: selectedUser.id,
      scope: selected.scope,
      scopeId,
      permissions: ["VIEW_ALERTS", "RESOLVE_ALERTS"],
      createSubscription: true,
    });
    setBusyId(null);
    if (!res.success) {
      alert(res.error ?? "No se pudo asignar");
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ámbitos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SectionList
              title="Organización"
              items={[
                {
                  id: org.id,
                  name: org.name,
                  scope: "ORGANIZATION" as const,
                  count: responsibles.organization.length,
                },
              ]}
              selected={selected}
              onSelect={setSelected}
            />

            <Separator />
            <SectionList
              title="Departamentos"
              items={departments.map((d) => ({
                id: d.id,
                name: d.name,
                scope: "DEPARTMENT" as const,
                count: responsibles.departments.filter((r) => r.department?.id === d.id).length,
              }))}
              selected={selected}
              onSelect={setSelected}
            />

            <Separator />
            <SectionList
              title="Centros"
              items={costCenters.map((c) => ({
                id: c.id,
                name: c.code ? `${c.name} (${c.code})` : c.name,
                scope: "COST_CENTER" as const,
                count: responsibles.costCenters.filter((r) => r.costCenter?.id === c.id).length,
              }))}
              selected={selected}
              onSelect={setSelected}
            />

            <Separator />
            <SectionList
              title="Equipos"
              items={teams.map((t) => ({
                id: t.id,
                name: t.code ? `${t.name} (${t.code})` : t.name,
                scope: "TEAM" as const,
                count: responsibles.teams.filter((r) => r.team?.id === t.id).length,
              }))}
              selected={selected}
              onSelect={setSelected}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>{selectedName || "Selecciona un ámbito"}</CardTitle>
              <p className="text-muted-foreground text-sm">Responsables asignados a este ámbito.</p>
            </div>
            <Button size="sm" onClick={() => setAddDialogOpen(true)} disabled={!selected.scope}>
              Añadir responsable
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {scopedList.length === 0 ? (
              <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
                No hay responsables asignados aquí.
              </div>
            ) : (
              <div className="space-y-3">
                {scopedList.map((resp) => {
                  const sub = subscriptionFor(resp);
                  return (
                    <div key={resp.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Users className="text-primary h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{resp.user?.name}</p>
                          <p className="text-muted-foreground text-sm">{resp.user?.email}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            {sub ? (
                              <>
                                <Badge variant="outline">Suscrito</Badge>
                                {sub.severityLevels.length > 0 && (
                                  <Badge variant="secondary">Sev: {sub.severityLevels.join(", ")}</Badge>
                                )}
                                {sub.alertTypes.length > 0 && (
                                  <Badge variant="secondary">{sub.alertTypes.length} tipos</Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline">Sin suscripción</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openSubscriptionDialog(resp)}>
                          Alertas
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemove(resp.responsibilityId)}
                          disabled={busyId === resp.responsibilityId}
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        responsibility={dialogResponsibility}
        onSuccess={() => window.location.reload()}
      />

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir responsable</DialogTitle>
            <DialogDescription>
              Roles permitidos: {ALLOWED_RESPONSIBLE_ROLES.join(", ")}. Escribe al menos 2 letras para buscar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-2">
              {searchTerm.trim().length < 2 && (
                <p className="text-muted-foreground text-sm">Escribe 2 letras para buscar.</p>
              )}
              {searchLoading && <p className="text-muted-foreground text-sm">Buscando...</p>}
              {!searchLoading && searchResults.length === 0 && searchTerm.trim().length >= 2 && (
                <p className="text-muted-foreground text-sm">Sin resultados.</p>
              )}
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  className={`hover:border-primary w-full rounded-md border p-2 text-left transition ${selectedUser?.id === user.id ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <p className="font-medium">{user.name}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {user.role}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={!selectedUser || busyId === selectedUser?.id}>
              {busyId === selectedUser?.id ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionList({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: Array<{ id: string; name: string; scope: ResponsibilityWithSubscription["scope"]; count: number }>;
  selected: { scope: ResponsibilityWithSubscription["scope"]; id: string | null };
  onSelect: (s: { scope: ResponsibilityWithSubscription["scope"]; id: string | null }) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs uppercase">{title}</p>
      {items.length === 0 && <p className="text-muted-foreground text-sm">Sin datos.</p>}
      {items.map((item) => (
        <button
          key={item.id}
          className={`hover:border-primary w-full rounded-md border p-3 text-left transition ${selected.scope === item.scope && selected.id === item.id ? "border-primary bg-primary/5" : "border-border"}`}
          onClick={() => onSelect({ scope: item.scope, id: item.id })}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{item.name}</span>
            <Badge variant="secondary">{item.count}</Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

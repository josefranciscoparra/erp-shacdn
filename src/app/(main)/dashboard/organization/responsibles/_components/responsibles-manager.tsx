"use client";

import { useMemo, useState } from "react";

import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { SubscriptionDialog } from "@/app/(main)/dashboard/me/responsibilities/_components/subscription-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  assignResponsibility,
  removeResponsibility,
  searchUsersForResponsibility,
} from "@/server/actions/area-responsibilities";
import type { ResponsibilityWithSubscription } from "@/server/actions/responsibilities";
import { ALLOWED_RESPONSIBLE_ROLES } from "@/services/permissions";

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
  const [navSearchTerm, setNavSearchTerm] = useState(""); // Buscador de navegación lateral
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; role: string }>>(
    [],
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  // Filtrado de navegación
  const filteredDepartments = useMemo(
    () => departments.filter((d) => d.name.toLowerCase().includes(navSearchTerm.toLowerCase())),
    [departments, navSearchTerm],
  );

  const filteredCostCenters = useMemo(
    () =>
      costCenters.filter(
        (c) =>
          c.name.toLowerCase().includes(navSearchTerm.toLowerCase()) ||
          (c.code && c.code.toLowerCase().includes(navSearchTerm.toLowerCase())),
      ),
    [costCenters, navSearchTerm],
  );

  const filteredTeams = useMemo(
    () =>
      teams.filter(
        (t) =>
          t.name.toLowerCase().includes(navSearchTerm.toLowerCase()) ||
          (t.code && t.code.toLowerCase().includes(navSearchTerm.toLowerCase())),
      ),
    [teams, navSearchTerm],
  );

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
    if (!confirm("¿Estás seguro de quitar a este responsable? Perderá acceso a las alertas de este ámbito.")) return;

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
      <div className="grid h-[calc(100vh-12rem)] min-h-[500px] gap-4 lg:grid-cols-12">
        {/* SIDEBAR DE NAVEGACIÓN */}
        <Card className="flex flex-col overflow-hidden lg:col-span-4">
          <CardHeader className="pb-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
              <Input
                placeholder="Buscar área..."
                className="pl-8"
                value={navSearchTerm}
                onChange={(e) => setNavSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[calc(100vh-18rem)]">
              <div className="p-4 pt-0">
                <SectionItem
                  id={org.id}
                  name={org.name}
                  scope="ORGANIZATION"
                  count={responsibles.organization.length}
                  selected={selected}
                  onSelect={setSelected}
                  icon={<ShieldCheck className="h-4 w-4" />}
                />

                <Accordion
                  type="multiple"
                  defaultValue={["departments", "cost-centers", "teams"]}
                  className="mt-4 w-full"
                >
                  <AccordionItem value="departments" className="border-b-0">
                    <AccordionTrigger className="text-muted-foreground py-2 text-sm font-semibold hover:no-underline">
                      DEPARTAMENTOS ({filteredDepartments.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1">
                        {filteredDepartments.length === 0 && (
                          <p className="text-muted-foreground px-2 text-xs italic">No encontrados</p>
                        )}
                        {filteredDepartments.map((d) => (
                          <SectionItem
                            key={d.id}
                            id={d.id}
                            name={d.name}
                            scope="DEPARTMENT"
                            count={responsibles.departments.filter((r) => r.department?.id === d.id).length}
                            selected={selected}
                            onSelect={setSelected}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="cost-centers" className="border-b-0">
                    <AccordionTrigger className="text-muted-foreground py-2 text-sm font-semibold hover:no-underline">
                      CENTROS DE COSTE ({filteredCostCenters.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1">
                        {filteredCostCenters.length === 0 && (
                          <p className="text-muted-foreground px-2 text-xs italic">No encontrados</p>
                        )}
                        {filteredCostCenters.map((c) => (
                          <SectionItem
                            key={c.id}
                            id={c.id}
                            name={c.code ? `${c.name} (${c.code})` : c.name}
                            scope="COST_CENTER"
                            count={responsibles.costCenters.filter((r) => r.costCenter?.id === c.id).length}
                            selected={selected}
                            onSelect={setSelected}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="teams" className="border-b-0">
                    <AccordionTrigger className="text-muted-foreground py-2 text-sm font-semibold hover:no-underline">
                      EQUIPOS ({filteredTeams.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1">
                        {filteredTeams.length === 0 && (
                          <p className="text-muted-foreground px-2 text-xs italic">No encontrados</p>
                        )}
                        {filteredTeams.map((t) => (
                          <SectionItem
                            key={t.id}
                            id={t.id}
                            name={t.code ? `${t.name} (${t.code})` : t.name}
                            scope="TEAM"
                            count={responsibles.teams.filter((r) => r.team?.id === t.id).length}
                            selected={selected}
                            onSelect={setSelected}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* PANEL PRINCIPAL */}
        <Card className="flex flex-col lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
            <div>
              <CardTitle className="text-xl">{selectedName || "Selecciona un ámbito"}</CardTitle>
              <CardDescription className="mt-1">{scopedList.length} usuarios responsables asignados</CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)} disabled={!selected.scope} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Añadir
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="p-6">
                {scopedList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-muted mb-4 rounded-full p-4">
                      <Users className="text-muted-foreground h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold">Sin responsables</h3>
                    <p className="text-muted-foreground mt-1 mb-4 max-w-sm">
                      No hay nadie asignado para gestionar las alertas de este ámbito. Añade un responsable para
                      asegurar que las incidencias se resuelven.
                    </p>
                    <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
                      Añadir primer responsable
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                    {scopedList.map((resp) => {
                      const sub = subscriptionFor(resp);
                      return (
                        <div
                          key={resp.id}
                          className="group hover:border-primary/50 bg-card relative flex items-start gap-3 rounded-lg border p-4 transition-colors hover:shadow-sm"
                        >
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src={`/avatars/${resp.user?.id}.png`} alt={resp.user?.name} />
                            <AvatarFallback>{resp.user?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="truncate pr-2 font-semibold">{resp.user?.name}</p>
                                <p className="text-muted-foreground truncate text-xs">{resp.user?.email}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground -mt-1 -mr-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => openSubscriptionDialog(resp)}>
                                    <AlertCircle className="mr-2 h-4 w-4" /> Configurar alertas
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleRemove(resp.responsibilityId)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Quitar responsable
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {sub ? (
                                <Badge
                                  variant={sub.notifyByEmail ? "default" : "secondary"}
                                  className="h-5 gap-1 px-1.5 text-[10px]"
                                >
                                  {sub.notifyByEmail ? <Check className="h-3 w-3" /> : null}
                                  {sub.notifyByEmail ? "Email activo" : "Solo App"}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground h-5 border-dashed px-1.5 text-[10px]"
                                >
                                  Sin notificaciones
                                </Badge>
                              )}
                              {sub && sub.severityLevels.includes("CRITICAL") && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                  Críticas
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Añadir responsable</DialogTitle>
            <DialogDescription>
              Busca un usuario para asignarlo a <strong>{selectedName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <Command className="rounded-lg border shadow-md">
            <CommandInput placeholder="Buscar usuario..." value={searchTerm} onValueChange={handleSearch} />
            <CommandList className="h-[200px]">
              <CommandEmpty>
                {searchTerm.length < 2
                  ? "Escribe 2 letras para buscar..."
                  : searchLoading
                    ? "Buscando..."
                    : "No se encontraron usuarios."}
              </CommandEmpty>
              <CommandGroup heading="Usuarios encontrados">
                {searchResults.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.name}
                    onSelect={() => setSelectedUser(user)}
                    className="flex cursor-pointer items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-muted-foreground text-xs">{user.email}</span>
                      </div>
                    </div>
                    {selectedUser?.id === user.id && <Check className="text-primary h-4 w-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={!selectedUser || busyId === selectedUser?.id}>
              {busyId === selectedUser?.id ? "Asignando..." : "Confirmar Asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionItem({
  id,
  name,
  scope,
  count,
  selected,
  onSelect,
  icon,
}: {
  id: string;
  name: string;
  scope: ResponsibilityWithSubscription["scope"];
  count: number;
  selected: { scope: ResponsibilityWithSubscription["scope"]; id: string | null };
  onSelect: (s: { scope: ResponsibilityWithSubscription["scope"]; id: string | null }) => void;
  icon?: React.ReactNode;
}) {
  const isSelected = selected.scope === scope && selected.id === id;

  return (
    <button
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
        isSelected ? "bg-primary text-primary-foreground font-medium shadow-sm" : "hover:bg-muted text-foreground"
      }`}
      onClick={() => onSelect({ scope, id })}
    >
      <div className="flex items-center gap-2 truncate">
        {icon}
        <span className="truncate">{name}</span>
      </div>
      {count > 0 && (
        <Badge
          variant={isSelected ? "secondary" : "outline"}
          className={`h-5 min-w-[1.25rem] justify-center px-1.5 ${isSelected ? "bg-primary-foreground text-primary border-transparent" : "text-muted-foreground"}`}
        >
          {count}
        </Badge>
      )}
    </button>
  );
}

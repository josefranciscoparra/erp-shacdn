"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Check, ChevronDown, ChevronUp, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  type ApprovalCriterion,
  type ApprovalRequestType,
  type ApprovalSettings,
  DEFAULT_APPROVAL_SETTINGS,
} from "@/lib/approvals/approval-settings";
import { cn } from "@/lib/utils";
import { getApprovalSettings, updateApprovalSettings } from "@/server/actions/approval-settings";

type WorkflowKey = ApprovalRequestType;

const workflowLabels: Record<WorkflowKey, { title: string; description: string }> = {
  PTO: {
    title: "Ausencias",
    description: "Define quien aprueba vacaciones y permisos.",
  },
  MANUAL_TIME_ENTRY: {
    title: "Fichajes manuales",
    description: "Define quien valida solicitudes de correccion de fichajes.",
  },
  TIME_BANK: {
    title: "Bolsa de horas",
    description: "Define quien revisa solicitudes de compensacion/recuperacion.",
  },
  EXPENSE: {
    title: "Gastos",
    description: "Define quien aprueba los gastos enviados por empleados.",
  },
};

const criterionLabels: Record<ApprovalCriterion, string> = {
  DIRECT_MANAGER: "Responsable directo (manager del contrato)",
  TEAM_RESPONSIBLE: "Responsable de equipo",
  DEPARTMENT_RESPONSIBLE: "Responsable de departamento",
  COST_CENTER_RESPONSIBLE: "Responsable de centro de coste",
  HR_ADMIN: "RRHH (empresa)",
  GROUP_HR: "RRHH del grupo",
};

const criterionOptions: ApprovalCriterion[] = [
  "DIRECT_MANAGER",
  "TEAM_RESPONSIBLE",
  "DEPARTMENT_RESPONSIBLE",
  "COST_CENTER_RESPONSIBLE",
  "HR_ADMIN",
  "GROUP_HR",
];

type ApproverUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  source?: "ORG" | "GROUP";
  baseOrgName?: string | null;
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Organizacion",
  HR_ADMIN: "Admin RRHH",
  HR_ASSISTANT: "Asistente RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

function ApprovalOrderEditor({
  order,
  onChange,
}: {
  order: ApprovalCriterion[];
  onChange: (next: ApprovalCriterion[]) => void;
}) {
  const availableOptions = useMemo(() => criterionOptions.filter((option) => !order.includes(option)), [order]);

  const moveItem = (from: number, to: number) => {
    const next = [...order];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {order.map((criterion, index) => (
        <div key={criterion} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {index + 1}. {criterionLabels[criterion]}
            </span>
            <span className="text-muted-foreground text-xs">Se usa si existe para el empleado.</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => moveItem(index, index - 1)}
              disabled={index === 0}
              aria-label="Subir criterio"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => moveItem(index, index + 1)}
              disabled={index === order.length - 1}
              aria-label="Bajar criterio"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(order.filter((item) => item !== criterion))}
              disabled={order.length <= 1}
              aria-label="Eliminar criterio"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Eliminar criterio</span>
            </Button>
          </div>
        </div>
      ))}

      {availableOptions.length > 0 && (
        <div className="flex items-center gap-3">
          <Select
            value=""
            onValueChange={(value) => {
              if (!value) return;
              onChange([...order, value as ApprovalCriterion]);
            }}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Agregar criterio..." />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {criterionLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function ApproverListEditor({
  users,
  value,
  onChange,
  isLoading,
  hasGroupScope,
}: {
  users: ApproverUser[];
  value: string[];
  onChange: (next: string[]) => void;
  isLoading: boolean;
  hasGroupScope: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedUsers = useMemo(() => users.filter((user) => value.includes(user.id)), [users, value]);
  const missingCount = value.length - selectedUsers.length;
  const { orgUsers, groupUsers } = useMemo(() => {
    const orgList: ApproverUser[] = [];
    const groupList: ApproverUser[] = [];
    users.forEach((user) => {
      if (user.source === "GROUP") {
        groupList.push(user);
      } else {
        orgList.push(user);
      }
    });
    return { orgUsers: orgList, groupUsers: groupList };
  }, [users]);

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
      return;
    }

    onChange([...value, userId]);
  };

  const removeUser = (userId: string) => {
    onChange(value.filter((id) => id !== userId));
  };

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} disabled={isLoading} className="w-full">
            <span className="text-muted-foreground truncate">
              {value.length === 0
                ? "Seleccionar aprobadores..."
                : `${value.length} aprobador${value.length === 1 ? "" : "es"} seleccionado${value.length === 1 ? "" : "s"}`}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[520px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar usuario..." />
            <CommandList className="max-h-[320px]">
              {isLoading ? (
                <div className="text-muted-foreground flex items-center justify-center py-6 text-sm">
                  Cargando usuarios...
                </div>
              ) : (
                <>
                  <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                  <CommandGroup heading="Usuarios de la organizacion">
                    {orgUsers.map((user) => {
                      const isSelected = value.includes(user.id);
                      return (
                        <CommandItem
                          key={user.id}
                          value={`${user.name} ${user.email}`}
                          onSelect={() => toggleUser(user.id)}
                        >
                          <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                          <Avatar className="mr-2 h-7 w-7">
                            <AvatarImage src={user.image ?? undefined} alt={user.name} />
                            <AvatarFallback className="text-xs">
                              {user.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-1 items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">{user.name}</span>
                              <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge variant="outline">{roleLabels[user.role] ?? user.role}</Badge>
                              <Badge variant="secondary">Empresa</Badge>
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  {(hasGroupScope || groupUsers.length > 0) && (
                    <CommandGroup heading="Usuarios del grupo">
                      {groupUsers.length === 0 ? (
                        <div className="text-muted-foreground px-3 py-4 text-xs">
                          No hay usuarios del grupo disponibles en esta organizacion.
                        </div>
                      ) : (
                        groupUsers.map((user) => {
                          const isSelected = value.includes(user.id);
                          const groupLabel = user.baseOrgName ? `Grupo: ${user.baseOrgName}` : "Grupo";
                          return (
                            <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.email}`}
                              onSelect={() => toggleUser(user.id)}
                            >
                              <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                              <Avatar className="mr-2 h-7 w-7">
                                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                                <AvatarFallback className="text-xs">
                                  {user.name
                                    .split(" ")
                                    .map((part) => part[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-1 items-center justify-between gap-3">
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate">{user.name}</span>
                                  <span className="text-muted-foreground truncate text-xs">
                                    {user.email} • {groupLabel}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Badge variant="outline">{roleLabels[user.role] ?? user.role}</Badge>
                                  <Badge variant="secondary">Grupo</Badge>
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })
                      )}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
              <span className="max-w-[220px] truncate">{user.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeUser(user.id);
                }}
                className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Eliminar</span>
              </button>
            </Badge>
          ))}
        </div>
      )}

      {missingCount > 0 && (
        <p className="text-muted-foreground text-xs">
          {missingCount} aprobador{missingCount === 1 ? "" : "es"} ya no esta disponible en la organizacion.
        </p>
      )}
    </div>
  );
}

export function ApprovalSettingsTab() {
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [approverUsers, setApproverUsers] = useState<ApproverUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [hasGroupScope, setHasGroupScope] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getApprovalSettings();
      setSettings(data);
    } catch (error) {
      console.error("Error al cargar configuracion de aprobaciones:", error);
      setSettings(DEFAULT_APPROVAL_SETTINGS);
      toast.error("No se pudo cargar la configuracion de aprobaciones");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const loadApproverUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch("/api/users?roles=MANAGER,HR_ASSISTANT,HR_ADMIN,ORG_ADMIN");

      if (!response.ok) {
        throw new Error("No se pudieron cargar los usuarios");
      }

      const data = await response.json();
      setApproverUsers(data.users ?? []);
      setHasGroupScope(data.hasGroupScope ?? false);
    } catch (error) {
      console.error("Error al cargar usuarios para aprobaciones:", error);
      toast.error("No se pudieron cargar los usuarios para aprobaciones");
      setHasGroupScope(false);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void loadApproverUsers();
  }, [loadApproverUsers]);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const result = await updateApprovalSettings(settings);
      if (result.success) {
        toast.success("Configuracion de aprobaciones guardada");
      } else {
        toast.error(result.error ?? "No se pudo guardar la configuracion");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border p-6">
          <div className="text-muted-foreground text-sm">Cargando configuracion...</div>
        </Card>
      </div>
    );
  }

  const workflows = settings.workflows;

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-primary h-5 w-5" />
          <div>
            <h3 className="font-semibold">Flujo de aprobaciones</h3>
            <p className="text-muted-foreground text-sm">
              El sistema utiliza el primer criterio que aplique para cada empleado. Si no encuentra aprobadores, se
              activa el fallback de RRHH.
            </p>
          </div>
        </div>
      </Card>

      {(["PTO", "MANUAL_TIME_ENTRY", "TIME_BANK", "EXPENSE"] as WorkflowKey[]).map((key) => {
        const workflow = workflows[key];
        return (
          <Card key={key} className="rounded-lg border p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{workflowLabels[key].title}</h3>
                <p className="text-muted-foreground text-sm">{workflowLabels[key].description}</p>
              </div>

              <div className="grid gap-4 @xl/main:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Modo de aprobacion</p>
                  <Select
                    value={workflow.mode}
                    onValueChange={(value) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              workflows: {
                                ...prev.workflows,
                                [key]: {
                                  ...prev.workflows[key],
                                  mode: value === "LIST" ? "LIST" : "HIERARCHY",
                                },
                              },
                            }
                          : prev,
                      )
                    }
                  >
                    <SelectTrigger className="mt-2 w-full max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIST">Lista de aprobadores</SelectItem>
                      <SelectItem value="HIERARCHY">Jerarquia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-muted-foreground text-sm">
                  {workflow.mode === "LIST"
                    ? "Si la lista esta vacia, se aplicara el orden jerarquico configurado."
                    : "Se aplica el orden jerarquico configurado. Siempre hay fallback a RRHH."}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">Orden jerarquico</p>
                <ApprovalOrderEditor
                  order={workflow.criteriaOrder}
                  onChange={(next) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            workflows: {
                              ...prev.workflows,
                              [key]: {
                                ...prev.workflows[key],
                                criteriaOrder: next,
                              },
                            },
                          }
                        : prev,
                    )
                  }
                />
              </div>

              {workflow.mode === "LIST" && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">Lista de aprobadores</p>
                      <p className="text-muted-foreground text-xs">
                        Todos los aprobadores de la lista reciben notificacion. Si esta vacia se usa la jerarquia.
                      </p>
                    </div>
                    <ApproverListEditor
                      users={approverUsers}
                      value={workflow.approverList}
                      onChange={(next) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                workflows: {
                                  ...prev.workflows,
                                  [key]: {
                                    ...prev.workflows[key],
                                    approverList: next,
                                  },
                                },
                              }
                            : prev,
                        )
                      }
                      isLoading={isLoadingUsers}
                      hasGroupScope={hasGroupScope}
                    />
                  </div>
                </>
              )}
            </div>
          </Card>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}

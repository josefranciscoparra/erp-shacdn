"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { Role } from "@prisma/client";
import { Building2, CirclePlus, Folders, Loader2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deactivateOrganizationGroup,
  deleteOrganizationGroup,
  listOrganizationGroups,
  reactivateOrganizationGroup,
} from "@/server/actions/organization-groups";

import { CreateGroupDialog } from "../groups/_components/create-group-dialog";
import { GroupsDataTable } from "../groups/_components/groups-data-table";
import { ManageGroupDialog } from "../groups/_components/manage-group-dialog";
import type { OrganizationGroupRow } from "../groups/_components/types";

import { OrganizationFormDialog, type OrganizationFormValues } from "./_components/organization-form-dialog";
import { OrganizationLifecycleDialog } from "./_components/organization-lifecycle-dialog";
import { OrganizationSetupDialog } from "./_components/organization-setup-dialog";
import { OrganizationsTable } from "./_components/organizations-table";
import { StatsCards } from "./_components/stats-cards";
import type { OrganizationItem } from "./_components/types";

type OrganizationLifecycleMode = "deactivate" | "reactivate" | "purge";
type GroupActionMode = "deactivate" | "reactivate" | "delete";

interface OrganizationsResponse {
  organizations?: OrganizationItem[];
}

async function requestOrganizationAction<TResponse>(
  action: "create" | "update" | "toggle-active",
  data: unknown,
  errorMessage: string,
): Promise<TResponse> {
  const response = await fetch("/api/admin/organizations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      data,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? errorMessage);
  }

  return payload as TResponse;
}

export default function OrganizationsManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state - read from URL param if present
  const initialTab = searchParams.get("tab") === "groups" ? "groups" : "organizations";
  const [activeMainTab, setActiveMainTab] = useState<"organizations" | "groups">(initialTab);

  // Organizations state
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupDrawerOpen, setSetupDrawerOpen] = useState(false);
  const [setupOrganization, setSetupOrganization] = useState<OrganizationItem | null>(null);
  const [isSeedingBasics, setIsSeedingBasics] = useState(false);

  // Groups state
  const [groups, setGroups] = useState<OrganizationGroupRow[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [manageGroupDialogOpen, setManageGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<OrganizationGroupRow | null>(null);
  const [lifecycleMode, setLifecycleMode] = useState<OrganizationLifecycleMode | null>(null);
  const [lifecycleOrganization, setLifecycleOrganization] = useState<OrganizationItem | null>(null);
  const [groupActionMode, setGroupActionMode] = useState<GroupActionMode | null>(null);
  const [groupActionTarget, setGroupActionTarget] = useState<OrganizationGroupRow | null>(null);
  const [isGroupActionLoading, setIsGroupActionLoading] = useState(false);

  const userRole = session?.user.role as Role | undefined;
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const fetchOrganizations = useCallback(
    async (options?: { showLoader?: boolean }): Promise<OrganizationItem[] | null> => {
      const shouldShowLoader = options?.showLoader ?? true;

      try {
        if (shouldShowLoader) {
          setIsLoading(true);
        }
        setError(null);
        const response = await fetch("/api/admin/organizations", { cache: "no-store" });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudieron obtener las organizaciones");
        }

        const data = payload as OrganizationsResponse;
        const list = data.organizations ?? [];
        setOrganizations(list);
        return list;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error inesperado";
        setError(message);
        return null;
      } finally {
        if (shouldShowLoader) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const fetchGroups = useCallback(async () => {
    if (!isSuperAdmin) return;
    setIsLoadingGroups(true);
    setGroupsError(null);
    try {
      const result = await listOrganizationGroups();
      if (!result.success || !result.groups) {
        setGroupsError(result.error ?? "No se pudieron cargar los grupos");
        return;
      }
      setGroups(result.groups);
    } catch (err) {
      setGroupsError(err instanceof Error ? err.message : "No se pudieron cargar los grupos");
    } finally {
      setIsLoadingGroups(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (status === "authenticated" && isSuperAdmin) {
      void fetchOrganizations();
      void fetchGroups();
    }
  }, [status, isSuperAdmin, fetchOrganizations, fetchGroups]);

  const organizationCount = useMemo(() => organizations.length, [organizations]);
  const groupsCount = useMemo(() => groups.length, [groups]);

  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedOrganization(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (organization: OrganizationItem) => {
    setDialogMode("edit");
    setSelectedOrganization(organization);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: OrganizationFormValues) => {
    try {
      setIsSubmitting(true);

      const isCreating = dialogMode === "create";
      const action = isCreating ? "create" : "update";

      if (!isCreating && !selectedOrganization) {
        throw new Error("No se ha seleccionado ninguna organización para editar");
      }

      const payloadData = isCreating
        ? values
        : {
            id: selectedOrganization!.id,
            ...values,
          };

      await requestOrganizationAction<unknown>(action, payloadData, "No se pudo guardar la organización");

      const successMessage = isCreating
        ? "Organización creada correctamente"
        : "Organización actualizada correctamente";

      toast.success(successMessage);

      setDialogOpen(false);
      setSelectedOrganization(null);
      await fetchOrganizations();
      router.refresh();
    } catch (error) {
      console.error("Error guardando organización", error);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la organización");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSetup = (organization: OrganizationItem) => {
    setSetupOrganization(organization);
    setSetupDrawerOpen(true);
  };

  const handleSeedBasics = async () => {
    if (!setupOrganization) {
      return;
    }

    try {
      setIsSeedingBasics(true);
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "seed-basics",
          data: {
            id: setupOrganization.id,
          },
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudieron crear los catálogos base");
      }

      const created = (payload?.created ?? {}) as {
        costCenter?: boolean;
        department?: boolean;
        scheduleTemplate?: boolean;
      };

      const summaryParts: string[] = [];
      if (created.costCenter) summaryParts.push("centro de trabajo");
      if (created.department) summaryParts.push("departamento");
      if (created.scheduleTemplate) summaryParts.push("horario");

      const refreshed = await fetchOrganizations({ showLoader: false });
      if (refreshed) {
        const updatedOrganization = refreshed.find((item) => item.id === setupOrganization.id);
        if (updatedOrganization) {
          setSetupOrganization(updatedOrganization);
        }
      }

      router.refresh();

      const successMessage =
        summaryParts.length > 0
          ? `Listo: ${summaryParts.join(", ")} ${summaryParts.length === 1 ? "creado" : "creados"} automáticamente.`
          : "Todo estaba preparado, no se generaron nuevos catálogos.";

      toast.success(successMessage);
    } catch (error) {
      console.error("Error al crear catálogos base", error);
      toast.error(error instanceof Error ? error.message : "No se pudieron crear los catálogos base");
    } finally {
      setIsSeedingBasics(false);
    }
  };

  const handleManageGroup = (group: OrganizationGroupRow) => {
    setSelectedGroup(group);
    setManageGroupDialogOpen(true);
  };

  const handleOpenLifecycle = (mode: OrganizationLifecycleMode, organization: OrganizationItem) => {
    setLifecycleMode(mode);
    setLifecycleOrganization(organization);
  };

  const handleCloseLifecycle = () => {
    setLifecycleMode(null);
    setLifecycleOrganization(null);
  };

  const handleLifecycleCompleted = async () => {
    await fetchOrganizations({ showLoader: false });
    if (activeMainTab === "groups") {
      await fetchGroups();
    }
    router.refresh();
  };

  const handleOpenGroupAction = (mode: GroupActionMode, group: OrganizationGroupRow) => {
    setGroupActionMode(mode);
    setGroupActionTarget(group);
  };

  const handleCloseGroupAction = () => {
    setGroupActionMode(null);
    setGroupActionTarget(null);
  };

  const handleConfirmGroupAction = () => {
    if (!groupActionTarget || !groupActionMode) return;

    setIsGroupActionLoading(true);
    const actionTarget = groupActionTarget;
    const actionMode = groupActionMode;

    const run = async () => {
      try {
        const result =
          actionMode === "deactivate"
            ? await deactivateOrganizationGroup(actionTarget.id)
            : actionMode === "reactivate"
              ? await reactivateOrganizationGroup(actionTarget.id)
              : await deleteOrganizationGroup(actionTarget.id);

        if (!result.success) {
          toast.error(result.error ?? "No se pudo completar la acción");
          return;
        }

        const message =
          actionMode === "deactivate"
            ? "Grupo dado de baja"
            : actionMode === "reactivate"
              ? "Grupo reactivado"
              : "Grupo eliminado";

        toast.success(message);
        await fetchGroups();
      } catch (error) {
        console.error("Error ejecutando acción de grupo", error);
        toast.error(error instanceof Error ? error.message : "No se pudo completar la acción");
      } finally {
        setIsGroupActionLoading(false);
        handleCloseGroupAction();
      }
    };

    void run();
  };

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <EmptyState
        icon={<Building2 className="mx-auto h-12 w-12" />}
        title="Acceso exclusivo para SUPER_ADMIN"
        description="Solo los super administradores pueden gestionar las organizaciones."
      />
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Administración" subtitle="Gestiona organizaciones y grupos de tu plataforma" />

      <Tabs
        value={activeMainTab}
        onValueChange={(value) => setActiveMainTab(value as "organizations" | "groups")}
        className="w-full"
      >
        {/* Mobile: Select | Desktop: TabsList */}
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="main-view-selector" className="sr-only">
            Vista principal
          </Label>
          <Select
            value={activeMainTab}
            onValueChange={(value) => setActiveMainTab(value as "organizations" | "groups")}
          >
            <SelectTrigger className="flex w-fit @xl/main:hidden" size="sm" id="main-view-selector">
              <SelectValue placeholder="Seleccionar vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="organizations">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organizaciones ({organizationCount})
                </div>
              </SelectItem>
              <SelectItem value="groups">
                <div className="flex items-center gap-2">
                  <Folders className="h-4 w-4" />
                  Grupos ({groupsCount})
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @xl/main:flex">
            <TabsTrigger value="organizations" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organizaciones
              <Badge variant="secondary">{organizationCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Folders className="h-4 w-4" />
              Grupos
              <Badge variant="secondary">{groupsCount}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {activeMainTab === "organizations" ? (
              <>
                <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                  <CirclePlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nueva organización</span>
                  <span className="sm:hidden">Nueva</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => router.push("/dashboard/admin/organizations/wizard")}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Organización guiada</span>
                  <span className="sm:hidden">Guiada</span>
                </Button>
              </>
            ) : (
              <Button onClick={() => setCreateGroupDialogOpen(true)} size="sm" className="gap-2">
                <CirclePlus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo grupo</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
          </div>
        </div>

        {/* Organizations Tab Content */}
        <TabsContent value="organizations" className="mt-6 space-y-6">
          <StatsCards organizations={organizations} />

          <div className="overflow-hidden rounded-lg border shadow-xs">
            <OrganizationsTable
              organizations={organizations}
              isLoading={isLoading}
              error={error}
              onRetry={() => {
                void fetchOrganizations();
              }}
              onEdit={handleOpenEdit}
              onSetup={handleOpenSetup}
              onDeactivate={(organization) => handleOpenLifecycle("deactivate", organization)}
              onReactivate={(organization) => handleOpenLifecycle("reactivate", organization)}
              onPurge={(organization) => handleOpenLifecycle("purge", organization)}
            />
          </div>
        </TabsContent>

        {/* Groups Tab Content */}
        <TabsContent value="groups" className="mt-6 space-y-6">
          {isLoadingGroups ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              <span className="text-muted-foreground ml-2">Cargando grupos...</span>
            </div>
          ) : groupsError ? (
            <div className="text-destructive flex items-center justify-center py-12">
              <span>Error al cargar grupos: {groupsError}</span>
            </div>
          ) : groups.length > 0 ? (
            <GroupsDataTable
              data={groups}
              onManageGroup={handleManageGroup}
              onDeactivate={(group) => handleOpenGroupAction("deactivate", group)}
              onReactivate={(group) => handleOpenGroupAction("reactivate", group)}
              onDelete={(group) => handleOpenGroupAction("delete", group)}
            />
          ) : (
            <EmptyState
              icon={<Folders className="text-muted-foreground/40 mx-auto h-12 w-12" />}
              title="Sin grupos todavía"
              description="Los grupos te permiten agrupar varias organizaciones para gestión centralizada."
              actionLabel="Crear grupo"
              onAction={() => setCreateGroupDialogOpen(true)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Organization Dialogs */}
      <OrganizationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        mode={dialogMode}
        isSubmitting={isSubmitting}
        initialValues={
          selectedOrganization
            ? {
                name: selectedOrganization.name,
                vat: selectedOrganization.vat,
                active: selectedOrganization.active,
                hierarchyType: selectedOrganization.hierarchyType,
                employeeNumberPrefix: selectedOrganization.employeeNumberPrefix,
                allowedEmailDomains: selectedOrganization.allowedEmailDomains,
              }
            : undefined
        }
      />

      <OrganizationSetupDialog
        open={setupDrawerOpen}
        onOpenChange={(open) => {
          setSetupDrawerOpen(open);
          if (!open) {
            setSetupOrganization(null);
          }
        }}
        organization={setupOrganization}
        onSeedBasics={handleSeedBasics}
        isSeeding={isSeedingBasics}
      />

      {/* Group Dialogs */}
      <CreateGroupDialog open={createGroupDialogOpen} onOpenChange={setCreateGroupDialogOpen} onCreated={fetchGroups} />

      <ManageGroupDialog
        open={manageGroupDialogOpen}
        onOpenChange={(open) => {
          setManageGroupDialogOpen(open);
          if (!open) {
            setSelectedGroup(null);
          }
        }}
        group={selectedGroup}
        currentUserRole={userRole || null}
        onUpdated={fetchGroups}
      />

      <OrganizationLifecycleDialog
        open={Boolean(lifecycleMode && lifecycleOrganization)}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseLifecycle();
          }
        }}
        mode={lifecycleMode}
        organization={lifecycleOrganization}
        onCompleted={handleLifecycleCompleted}
      />

      <AlertDialog open={Boolean(groupActionMode && groupActionTarget)} onOpenChange={handleCloseGroupAction}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {groupActionMode === "deactivate"
                ? "Dar de baja grupo"
                : groupActionMode === "reactivate"
                  ? "Reactivar grupo"
                  : "Limpiar grupo"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {groupActionTarget ? (
                <span>
                  {groupActionMode === "delete"
                    ? "Esta acción elimina el grupo y todas sus relaciones."
                    : "Confirma el cambio para el grupo seleccionado."}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {groupActionTarget ? (
            <div className="bg-muted/30 rounded-lg border p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{groupActionTarget.name}</span>
                <Badge variant={groupActionTarget.isActive ? "secondary" : "outline"}>
                  {groupActionTarget.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-4">
                <span>Organizaciones: {groupActionTarget.organizationsCount}</span>
                <span>Miembros: {groupActionTarget.membersCount}</span>
              </div>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGroupActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmGroupAction}
              disabled={isGroupActionLoading}
              className={groupActionMode === "delete" ? "bg-destructive hover:bg-destructive/90 text-white" : ""}
            >
              {isGroupActionLoading
                ? "Procesando..."
                : groupActionMode === "deactivate"
                  ? "Dar de baja"
                  : groupActionMode === "reactivate"
                    ? "Reactivar"
                    : "Limpiar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

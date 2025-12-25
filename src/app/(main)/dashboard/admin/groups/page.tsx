"use client";

import { useEffect, useState } from "react";

import { Building2, Loader2, ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { usePermissions } from "@/hooks/use-permissions";
import { listOrganizationGroups } from "@/server/actions/organization-groups";

import { CreateGroupDialog } from "./_components/create-group-dialog";
import { GroupsDataTable } from "./_components/groups-data-table";
import { ManageGroupDialog } from "./_components/manage-group-dialog";
import type { OrganizationGroupRow } from "./_components/types";

export default function OrganizationGroupsPage() {
  const { userRole, isLoadingPermissions } = usePermissions();
  const [groups, setGroups] = useState<OrganizationGroupRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<OrganizationGroupRow | null>(null);

  const canManageGroups = userRole === "SUPER_ADMIN";

  const fetchGroups = async () => {
    if (!canManageGroups) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await listOrganizationGroups();
      if (!result.success || !result.groups) {
        setError(result.error ?? "No se pudieron cargar los grupos");
        return;
      }
      setGroups(result.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los grupos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [canManageGroups]);

  const handleManageGroup = (group: OrganizationGroupRow) => {
    setSelectedGroup(group);
    setManageDialogOpen(true);
  };

  if (!canManageGroups && !isLoadingPermissions) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Grupos de organizaciones" subtitle="Gestiona la estructura multiempresa" />
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="Acceso denegado"
          description="Solo los administradores pueden gestionar grupos."
        />
      </div>
    );
  }

  if (isLoading || isLoadingPermissions) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Grupos de organizaciones" subtitle="Gestiona la estructura multiempresa" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando grupos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Grupos de organizaciones" subtitle="Gestiona la estructura multiempresa" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar grupos: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Grupos de organizaciones"
        subtitle="Gestiona la estructura multiempresa"
        actionLabel="Nuevo grupo"
        onAction={() => setCreateDialogOpen(true)}
      />

      {groups.length > 0 ? (
        <GroupsDataTable data={groups} onManageGroup={handleManageGroup} />
      ) : (
        <EmptyState
          icon={<Building2 className="text-muted-foreground/40 mx-auto h-12 w-12" />}
          title="Sin grupos todavía"
          description="Crea el primer grupo para agrupar organizaciones."
          actionLabel="Crear grupo"
          onAction={() => setCreateDialogOpen(true)}
        />
      )}

      <CreateGroupDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={fetchGroups} />

      <ManageGroupDialog
        open={manageDialogOpen}
        onOpenChange={(open) => {
          setManageDialogOpen(open);
          if (!open) {
            setSelectedGroup(null);
          }
        }}
        group={selectedGroup}
        currentUserRole={userRole ?? null}
        onUpdated={fetchGroups}
      />
    </div>
  );
}

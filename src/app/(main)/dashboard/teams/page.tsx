"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { Loader2, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import {
  deleteTeam,
  getTeamById,
  getTeams,
  toggleTeamStatus,
  type TeamDetail,
  type TeamListItem,
} from "@/server/actions/teams";

import { CreateTeamDialog } from "./_components/create-team-dialog";
import { EditTeamDialog } from "./_components/edit-team-dialog";
import { createTeamsColumns } from "./_components/teams-columns";

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingTeam, setEditingTeam] = useState<TeamDetail | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const { success, teams: data, error: err } = await getTeams();

      if (success && data) {
        setTeams(data);
      } else {
        setError(err ?? "Error al cargar equipos");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleEdit = useCallback(async (team: TeamListItem) => {
    // Cargar los detalles completos del equipo para el dialog de edición
    const { success, team: teamDetail } = await getTeamById(team.id);
    if (success && teamDetail) {
      setEditingTeam(teamDetail);
      setIsEditDialogOpen(true);
    } else {
      toast.error("Error al cargar los datos del equipo");
    }
  }, []);

  const handleToggleStatus = useCallback(
    async (team: TeamListItem) => {
      const { success, error: err } = await toggleTeamStatus(team.id);
      if (success) {
        toast.success(`Equipo ${team.isActive ? "desactivado" : "activado"} correctamente`);
        loadTeams();
      } else {
        toast.error(err ?? "Error al cambiar el estado del equipo");
      }
    },
    [loadTeams],
  );

  const handleDelete = useCallback(
    async (team: TeamListItem) => {
      const { success, error: err } = await deleteTeam(team.id);
      if (success) {
        toast.success("Equipo eliminado correctamente");
        loadTeams();
      } else {
        toast.error(err ?? "Error al eliminar el equipo");
      }
    },
    [loadTeams],
  );

  const handleTeamUpdated = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingTeam(null);
    loadTeams();
    toast.success("Equipo actualizado correctamente");
  }, [loadTeams]);

  const handleEditDialogClose = useCallback((open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingTeam(null);
    }
  }, []);

  const columns = useMemo(
    () =>
      createTeamsColumns({
        onEdit: handleEdit,
        onToggleStatus: handleToggleStatus,
        onDelete: handleDelete,
      }),
    [handleEdit, handleToggleStatus, handleDelete],
  );

  const table = useReactTable({
    data: teams,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Equipos" subtitle="Gestiona los equipos de tu organización" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando equipos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Equipos" subtitle="Gestiona los equipos de tu organización" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar equipos: {error}</span>
        </div>
      </div>
    );
  }

  const hasTeams = teams.length > 0;

  return (
    <PermissionGuard
      permission="view_teams"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Equipos" subtitle="Gestiona los equipos de tu organización" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Equipos"
          subtitle="Gestiona los equipos de tu organización"
          action={<CreateTeamDialog onTeamCreated={loadTeams} />}
        />

        {hasTeams ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <DataTable table={table} columns={columns} />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="mx-auto h-12 w-12" />}
            title="No hay equipos registrados"
            description='Crea tu primer equipo usando el botón "Nuevo Equipo"'
          />
        )}
      </div>

      {/* Dialog de edición con estado controlado */}
      {editingTeam && (
        <EditTeamDialog
          team={editingTeam}
          open={isEditDialogOpen}
          onOpenChange={handleEditDialogClose}
          onTeamUpdated={handleTeamUpdated}
        />
      )}
    </PermissionGuard>
  );
}

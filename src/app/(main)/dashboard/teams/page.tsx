"use client";

import { useEffect, useState } from "react";

import { getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { Loader2, ShieldAlert, Users } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { getTeams, type TeamListItem } from "@/server/actions/teams";

import { teamsColumns } from "./_components/teams-columns";

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
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
  }

  const table = useReactTable({
    data: teams,
    columns: teamsColumns,
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
        <SectionHeader title="Equipos" subtitle="Gestiona los equipos de tu organización" />

        {hasTeams ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <DataTable table={table} columns={teamsColumns} />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="mx-auto h-12 w-12" />}
            title="No hay equipos registrados"
            description="Los equipos se crean desde la configuración de centros de coste"
          />
        )}
      </div>
    </PermissionGuard>
  );
}

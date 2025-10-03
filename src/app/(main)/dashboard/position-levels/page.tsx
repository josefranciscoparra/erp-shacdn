"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PositionLevelsDataTable } from "../positions/_components/position-levels-data-table";
import { PositionLevelDialog } from "../positions/_components/position-level-dialog";
import { Plus, Briefcase, Loader2, ShieldAlert } from "lucide-react";
import { useOrganizationStore, type PositionLevel } from "@/stores/organization-store";

export default function PositionLevelsPage() {
  const { positionLevels, isLoading, error, fetchPositionLevels } = useOrganizationStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<PositionLevel | null>(null);

  useEffect(() => {
    fetchPositionLevels();
  }, [fetchPositionLevels]);

  const handleEdit = (level: PositionLevel) => {
    setEditingLevel(level);
    setDialogOpen(true);
  };

  const handleDelete = async (level: PositionLevel) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el nivel "${level.name}"?`)) {
      try {
        const response = await fetch(`/api/position-levels/${level.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Error al eliminar nivel de puesto");
        }

        await fetchPositionLevels();
      } catch (error) {
        console.error("Error al eliminar nivel de puesto:", error);
        alert(`Error: ${(error as Error).message}`);
      }
    }
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingLevel(null);
    }
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Niveles de puestos"
          subtitle="Define los niveles jerárquicos para los puestos de trabajo"
          actionLabel="Nuevo nivel"
          actionIcon={<Plus className="h-4 w-4" />}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando niveles...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Niveles de puestos"
          subtitle="Define los niveles jerárquicos para los puestos de trabajo"
          actionLabel="Nuevo nivel"
          actionIcon={<Plus className="h-4 w-4" />}
        />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar niveles: {error}</span>
        </div>
      </div>
    );
  }

  const hasLevels = positionLevels.length > 0;

  return (
    <PermissionGuard
      permission="view_positions"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Niveles de puestos" subtitle="Define los niveles jerárquicos para los puestos de trabajo" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Niveles de puestos</h1>
            <p className="text-muted-foreground text-sm">Define los niveles jerárquicos para los puestos de trabajo</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo nivel</span>
            </button>
          </div>
        </div>

        {hasLevels ? (
          <PositionLevelsDataTable
            data={positionLevels}
            onNewLevel={() => setDialogOpen(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <EmptyState
            icon={<Briefcase className="mx-auto h-12 w-12" />}
            title="No hay niveles registrados"
            description="Comienza agregando tu primer nivel de puesto al sistema"
            actionLabel="Agregar primer nivel"
            onAction={() => setDialogOpen(true)}
          />
        )}

        <PositionLevelDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          level={editingLevel}
        />
      </div>
    </PermissionGuard>
  );
}

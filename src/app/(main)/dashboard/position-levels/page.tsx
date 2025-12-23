"use client";

import { useEffect, useState } from "react";

import { Briefcase, Loader2, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrganizationStore, type PositionLevel } from "@/stores/organization-store";

import { PositionLevelDialog } from "../positions/_components/position-level-dialog";
import { PositionLevelsDataTable } from "../positions/_components/position-levels-data-table";

export default function PositionLevelsPage() {
  const { positionLevels, isLoading, error, fetchPositionLevels } = useOrganizationStore();
  const { hasPermission } = usePermissions();
  const canManagePositions = hasPermission("manage_positions");
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
          throw new Error(error.error ?? "Error al eliminar nivel de puesto");
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
      permission="manage_positions"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Niveles de puestos"
            subtitle="Define los niveles jerárquicos para los puestos de trabajo"
          />
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
          title="Niveles de puestos"
          subtitle="Define los niveles jerárquicos para los puestos de trabajo"
        />

        {hasLevels ? (
          <PositionLevelsDataTable
            data={positionLevels}
            onNewLevel={() => setDialogOpen(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canManage={canManagePositions}
          />
        ) : (
          <EmptyState
            icon={<Briefcase className="mx-auto h-12 w-12" />}
            title="No hay niveles registrados"
            description="Comienza agregando tu primer nivel de puesto al sistema"
            {...(canManagePositions
              ? {
                  actionLabel: "Agregar primer nivel",
                  onAction: () => setDialogOpen(true),
                }
              : {})}
          />
        )}

        <PositionLevelDialog open={dialogOpen} onOpenChange={handleCloseDialog} level={editingLevel} />
      </div>
    </PermissionGuard>
  );
}

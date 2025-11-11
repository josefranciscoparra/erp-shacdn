"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Plus, BriefcaseBusiness, Loader2, ShieldAlert, Layers } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { useOrganizationStore } from "@/stores/organization-store";

import { PositionDialog } from "./_components/position-dialog";
import { PositionsDataTable } from "./_components/positions-data-table";

export default function PositionsPage() {
  const { positions, isLoading, error, fetchPositions } = useOrganizationStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleEdit = (position) => {
    setEditingPosition(position);
    setDialogOpen(true);
  };

  const handleDelete = async (position) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el puesto "${position.title}"?`)) {
      try {
        const response = await fetch(`/api/positions/${position.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error ?? "Error al eliminar puesto");
        }

        await fetchPositions();
      } catch (error) {
        console.error("Error al eliminar puesto:", error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPosition(null);
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Puestos de trabajo" subtitle="Gestiona los puestos de trabajo de tu organización" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando puestos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Puestos de trabajo" subtitle="Gestiona los puestos de trabajo de tu organización" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar puestos: {error}</span>
        </div>
      </div>
    );
  }

  const hasPositions = positions.length > 0;

  return (
    <PermissionGuard
      permission="view_positions"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Puestos de trabajo" subtitle="Gestiona los puestos de trabajo de tu organización" />
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
          title="Puestos de trabajo"
          subtitle="Gestiona los puestos de trabajo de tu organización"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/position-levels">
                <Layers className="h-4 w-4" />
                <span className="hidden md:inline">Niveles</span>
              </Link>
            </Button>
          }
        />

        {hasPositions ? (
          <PositionsDataTable
            data={positions}
            onNewPosition={() => setDialogOpen(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <EmptyState
            icon={<BriefcaseBusiness className="mx-auto h-12 w-12" />}
            title="No hay puestos registrados"
            description="Comienza agregando tu primer puesto de trabajo al sistema"
            actionLabel="Agregar primer puesto"
            onAction={() => setDialogOpen(true)}
          />
        )}

        <PositionDialog open={dialogOpen} onOpenChange={handleCloseDialog} position={editingPosition} />
      </div>
    </PermissionGuard>
  );
}

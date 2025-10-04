"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { CostCentersDataTable } from "./_components/cost-centers-data-table";
import { CostCenterDialog } from "./_components/cost-center-dialog";
import { Plus, Landmark, Loader2, ShieldAlert } from "lucide-react";
import { useCostCentersStore } from "@/stores/cost-centers-store";

export default function CostCentersPage() {
  const { costCenters, isLoading, error, fetchCostCenters, deleteCostCenter } = useCostCentersStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState(null);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const handleEdit = (costCenter) => {
    setEditingCostCenter(costCenter);
    setDialogOpen(true);
  };

  const handleDelete = async (costCenter) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el centro de coste "${costCenter.name}"?`)) {
      try {
        const response = await fetch(`/api/cost-centers/${costCenter.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Error al eliminar centro de coste");
        }

        deleteCostCenter(costCenter.id);
        await fetchCostCenters();
      } catch (error) {
        console.error("Error al eliminar centro de coste:", error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCostCenter(null);
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Centros de coste"
          subtitle="Gestiona los centros de coste de tu organización"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando centros de coste...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Centros de coste"
          subtitle="Gestiona los centros de coste de tu organización"
        />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar centros de coste: {error}</span>
        </div>
      </div>
    );
  }

  const hasCostCenters = costCenters.length > 0;

  return (
    <PermissionGuard
      permission="view_cost_centers"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Centros de coste" subtitle="Gestiona los centros de coste de tu organización" />
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
          title="Centros de coste"
          subtitle="Gestiona los centros de coste de tu organización"
        />

        {hasCostCenters ? (
          <CostCentersDataTable 
            data={costCenters} 
            onNewCostCenter={() => setDialogOpen(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <EmptyState
            icon={<Landmark className="mx-auto h-12 w-12" />}
            title="No hay centros de coste registrados"
            description="Comienza agregando tu primer centro de coste al sistema"
            actionLabel="Agregar primer centro"
            onAction={() => setDialogOpen(true)}
          />
        )}

        <CostCenterDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          costCenter={editingCostCenter}
        />
      </div>
    </PermissionGuard>
  );
}

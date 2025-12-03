"use client";

import { useEffect, useState } from "react";

import { getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { UserCog } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/hr/empty-state";
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
import type { Scope } from "@/services/permissions";
import {
  getResponsiblesForArea,
  removeResponsibility,
  type AreaResponsibilityData,
} from "@/server/actions/area-responsibilities";

import { AddResponsibleDialog } from "./add-responsible-dialog";
import { EditPermissionsDialog } from "./edit-permissions-dialog";
import { responsiblesColumns } from "./responsibles-columns";

interface ResponsiblesListProps {
  scope: Scope;
  scopeId: string;
  scopeName?: string; // Nombre del ámbito (ej: "Centro Madrid", "Equipo A")
}

// Labels de scopes en español
const scopeLabels: Record<Scope, string> = {
  ORGANIZATION: "organización",
  COST_CENTER: "centro de coste",
  TEAM: "equipo",
};

export function ResponsiblesList({ scope, scopeId, scopeName }: ResponsiblesListProps) {
  const [loading, setLoading] = useState(true);
  const [responsibles, setResponsibles] = useState<AreaResponsibilityData[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Estado para dialogs
  const [editingResponsibility, setEditingResponsibility] = useState<AreaResponsibilityData | null>(null);
  const [deletingResponsibility, setDeletingResponsibility] = useState<AreaResponsibilityData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cargar responsables
  useEffect(() => {
    loadResponsibles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, scopeId]);

  async function loadResponsibles() {
    setLoading(true);
    try {
      const { success, responsibles: data, error } = await getResponsiblesForArea(scope, scopeId);

      if (success && data) {
        setResponsibles(data);
      } else {
        toast.error(error ?? "Error al cargar responsables");
      }
    } finally {
      setLoading(false);
    }
  }

  // Handler para eliminar
  async function handleDelete() {
    if (!deletingResponsibility) return;

    setDeleting(true);
    try {
      const { success, error } = await removeResponsibility(deletingResponsibility.id);

      if (success) {
        toast.success("Responsable eliminado correctamente");
        setDeletingResponsibility(null);
        loadResponsibles(); // Recargar lista
      } else {
        toast.error(error ?? "Error al eliminar responsable");
      }
    } finally {
      setDeleting(false);
    }
  }

  const table = useReactTable({
    data: responsibles,
    columns: responsiblesColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    meta: {
      onEdit: (responsibility: AreaResponsibilityData) => {
        setEditingResponsibility(responsibility);
      },
      onDelete: (responsibility: AreaResponsibilityData) => {
        setDeletingResponsibility(responsibility);
      },
    },
  });

  const scopeLabel = scopeLabels[scope];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground text-sm">Cargando responsables...</div>
      </div>
    );
  }

  if (responsibles.length === 0) {
    return (
      <EmptyState
        icon={<UserCog className="text-muted-foreground mx-auto h-12 w-12" />}
        title="Sin responsables asignados"
        description={`Añade el primer responsable para este ${scopeLabel}`}
        action={<AddResponsibleDialog scope={scope} scopeId={scopeId} scopeName={scopeName} />}
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table} columns={responsiblesColumns} />
      </div>

      {/* Dialog para editar permisos */}
      {editingResponsibility && (
        <EditPermissionsDialog
          responsibility={editingResponsibility}
          open={!!editingResponsibility}
          onClose={() => setEditingResponsibility(null)}
          onSuccess={loadResponsibles}
          scope={scope}
        />
      )}

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={!!deletingResponsibility} onOpenChange={(open) => !open && setDeletingResponsibility(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar responsable?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción quitará a <strong>{deletingResponsibility?.user.name}</strong> como responsable de este{" "}
              {scopeLabel}. El usuario perderá acceso a gestionar este ámbito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

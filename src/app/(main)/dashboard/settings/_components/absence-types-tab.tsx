"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Check, Loader2, MoreHorizontal, Pencil, Power, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteAbsenceType, getAllAbsenceTypes, toggleAbsenceTypeStatus } from "@/server/actions/absence-types";

import { AbsenceTypeDialog } from "./absence-type-dialog";

const BALANCE_TYPE_LABELS: Record<string, string> = {
  VACATION: "Vacaciones",
  PERSONAL_MATTERS: "Asuntos propios",
  COMP_TIME: "Compensación",
};

// Tipo para la fila de la tabla
export interface AbsenceTypeRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  minDaysAdvance: number;
  affectsBalance: boolean;
  balanceType: "VACATION" | "PERSONAL_MATTERS" | "COMP_TIME";
  active: boolean;
  allowPartialDays: boolean;
  granularityMinutes: number;
  minimumDurationMinutes: number;
  maxDurationMinutes: number | null;
  compensationFactor: number;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export function AbsenceTypesTab() {
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceTypeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AbsenceTypeRow | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getAllAbsenceTypes();
      setAbsenceTypes(data);
    } catch (error) {
      console.error("Error loading absence types:", error);
      toast.error("Error al cargar los tipos de ausencia");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleAbsenceTypeStatus(id, !currentStatus);
      toast.success(currentStatus ? "Tipo de ausencia desactivado" : "Tipo de ausencia activado");
      await loadData();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Error al cambiar el estado");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el tipo "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteAbsenceType(id);
      toast.success("Tipo de ausencia eliminado");
      await loadData();
    } catch (error: any) {
      console.error("Error deleting absence type:", error);
      toast.error(error.message ?? "Error al eliminar el tipo de ausencia");
    }
  };

  const handleEdit = (type: AbsenceTypeRow) => {
    setEditingType(type);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingType(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingType(null);
  };

  const handleSuccess = async () => {
    setDialogOpen(false);
    setEditingType(null);
    await loadData();
  };

  // State para la tabla
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Filtrar datos según tab - MEMOIZADO para evitar re-renders
  const filteredData = useMemo(
    () => (activeTab === "active" ? absenceTypes.filter((t) => t.active) : absenceTypes),
    [activeTab, absenceTypes],
  );

  // Definición de columnas - MEMOIZADO para evitar re-renders
  const columns: ColumnDef<AbsenceTypeRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => {
          const color = row.original.color;
          return (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <div>
                <div className="font-medium">{row.original.name}</div>
                <div className="text-muted-foreground text-xs">{row.original.code}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "granularity",
        header: "Granularidad",
        cell: ({ row }) => {
          const allowPartialDays = row.original.allowPartialDays ?? false;
          if (!allowPartialDays) {
            return <Badge variant="secondary">Día completo</Badge>;
          }

          const minutes = row.original.granularityMinutes ?? 480;
          if (minutes === 60) return <Badge variant="secondary">Por horas</Badge>;
          if (minutes === 30) return <Badge variant="secondary">Media hora</Badge>;
          if (minutes === 15) return <Badge variant="secondary">Cuarto de hora</Badge>;
          return <Badge variant="secondary">{minutes} min</Badge>;
        },
      },
      {
        accessorKey: "duration",
        header: "Duración",
        cell: ({ row }) => {
          const min = row.original.minimumDurationMinutes ?? 480; // Default to full day
          const max = row.original.maxDurationMinutes;

          const formatMinutes = (m: number) => {
            if (m >= 480) return `${m / 480}d`;
            if (m >= 60) return `${m / 60}h`;
            return `${m}min`;
          };

          if (max) {
            return (
              <span className="text-sm">
                {formatMinutes(min)} - {formatMinutes(max)}
              </span>
            );
          }
          return <span className="text-sm">Min: {formatMinutes(min)}</span>;
        },
      },
      {
        accessorKey: "properties",
        header: "Propiedades",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.isPaid && <Badge variant="outline">Pagado</Badge>}
            {row.original.requiresApproval && <Badge variant="outline">Requiere aprobación</Badge>}
            {row.original.affectsBalance && <Badge variant="outline">Afecta balance</Badge>}
          </div>
        ),
      },
      {
        accessorKey: "balanceType",
        header: "Balance",
        cell: ({ row }) => {
          if (!row.original.affectsBalance) {
            return <span className="text-muted-foreground text-xs">No aplica</span>;
          }

          const label = BALANCE_TYPE_LABELS[row.original.balanceType] ?? row.original.balanceType;
          return <Badge variant="secondary">{label}</Badge>;
        },
      },
      {
        accessorKey: "usageCount",
        header: "Uso",
        cell: ({ row }) => {
          const count = row.original.usageCount;
          return <span className="text-sm">{count} solicitudes</span>;
        },
      },
      {
        accessorKey: "active",
        header: "Estado",
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400">
              <Check className="mr-1 h-3 w-3" />
              Activo
            </Badge>
          ) : (
            <Badge variant="secondary">
              <X className="mr-1 h-3 w-3" />
              Inactivo
            </Badge>
          ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(row.original.id, row.original.active)}>
                <Power className="mr-2 h-4 w-4" />
                {row.original.active ? "Desactivar" : "Activar"}
              </DropdownMenuItem>
              {row.original.usageCount === 0 && (
                <DropdownMenuItem
                  onClick={() => handleDelete(row.original.id, row.original.name)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleEdit, handleToggleStatus, handleDelete],
  );

  // Crear tabla con useReactTable
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  if (isLoading) {
    return (
      <Card className="rounded-lg border p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  const activeCount = absenceTypes.filter((t) => t.active).length;
  const totalCount = absenceTypes.length;

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "all")}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="active">
              Activos <Badge className="ml-2">{activeCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="all">
              Todos <Badge className="ml-2">{totalCount}</Badge>
            </TabsTrigger>
          </TabsList>

          <Button onClick={handleNew}>Nuevo Tipo</Button>
        </div>

        <TabsContent value="active" className="mt-4 space-y-4">
          {activeCount === 0 ? (
            <EmptyState
              title="No hay tipos de ausencia activos"
              description="Crea tu primer tipo de ausencia para empezar"
              action={
                <Button onClick={handleNew} size="sm">
                  Nuevo Tipo
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Input
                  placeholder="Buscar por nombre..."
                  value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                  onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                  className="max-w-sm"
                />
                <DataTableViewOptions table={table} />
              </div>

              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>

              <DataTablePagination table={table} />
            </>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-4">
          {totalCount === 0 ? (
            <EmptyState
              title="No hay tipos de ausencia"
              description="Crea tu primer tipo de ausencia para empezar"
              action={
                <Button onClick={handleNew} size="sm">
                  Nuevo Tipo
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Input
                  placeholder="Buscar por nombre..."
                  value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                  onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                  className="max-w-sm"
                />
                <DataTableViewOptions table={table} />
              </div>

              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>

              <DataTablePagination table={table} />
            </>
          )}
        </TabsContent>
      </Tabs>

      <AbsenceTypeDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleSuccess}
        editingType={editingType}
      />
    </>
  );
}

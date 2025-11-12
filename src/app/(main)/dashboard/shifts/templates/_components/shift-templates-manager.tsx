"use client";

import { useEffect, useState } from "react";

import type { ShiftTemplate } from "@prisma/client";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  getFilteredRowModel,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Plus, MoreHorizontal, Pencil, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useShiftTemplatesStore } from "@/stores/shift-templates-store";

import { CreateTemplateDialog } from "./create-template-dialog";

type ShiftTemplateWithRelations = ShiftTemplate & {
  position: { id: string; title: string } | null;
  costCenter: { id: string; name: string } | null;
};

export function ShiftTemplatesManager() {
  const { templates, fetchTemplates, deleteTemplate, isLoading } = useShiftTemplatesStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la plantilla "${name}"?`)) {
      return;
    }

    try {
      await deleteTemplate(id);
      toast.success("Plantilla eliminada correctamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar plantilla");
    }
  };

  const columns: ColumnDef<ShiftTemplateWithRelations>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => {
        const color = row.original.color;
        return (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-medium">{row.getValue("name")}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "defaultStartTime",
      header: "Horario",
      cell: ({ row }) => {
        return (
          <span className="text-sm">
            {row.original.defaultStartTime} - {row.original.defaultEndTime}
          </span>
        );
      },
    },
    {
      accessorKey: "durationMinutes",
      header: "Duración",
      cell: ({ row }) => {
        const minutes = row.getValue("durationMinutes");
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return (
          <span className="text-sm">
            {hours}h {mins > 0 ? `${mins}m` : ""}
          </span>
        );
      },
    },
    {
      accessorKey: "defaultRequiredHeadcount",
      header: "Cobertura Req.",
      cell: ({ row }) => {
        return <Badge variant="secondary">{row.getValue("defaultRequiredHeadcount")}</Badge>;
      },
    },
    {
      accessorKey: "position",
      header: "Posición/Rol",
      cell: ({ row }) => {
        const position = row.original.position;
        return position ? (
          <span className="text-sm">{position.title}</span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      accessorKey: "costCenter",
      header: "Centro",
      cell: ({ row }) => {
        const center = row.original.costCenter;
        return center ? <span className="text-sm">{center.name}</span> : <Badge variant="outline">Todos</Badge>;
      },
    },
    {
      accessorKey: "active",
      header: "Estado",
      cell: ({ row }) => {
        const active = row.getValue("active");
        return <Badge variant={active ? "default" : "secondary"}>{active ? "Activa" : "Inactiva"}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const template = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(template.id, template.name)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plantillas de Turnos</h1>
          <p className="text-muted-foreground">Gestiona plantillas reutilizables para crear turnos rápidamente</p>
        </div>
        <CreateTemplateDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Plantilla
            </Button>
          }
        />
      </div>

      {/* Filters and view options */}
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Buscar plantillas..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <DataTableViewOptions table={table} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron plantillas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}

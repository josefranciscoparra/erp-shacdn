"use client";

import { useState } from "react";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Clock, Loader2, X } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { BulkEditSchedulesDialog } from "@/components/schedules/bulk-edit-schedules-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Contract } from "@/stores/contracts-store";

interface SchedulesDataTableProps {
  columns: ColumnDef<Contract>[];
  data: Contract[];
  isLoading?: boolean;
}

export function SchedulesDataTable({ columns, data, isLoading = false }: SchedulesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Función para refrescar datos después de bulk edit
  const handleBulkEditSuccess = () => {
    // Limpiar selección
    table.resetRowSelection();
    setBulkEditDialogOpen(false);
  };

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedContracts = selectedRows.map((row) => row.original);

  // Obtener todos los contratos filtrados (sin paginación)
  const allFilteredRows = table.getFilteredRowModel().rows;
  const allFilteredContracts = allFilteredRows.map((row) => row.original);

  // Verificar si todos los filtrados están seleccionados
  const allFilteredSelected = allFilteredRows.length > 0 && allFilteredRows.every((row) => row.getIsSelected());

  // Función para seleccionar todos los filtrados
  const handleSelectAllFiltered = () => {
    allFilteredRows.forEach((row) => {
      row.toggleSelected(true);
    });
  };

  // Función para deseleccionar todos
  const handleDeselectAll = () => {
    table.resetRowSelection();
  };

  return (
    <div className="space-y-4">
      {/* Banner de selección masiva */}
      {selectedRows.length > 0 && (
        <div className="from-primary/5 to-primary/10 border-primary flex items-center justify-between rounded-lg border-l-4 bg-gradient-to-r p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <span className="text-primary text-sm font-semibold">{selectedRows.length}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-foreground font-medium">
                  {allFilteredSelected ? (
                    <>Todos seleccionados ({selectedRows.length})</>
                  ) : (
                    <>{selectedRows.length} seleccionados</>
                  )}
                </p>
                {!allFilteredSelected && selectedRows.length < allFilteredContracts.length && (
                  <Badge variant="secondary" className="font-medium">
                    de {allFilteredContracts.length}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">Puedes editar los horarios de forma masiva</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button size="sm" onClick={() => setBulkEditDialogOpen(true)}>
              <Clock className="mr-2 h-4 w-4" />
              Editar Horarios
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <Input
          placeholder="Buscar por empleado..."
          value={(table.getColumn("employee")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("employee")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />

        <div className="flex items-center gap-2">
          {/* Botón seleccionar/deseleccionar todos */}
          {allFilteredContracts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={allFilteredSelected ? handleDeselectAll : handleSelectAllFiltered}
              className="h-8"
            >
              {allFilteredSelected ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Deseleccionar todos
                </>
              ) : (
                <>Seleccionar todos ({allFilteredContracts.length})</>
              )}
            </Button>
          )}

          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
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
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                    <span className="text-muted-foreground">Cargando horarios...</span>
                  </div>
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
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="text-muted-foreground h-8 w-8" />
                    <span className="text-muted-foreground">No se encontraron horarios</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />

      {/* Dialog de edición masiva */}
      <BulkEditSchedulesDialog
        open={bulkEditDialogOpen}
        onOpenChange={setBulkEditDialogOpen}
        selectedContracts={selectedContracts}
        onSuccess={handleBulkEditSuccess}
      />
    </div>
  );
}

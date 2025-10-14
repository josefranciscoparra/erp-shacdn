"use client";

import { useState } from "react";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, X, Edit } from "lucide-react";

import { BulkEditContractDialog } from "@/components/contracts/bulk-edit-contract-dialog";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Contract } from "@/stores/contracts-store";

interface ContractsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
}

const contractTypeOptions = [
  { label: "Indefinido", value: "INDEFINIDO" },
  { label: "Temporal", value: "TEMPORAL" },
  { label: "Prácticas", value: "PRACTICAS" },
  { label: "Formación", value: "FORMACION" },
  { label: "Obra o Servicio", value: "OBRA_SERVICIO" },
  { label: "Eventual", value: "EVENTUAL" },
  { label: "Interinidad", value: "INTERINIDAD" },
];

const statusOptions = [
  { label: "Activo", value: "active" },
  { label: "Finalizado", value: "inactive" },
];

export function ContractsDataTable<TData, TValue>({
  columns,
  data,
  isLoading,
}: ContractsDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  // Obtener contratos seleccionados
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedContracts = selectedRows.map((row) => row.original as Contract);

  // Obtener todos los contratos filtrados (sin paginación)
  const allFilteredRows = table.getFilteredRowModel().rows;
  const allFilteredContracts = allFilteredRows.map((row) => row.original as Contract);

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

  // Función para refrescar datos después de bulk edit
  const handleBulkEditSuccess = () => {
    // Limpiar selección
    table.resetRowSelection();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar de selección masiva */}
      {selectedContracts.length > 0 && (
        <div className="from-primary/5 to-primary/10 border-primary flex items-center justify-between rounded-lg border-l-4 bg-gradient-to-r p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <span className="text-primary text-sm font-semibold">{selectedContracts.length}</span>
            </div>
            <div>
              <p className="text-foreground font-medium">
                {selectedContracts.length} contrato{selectedContracts.length > 1 ? "s" : ""} seleccionado
                {selectedContracts.length > 1 ? "s" : ""}
              </p>
              <p className="text-muted-foreground text-sm">Puedes editar los horarios de forma masiva</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.resetRowSelection()}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button size="sm" onClick={() => setBulkEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar horarios
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div className="flex flex-1 flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center">
          {/* Búsqueda global */}
          <div className="relative flex-1 @4xl/main:max-w-sm">
            <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <Input
              placeholder="Buscar contratos..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {table.getColumn("contractType") && (
              <DataTableFacetedFilter
                column={table.getColumn("contractType")}
                title="Tipo de Contrato"
                options={contractTypeOptions}
              />
            )}
            {table.getColumn("active") && (
              <DataTableFacetedFilter column={table.getColumn("active")} title="Estado" options={statusOptions} />
            )}
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={() => {
                  table.resetColumnFilters();
                  setGlobalFilter("");
                }}
                className="h-8 px-2 lg:px-3"
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Botón seleccionar todos los filtrados */}
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

      {/* Dialog de edición masiva */}
      <BulkEditContractDialog
        open={bulkEditDialogOpen}
        onOpenChange={setBulkEditDialogOpen}
        selectedContracts={selectedContracts}
        onSuccess={handleBulkEditSuccess}
      />

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                    <span className="text-muted-foreground">Cargando contratos...</span>
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
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-muted-foreground text-sm">
                      {isFiltered
                        ? "No se encontraron contratos con los filtros aplicados."
                        : "No hay contratos registrados."}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <DataTablePagination table={table} />

      {/* Stats */}
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <div>{table.getFilteredRowModel().rows.length} contrato(s) total(es)</div>
        <div>
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </div>
      </div>
    </div>
  );
}

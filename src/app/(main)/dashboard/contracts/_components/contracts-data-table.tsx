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
import { Search, X } from "lucide-react";

import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
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
  const [globalFilter, setGlobalFilter] = useState("");

  // Función de filtro inteligente para búsqueda de empleados
  const intelligentEmployeeFilter = (row: any, columnId: string, filterValue: string) => {
    if (!filterValue || filterValue.trim().length === 0) return true;

    const contract = row.original as Contract;
    const employee = contract.employee;

    if (!employee) return false;

    // Normalizar búsqueda (lowercase, sin acentos)
    const searchTerms = filterValue
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/)
      .filter((term) => term.length > 0);

    // Construir nombre completo del empleado
    const fullName = `${employee.firstName} ${employee.lastName} ${employee.secondLastName ?? ""}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Número de empleado
    const employeeNumber = employee.employeeNumber?.toLowerCase() ?? "";

    // Verificar que todos los términos de búsqueda coincidan con el nombre o número
    return searchTerms.every((term) => {
      return fullName.includes(term) || employeeNumber.includes(term);
    });
  };

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
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: intelligentEmployeeFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  // Obtener todos los contratos filtrados (sin paginación)
  const allFilteredRows = table.getFilteredRowModel().rows;
  const allFilteredContracts = allFilteredRows.map((row) => row.original as Contract);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div className="flex flex-1 flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center">
          {/* Búsqueda global */}
          <div className="relative flex-1 @4xl/main:max-w-sm">
            <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre o número de empleado..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-9"
            />
            {globalFilter && (
              <div className="text-muted-foreground absolute top-full left-0 mt-1 text-xs">
                {allFilteredContracts.length} resultado{allFilteredContracts.length !== 1 ? "s" : ""}
              </div>
            )}
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
          <DataTableViewOptions table={table} />
        </div>
      </div>

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

"use client";

import * as React from "react";

import {
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
import { Plus, Building2, Search, X } from "lucide-react";

import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentData } from "@/stores/departments-store";

import { createDepartmentsColumns } from "./departments-columns";

interface DepartmentsDataTableProps {
  data: DepartmentData[];
  onNewDepartment?: () => void;
  onEdit?: (department: DepartmentData) => void;
  onDelete?: (department: DepartmentData) => void;
}

export function DepartmentsDataTable({ data, onNewDepartment, onEdit, onDelete }: DepartmentsDataTableProps) {
  const [activeTab, setActiveTab] = React.useState("active");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Crear columnas con callbacks
  const columns = React.useMemo(() => createDepartmentsColumns({ onEdit, onDelete }), [onEdit, onDelete]);

  // Filtrar datos según la pestaña activa
  const filteredData = React.useMemo(() => {
    switch (activeTab) {
      case "active":
        return data.filter((dept) => dept.active);
      case "inactive":
        return data.filter((dept) => !dept.active);
      case "all":
        return data;
      case "with-manager":
        return data.filter((dept) => dept.manager && dept.active);
      default:
        return data;
    }
  }, [data, activeTab]);

  const table = useReactTable({
    data: filteredData,
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

  // Contadores para badges
  const counts = React.useMemo(
    () => ({
      active: data.filter((dept) => dept.active).length,
      inactive: data.filter((dept) => !dept.active).length,
      all: data.length,
      withManager: data.filter((dept) => dept.manager && dept.active).length,
    }),
    [data],
  );

  // Opciones únicas para filtros
  const costCenterOptions = React.useMemo(() => {
    const unique = Array.from(
      new Set(
        data.filter((d) => d.costCenter).map((d) => JSON.stringify({ id: d.costCenter?.id, name: d.costCenter?.name })),
      ),
    );
    return unique.map((cc) => {
      const parsed = JSON.parse(cc);
      return {
        label: parsed.name,
        value: parsed.id,
      };
    });
  }, [data]);

  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          Vista de departamentos
        </Label>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Seleccionar vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos ({counts.active})</SelectItem>
            <SelectItem value="inactive">Inactivos ({counts.inactive})</SelectItem>
            <SelectItem value="all">Todos ({counts.all})</SelectItem>
            <SelectItem value="with-manager">Con responsable ({counts.withManager})</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="active">
            Activos <Badge variant="secondary">{counts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactivos <Badge variant="secondary">{counts.inactive}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos <Badge variant="secondary">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="with-manager">
            Con responsable <Badge variant="secondary">{counts.withManager}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button size="sm" onClick={onNewDepartment}>
            <Plus />
            <span className="hidden lg:inline">Nuevo departamento</span>
          </Button>
        </div>
      </div>

      {/* Contenido común para todas las tabs */}
      {["active", "inactive", "all", "with-manager"].map((tabValue) => (
        <TabsContent key={tabValue} value={tabValue} className="relative flex flex-col gap-4 overflow-auto">
          {/* Toolbar con búsqueda y filtros */}
          <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
            <div className="flex flex-1 flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center">
              {/* Búsqueda global */}
              <div className="relative flex-1 @4xl/main:max-w-sm">
                <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                <Input
                  placeholder="Buscar departamentos..."
                  value={globalFilter}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filtros */}
              <div className="flex gap-2">
                {table.getColumn("costCenter") && costCenterOptions.length > 0 && (
                  <DataTableFacetedFilter
                    column={table.getColumn("costCenter")}
                    title="Centro de coste"
                    options={costCenterOptions}
                  />
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
          </div>

          {filteredData.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          <div className="text-muted-foreground text-sm">
                            {isFiltered
                              ? "No se encontraron departamentos con los filtros aplicados."
                              : "No hay departamentos en esta categoría."}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination table={table} />
            </>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4">
                <Building2 className="text-muted-foreground/30 mx-auto h-12 w-12" />
              </div>
              <h3 className="text-foreground mb-1 text-sm font-medium">
                {tabValue === "active" && "No hay departamentos activos"}
                {tabValue === "inactive" && "No hay departamentos inactivos"}
                {tabValue === "with-manager" && "No hay departamentos con responsable"}
                {tabValue === "all" && "No hay departamentos registrados"}
              </h3>
              <p className="text-xs">
                {tabValue === "active" && "Los departamentos activos aparecerán aquí"}
                {tabValue === "inactive" && "Los departamentos dados de baja aparecerán aquí"}
                {tabValue === "with-manager" && "Los departamentos con responsable asignado aparecerán aquí"}
                {tabValue === "all" && "Comienza agregando tu primer departamento"}
              </p>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

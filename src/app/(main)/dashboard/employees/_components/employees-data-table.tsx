"use client";

import * as React from "react";

import Link from "next/link";

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
import { Plus, Users, Search, X } from "lucide-react";

import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DataTablePagination } from "../../../../../components/data-table/data-table-pagination";
import { DataTableViewOptions } from "../../../../../components/data-table/data-table-view-options";
import { Employee } from "../types";

import { employeesColumns } from "./employees-columns";

export function EmployeesDataTable({ data }: { data: Employee[] }) {
  const [activeTab, setActiveTab] = React.useState("active");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Filtrar datos según la pestaña activa
  const filteredData = React.useMemo(() => {
    switch (activeTab) {
      case "active":
        return data.filter((emp) => emp.active);
      case "inactive":
        return data.filter((emp) => !emp.active);
      case "all":
        return data;
      case "recent": {
        // Empleados contratados en los últimos 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return data.filter((emp) => {
          const currentContract = emp.employmentContracts.find((c) => c.active);
          if (!currentContract) return false;
          return new Date(currentContract.startDate) > thirtyDaysAgo;
        });
      }
      default:
        return data;
    }
  }, [data, activeTab]);

  const table = useReactTable({
    data: filteredData,
    columns: employeesColumns,
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
      active: data.filter((emp) => emp.active).length,
      inactive: data.filter((emp) => !emp.active).length,
      all: data.length,
      recent: data.filter((emp) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const currentContract = emp.employmentContracts.find((c) => c.active);
        if (!currentContract) return false;
        return new Date(currentContract.startDate) > thirtyDaysAgo;
      }).length,
    }),
    [data],
  );

  // Obtener opciones únicas para filtros
  const departmentOptions = React.useMemo(() => {
    const unique = Array.from(new Set(data.map((emp) => emp.department?.name).filter(Boolean)));
    return unique.map((name) => ({ label: name, value: name }));
  }, [data]);

  const positionOptions = React.useMemo(() => {
    const unique = Array.from(new Set(data.map((emp) => emp.position?.title).filter(Boolean)));
    return unique.map((title) => ({ label: title, value: title }));
  }, [data]);

  const contractTypeOptions = React.useMemo(() => {
    const unique = Array.from(
      new Set(
        data
          .flatMap((emp) => emp.employmentContracts)
          .filter((c) => c.active)
          .map((c) => c.contractType)
          .filter(Boolean),
      ),
    );
    return unique.map((type) => ({ label: type, value: type }));
  }, [data]);

  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          Vista de empleados
        </Label>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Seleccionar vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos ({counts.active})</SelectItem>
            <SelectItem value="inactive">Inactivos ({counts.inactive})</SelectItem>
            <SelectItem value="all">Todos ({counts.all})</SelectItem>
            <SelectItem value="recent">Recientes ({counts.recent})</SelectItem>
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
          <TabsTrigger value="recent">
            Recientes <Badge variant="secondary">{counts.recent}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button size="sm" asChild>
            <Link href="/dashboard/employees/new">
              <Plus />
              <span className="hidden lg:inline">Nuevo empleado</span>
            </Link>
          </Button>
        </div>
      </div>

      <TabsContent value="active" className="relative flex flex-col gap-4 overflow-auto">
        {/* Toolbar con búsqueda y filtros */}
        <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
          <div className="flex flex-1 flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center">
            {/* Búsqueda global */}
            <div className="relative flex-1 @4xl/main:max-w-sm">
              <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                placeholder="Buscar empleados..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              {table.getColumn("department") && departmentOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn("department")}
                  title="Departamento"
                  options={departmentOptions}
                />
              )}
              {table.getColumn("position") && positionOptions.length > 0 && (
                <DataTableFacetedFilter column={table.getColumn("position")} title="Puesto" options={positionOptions} />
              )}
              {table.getColumn("contractType") && contractTypeOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn("contractType")}
                  title="Tipo Contrato"
                  options={contractTypeOptions}
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
                        <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
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
                          <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={employeesColumns.length} className="h-24 text-center">
                        <div className="text-muted-foreground text-sm">
                          {isFiltered
                            ? "No se encontraron empleados con los filtros aplicados."
                            : "No hay empleados activos."}
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
              <Users className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay empleados activos</h3>
            <p className="text-xs">Los empleados activos aparecerán aquí</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="inactive" className="relative flex flex-col gap-4 overflow-auto">
        {/* Toolbar con búsqueda y filtros */}
        <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
          <div className="flex flex-1 flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center">
            {/* Búsqueda global */}
            <div className="relative flex-1 @4xl/main:max-w-sm">
              <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                placeholder="Buscar empleados..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              {table.getColumn("department") && departmentOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn("department")}
                  title="Departamento"
                  options={departmentOptions}
                />
              )}
              {table.getColumn("position") && positionOptions.length > 0 && (
                <DataTableFacetedFilter column={table.getColumn("position")} title="Puesto" options={positionOptions} />
              )}
              {table.getColumn("contractType") && contractTypeOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn("contractType")}
                  title="Tipo Contrato"
                  options={contractTypeOptions}
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
                        <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
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
                          <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={employeesColumns.length} className="h-24 text-center">
                        <div className="text-muted-foreground text-sm">
                          {isFiltered
                            ? "No se encontraron empleados con los filtros aplicados."
                            : "No hay empleados inactivos."}
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
              <Users className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay empleados inactivos</h3>
            <p className="text-xs">Los empleados dados de baja aparecerán aquí</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="all" className="relative flex flex-col gap-4 overflow-auto">
        {/* Toolbar con búsqueda y filtros */}
        <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
          <div className="flex flex-1 flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center">
            {/* Búsqueda global */}
            <div className="relative flex-1 @4xl/main:max-w-sm">
              <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                placeholder="Buscar empleados..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              {table.getColumn("department") && departmentOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn("department")}
                  title="Departamento"
                  options={departmentOptions}
                />
              )}
              {table.getColumn("position") && positionOptions.length > 0 && (
                <DataTableFacetedFilter column={table.getColumn("position")} title="Puesto" options={positionOptions} />
              )}
              {table.getColumn("contractType") && contractTypeOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn("contractType")}
                  title="Tipo Contrato"
                  options={contractTypeOptions}
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
                        <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
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
                          <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={employeesColumns.length} className="h-24 text-center">
                        <div className="text-muted-foreground text-sm">
                          {isFiltered
                            ? "No se encontraron empleados con los filtros aplicados."
                            : "No hay empleados registrados."}
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
              <Users className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay empleados registrados</h3>
            <p className="text-xs">Comienza agregando tu primer empleado</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="recent" className="relative flex flex-col gap-4 overflow-auto">
        {/* Toolbar con búsqueda y filtros */}
        <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
          <div className="flex flex-1 flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center">
            {/* Búsqueda global */}
            <div className="relative flex-1 @4xl/main:max-w-sm">
              <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                placeholder="Buscar empleados..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              {table.getColumn("department") && departmentOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn("department")}
                  title="Departamento"
                  options={departmentOptions}
                />
              )}
              {table.getColumn("position") && positionOptions.length > 0 && (
                <DataTableFacetedFilter column={table.getColumn("position")} title="Puesto" options={positionOptions} />
              )}
              {table.getColumn("contractType") && contractTypeOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn("contractType")}
                  title="Tipo Contrato"
                  options={contractTypeOptions}
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
                        <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
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
                          <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={employeesColumns.length} className="h-24 text-center">
                        <div className="text-muted-foreground text-sm">
                          {isFiltered
                            ? "No se encontraron empleados con los filtros aplicados."
                            : "No hay empleados recientes."}
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
              <Users className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay empleados recientes</h3>
            <p className="text-xs">Los empleados contratados en los últimos 30 días aparecerán aquí</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

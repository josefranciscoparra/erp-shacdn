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
import { FolderX, Search } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { createGroupColumns } from "./group-columns";
import type { OrganizationGroupRow } from "./types";

interface GroupsDataTableProps {
  data: OrganizationGroupRow[];
  onManageGroup: (group: OrganizationGroupRow) => void;
  onDeactivate: (group: OrganizationGroupRow) => void;
  onReactivate: (group: OrganizationGroupRow) => void;
  onDelete: (group: OrganizationGroupRow) => void;
}

type FilterStatus = "all" | "active" | "inactive";

export function GroupsDataTable({ data, onManageGroup, onDeactivate, onReactivate, onDelete }: GroupsDataTableProps) {
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("active");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo(
    () => createGroupColumns({ onManageGroup, onDeactivate, onReactivate, onDelete }),
    [onManageGroup, onDeactivate, onReactivate, onDelete],
  );

  const filteredData = React.useMemo(() => {
    switch (filterStatus) {
      case "active":
        return data.filter((group) => group.isActive);
      case "inactive":
        return data.filter((group) => !group.isActive);
      case "all":
        return data;
      default:
        return data;
    }
  }, [data, filterStatus]);

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
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
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

  const counts = React.useMemo(
    () => ({
      active: data.filter((group) => group.isActive).length,
      inactive: data.filter((group) => !group.isActive).length,
      all: data.length,
    }),
    [data],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Filters & Actions Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-muted/50 flex items-center gap-1 rounded-lg p-1">
            <Button
              variant={filterStatus === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("all")}
              className="h-7 text-xs font-medium"
            >
              Todos
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] text-slate-500">
                {counts.all}
              </Badge>
            </Button>
            <Button
              variant={filterStatus === "active" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("active")}
              className="h-7 text-xs font-medium"
            >
              Activos
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] text-emerald-600">
                {counts.active}
              </Badge>
            </Button>
            <Button
              variant={filterStatus === "inactive" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("inactive")}
              className="h-7 text-xs font-medium"
            >
              Inactivos
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] text-slate-500">
                {counts.inactive}
              </Badge>
            </Button>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-2 md:max-w-xs">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Buscar grupo..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white shadow-sm dark:bg-slate-950">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-slate-100 hover:bg-transparent dark:border-slate-800"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 text-xs font-medium tracking-wider text-slate-500 uppercase"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                    <FolderX className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium">No se encontraron grupos</p>
                    <p className="text-xs text-slate-400">Intenta ajustar los filtros de búsqueda.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}

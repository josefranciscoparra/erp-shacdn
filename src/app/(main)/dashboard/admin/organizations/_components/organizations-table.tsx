"use client";

import * as React from "react";

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
import {
  Ban,
  Building2,
  HardDrive,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { OrganizationItem } from "./types";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface OrganizationsTableProps {
  organizations: OrganizationItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onEdit: (organization: OrganizationItem) => void;
  onSetup: (organization: OrganizationItem) => void;
  onDeactivate: (organization: OrganizationItem) => void;
  onReactivate: (organization: OrganizationItem) => void;
  onPurge: (organization: OrganizationItem) => void;
}

export function OrganizationsTable({
  organizations,
  isLoading,
  error,
  onRetry,
  onEdit,
  onSetup,
  onDeactivate,
  onReactivate,
  onPurge,
}: OrganizationsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const columns = React.useMemo<ColumnDef<OrganizationItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Organización",
        cell: ({ row }) => {
          const organization = row.original;
          return (
            <div className="flex items-center gap-3 py-1">
              <Avatar className="h-9 w-9 border shadow-sm">
                <AvatarImage src={`/api/organizations/${organization.id}/logo`} alt={organization.name} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
                  {getInitials(organization.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900 dark:text-slate-100">{organization.name}</span>
                  {organization.active ? (
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                  ) : (
                    <Badge variant="outline" className="h-4 px-1 text-[10px] text-slate-500">
                      Inactiva
                    </Badge>
                  )}
                </div>
                <span className="truncate font-mono text-[10px] text-slate-400" title={organization.id}>
                  {organization.id}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "legal",
        header: "Legal & Dominios",
        cell: ({ row }) => {
          const organization = row.original;
          return (
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {organization.vat ?? <span className="text-slate-400 italic">Sin NIF</span>}
              </div>
              <div className="flex items-center gap-1.5">
                {organization.allowedEmailDomains.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal text-slate-600">
                      @{organization.allowedEmailDomains[0]}
                    </Badge>
                    {organization.allowedEmailDomains.length > 1 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="h-4 cursor-help px-1 text-[10px] text-slate-500">
                              +{organization.allowedEmailDomains.length - 1}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs font-medium">Dominios permitidos:</p>
                            <ul className="mt-1 list-inside list-disc text-xs text-slate-500">
                              {organization.allowedEmailDomains.map((d) => (
                                <li key={d}>{d}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">Cualquier dominio</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "storageUsedBytes",
        header: "Almacenamiento",
        cell: ({ row }) => {
          const organization = row.original;
          const limitBytes = Math.max(organization.storageLimitBytes, 1);
          const usagePercent = Math.min((organization.storageUsedBytes / limitBytes) * 100, 100);
          const isDangerUsage = usagePercent > 85;

          return (
            <div className="flex max-w-[140px] flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-slate-500">
                  <HardDrive className="h-3 w-3" />
                  {Math.round(usagePercent)}%
                </span>
                <span className="text-slate-400">{formatBytes(organization.storageUsedBytes)}</span>
              </div>
              <Progress value={usagePercent} className="h-1" indicatorClassName={cn(isDangerUsage && "bg-red-500")} />
            </div>
          );
        },
      },
      {
        id: "metrics",
        header: "Métricas",
        cell: ({ row }) => {
          const organization = row.original;
          return (
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5" title="Usuarios totales">
                <Users className="h-3.5 w-3.5" />
                <span>{organization._count?.users ?? 0}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5" title="Empleados activos">
                <span className="font-medium">Emp:</span>
                <span>{organization._count?.employees ?? 0}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const organization = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuItem onClick={() => onEdit(organization)}>
                    <Pencil className="mr-2 h-3.5 w-3.5 text-slate-500" />
                    Editar organización
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetup(organization)}>
                    <Sparkles className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                    Asistente de inicio
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {organization.active ? (
                    <DropdownMenuItem
                      onClick={() => onDeactivate(organization)}
                      className="text-amber-600 focus:text-amber-700"
                    >
                      <Ban className="mr-2 h-3.5 w-3.5" />
                      Desactivar acceso
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => onReactivate(organization)}
                        className="text-emerald-600 focus:text-emerald-700"
                      >
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        Reactivar acceso
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onPurge(organization)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Eliminar definitivamente
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [onEdit, onSetup, onDeactivate, onReactivate, onPurge],
  );

  const table = useReactTable({
    data: organizations,
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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="animate-pulse text-sm font-medium">Cargando organizaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="rounded-full bg-red-50 p-3">
          <Building2 className="h-6 w-6 text-red-500" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-red-900">Error al cargar datos</p>
          <p className="max-w-[300px] text-sm text-red-600/80">{error}</p>
        </div>
        <Button onClick={onRetry} variant="outline" className="mt-2">
          Reintentar conexión
        </Button>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-slate-50 p-6">
          <Building2 className="h-10 w-10 text-slate-300" />
        </div>
        <div className="max-w-sm space-y-1 text-center">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Sin organizaciones</p>
          <p className="text-sm text-slate-500">
            Comienza creando la primera organización para dar de alta empleados y configurar el entorno.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Buscar organización..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9"
          />
        </div>
        <DataTableViewOptions table={table} />
      </div>

      <div className="relative w-full overflow-hidden rounded-md border bg-white shadow-sm dark:bg-slate-950">
        <div className="overflow-x-auto">
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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}

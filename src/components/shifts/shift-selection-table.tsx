"use client";

import { useState } from "react";

import type { Shift, ShiftStatus } from "@prisma/client";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, MapPin, Users, AlertTriangle } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ShiftWithRelations = Shift & {
  position: { id: string; title: string } | null;
  costCenter: { id: string; name: string };
  assignments: Array<{
    id: string;
    employeeId: string;
  }>;
};

interface ShiftSelectionTableProps {
  shifts: ShiftWithRelations[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ShiftSelectionTable({ shifts, selectedIds, onSelectionChange }: ShiftSelectionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns: ColumnDef<ShiftWithRelations>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            if (value) {
              const allIds = shifts.map((s) => s.id);
              onSelectionChange(allIds);
            } else {
              onSelectionChange([]);
            }
          }}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={(value) => {
            const id = row.original.id;
            if (value) {
              onSelectionChange([...selectedIds, id]);
            } else {
              onSelectionChange(selectedIds.filter((i) => i !== id));
            }
          }}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => {
        return <div className="text-sm">{format(new Date(row.getValue("date")), "EEE d MMM", { locale: es })}</div>;
      },
    },
    {
      accessorKey: "startTime",
      header: "Horario",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="text-muted-foreground h-3 w-3" />
            {row.original.startTime} - {row.original.endTime}
          </div>
        );
      },
    },
    {
      accessorKey: "position",
      header: "Posición",
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
        return (
          <div className="flex items-center gap-1 text-sm">
            <MapPin className="text-muted-foreground h-3 w-3" />
            {center.name}
          </div>
        );
      },
    },
    {
      accessorKey: "coverage",
      header: "Cobertura",
      cell: ({ row }) => {
        const assigned = row.original.assignments.length;
        const required = row.original.requiredHeadcount;
        const percentage = (assigned / required) * 100;

        return (
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-3 w-3" />
            <span className="text-sm">
              {assigned} / {required}
            </span>
            {percentage < 100 && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                {percentage.toFixed(0)}%
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status");
        const statusConfig = {
          DRAFT: { label: "Borrador", variant: "secondary" as const },
          PENDING_APPROVAL: { label: "Pendiente", variant: "secondary" as const },
          PUBLISHED: { label: "Publicado", variant: "default" as const },
          CLOSED: { label: "Cerrado", variant: "outline" as const },
        };

        const config = statusConfig[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "issues",
      header: "Alertas",
      cell: ({ row }) => {
        const assigned = row.original.assignments.length;
        const required = row.original.requiredHeadcount;
        const hasIssues = assigned < required;

        return hasIssues ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null;
      },
    },
  ];

  const table = useReactTable({
    data: shifts,
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Buscar por posición o centro..."
          value={(table.getColumn("position")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("position")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <DataTableViewOptions table={table} />
      </div>

      {/* Selection summary */}
      {selectedIds.length > 0 && (
        <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
          <div className="text-sm">
            <strong>{selectedIds.length}</strong> turno(s) seleccionado(s)
          </div>
        </div>
      )}

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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={selectedIds.includes(row.original.id) && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron turnos.
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

"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLink, User, UserX } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WhistleblowingReportSummary } from "@/server/actions/whistleblowing";

interface WhistleblowingDataTableProps {
  reports: WhistleblowingReportSummary[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SUBMITTED: { label: "Pendiente", variant: "default" },
  IN_REVIEW: { label: "En investigación", variant: "secondary" },
  RESOLVED: { label: "Resuelta", variant: "outline" },
  CLOSED: { label: "Cerrada", variant: "outline" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: { label: "Baja", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
  MEDIUM: { label: "Media", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
  HIGH: { label: "Alta", className: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" },
  CRITICAL: { label: "Crítica", className: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" },
};

const reporterTypeIcon: Record<string, typeof User> = {
  EMPLOYEE: User,
  EXTERNAL: ExternalLink,
  ANONYMOUS: UserX,
};

export function WhistleblowingDataTable({ reports }: WhistleblowingDataTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "submittedAt", desc: true }]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const columns = React.useMemo<ColumnDef<WhistleblowingReportSummary>[]>(() => {
    return [
      {
        accessorKey: "trackingCode",
        header: "Código",
        cell: ({ row }) => (
          <code className="bg-muted rounded px-2 py-1 font-mono text-xs">{row.getValue("trackingCode")}</code>
        ),
        size: 140,
      },
      {
        accessorKey: "title",
        header: "Título",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-foreground font-medium">{row.getValue("title")}</span>
            <span className="text-muted-foreground text-xs">{row.original.categoryName}</span>
          </div>
        ),
      },
      {
        accessorKey: "reporterType",
        header: "Origen",
        cell: ({ row }) => {
          const ReporterIcon = reporterTypeIcon[row.original.reporterType] ?? User;
          return (
            <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <ReporterIcon className="h-4 w-4" />
              <span>{row.original.reporterDisplayLabel ?? row.original.reporterType}</span>
            </div>
          );
        },
        size: 140,
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const status = statusConfig[row.original.status];
          return <Badge variant={status.variant}>{status.label}</Badge>;
        },
        size: 140,
      },
      {
        accessorKey: "priority",
        header: "Prioridad",
        cell: ({ row }) => {
          const priority = priorityConfig[row.original.priority];
          return (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${priority.className}`}>
              {priority.label}
            </span>
          );
        },
        size: 110,
      },
      {
        accessorKey: "assignedToName",
        header: "Gestor asignado",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.original.assignedToName ?? "Sin asignar"}</span>
        ),
      },
      {
        accessorKey: "submittedAt",
        header: "Registrada",
        cell: ({ row }) =>
          format(new Date(row.original.submittedAt), "dd MMM yyyy - HH:mm", {
            locale: es,
          }),
        size: 180,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/whistleblowing/${row.original.id}`)}>
            Ver detalle
          </Button>
        ),
      },
    ];
  }, [router]);

  const table = useReactTable({
    data: reports,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="bg-card/60 space-y-2 rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Mostrando {table.getRowModel().rows.length} de {reports.length} registros
        </p>
        <DataTableViewOptions table={table} />
      </div>
      <div className="overflow-hidden rounded-xl border">
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center text-sm">
                  No hay resultados para los filtros actuales.
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

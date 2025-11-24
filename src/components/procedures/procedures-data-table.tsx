"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, Search, FileText, User } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/hr/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipo aproximado basado en el retorno de getProcedures
export interface Procedure {
  id: string;
  code: string | null;
  name: string;
  status: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count: {
    expenses: number;
  };
  updatedAt: Date | string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
  PENDING_AUTHORIZATION: {
    label: "Pend. Autorización",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  AUTHORIZED: { label: "Autorizado", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
  JUSTIFICATION_PENDING: {
    label: "Pend. Justificación",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  JUSTIFIED: { label: "Justificado", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  CLOSED: { label: "Cerrado", className: "bg-gray-700/10 text-gray-700 dark:text-gray-400" },
  REJECTED: { label: "Rechazado", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusMap[status] ?? {
    label: status.replace("_", " "),
    className: "bg-gray-500/10 text-gray-700",
  };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

interface ProceduresDataTableProps {
  data: Procedure[];
  isManagerView?: boolean;
}

export function ProceduresDataTable({ data, isManagerView = false }: ProceduresDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusTab, setStatusTab] = useState("all");

  const columns: ColumnDef<Procedure>[] = useMemo(() => {
    const baseColumns: ColumnDef<Procedure>[] = [
      {
        accessorKey: "code",
        header: "Código",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs font-medium">{row.original.code ?? "---"}</span>
        ),
      },
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            {row.original.startDate && (
              <span className="text-muted-foreground text-xs">
                {format(new Date(row.original.startDate), "d MMM yyyy", { locale: es })}
              </span>
            )}
          </div>
        ),
      },
    ];

    if (isManagerView) {
      baseColumns.push({
        id: "employeeName", // Virtual column for filtering/sorting
        accessorFn: (row) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : "Sin asignar"),
        header: "Empleado",
        cell: ({ row }) => {
          const employee = row.original.employee;
          return employee ? (
            <div className="flex items-center gap-2">
              <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full">
                <User className="text-muted-foreground h-3 w-3" />
              </div>
              <span className="text-sm">
                {employee.firstName} {employee.lastName}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm italic">Sin asignar</span>
          );
        },
      });
    }

    baseColumns.push(
      {
        accessorKey: "_count.expenses",
        header: "Gastos",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal">
            {row.original._count.expenses}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Actualizado",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {format(new Date(row.original.updatedAt), "PP", { locale: es })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Acciones</div>,
        cell: ({ row }) => {
          const detailUrl = isManagerView
            ? `/dashboard/procedures/${row.original.id}`
            : `/dashboard/my-procedures/${row.original.id}`;

          return (
            <div className="text-right">
              <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                <Link href={detailUrl}>
                  Ver Detalle <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </div>
          );
        },
      },
    );

    return baseColumns;
  }, [isManagerView]);

  // Handle status filtering based on Tabs
  const filteredData = useMemo(() => {
    let processed = data;

    // Filter by Tab Group
    if (statusTab !== "all") {
      switch (statusTab) {
        case "draft":
          processed = processed.filter((item) => item.status === "DRAFT");
          break;
        case "pending":
          processed = processed.filter((item) =>
            ["PENDING_AUTHORIZATION", "JUSTIFICATION_PENDING"].includes(item.status),
          );
          break;
        case "approved":
          processed = processed.filter((item) => ["AUTHORIZED", "JUSTIFIED"].includes(item.status));
          break;
        case "finished":
          processed = processed.filter((item) => ["CLOSED", "REJECTED"].includes(item.status));
          break;
      }
    }

    // Global filter (simple implementation for Name and Code)
    if (globalFilter) {
      const lower = globalFilter.toLowerCase();
      processed = processed.filter(
        (item) =>
          item.name.toLowerCase().includes(lower) ||
          (item.code?.toLowerCase().includes(lower) ?? false) ||
          (isManagerView &&
            item.employee &&
            `${item.employee.firstName} ${item.employee.lastName}`.toLowerCase().includes(lower)),
      );
    }
    return processed;
  }, [data, statusTab, globalFilter, isManagerView]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters and Tabs */}
      <div className="flex flex-col gap-4">
        {/* Top Bar: Tabs and Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-5 md:w-auto">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="draft">Borrador</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="approved">Aprobadas</TabsTrigger>
              <TabsTrigger value="finished">Finalizadas</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:max-w-xs">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder={isManagerView ? "Buscar..." : "Buscar..."}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {(table.getRowModel().rows?.length ?? 0) > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <EmptyState
                    title="No se encontraron expedientes"
                    description="No hay resultados que coincidan con los filtros."
                    icon={<FileText className="mx-auto h-12 w-12" />}
                  />
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

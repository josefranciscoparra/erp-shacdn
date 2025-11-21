"use client";

import { useMemo, useState } from "react";

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
import { CheckCircle2, Clock, ArrowRight, FileText, AlertCircle } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/hr/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PendingApprovalItem } from "@/server/actions/approvals";

interface ApprovalsTableProps {
  items: PendingApprovalItem[];
  filterType?: string;
  onReview: (item: PendingApprovalItem) => void;
}

export function ApprovalsTable({ items, filterType = "all", onReview }: ApprovalsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns: ColumnDef<PendingApprovalItem>[] = useMemo(
    () => [
      {
        accessorKey: "employeeName",
        header: "Empleado",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={item.employeeImage ?? ""} />
                <AvatarFallback>{item.employeeName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">{item.employeeName}</div>
                <div className="text-muted-foreground text-xs capitalize">
                  {item.details?.["position"] ?? "Empleado"}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => {
          const type = row.original.type;
          let label = "Solicitud";
          let icon = AlertCircle;
          let colorClass = "text-gray-500";

          if (type === "PTO") {
            label = "Ausencia";
            icon = CheckCircle2;
            colorClass = "text-blue-500";
          } else if (type === "MANUAL_TIME_ENTRY") {
            label = "Fichaje";
            icon = Clock;
            colorClass = "text-amber-500";
          } else if (type === "EXPENSE") {
            label = "Gasto";
            icon = FileText;
            colorClass = "text-green-500";
          }

          const IconComp = icon;

          return (
            <div className="flex items-center gap-2">
              <IconComp className={`h-4 w-4 ${colorClass}`} />
              <span className="font-medium">{label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "date",
        header: "Fecha Efectiva",
        cell: ({ row }) => {
          const date = new Date(row.original.date);
          return (
            <div className="flex flex-col">
              <span className="font-medium">{format(date, "d MMM yyyy", { locale: es })}</span>
              <span className="text-muted-foreground text-xs">{row.original.summary}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Solicitado",
        cell: ({ row }) => format(new Date(row.original.createdAt), "PP", { locale: es }),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Button
              onClick={() => onReview(item)}
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 gap-2"
            >
              Revisar <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    [onReview],
  );

  // Filtrar solicitudes
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (filterType !== "all") {
      filtered = filtered.filter((i) => i.type === filterType);
    }
    return filtered;
  }, [items, filterType]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <>
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
                <TableRow key={row.id} className="hover:bg-muted/40">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState title="Todo al día" description="No tienes solicitudes pendientes de aprobación." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <DataTablePagination table={table} />
      </div>
    </>
  );
}

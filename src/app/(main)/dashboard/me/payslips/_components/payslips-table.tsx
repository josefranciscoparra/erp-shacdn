"use client";

import { useMemo, useState } from "react";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Download, FileText, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/hr/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadFileFromApi } from "@/lib/client/file-download";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface Payslip {
  id: string;
  fileName: string;
  month: number | null;
  year: number | null;
  createdAt: Date;
}

interface PayslipsTableProps {
  payslips: Payslip[];
  yearFilter?: number;
}

function formatPeriod(month: number | null, year: number | null) {
  if (!month || !year) return "Sin periodo";
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function PayslipsTable({ payslips, yearFilter }: PayslipsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "period", desc: true }, // Default sort: Period DESC
  ]);

  const handleDownload = async (payslip: Payslip) => {
    try {
      await downloadFileFromApi(
        `/api/me/documents/${payslip.id}/download?action=url&disposition=attachment`,
        payslip.fileName,
      );
      toast.success("Nómina descargada");
    } catch (error) {
      console.error("Error downloading payslip:", error);
      toast.error("Error al descargar la nómina");
    }
  };

  const columns: ColumnDef<Payslip>[] = useMemo(
    () => [
      {
        id: "period",
        accessorFn: (row) => (row.year ?? 0) * 100 + (row.month ?? 0),
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-4"
            >
              Periodo
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                <FileText className="text-primary h-4 w-4" />
              </div>
              <span className="font-medium">{formatPeriod(row.original.month, row.original.year)}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-4"
            >
              Fecha de subida
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(row.original.createdAt), "PP", { locale: es })}
          </div>
        ),
      },
      {
        id: "format",
        header: "Formato",
        cell: () => (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
            PDF
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          return (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(row.original);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  // Filtrar por año si se especifica
  const filteredPayslips = useMemo(() => {
    if (!yearFilter) return payslips;
    return payslips.filter((p) => p.year === yearFilter);
  }, [payslips, yearFilter]);

  const table = useReactTable({
    data: filteredPayslips,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
                  <EmptyState
                    title="Nada por aquí"
                    description={
                      yearFilter
                        ? `No hay nóminas disponibles para el año ${yearFilter}`
                        : "No tienes nóminas disponibles en este momento."
                    }
                  />
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

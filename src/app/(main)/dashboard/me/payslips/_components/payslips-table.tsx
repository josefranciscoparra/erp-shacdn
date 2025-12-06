"use client";

import { useMemo } from "react";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Download, FileText } from "lucide-react";
import { toast } from "sonner";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/hr/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const handleDownload = async (payslip: Payslip) => {
    try {
      const response = await fetch(`/api/me/documents/${payslip.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = payslip.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Nómina descargada");
      } else {
        toast.error("Error al descargar la nómina");
      }
    } catch {
      toast.error("Error al descargar la nómina");
    }
  };

  const columns: ColumnDef<Payslip>[] = useMemo(
    () => [
      {
        accessorKey: "period",
        header: "Periodo",
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
        header: "Fecha de subida",
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

  // Ordenar por periodo (año desc, mes desc)
  const sortedPayslips = useMemo(() => {
    return [...filteredPayslips].sort((a, b) => {
      if (a.year !== b.year) return (b.year ?? 0) - (a.year ?? 0);
      return (b.month ?? 0) - (a.month ?? 0);
    });
  }, [filteredPayslips]);

  const table = useReactTable({
    data: sortedPayslips,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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

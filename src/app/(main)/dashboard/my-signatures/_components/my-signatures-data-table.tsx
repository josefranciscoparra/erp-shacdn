"use client";

import { useState } from "react";

import Link from "next/link";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Eye, FileSignature } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { SignatureStatusBadge, SignatureUrgencyBadge } from "@/components/signatures";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type MySignature } from "@/stores/signatures-store";

interface MySignaturesDataTableProps {
  data: MySignature[];
}

export function MySignaturesDataTable({ data }: MySignaturesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<MySignature>[] = [
    {
      accessorKey: "document.title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent"
          >
            Documento
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const title = row.original.document.title;
        const category = row.original.document.category;
        return (
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-muted-foreground text-xs">{category}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        return <SignatureStatusBadge status={row.original.status} />;
      },
    },
    {
      accessorKey: "request.expiresAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent"
          >
            Urgencia
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return <SignatureUrgencyBadge expiresAt={row.original.request.expiresAt} />;
      },
    },
    {
      accessorKey: "signedAt",
      header: "Firmado",
      cell: ({ row }) => {
        const signedAt = row.original.signedAt;
        if (!signedAt) return <span className="text-muted-foreground text-sm">-</span>;
        return (
          <span className="text-muted-foreground text-sm">
            {new Date(signedAt).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const signature = row.original;
        const isPending = signature.status === "PENDING";

        return (
          <div className="flex justify-end">
            <Button variant={isPending ? "default" : "ghost"} size="sm" asChild>
              <Link href={`/sign/${signature.signToken}`}>
                {isPending ? (
                  <>
                    <FileSignature className="mr-2 h-4 w-4" />
                    Firmar ahora
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </>
                )}
              </Link>
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border dark:border-gray-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-gray-200 dark:border-b-gray-800">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-12 px-4 text-left">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-b-gray-200 dark:border-b-gray-800"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay firmas que coincidan con tu búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && <DataTablePagination table={table} />}
    </div>
  );
}

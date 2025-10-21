"use client";

import { useState } from "react";

import Link from "next/link";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Eye, FileSignature } from "lucide-react";

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
        return <SignatureStatusBadge status={row.original.status as any} />;
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
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No hay documentos en este estado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

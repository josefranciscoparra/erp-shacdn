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
import { ArrowUpDown, Download, Eye, FileSignature, FileText } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/hr/empty-state";
import { SignatureStatusBadge, SignatureUrgencyBadge } from "@/components/signatures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { signableDocumentCategoryLabels } from "@/lib/validations/signature";
import { useSignaturesStore, type MySignature } from "@/stores/signatures-store";

interface MySignaturesDataTableProps {
  data: MySignature[];
  emptyStateType?: "pending" | "signed" | "rejected" | "expired" | "all";
}

export function MySignaturesDataTable({ data, emptyStateType = "all" }: MySignaturesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { downloadEvidence } = useSignaturesStore();

  const getEmptyStateMessage = () => {
    switch (emptyStateType) {
      case "pending":
        return {
          title: "Nada por aquí",
          description: "No tienes documentos pendientes de firma.",
        };
      case "signed":
        return {
          title: "Nada por aquí",
          description: "Aún no has firmado ningún documento.",
        };
      case "rejected":
        return {
          title: "Nada por aquí",
          description: "No has rechazado ningún documento.",
        };
      case "expired":
        return {
          title: "Nada por aquí",
          description: "No tienes documentos expirados.",
        };
      case "all":
      default:
        return {
          title: "Nada por aquí",
          description: "No hay documentos disponibles.",
        };
    }
  };

  const emptyState = getEmptyStateMessage();

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
        const status = row.original.status;
        const expiresAt = row.original.request.expiresAt;
        const isUrgent =
          row.original.status === "PENDING" && new Date(expiresAt) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="font-medium">{title}</p>
              <SignatureStatusBadge status={status} />
              {isUrgent && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                  Urgente
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs">{signableDocumentCategoryLabels[category]}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "lastActivity",
      header: "Última actividad",
      cell: ({ row }) => {
        const status = row.original.status;
        const signedAt = row.original.signedAt;
        const expiresAt = row.original.request.expiresAt;

        if (status === "SIGNED" && signedAt) {
          return (
            <span className="text-muted-foreground text-sm">
              Firmado{" "}
              {new Date(signedAt).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          );
        }

        return (
          <span className="text-muted-foreground text-sm">
            Expira{" "}
            {new Date(expiresAt).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
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
        const isSigned = signature.status === "SIGNED";

        return (
          <div className="flex justify-end gap-2">
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
            {isSigned && (
              <Button variant="ghost" size="sm" onClick={() => downloadEvidence(signature.id)}>
                <Download className="mr-2 h-4 w-4" />
                Evidencia
              </Button>
            )}
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
        pageSize: 5,
      },
    },
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-4">
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    icon={<FileSignature className="h-8 w-8" />}
                    title={emptyState.title}
                    description={emptyState.description}
                  />
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

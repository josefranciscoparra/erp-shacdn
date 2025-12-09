"use client";

import { useState } from "react";

import Link from "next/link";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Users, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SignerInfo {
  id: string;
  order: number;
  status: string;
  signerName: string;
  signedAt: Date | null;
  employeeId: string;
}

interface BatchRecipient {
  id: string;
  status: string;
  employeeName: string;
  employeeId: string;
  secondSignerMissing: boolean;
  signers: SignerInfo[];
}

interface BatchRecipientsTableProps {
  recipients: BatchRecipient[];
  requireDoubleSignature: boolean;
  onManageSigners?: (requestId: string) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-amber-500" />,
  IN_PROGRESS: <Clock className="h-4 w-4 text-blue-500" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  REJECTED: <XCircle className="h-4 w-4 text-red-500" />,
  EXPIRED: <Clock className="h-4 w-4 text-gray-400" />,
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
  REJECTED: "Rechazado",
  EXPIRED: "Expirado",
};

function getSignerStatusBadge(status: string) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    SIGNED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    EXPIRED: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  };

  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    SIGNED: "Firmado",
    REJECTED: "Rechazado",
    EXPIRED: "Expirado",
  };

  return (
    <Badge variant="outline" className={colors[status] ?? colors.PENDING}>
      {labels[status] ?? status}
    </Badge>
  );
}

export function BatchRecipientsTable({
  recipients,
  requireDoubleSignature,
  onManageSigners,
}: BatchRecipientsTableProps) {
  const [pageSize, setPageSize] = useState(10);

  const columns: ColumnDef<BatchRecipient>[] = [
    {
      accessorKey: "employeeName",
      header: "Empleado",
      cell: ({ row }) => {
        const hasWarning = row.original.secondSignerMissing;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.employeeName}</span>
            {hasWarning && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Falta segundo firmante (manager no asignado)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {statusIcons[row.original.status]}
          <span>{statusLabels[row.original.status] ?? row.original.status}</span>
        </div>
      ),
    },
    {
      id: "signer1",
      header: "Firma empleado",
      cell: ({ row }) => {
        const signer = row.original.signers.find((s) => s.order === 1);
        if (!signer) return <span className="text-muted-foreground">-</span>;

        return (
          <div className="flex flex-col gap-1">
            {getSignerStatusBadge(signer.status)}
            {signer.signedAt && (
              <span className="text-muted-foreground text-xs">
                {format(new Date(signer.signedAt), "dd MMM yyyy HH:mm", { locale: es })}
              </span>
            )}
          </div>
        );
      },
    },
    ...(requireDoubleSignature
      ? [
          {
            id: "signer2",
            header: "Segunda firma",
            cell: ({ row }: { row: { original: BatchRecipient } }) => {
              const signer = row.original.signers.find((s) => s.order === 2);
              if (!signer) {
                if (row.original.secondSignerMissing) {
                  return (
                    <Badge
                      variant="outline"
                      className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      Sin asignar
                    </Badge>
                  );
                }
                return <span className="text-muted-foreground">-</span>;
              }

              return (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">{getSignerStatusBadge(signer.status)}</div>
                  <span className="text-muted-foreground text-xs">{signer.signerName}</span>
                  {signer.signedAt && (
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(signer.signedAt), "dd MMM yyyy HH:mm", { locale: es })}
                    </span>
                  )}
                </div>
              );
            },
          } as ColumnDef<BatchRecipient>,
        ]
      : []),
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {onManageSigners && row.original.status !== "COMPLETED" && row.original.status !== "REJECTED" && (
            <Button variant="ghost" size="sm" onClick={() => onManageSigners(row.original.id)}>
              <Users className="mr-1 h-3.5 w-3.5" />
              Firmantes
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/signatures/${row.original.id}`}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Ver
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: recipients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  });

  return (
    <div className="space-y-4">
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay destinatarios
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {recipients.length > 10 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Mostrando {table.getState().pagination.pageIndex * pageSize + 1} -{" "}
            {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, recipients.length)} de {recipients.length}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / pág</SelectItem>
                <SelectItem value="25">25 / pág</SelectItem>
                <SelectItem value="50">50 / pág</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

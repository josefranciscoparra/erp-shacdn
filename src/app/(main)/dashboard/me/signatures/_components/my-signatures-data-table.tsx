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
import { FileSignature, Clock, CheckCircle2, XCircle, AlertTriangle, Eye, Users, Filter } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/hr/empty-state";
import { SignatureUrgencyBadge } from "@/components/signatures";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { signerStatusColors, signerStatusLabels, type SignerStatus } from "@/lib/validations/signature";
import type { MySignature } from "@/stores/signatures-store";

const signerStatusIcons: Record<SignerStatus, React.ElementType> = {
  PENDING: Clock,
  SIGNED: CheckCircle2,
  REJECTED: XCircle,
  EXPIRED: AlertTriangle,
};

interface MySignaturesDataTableProps {
  signatures: MySignature[];
  status: "pending" | "signed" | "rejected" | "expired";
  emptyMessage?: string;
}

export function MySignaturesDataTable({
  signatures,
  status,
  emptyMessage = "No hay firmas en este estado",
}: MySignaturesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const columns: ColumnDef<MySignature>[] = useMemo(
    () => [
      {
        accessorKey: "document.title",
        header: "Documento",
        cell: ({ row }) => {
          const signature = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <FileSignature className="text-primary h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{signature.document.title}</p>
                {signature.document.description && (
                  <p className="text-muted-foreground truncate text-xs">{signature.document.description}</p>
                )}
                {signature.status === "PENDING" && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {signature.isMyTurn ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                        Tu turno
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200"
                      >
                        Esperando a {signature.waitingFor ?? "otro firmante"}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "document.category",
        header: "Categoría",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs font-normal">
            {row.original.document.category}
          </Badge>
        ),
      },
      {
        accessorKey: "request.createdAt",
        header: "Fecha",
        cell: ({ row }) => {
          const signature = row.original;
          // Mostrar fecha según el estado
          if (signature.status === "SIGNED" && signature.signedAt) {
            return (
              <div className="flex flex-col">
                <span className="text-sm font-medium text-green-600">
                  {format(new Date(signature.signedAt), "d MMM yyyy", { locale: es })}
                </span>
                <span className="text-muted-foreground text-xs">Firmado</span>
              </div>
            );
          }
          if (signature.status === "REJECTED" && signature.rejectedAt) {
            return (
              <div className="flex flex-col">
                <span className="text-sm font-medium text-red-600">
                  {format(new Date(signature.rejectedAt), "d MMM yyyy", { locale: es })}
                </span>
                <span className="text-muted-foreground text-xs">Rechazado</span>
              </div>
            );
          }
          // Para pendientes o expirados, mostrar fecha de solicitud
          return (
            <div className="flex flex-col">
              <span className="text-sm">
                {format(new Date(signature.request.createdAt), "d MMM yyyy", { locale: es })}
              </span>
              <span className="text-muted-foreground text-xs">Solicitado</span>
            </div>
          );
        },
      },
      {
        id: "currentSigner",
        header: "Firmante actual",
        cell: ({ row }) => {
          const signature = row.original;
          const orderedSigners = [...signature.allSigners].sort((a, b) => a.order - b.order);
          // Encontrar el firmante actual (el primero que está pendiente según order)
          const currentSigner = orderedSigners.find((s) => s.status === "PENDING");

          // Si todos firmaron o no hay pendientes
          if (!currentSigner) {
            if (signature.status === "SIGNED") {
              return (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground text-sm">Completado</span>
                </div>
              );
            }
            if (signature.status === "REJECTED") {
              return (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-muted-foreground text-sm">Rechazado</span>
                </div>
              );
            }
            return <span className="text-muted-foreground text-sm">-</span>;
          }

          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-amber-500/20 text-[10px] text-amber-700">
                  {getInitials(currentSigner.employee.firstName, currentSigner.employee.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {currentSigner.employee.firstName} {currentSigner.employee.lastName}
                </span>
                <span className="text-muted-foreground text-xs">
                  {signature.status === "PENDING"
                    ? signature.isMyTurn
                      ? "Te corresponde firmar ahora"
                      : `Esperando a ${signature.waitingFor ?? "otro firmante"}`
                    : `Turno ${currentSigner.order} de ${signature.allSigners.length}`}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "request.expiresAt",
        header: "Vencimiento",
        cell: ({ row }) => {
          const signature = row.original;
          if (status === "pending") {
            return (
              <SignatureUrgencyBadge expiresAt={signature.request.expiresAt} urgencyLevel={signature.urgencyLevel} />
            );
          }
          return (
            <span className="text-muted-foreground text-sm">
              {format(new Date(signature.request.expiresAt), "d MMM yyyy", { locale: es })}
            </span>
          );
        },
      },
      {
        accessorKey: "allSigners",
        header: "Firmantes",
        cell: ({ row }) => {
          const signature = row.original;
          const signedCount = signature.allSigners.filter((s) => s.status === "SIGNED").length;
          const totalSigners = signature.allSigners.length;

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {signature.allSigners.slice(0, 3).map((signer) => (
                        <Avatar key={signer.id} className="border-background h-6 w-6 border-2">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {getInitials(signer.employee.firstName, signer.employee.lastName)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {signature.allSigners.length > 3 && (
                        <div className="bg-muted border-background flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px]">
                          +{signature.allSigners.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {signedCount}/{totalSigners}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">
                      <Users className="mr-1 inline h-3 w-3" />
                      {signedCount} de {totalSigners} firmantes
                    </p>
                    {signature.allSigners.map((signer) => (
                      <p key={signer.id} className="text-xs">
                        {signer.employee.firstName} {signer.employee.lastName}
                        {" - "}
                        <span
                          className={
                            signer.status === "SIGNED"
                              ? "text-green-500"
                              : signer.status === "REJECTED"
                                ? "text-red-500"
                                : "text-yellow-500"
                          }
                        >
                          {signer.status === "SIGNED"
                            ? "Firmado"
                            : signer.status === "REJECTED"
                              ? "Rechazado"
                              : "Pendiente"}
                        </span>
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const signature = row.original;
          const status = signature.status as SignerStatus; // Cast seguro
          const Icon = signerStatusIcons[status] ?? Clock;
          const label = signerStatusLabels[status] ?? status;
          const colorClass = signerStatusColors[status] ?? "bg-gray-100 text-gray-800";

          return (
            <Badge variant="outline" className={colorClass}>
              <Icon className="mr-1 h-3 w-3" />
              {label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const signature = row.original;
          const isPending = signature.status === "PENDING";
          const canSignNow = isPending && signature.isMyTurn;
          const Icon = canSignNow ? FileSignature : Eye;

          return (
            <Link href={`/dashboard/me/signatures/${signature.signToken}`}>
              <Button variant={canSignNow ? "default" : "outline"} size="sm" className="gap-2">
                <Icon className="h-4 w-4" />
                {canSignNow ? "Firmar" : "Ver"}
              </Button>
            </Link>
          );
        },
      },
    ],
    [status],
  );

  // Ordenar firmas: más recientes primero
  const prioritizedSignatures = useMemo(() => {
    return [...signatures].sort((a, b) => {
      if (status === "pending" && a.isMyTurn !== b.isMyTurn) {
        return a.isMyTurn ? -1 : 1;
      }
      return new Date(b.request.createdAt).getTime() - new Date(a.request.createdAt).getTime();
    });
  }, [signatures, status]);

  const actionableCount = useMemo(() => {
    if (status !== "pending") {
      return 0;
    }
    return prioritizedSignatures.filter((signature) => signature.isMyTurn).length;
  }, [prioritizedSignatures, status]);

  const visibleSignatures = useMemo(() => {
    if (status === "pending" && showOnlyActionable) {
      return prioritizedSignatures.filter((signature) => signature.isMyTurn);
    }
    return prioritizedSignatures;
  }, [prioritizedSignatures, showOnlyActionable, status]);

  const table = useReactTable({
    data: visibleSignatures,
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
        pageSize: 5,
      },
    },
  });

  return (
    <>
      {status === "pending" && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Prioridad: primero verás los documentos que puedes firmar ahora mismo.
          </p>
          <Button
            variant={showOnlyActionable ? "default" : "outline"}
            size="sm"
            className="gap-2"
            disabled={!showOnlyActionable && actionableCount === 0}
            onClick={() => {
              setShowOnlyActionable((prev) => !prev);
              table.setPageIndex(0);
            }}
          >
            <Filter className="h-4 w-4" />
            {showOnlyActionable ? "Ver todos" : `Solo firmables (${actionableCount})`}
          </Button>
        </div>
      )}

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
                    icon={<FileSignature className="text-muted-foreground h-8 w-8" />}
                    title="Sin documentos"
                    description={emptyMessage}
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

"use client";

import { useMemo, useState, useCallback } from "react";

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
import { CheckCircle2, Clock, XCircle, Ban, MoreHorizontal, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { minutesToTime } from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/hr/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatWorkingDays } from "@/services/pto/pto-helpers-client";
import { usePtoStore, type PtoRequest } from "@/stores/pto-store";

import { PtoRequestDetailDialog } from "./pto-request-detail-dialog";

function formatMinutesAsHours(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "0m";

  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);

  return parts.join(" ");
}

const statusConfig = {
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-yellow-500/20 text-yellow-800 dark:bg-yellow-500/30 dark:text-yellow-300 font-semibold",
  },
  APPROVED: {
    label: "Aprobada",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  REJECTED: {
    label: "Rechazada",
    icon: XCircle,
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  CANCELLED: {
    label: "Cancelada",
    icon: Ban,
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  },
  DRAFT: {
    label: "Borrador",
    icon: Clock,
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  },
};

interface PtoRequestsTableProps {
  status?: "all" | "pending" | "approved" | "rejected";
  yearFilter?: string;
}

export function PtoRequestsTable({ status = "all", yearFilter = "all" }: PtoRequestsTableProps) {
  const { requests, cancelRequest, loadRequests } = usePtoStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PtoRequest | null>(null);

  // Callback cuando cambian los documentos
  const handleDocumentsChange = useCallback(() => {
    loadRequests();
  }, [loadRequests]);

  const handleCancelRequest = async () => {
    if (!requestToCancel) return;

    try {
      await cancelRequest(requestToCancel);
      toast.success("Solicitud cancelada correctamente");
      setCancelDialogOpen(false);
      setRequestToCancel(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cancelar solicitud");
    }
  };

  const columns: ColumnDef<PtoRequest>[] = useMemo(
    () => [
      {
        accessorKey: "absenceType",
        header: "Tipo",
        cell: ({ row }) => {
          const type = row.original.absenceType;
          return (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
              <span className="font-medium">{type.name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "startDate",
        header: "Fecha inicio",
        cell: ({ row }) => format(new Date(row.original.startDate), "PP", { locale: es }),
      },
      {
        accessorKey: "endDate",
        header: "Fecha fin",
        cell: ({ row }) => format(new Date(row.original.endDate), "PP", { locale: es }),
      },
      {
        accessorKey: "workingDays",
        header: "Duración / Horario",
        cell: ({ row }) => {
          const request = row.original;
          const discountedMinutes =
            typeof request.effectiveMinutes === "number" && request.effectiveMinutes > 0
              ? request.effectiveMinutes
              : (request.durationMinutes ?? 0);
          const discountedLabel = formatMinutesAsHours(discountedMinutes);

          // Si tiene durationMinutes, es una ausencia parcial → mostrar horas y rango
          if (request.durationMinutes !== null && request.durationMinutes !== undefined) {
            const hours = Math.floor(request.durationMinutes / 60);
            const minutes = request.durationMinutes % 60;

            // Formatear rango de horas si existe
            const timeRange =
              request.startTime !== null &&
              request.startTime !== undefined &&
              request.endTime !== null &&
              request.endTime !== undefined
                ? `${minutesToTime(request.startTime)} - ${minutesToTime(request.endTime)}`
                : null;

            return (
              <div className="flex flex-col text-sm">
                {timeRange && <span className="font-semibold">{timeRange}</span>}
                <span className="text-muted-foreground text-xs">
                  {hours > 0 && `${hours}h`}
                  {minutes > 0 && ` ${minutes}m`}
                </span>
                <span className="text-muted-foreground text-xs">Descuenta {discountedLabel}</span>
              </div>
            );
          }

          // Ausencia de días completos → mostrar días
          const roundedDays = Math.round(request.workingDays * 10) / 10;
          const dayLabel = formatWorkingDays(roundedDays);
          const unit = roundedDays === 1 ? "día" : "días";

          return (
            <div className="flex flex-col text-sm">
              <span className="font-semibold">
                {dayLabel} {unit}
              </span>
              <span className="text-muted-foreground text-xs">Descuenta {discountedLabel}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const config = statusConfig[row.original.status];
          const Icon = config.icon;

          return (
            <Badge variant="outline" className={config.className}>
              <Icon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
          );
        },
      },
      {
        id: "documents",
        header: "Docs",
        cell: ({ row }) => {
          const docsCount = row.original._count?.documents ?? 0;
          if (docsCount === 0) return null;

          return (
            <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400">
              <Paperclip className="h-3 w-3" />
              {docsCount}
            </Badge>
          );
        },
      },
      {
        accessorKey: "submittedAt",
        header: "Solicitado",
        cell: ({ row }) => format(new Date(row.original.submittedAt), "PP", { locale: es }),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const request = row.original;
          const canCancel = request.status === "PENDING";

          if (!canCancel) return null;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setRequestToCancel(request.id);
                    setCancelDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  Cancelar solicitud
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [cancelRequest],
  );

  // Filtrar solicitudes según el tab seleccionado y año
  const filteredRequests = useMemo(() => {
    // Primero filtrar por año
    let filtered =
      yearFilter === "all"
        ? requests
        : requests.filter((r) => {
            const year = new Date(r.startDate).getFullYear();
            return year === parseInt(yearFilter);
          });

    // Luego filtrar por estado
    switch (status) {
      case "pending":
        filtered = filtered.filter((r) => r.status === "PENDING");
        break;
      case "approved":
        filtered = filtered.filter((r) => r.status === "APPROVED");
        break;
      case "rejected":
        filtered = filtered.filter((r) => r.status === "REJECTED" || r.status === "CANCELLED");
        break;
      default:
        // "all" - no filtrar por estado
        break;
    }

    // Ordenar con "Smart Sort":
    // 1. Pendientes siempre arriba.
    // 2. Futuras (>= hoy): Orden Ascendente (la más próxima primero).
    // 3. Pasadas (< hoy): Orden Descendente (la más reciente primero).
    return filtered.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Ignorar hora actual para comparar fechas

      // Prioridad 1: PENDING primero
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (a.status !== "PENDING" && b.status === "PENDING") return 1;

      // Si ambas son pendientes, ordenar por fecha (más antigua primero para atender antes)
      if (a.status === "PENDING" && b.status === "PENDING") {
        return dateA.getTime() - dateB.getTime();
      }

      // Clasificar en Futuro vs Pasado
      const isFutureA = dateA >= now;
      const isFutureB = dateB >= now;

      // Prioridad 2: Futuro va antes que Pasado
      if (isFutureA && !isFutureB) return -1;
      if (!isFutureA && isFutureB) return 1;

      // Prioridad 3: Ordenar dentro del grupo
      if (isFutureA && isFutureB) {
        // Ambas futuras: Ascendente (próxima vacación primero)
        return dateA.getTime() - dateB.getTime();
      } else {
        // Ambas pasadas: Descendente (historial reciente primero)
        return dateB.getTime() - dateA.getTime();
      }
    });
  }, [requests, status, yearFilter]);

  const table = useReactTable({
    data: filteredRequests,
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
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/40 cursor-pointer"
                  onClick={() => {
                    setSelectedRequest(row.original);
                    setDetailDialogOpen(true);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState title="Nada por aquí" description="No tienes solicitudes de ausencias." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <DataTablePagination table={table} />
      </div>

      {/* Dialog de confirmación de cancelación */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La solicitud será marcada como cancelada y se notificará al aprobador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelRequest}>Sí, cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de detalle de solicitud */}
      <PtoRequestDetailDialog
        request={selectedRequest}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onDocumentsChange={handleDocumentsChange}
      />
    </>
  );
}

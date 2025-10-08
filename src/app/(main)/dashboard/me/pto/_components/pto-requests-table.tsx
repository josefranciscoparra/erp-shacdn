"use client";

import { useMemo, useState } from "react";
import { usePtoStore, type PtoRequest } from "@/stores/pto-store";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, XCircle, Ban, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
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

const statusConfig = {
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
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
  status?: "all" | "active" | "pending" | "history";
}

export function PtoRequestsTable({ status = "all" }: PtoRequestsTableProps) {
  const { requests, cancelRequest } = usePtoStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<string | null>(null);

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
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: type.color }}
              />
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
        header: "Días",
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.workingDays.toFixed(1)}</span>
        ),
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
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
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
    [cancelRequest]
  );

  // Filtrar solicitudes según el tab seleccionado
  const filteredRequests = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (status) {
      case "active":
        return requests.filter(
          (r) => r.status === "APPROVED" && new Date(r.startDate) >= now
        );
      case "pending":
        return requests.filter((r) => r.status === "PENDING");
      case "history":
        return requests.filter(
          (r) =>
            r.status === "APPROVED" ||
            r.status === "REJECTED" ||
            r.status === "CANCELLED"
        );
      default:
        return requests;
    }
  }, [requests, status]);

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
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay solicitudes para mostrar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      {/* Dialog de confirmación de cancelación */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La solicitud será marcada como cancelada
              y se notificará al aprobador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelRequest}>
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

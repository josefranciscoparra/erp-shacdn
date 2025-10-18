"use client";

import { useCallback, useMemo, useState } from "react";

import type { AbsenceType } from "@prisma/client";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, CheckCircle2, Clock, Loader2, MoreHorizontal, XCircle } from "lucide-react";
import { toast } from "sonner";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/hr/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { adminApprovePtoRequest, adminCancelPtoRequest, adminRejectPtoRequest } from "@/server/actions/admin-pto";

interface PtoRequest {
  id: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reason?: string | null;
  submittedAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  absenceType: AbsenceType;
  approver?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

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

interface EmployeePtoRequestsTableProps {
  requests: PtoRequest[];
  isLoading?: boolean;
  canManage?: boolean;
  onRefresh?: () => Promise<void> | void;
}

type ActionType = "approve" | "reject" | "cancel";

export function EmployeePtoRequestsTable({
  requests,
  isLoading,
  canManage = false,
  onRefresh,
}: EmployeePtoRequestsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PtoRequest | null>(null);
  const [actionType, setActionType] = useState<ActionType>("approve");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openActionDialog = useCallback((request: PtoRequest, type: ActionType) => {
    setSelectedRequest(request);
    setActionType(type);
    setComments("");
    setActionDialogOpen(true);
  }, []);

  const closeActionDialog = () => {
    setActionDialogOpen(false);
    setSelectedRequest(null);
    setComments("");
    setActionType("approve");
  };

  const handleSubmitAction = async () => {
    if (!selectedRequest) return;

    const trimmedComments = comments.trim();
    if ((actionType === "reject" || actionType === "cancel") && !trimmedComments) {
      toast.error("Debes indicar un motivo");
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionType === "approve") {
        await adminApprovePtoRequest(selectedRequest.id, trimmedComments || undefined);
        toast.success("Solicitud aprobada correctamente");
      } else if (actionType === "reject") {
        await adminRejectPtoRequest(selectedRequest.id, trimmedComments, trimmedComments);
        toast.success("Solicitud rechazada correctamente");
      } else {
        await adminCancelPtoRequest(selectedRequest.id, trimmedComments);
        toast.success("Solicitud cancelada correctamente");
      }

      if (onRefresh) {
        await onRefresh();
      }

      closeActionDialog();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar la acción";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<PtoRequest>[] = useMemo(() => {
    const baseColumns: ColumnDef<PtoRequest>[] = [
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
        header: "Días",
        cell: ({ row }) => <span className="font-semibold">{row.original.workingDays.toFixed(1)}</span>,
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
    ];

    if (canManage) {
      baseColumns.push({
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <ActionsMenu request={row.original} onAction={(type) => openActionDialog(row.original, type)} />
        ),
        enableSorting: false,
      });
    }

    return baseColumns;
  }, [canManage, openActionDialog]);

  const table = useReactTable({
    data: requests,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse">Cargando solicitudes...</div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="mx-auto h-12 w-12" />}
        title="Sin solicitudes"
        description="Este empleado aún no ha realizado ninguna solicitud de vacaciones"
      />
    );
  }

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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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

      <Dialog
        open={actionDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeActionDialog();
          } else {
            setActionDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? "Aprobar solicitud"
                : actionType === "reject"
                  ? "Rechazar solicitud"
                  : "Cancelar solicitud"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && selectedRequest.absenceType
                ? `${selectedRequest.absenceType.name} (${format(new Date(selectedRequest.startDate), "PP", { locale: es })} - ${format(new Date(selectedRequest.endDate), "PP", { locale: es })})`
                : "Confirma la acción seleccionada"}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-sm">
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Días hábiles</span>
                    <span className="font-semibold">{Number(selectedRequest.workingDays).toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Solicitado:</span>
                    <span className="ml-1 font-medium">
                      {format(new Date(selectedRequest.submittedAt), "PP", { locale: es })}
                    </span>
                  </div>
                  {selectedRequest.reason && (
                    <div>
                      <span className="text-muted-foreground">Motivo:</span>
                      <p className="mt-1 whitespace-pre-line">{selectedRequest.reason}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action-comments">
                  {actionType === "approve" ? "Comentarios (opcional)" : "Motivo (obligatorio)"}
                </Label>
                <Textarea
                  id="action-comments"
                  rows={4}
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder={
                    actionType === "approve"
                      ? "Añade información para el historial (opcional)"
                      : actionType === "reject"
                        ? "Explica por qué se rechaza la solicitud"
                        : "Explica por qué se cancela la solicitud"
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeActionDialog} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={isSubmitting}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : actionType === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : actionType === "approve" ? (
                "Aprobar"
              ) : actionType === "reject" ? (
                "Rechazar"
              ) : (
                "Cancelar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ActionsMenuProps {
  request: PtoRequest;
  onAction: (type: ActionType) => void;
}

function ActionsMenu({ request, onAction }: ActionsMenuProps) {
  const status = request.status;
  const now = Date.now();
  const startDate = new Date(request.startDate).getTime();
  const canCancel = status === "APPROVED" && startDate > now;
  const canDecide = status === "PENDING";

  if (!canDecide && !canCancel) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canDecide && (
          <>
            <DropdownMenuItem onClick={() => onAction("approve")}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
              Aprobar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("reject")}>
              <XCircle className="mr-2 h-4 w-4 text-red-600" />
              Rechazar
            </DropdownMenuItem>
          </>
        )}
        {canCancel && (
          <DropdownMenuItem onClick={() => onAction("cancel")}>
            <Ban className="mr-2 h-4 w-4 text-amber-600" />
            Cancelar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

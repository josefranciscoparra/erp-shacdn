"use client";

import { useEffect, useState, useMemo } from "react";
import { SectionHeader } from "@/components/hr/section-header";
import { getPendingPtoRequests, approvePtoRequest, rejectPtoRequest } from "@/server/actions/approver-pto";
import { Loader2 } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
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
import { Clock, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface PendingRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  status: string;
  reason?: string | null;
  submittedAt: Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl?: string | null;
  };
  absenceType: {
    id: string;
    name: string;
    color: string;
  };
}

export default function PtoApprovalsPage() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await getPendingPtoRequests();
      setRequests(data as PendingRequest[]);
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
      toast.error("Error al cargar solicitudes pendientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = (request: PendingRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setComments("");
    setActionDialogOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedRequest) return;

    if (actionType === "reject" && !comments.trim()) {
      toast.error("Debes proporcionar un motivo para el rechazo");
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionType === "approve") {
        await approvePtoRequest(selectedRequest.id, comments.trim() || undefined);
        toast.success("Solicitud aprobada correctamente");
      } else {
        await rejectPtoRequest(selectedRequest.id, comments.trim());
        toast.success("Solicitud rechazada correctamente");
      }

      setActionDialogOpen(false);
      setSelectedRequest(null);
      setComments("");
      await loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<PendingRequest>[] = useMemo(
    () => [
      {
        accessorKey: "employee",
        header: "Empleado",
        cell: ({ row }) => {
          const employee = row.original.employee;
          return (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {employee.firstName[0]}
                {employee.lastName[0]}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">
                  {employee.firstName} {employee.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{employee.email}</span>
              </div>
            </div>
          );
        },
      },
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
        accessorKey: "submittedAt",
        header: "Solicitado",
        cell: ({ row }) => format(new Date(row.original.submittedAt), "PP", { locale: es }),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const request = row.original;

          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
                onClick={() => handleAction(request, "approve")}
              >
                <Check className="mr-1 h-4 w-4" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                onClick={() => handleAction(request, "reject")}
              >
                <X className="mr-1 h-4 w-4" />
                Rechazar
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: requests,
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
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Solicitudes Pendientes" />

      {/* Contador */}
      <Card className="from-primary/5 to-card flex items-center justify-between bg-gradient-to-t p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Solicitudes pendientes de aprobación</span>
        </div>
        <Badge variant="secondary" className="text-lg font-bold">
          {requests.length}
        </Badge>
      </Card>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
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
                      No hay solicitudes pendientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination table={table} />
        </>
      )}

      {/* Dialog de aprobación/rechazo */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Aprobar solicitud" : "Rechazar solicitud"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest &&
                `${selectedRequest.employee.firstName} ${selectedRequest.employee.lastName} - ${selectedRequest.absenceType.name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fecha inicio:</span>
                    <p className="font-medium">
                      {format(new Date(selectedRequest.startDate), "PP", { locale: es })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha fin:</span>
                    <p className="font-medium">
                      {format(new Date(selectedRequest.endDate), "PP", { locale: es })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Días hábiles:</span>
                    <p className="font-semibold">{selectedRequest.workingDays.toFixed(1)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Solicitado:</span>
                    <p className="font-medium">
                      {format(new Date(selectedRequest.submittedAt), "PP", { locale: es })}
                    </p>
                  </div>
                </div>
                {selectedRequest.reason && (
                  <div className="mt-4">
                    <span className="text-sm text-muted-foreground">Motivo:</span>
                    <p className="mt-1 text-sm">{selectedRequest.reason}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="comments">
                  Comentarios {actionType === "reject" && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="comments"
                  placeholder={
                    actionType === "approve"
                      ? "Comentarios opcionales..."
                      : "Motivo del rechazo (obligatorio)"
                  }
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={isSubmitting || (actionType === "reject" && !comments.trim())}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : actionType === "approve" ? (
                "Aprobar"
              ) : (
                "Rechazar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

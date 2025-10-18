"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getApproverPtoRequests, approvePtoRequest, rejectPtoRequest } from "@/server/actions/approver-pto";

type TabKey = "pending" | "approved" | "rejected";
type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ApproverPtoRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  status: RequestStatus;
  reason?: string | null;
  submittedAt: Date;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  approverComments?: string | null;
  rejectionReason?: string | null;
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

interface ApproverPtoTotals {
  pending: number;
  approved: number;
  rejected: number;
}

export default function PtoApprovalsPage() {
  const [tabData, setTabData] = useState<Record<TabKey, ApproverPtoRequest[]>>({
    pending: [],
    approved: [],
    rejected: [],
  });
  const [tabLoading, setTabLoading] = useState<Record<TabKey, boolean>>({
    pending: true,
    approved: false,
    rejected: false,
  });
  const [loadedTabs, setLoadedTabs] = useState<Record<TabKey, boolean>>({
    pending: false,
    approved: false,
    rejected: false,
  });
  const [selectedTab, setSelectedTab] = useState<TabKey>("pending");
  const [pendingSorting, setPendingSorting] = useState<SortingState>([]);
  const [approvedSorting, setApprovedSorting] = useState<SortingState>([]);
  const [rejectedSorting, setRejectedSorting] = useState<SortingState>([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [selectedRequest, setSelectedRequest] = useState<ApproverPtoRequest | null>(null);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totals, setTotals] = useState<ApproverPtoTotals>({ pending: 0, approved: 0, rejected: 0 });
  const loadRequests = useCallback(async (tab: TabKey) => {
    let status: RequestStatus = "PENDING";
    let errorMessage = "Error al cargar solicitudes pendientes";

    if (tab === "approved") {
      status = "APPROVED";
      errorMessage = "Error al cargar solicitudes aprobadas";
    } else if (tab === "rejected") {
      status = "REJECTED";
      errorMessage = "Error al cargar solicitudes rechazadas";
    }

    setTabLoading((prev) => ({
      pending: tab === "pending" ? true : prev.pending,
      approved: tab === "approved" ? true : prev.approved,
      rejected: tab === "rejected" ? true : prev.rejected,
    }));
    try {
      const { requests, totals: newTotals } = await getApproverPtoRequests(status);
      const typedRequests = requests as ApproverPtoRequest[];
      const typedTotals = newTotals as ApproverPtoTotals;
      setTabData((prev) => ({
        pending: tab === "pending" ? typedRequests : prev.pending,
        approved: tab === "approved" ? typedRequests : prev.approved,
        rejected: tab === "rejected" ? typedRequests : prev.rejected,
      }));
      setTotals({ ...typedTotals });
      setLoadedTabs((prev) => ({
        pending: tab === "pending" ? true : prev.pending,
        approved: tab === "approved" ? true : prev.approved,
        rejected: tab === "rejected" ? true : prev.rejected,
      }));
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
      toast.error(errorMessage);
    } finally {
      setTabLoading((prev) => ({
        pending: tab === "pending" ? false : prev.pending,
        approved: tab === "approved" ? false : prev.approved,
        rejected: tab === "rejected" ? false : prev.rejected,
      }));
    }
  }, []);

  useEffect(() => {
    void loadRequests("pending");
  }, [loadRequests]);

  const handleTabChange = (value: string) => {
    const tab = value as TabKey;
    setSelectedTab(tab);
    let isLoaded: boolean;
    switch (tab) {
      case "approved":
        isLoaded = loadedTabs.approved;
        break;
      case "rejected":
        isLoaded = loadedTabs.rejected;
        break;
      default:
        isLoaded = loadedTabs.pending;
        break;
    }

    if (!isLoaded) {
      void loadRequests(tab);
    }
  };

  const handleAction = useCallback((request: ApproverPtoRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setComments("");
    setActionDialogOpen(true);
  }, []);

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
      const refreshTabs: TabKey[] = ["pending"];
      if (actionType === "approve" && loadedTabs.approved) {
        refreshTabs.push("approved");
      }
      if (actionType === "reject" && loadedTabs.rejected) {
        refreshTabs.push("rejected");
      }
      await Promise.all(refreshTabs.map((tab) => loadRequests(tab)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEmployeeCell = (request: ApproverPtoRequest) => {
    const employee = request.employee;
    return (
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full font-semibold">
          {employee.firstName[0]}
          {employee.lastName[0]}
        </div>
        <div className="flex flex-col">
          <span className="font-medium">
            {employee.firstName} {employee.lastName}
          </span>
          <span className="text-muted-foreground text-xs">{employee.email}</span>
        </div>
      </div>
    );
  };

  const renderTypeCell = (request: ApproverPtoRequest) => {
    const type = request.absenceType;
    return (
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
        <span className="font-medium">{type.name}</span>
      </div>
    );
  };

  const pendingColumns: ColumnDef<ApproverPtoRequest>[] = useMemo(
    () => [
      {
        accessorKey: "employee",
        header: "Empleado",
        cell: ({ row }) => renderEmployeeCell(row.original),
      },
      {
        accessorKey: "absenceType",
        header: "Tipo",
        cell: ({ row }) => renderTypeCell(row.original),
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
        cell: ({ row }) => <span className="font-semibold">{Number(row.original.workingDays).toFixed(1)}</span>,
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
    [handleAction],
  );

  const approvedColumns: ColumnDef<ApproverPtoRequest>[] = useMemo(
    () => [
      {
        accessorKey: "employee",
        header: "Empleado",
        cell: ({ row }) => renderEmployeeCell(row.original),
      },
      {
        accessorKey: "absenceType",
        header: "Tipo",
        cell: ({ row }) => renderTypeCell(row.original),
      },
      {
        accessorKey: "startDate",
        header: "Inicio",
        cell: ({ row }) => format(new Date(row.original.startDate), "PP", { locale: es }),
      },
      {
        accessorKey: "endDate",
        header: "Fin",
        cell: ({ row }) => format(new Date(row.original.endDate), "PP", { locale: es }),
      },
      {
        accessorKey: "workingDays",
        header: "Días",
        cell: ({ row }) => <span className="font-semibold">{Number(row.original.workingDays).toFixed(1)}</span>,
      },
      {
        accessorKey: "submittedAt",
        header: "Solicitado",
        cell: ({ row }) => format(new Date(row.original.submittedAt), "PP", { locale: es }),
      },
      {
        id: "approvedAt",
        header: "Aprobada",
        cell: ({ row }) => {
          const approvedAt = row.original.approvedAt;
          return approvedAt ? (
            <span>{format(new Date(approvedAt), "PP", { locale: es })}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: "comments",
        header: "Comentarios",
        cell: ({ row }) =>
          row.original.approverComments ? (
            <span className="line-clamp-2 text-sm">{row.original.approverComments}</span>
          ) : (
            <span className="text-muted-foreground text-sm">Sin comentarios</span>
          ),
      },
    ],
    [],
  );

  const rejectedColumns: ColumnDef<ApproverPtoRequest>[] = useMemo(
    () => [
      {
        accessorKey: "employee",
        header: "Empleado",
        cell: ({ row }) => renderEmployeeCell(row.original),
      },
      {
        accessorKey: "absenceType",
        header: "Tipo",
        cell: ({ row }) => renderTypeCell(row.original),
      },
      {
        accessorKey: "startDate",
        header: "Inicio",
        cell: ({ row }) => format(new Date(row.original.startDate), "PP", { locale: es }),
      },
      {
        accessorKey: "endDate",
        header: "Fin",
        cell: ({ row }) => format(new Date(row.original.endDate), "PP", { locale: es }),
      },
      {
        accessorKey: "workingDays",
        header: "Días",
        cell: ({ row }) => <span className="font-semibold">{Number(row.original.workingDays).toFixed(1)}</span>,
      },
      {
        accessorKey: "submittedAt",
        header: "Solicitado",
        cell: ({ row }) => format(new Date(row.original.submittedAt), "PP", { locale: es }),
      },
      {
        id: "rejectedAt",
        header: "Rechazada",
        cell: ({ row }) => {
          const rejectedAt = row.original.rejectedAt;
          return rejectedAt ? (
            <span>{format(new Date(rejectedAt), "PP", { locale: es })}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: "rejectionReason",
        header: "Motivo",
        cell: ({ row }) =>
          row.original.rejectionReason ? (
            <span className="line-clamp-2 text-sm">{row.original.rejectionReason}</span>
          ) : (
            <span className="text-muted-foreground text-sm">Sin motivo</span>
          ),
      },
    ],
    [],
  );

  const pendingTable = useReactTable({
    data: tabData.pending,
    columns: pendingColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setPendingSorting,
    state: {
      sorting: pendingSorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const approvedTable = useReactTable({
    data: tabData.approved,
    columns: approvedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setApprovedSorting,
    state: {
      sorting: approvedSorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const rejectedTable = useReactTable({
    data: tabData.rejected,
    columns: rejectedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setRejectedSorting,
    state: {
      sorting: rejectedSorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const counts = totals;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Solicitudes de PTO" />

      <Tabs value={selectedTab} onValueChange={handleTabChange} className="flex flex-col gap-4">
        <TabsList className="justify-start overflow-x-auto">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pendientes
            <Badge variant="secondary">{counts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            Aprobadas
            <Badge variant="secondary">{counts.approved}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            Rechazadas
            <Badge variant="secondary">{counts.rejected}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="flex flex-col gap-4">
          <Card className="from-primary/5 to-card flex items-center justify-between bg-gradient-to-t p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-5 w-5" />
              <span className="font-medium">Solicitudes pendientes de aprobación</span>
            </div>
            <Badge variant="secondary" className="text-lg font-bold">
              {counts.pending}
            </Badge>
          </Card>

          {tabLoading.pending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : tabData.pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-12 text-center">
              <Clock className="text-muted-foreground h-12 w-12" />
              <div>
                <h3 className="font-semibold">No hay solicitudes pendientes</h3>
                <p className="text-muted-foreground text-sm">Cuando recibas nuevas solicitudes aparecerán aquí.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    {pendingTable.getHeaderGroups().map((headerGroup) => (
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
                    {pendingTable.getRowModel().rows.length ? (
                      pendingTable.getRowModel().rows.map((row) => (
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
                        <TableCell colSpan={pendingColumns.length} className="h-24 text-center">
                          No hay solicitudes pendientes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination table={pendingTable} />
            </>
          )}
        </TabsContent>

        <TabsContent value="approved" className="flex flex-col gap-4">
          {tabLoading.approved ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : tabData.approved.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-12 text-center">
              <Check className="text-muted-foreground h-12 w-12" />
              <div>
                <h3 className="font-semibold">No hay solicitudes aprobadas</h3>
                <p className="text-muted-foreground text-sm">Cuando apruebes solicitudes aparecerán en este listado.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    {approvedTable.getHeaderGroups().map((headerGroup) => (
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
                    {approvedTable.getRowModel().rows.length ? (
                      approvedTable.getRowModel().rows.map((row) => (
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
                        <TableCell colSpan={approvedColumns.length} className="h-24 text-center">
                          No hay solicitudes aprobadas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination table={approvedTable} />
            </>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="flex flex-col gap-4">
          {tabLoading.rejected ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : tabData.rejected.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-12 text-center">
              <X className="text-muted-foreground h-12 w-12" />
              <div>
                <h3 className="font-semibold">No hay solicitudes rechazadas</h3>
                <p className="text-muted-foreground text-sm">Las solicitudes rechazadas se mostrarán cuando existan.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    {rejectedTable.getHeaderGroups().map((headerGroup) => (
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
                    {rejectedTable.getRowModel().rows.length ? (
                      rejectedTable.getRowModel().rows.map((row) => (
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
                        <TableCell colSpan={rejectedColumns.length} className="h-24 text-center">
                          No hay solicitudes rechazadas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination table={rejectedTable} />
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={actionDialogOpen}
        onOpenChange={(open) => {
          setActionDialogOpen(open);
          if (!open) {
            setSelectedRequest(null);
            setComments("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Aprobar solicitud" : "Rechazar solicitud"}</DialogTitle>
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
                    <p className="font-medium">{format(new Date(selectedRequest.startDate), "PP", { locale: es })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha fin:</span>
                    <p className="font-medium">{format(new Date(selectedRequest.endDate), "PP", { locale: es })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Días hábiles:</span>
                    <p className="font-semibold">{Number(selectedRequest.workingDays).toFixed(1)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Solicitado:</span>
                    <p className="font-medium">{format(new Date(selectedRequest.submittedAt), "PP", { locale: es })}</p>
                  </div>
                </div>
                {selectedRequest.reason && (
                  <div className="mt-4">
                    <span className="text-muted-foreground text-sm">Motivo:</span>
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
                    actionType === "approve" ? "Comentarios opcionales..." : "Motivo del rechazo (obligatorio)"
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
              onClick={() => {
                setActionDialogOpen(false);
                setSelectedRequest(null);
                setComments("");
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={isSubmitting || (actionType === "reject" && !comments.trim())}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
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

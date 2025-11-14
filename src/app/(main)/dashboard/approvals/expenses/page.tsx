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
import { Check, Clock, Eye, Loader2, Receipt, X } from "lucide-react";
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
import {
  getPendingApprovals,
  getApprovalHistory,
  approveExpense,
  rejectExpense,
} from "@/server/actions/expense-approvals";

import { ExpenseDetailSheet } from "./_components/expense-detail-sheet";

type TabKey = "pending" | "approved" | "rejected";

interface ExpenseApproval {
  id: string;
  date: Date;
  category: string;
  amount: number;
  vatPercent: number | null;
  totalAmount: number;
  notes: string | null;
  merchantName: string | null;
  merchantVat: string | null;
  status: string;
  createdAt: Date;
  mileageKm: number | null;
  mileageRate: number | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    photoUrl: string | null; // Lo mantenemos como photoUrl en la interfaz para el Sheet
    user?: {
      image: string | null; // Pero viene como image del servidor
    };
  };
  approvals: Array<{
    id: string;
    decision: string;
    comment: string | null;
    decidedAt: Date | null;
    approver: {
      name: string;
    };
  }>;
  attachments?: Array<{
    id: string;
    url: string;
    fileName: string;
  }>;
  costCenter?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

const categoryLabels: Record<string, string> = {
  FUEL: "Combustible",
  MILEAGE: "Kilometraje",
  MEAL: "Comida",
  TOLL: "Peaje",
  PARKING: "Parking",
  LODGING: "Alojamiento",
  OTHER: "Otros",
};

const getCategoryBadgeVariant = (category: string) => {
  switch (category) {
    case "FUEL":
      return "default";
    case "MILEAGE":
      return "secondary";
    case "MEAL":
      return "outline";
    default:
      return "outline";
  }
};

export default function ExpenseApprovalsPage() {
  const [tabData, setTabData] = useState<Record<TabKey, ExpenseApproval[]>>({
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
  const [selectedExpense, setSelectedExpense] = useState<ExpenseApproval | null>(null);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<ExpenseApproval | null>(null);

  const loadExpenses = useCallback(async (tab: TabKey) => {
    setTabLoading((prev) => ({ ...prev, [tab]: true }));
    try {
      if (tab === "pending") {
        const { expenses } = await getPendingApprovals();
        setTabData((prev) => ({ ...prev, pending: expenses as ExpenseApproval[] }));
      } else {
        const { expenses } = await getApprovalHistory(100);
        const filteredExpenses = (expenses as ExpenseApproval[]).filter((exp) => {
          const approval = exp.approvals[0];
          if (!approval) return false;
          return tab === "approved" ? approval.decision === "APPROVED" : approval.decision === "REJECTED";
        });
        setTabData((prev) => ({ ...prev, [tab]: filteredExpenses }));
      }
      setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
    } catch (error) {
      console.error("Error al cargar gastos:", error);
      toast.error("Error al cargar gastos");
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  useEffect(() => {
    // Cargar todas las tabs al inicio para tener los contadores correctos
    void Promise.all([loadExpenses("pending"), loadExpenses("approved"), loadExpenses("rejected")]);
  }, [loadExpenses]);

  const handleTabChange = (value: string) => {
    const tab = value as TabKey;
    setSelectedTab(tab);
    if (!loadedTabs[tab]) {
      void loadExpenses(tab);
    }
  };

  const handleAction = useCallback((expense: ExpenseApproval, action: "approve" | "reject") => {
    setSelectedExpense(expense);
    setActionType(action);
    setComments("");
    setActionDialogOpen(true);
  }, []);

  const handleDetailSheetApprove = useCallback(() => {
    if (!detailExpense) return;
    setDetailSheetOpen(false);
    handleAction(detailExpense, "approve");
  }, [detailExpense, handleAction]);

  const handleDetailSheetReject = useCallback(() => {
    if (!detailExpense) return;
    setDetailSheetOpen(false);
    handleAction(detailExpense, "reject");
  }, [detailExpense, handleAction]);

  const handleSubmitAction = async () => {
    if (!selectedExpense) return;

    if (actionType === "reject" && !comments.trim()) {
      toast.error("Debes proporcionar un motivo para el rechazo");
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionType === "approve") {
        await approveExpense(selectedExpense.id, comments.trim() || undefined);
        toast.success("Gasto aprobado correctamente");
      } else {
        await rejectExpense(selectedExpense.id, comments.trim());
        toast.success("Gasto rechazado correctamente");
      }

      setActionDialogOpen(false);
      setSelectedExpense(null);
      setComments("");

      // Recargar todas las tabs para actualizar los contadores
      const refreshTabs: TabKey[] = ["pending"];
      if (actionType === "approve") {
        refreshTabs.push("approved");
      }
      if (actionType === "reject") {
        refreshTabs.push("rejected");
      }
      await Promise.all(refreshTabs.map((tab) => loadExpenses(tab)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEmployeeCell = (expense: ExpenseApproval) => {
    const employee = expense.employee;
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
          {employee.email && <span className="text-muted-foreground text-xs">{employee.email}</span>}
        </div>
      </div>
    );
  };

  const pendingColumns: ColumnDef<ExpenseApproval>[] = useMemo(
    () => [
      {
        accessorKey: "employee",
        header: "Empleado",
        cell: ({ row }) => renderEmployeeCell(row.original),
      },
      {
        accessorKey: "category",
        header: "Categoría",
        cell: ({ row }) => (
          <Badge variant={getCategoryBadgeVariant(row.original.category)}>
            {categoryLabels[row.original.category] ?? row.original.category}
          </Badge>
        ),
      },
      {
        accessorKey: "merchantName",
        header: "Comercio",
        cell: ({ row }) => row.original.merchantName ?? <span className="text-muted-foreground">-</span>,
      },
      {
        accessorKey: "date",
        header: "Fecha",
        cell: ({ row }) => format(new Date(row.original.date), "PP", { locale: es }),
      },
      {
        accessorKey: "totalAmount",
        header: "Importe",
        cell: ({ row }) => (
          <span className="font-semibold">
            {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
              Number(row.original.totalAmount),
            )}
          </span>
        ),
      },
      {
        accessorKey: "costCenter",
        header: "Centro Coste",
        cell: ({ row }) =>
          row.original.costCenter ? (
            <span className="text-sm">{row.original.costCenter.name}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: "detail",
        cell: ({ row }) => {
          const expense = row.original;
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDetailExpense(expense);
                setDetailSheetOpen(true);
              }}
            >
              <Eye className="mr-1 h-4 w-4" />
              Ver detalle
            </Button>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const expense = row.original;
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
                onClick={() => handleAction(expense, "approve")}
              >
                <Check className="mr-1 h-4 w-4" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                onClick={() => handleAction(expense, "reject")}
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

  const historyColumns: ColumnDef<ExpenseApproval>[] = useMemo(
    () => [
      {
        accessorKey: "employee",
        header: "Empleado",
        cell: ({ row }) => renderEmployeeCell(row.original),
      },
      {
        accessorKey: "category",
        header: "Categoría",
        cell: ({ row }) => (
          <Badge variant={getCategoryBadgeVariant(row.original.category)}>
            {categoryLabels[row.original.category] ?? row.original.category}
          </Badge>
        ),
      },
      {
        accessorKey: "merchantName",
        header: "Comercio",
        cell: ({ row }) => row.original.merchantName ?? <span className="text-muted-foreground">-</span>,
      },
      {
        accessorKey: "date",
        header: "Fecha",
        cell: ({ row }) => format(new Date(row.original.date), "PP", { locale: es }),
      },
      {
        accessorKey: "totalAmount",
        header: "Importe",
        cell: ({ row }) => (
          <span className="font-semibold">
            {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
              Number(row.original.totalAmount),
            )}
          </span>
        ),
      },
      {
        id: "decidedAt",
        header: "Procesado",
        cell: ({ row }) => {
          const approval = row.original.approvals[0];
          return approval?.decidedAt ? (
            <span>{format(new Date(approval.decidedAt), "PP", { locale: es })}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: "comment",
        header: "Comentario",
        cell: ({ row }) => {
          const approval = row.original.approvals[0];
          return approval?.comment ? (
            <span className="line-clamp-2 text-sm">{approval.comment}</span>
          ) : (
            <span className="text-muted-foreground text-sm">Sin comentarios</span>
          );
        },
      },
      {
        id: "detail",
        cell: ({ row }) => {
          const expense = row.original;
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDetailExpense(expense);
                setDetailSheetOpen(true);
              }}
            >
              <Eye className="mr-1 h-4 w-4" />
              Ver detalle
            </Button>
          );
        },
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
    state: { sorting: pendingSorting },
    initialState: { pagination: { pageSize: 10 } },
  });

  const approvedTable = useReactTable({
    data: tabData.approved,
    columns: historyColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setApprovedSorting,
    state: { sorting: approvedSorting },
    initialState: { pagination: { pageSize: 10 } },
  });

  const rejectedTable = useReactTable({
    data: tabData.rejected,
    columns: historyColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setRejectedSorting,
    state: { sorting: rejectedSorting },
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Aprobación de Gastos"
        description="Revisa y aprueba los gastos presentados por los empleados de tu organización."
      />

      <Tabs value={selectedTab} onValueChange={handleTabChange} className="flex flex-col gap-4">
        <TabsList className="justify-start overflow-x-auto">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pendientes
            <Badge variant="secondary">{tabData.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            Aprobados
            <Badge variant="secondary">{tabData.approved.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            Rechazados
            <Badge variant="secondary">{tabData.rejected.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab Pendientes */}
        <TabsContent value="pending" className="flex flex-col gap-4">
          <Card className="from-primary/5 to-card flex items-center justify-between bg-gradient-to-t p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-5 w-5" />
              <span className="font-medium">Gastos pendientes de aprobación</span>
            </div>
            <Badge variant="secondary" className="text-lg font-bold">
              {tabData.pending.length}
            </Badge>
          </Card>

          {tabLoading.pending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : tabData.pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-12 text-center">
              <Receipt className="text-muted-foreground h-12 w-12" />
              <div>
                <h3 className="font-semibold">No hay gastos pendientes</h3>
                <p className="text-muted-foreground text-sm">Cuando recibas nuevos gastos aparecerán aquí.</p>
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
                    {pendingTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination table={pendingTable} />
            </>
          )}
        </TabsContent>

        {/* Tab Aprobados */}
        <TabsContent value="approved" className="flex flex-col gap-4">
          {tabLoading.approved ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : tabData.approved.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-12 text-center">
              <Check className="text-muted-foreground h-12 w-12" />
              <div>
                <h3 className="font-semibold">No hay gastos aprobados</h3>
                <p className="text-muted-foreground text-sm">Cuando apruebes gastos aparecerán en este listado.</p>
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
                    {approvedTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination table={approvedTable} />
            </>
          )}
        </TabsContent>

        {/* Tab Rechazados */}
        <TabsContent value="rejected" className="flex flex-col gap-4">
          {tabLoading.rejected ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : tabData.rejected.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-12 text-center">
              <X className="text-muted-foreground h-12 w-12" />
              <div>
                <h3 className="font-semibold">No hay gastos rechazados</h3>
                <p className="text-muted-foreground text-sm">Los gastos rechazados se mostrarán cuando existan.</p>
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
                    {rejectedTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination table={rejectedTable} />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Aprobación/Rechazo */}
      <Dialog
        open={actionDialogOpen}
        onOpenChange={(open) => {
          setActionDialogOpen(open);
          if (!open) {
            setSelectedExpense(null);
            setComments("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Aprobar gasto" : "Rechazar gasto"}</DialogTitle>
            {selectedExpense && (
              <DialogDescription>
                {selectedExpense.employee.firstName} {selectedExpense.employee.lastName} -{" "}
                {categoryLabels[selectedExpense.category]}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedExpense && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fecha:</span>
                    <p className="font-medium">{format(new Date(selectedExpense.date), "PP", { locale: es })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categoría:</span>
                    <p className="font-medium">{categoryLabels[selectedExpense.category]}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Importe:</span>
                    <p className="font-semibold text-green-600">
                      {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
                        Number(selectedExpense.totalAmount),
                      )}
                    </p>
                  </div>
                  {selectedExpense.merchantName && (
                    <div>
                      <span className="text-muted-foreground">Comercio:</span>
                      <p className="font-medium">{selectedExpense.merchantName}</p>
                    </div>
                  )}
                </div>
                {selectedExpense.notes && (
                  <div className="mt-4">
                    <span className="text-muted-foreground text-sm">Notas:</span>
                    <p className="mt-1 text-sm">{selectedExpense.notes}</p>
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
                setSelectedExpense(null);
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

      {/* Sheet de Detalle de Gasto */}
      {detailExpense && (
        <ExpenseDetailSheet
          expense={{
            ...detailExpense,
            employee: {
              firstName: detailExpense.employee.firstName,
              lastName: detailExpense.employee.lastName,
              email: detailExpense.employee.email ?? "",
              photoUrl: detailExpense.employee.user?.image ?? null,
            },
            approvals: detailExpense.approvals.map((approval) => ({
              ...approval,
              approver: {
                name: approval.approver.name ?? "",
              },
            })),
          }}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          onApprove={handleDetailSheetApprove}
          onReject={handleDetailSheetReject}
        />
      )}
    </div>
  );
}

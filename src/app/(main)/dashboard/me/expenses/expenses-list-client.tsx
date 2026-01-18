"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { SectionHeader } from "@/components/hr/section-header";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Expense, useExpensesStore } from "@/stores/expenses-store";

import { getCategoryLabel } from "./_components/expense-category-icon";
import { getExpensesColumns } from "./_components/expenses-columns";
import { ExpensesMetrics } from "./_components/expenses-metrics";
import { ExpensePolicyClient, isReceiptRequired } from "./_lib/expense-policy";

interface ExpensesListClientProps {
  policy?: ExpensePolicyClient | null;
}

export default function ExpensesPage({ policy }: ExpensesListClientProps) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]); // Ordenar por fecha descendente por defecto
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ amount: false });
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [dialogAction, setDialogAction] = useState<{ type: "delete" | "submit"; expense: Expense } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const { expenses, isLoading, fetchMyExpenses, deleteExpense, submitExpense } = useExpensesStore();

  // Cargar gastos al montar (solo una vez)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchMyExpenses();
    }
  }, [fetchMyExpenses]);

  // Filtrar gastos por estado (memoizado para evitar recálculos)
  const draftExpenses = useMemo(() => expenses.filter((e) => e.status === "DRAFT"), [expenses]);
  const inReviewExpenses = useMemo(() => expenses.filter((e) => e.status === "SUBMITTED"), [expenses]);
  const reimbursedExpenses = useMemo(() => expenses.filter((e) => e.status === "REIMBURSED"), [expenses]);
  const completedExpenses = useMemo(
    () => expenses.filter((e) => e.status === "APPROVED" || e.status === "REJECTED"),
    [expenses],
  );

  const counts = useMemo(
    () => ({
      all: expenses.length,
      draft: draftExpenses.length,
      inReview: inReviewExpenses.length,
      reimbursed: reimbursedExpenses.length,
      completed: completedExpenses.length,
    }),
    [completedExpenses, draftExpenses, expenses, inReviewExpenses, reimbursedExpenses],
  );

  // Obtener gastos filtrados según el tab actual (memoizado)
  const filteredExpenses = useMemo((): Expense[] => {
    switch (currentTab) {
      case "draft":
        return draftExpenses;
      case "in-review":
        return inReviewExpenses;
      case "reimbursed":
        return reimbursedExpenses;
      case "completed":
        return completedExpenses;
      case "all":
      default:
        return expenses;
    }
  }, [currentTab, draftExpenses, inReviewExpenses, reimbursedExpenses, completedExpenses, expenses]);

  // Obtener mensaje de empty state según el tab actual
  const emptyStateMessage = useMemo(() => {
    switch (currentTab) {
      case "draft":
        return { title: "Nada por aquí", description: "No tienes borradores de gastos." };
      case "in-review":
        return { title: "Nada por aquí", description: "No tienes gastos en revisión." };
      case "reimbursed":
        return { title: "Nada por aquí", description: "No tienes gastos reembolsados." };
      case "completed":
        return { title: "Nada por aquí", description: "No tienes gastos finalizados." };
      case "all":
      default:
        return { title: "Nada por aquí", description: "No tienes gastos registrados." };
    }
  }, [currentTab]);

  const categoryOptions = useMemo(
    () => [
      { value: "FUEL", label: getCategoryLabel("FUEL") },
      { value: "MILEAGE", label: getCategoryLabel("MILEAGE") },
      { value: "MEAL", label: getCategoryLabel("MEAL") },
      { value: "TOLL", label: getCategoryLabel("TOLL") },
      { value: "PARKING", label: getCategoryLabel("PARKING") },
      { value: "LODGING", label: getCategoryLabel("LODGING") },
      { value: "OTHER", label: getCategoryLabel("OTHER") },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "DRAFT", label: "Borrador" },
      { value: "SUBMITTED", label: "En revisión" },
      { value: "APPROVED", label: "Aprobado" },
      { value: "REJECTED", label: "Rechazado" },
      { value: "REIMBURSED", label: "Reembolsado" },
    ],
    [],
  );

  const tabItems = useMemo(
    () => [
      { value: "all", label: "Todos", count: counts.all },
      { value: "draft", label: "Borradores", count: counts.draft },
      { value: "in-review", label: "En revisión", count: counts.inReview },
      { value: "reimbursed", label: "Reembolsados", count: counts.reimbursed },
      { value: "completed", label: "Finalizados", count: counts.completed },
    ],
    [counts],
  );

  // Memoizar callbacks para evitar recrear en cada render
  const handleView = useMemo(
    () => (expense: Expense) => {
      router.push(`/dashboard/me/expenses/${expense.id}`);
    },
    [router],
  );

  const handleEdit = useMemo(
    () => (expense: Expense) => {
      router.push(`/dashboard/me/expenses/${expense.id}/edit`);
    },
    [router],
  );

  const canSubmitExpense = useMemo(
    () => (expense: Expense) => {
      const requiresReceipt = isReceiptRequired(policy, expense.category);
      const hasAttachments = Array.isArray(expense.attachments) && expense.attachments.length > 0;
      return !requiresReceipt || hasAttachments;
    },
    [policy],
  );

  const handleDelete = useMemo(
    () => (expense: Expense) => {
      setDialogAction({ type: "delete", expense });
    },
    [setDialogAction],
  );

  const handleSubmit = useMemo(
    () => (expense: Expense) => {
      setDialogAction({ type: "submit", expense });
    },
    [setDialogAction],
  );

  const handleNewExpense = useMemo(
    () => () => {
      router.push("/dashboard/me/expenses/new");
    },
    [router],
  );

  const handleConfirmAction = async () => {
    if (!dialogAction) return;
    setIsActionLoading(true);
    try {
      if (dialogAction.type === "delete") {
        await deleteExpense(dialogAction.expense.id);
        await fetchMyExpenses();
        toast.success("Gasto eliminado correctamente");
      }
      if (dialogAction.type === "submit") {
        await submitExpense(dialogAction.expense.id);
        await fetchMyExpenses();
        toast.success("Gasto enviado a aprobación");
      }
    } catch (error) {
      console.error("Error al ejecutar acción:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción");
    } finally {
      setIsActionLoading(false);
      setDialogAction(null);
    }
  };

  // Memoizar columnas para evitar recrear en cada render
  const columns = useMemo(
    () =>
      getExpensesColumns({
        onView: handleView,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onSubmit: handleSubmit,
        canSubmitExpense,
      }),
    [canSubmitExpense, handleView, handleEdit, handleDelete, handleSubmit],
  );

  const table = useReactTable({
    data: filteredExpenses,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [currentTab, table]);

  const showSkeleton = isLoading && expenses.length === 0;
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  // Calcular métricas
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Total del mes: todos los gastos del mes actual (excepto borradores y rechazados)
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expenseDate = new Date(e.date);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear &&
        e.status !== "DRAFT" &&
        e.status !== "REJECTED"
      );
    });
  }, [expenses, currentMonth, currentYear]);

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const previousMonthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expenseDate = new Date(e.date);
      return (
        expenseDate.getMonth() === previousMonth &&
        expenseDate.getFullYear() === previousYear &&
        e.status !== "DRAFT" &&
        e.status !== "REJECTED"
      );
    });
  }, [expenses, previousMonth, previousYear]);

  const currentMonthTotal = useMemo(
    () => currentMonthExpenses.reduce((sum, e) => sum + Number(e.totalAmount), 0),
    [currentMonthExpenses],
  );

  const previousMonthTotal = useMemo(
    () => previousMonthExpenses.reduce((sum, e) => sum + Number(e.totalAmount), 0),
    [previousMonthExpenses],
  );

  const monthlyChange =
    previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;

  // Aprobados: gastos que han sido aprobados (y posiblemente reembolsados)
  const approvedTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.status === "APPROVED" || e.status === "REIMBURSED")
        .reduce((sum, e) => sum + Number(e.totalAmount), 0),
    [expenses],
  );

  const approvedCount = useMemo(
    () => expenses.filter((e) => e.status === "APPROVED" || e.status === "REIMBURSED").length,
    [expenses],
  );

  // En revisión: gastos enviados esperando aprobación
  const submittedTotal = useMemo(
    () => expenses.filter((e) => e.status === "SUBMITTED").reduce((sum, e) => sum + Number(e.totalAmount), 0),
    [expenses],
  );

  const submittedCount = useMemo(() => expenses.filter((e) => e.status === "SUBMITTED").length, [expenses]);

  const selectedRequiresReceipt = dialogAction ? isReceiptRequired(policy, dialogAction.expense.category) : false;
  const selectedHasAttachments = dialogAction
    ? Array.isArray(dialogAction.expense.attachments) && dialogAction.expense.attachments.length > 0
    : false;
  const canSubmitSelected =
    dialogAction && dialogAction.type === "submit" ? canSubmitExpense(dialogAction.expense) : true;

  const metrics = useMemo(
    () => [
      {
        name: "Total del Mes",
        value: new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(currentMonthTotal),
        change: `${monthlyChange >= 0 ? "+" : ""}${monthlyChange.toFixed(1)}%`,
        changeType: monthlyChange < 0 ? "positive" : monthlyChange > 0 ? "negative" : "neutral",
        subtitle: monthlyChange !== 0 ? "vs mes anterior" : "Todos los gastos del mes",
        icon: "total" as const,
      },
      {
        name: "Aprobado",
        value: new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(approvedTotal),
        subtitle: `${approvedCount} ${approvedCount === 1 ? "gasto" : "gastos"}`,
        icon: "pending" as const,
      },
      {
        name: "En Revisión",
        value: new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(submittedTotal),
        subtitle: `${submittedCount} ${submittedCount === 1 ? "gasto" : "gastos"}`,
        icon: "review" as const,
      },
    ],
    [currentMonthTotal, monthlyChange, approvedTotal, approvedCount, submittedTotal, submittedCount],
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <SectionHeader
        title="Mis Gastos"
        description="Registra y gestiona tus gastos de forma sencilla."
        actionLabel="Nuevo Gasto"
        onAction={handleNewExpense}
      />

      {/* Métricas */}
      {showSkeleton ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-lg border p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-4 h-8 w-24" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          ))}
        </div>
      ) : (
        <ExpensesMetrics metrics={metrics} />
      )}

      {/* Tabs de gastos */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full flex-col gap-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="expenses-tab-selector" className="sr-only">
            Vista de gastos
          </Label>
          <Select value={currentTab} onValueChange={setCurrentTab}>
            <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="expenses-tab-selector">
              <SelectValue placeholder="Seleccionar vista" />
            </SelectTrigger>
            <SelectContent>
              {tabItems.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label} ({tab.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TabsList className="hidden @4xl/main:flex">
            {tabItems.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label} <Badge variant="secondary">{tab.count}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2">
            <DataTableViewOptions table={table} />
          </div>
        </div>

        {tabItems.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="relative flex flex-col gap-4">
            <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
              <div className="flex flex-1 flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center">
                <div className="relative flex-1 @4xl/main:max-w-sm">
                  <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    placeholder="Buscar gastos..."
                    value={globalFilter}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {table.getColumn("category") && (
                    <DataTableFacetedFilter
                      column={table.getColumn("category")}
                      title="Categoría"
                      options={categoryOptions}
                    />
                  )}
                  {table.getColumn("status") && (
                    <DataTableFacetedFilter column={table.getColumn("status")} title="Estado" options={statusOptions} />
                  )}
                  {isFiltered && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        table.resetColumnFilters();
                        setGlobalFilter("");
                      }}
                      className="h-8 px-2 lg:px-3"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {showSkeleton ? (
              <div className="space-y-4">
                <div className="rounded-lg border">
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-6 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border">
                  <DataTable
                    table={table}
                    columns={columns}
                    emptyStateTitle={emptyStateMessage.title}
                    emptyStateDescription={emptyStateMessage.description}
                  />
                </div>
                <DataTablePagination table={table} />
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={dialogAction !== null} onOpenChange={(open) => !open && setDialogAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction?.type === "delete" ? "¿Eliminar este gasto?" : "¿Enviar este gasto a aprobación?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction?.type === "delete"
                ? "Esta acción no se puede deshacer."
                : selectedRequiresReceipt && !selectedHasAttachments
                  ? "Necesitas adjuntar un ticket antes de enviarlo."
                  : "Se notificará a los aprobadores correspondientes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isActionLoading || !canSubmitSelected}
              className={dialogAction?.type === "delete" ? "bg-destructive hover:bg-destructive/90" : undefined}
            >
              {isActionLoading
                ? "Procesando..."
                : dialogAction?.type === "delete"
                  ? "Eliminar gasto"
                  : "Enviar a aprobación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

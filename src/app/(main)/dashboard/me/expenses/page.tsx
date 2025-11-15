"use client";

import { useEffect, useState, useMemo, useRef } from "react";

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

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { SectionHeader } from "@/components/hr/section-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Expense, useExpensesStore } from "@/stores/expenses-store";

import { getExpensesColumns } from "./_components/expenses-columns";
import { ExpensesMetrics } from "./_components/expenses-metrics";

export default function ExpensesPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]); // Ordenar por fecha descendente por defecto
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
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
  const completedExpenses = useMemo(
    () => expenses.filter((e) => e.status === "APPROVED" || e.status === "REJECTED" || e.status === "REIMBURSED"),
    [expenses],
  );

  // Obtener gastos filtrados según el tab actual (memoizado)
  const filteredExpenses = useMemo((): Expense[] => {
    switch (currentTab) {
      case "draft":
        return draftExpenses;
      case "in-review":
        return inReviewExpenses;
      case "completed":
        return completedExpenses;
      case "all":
      default:
        return expenses;
    }
  }, [currentTab, draftExpenses, inReviewExpenses, completedExpenses, expenses]);

  // Obtener mensaje de empty state según el tab actual
  const emptyStateMessage = useMemo(() => {
    switch (currentTab) {
      case "draft":
        return { title: "Nada por aquí", description: "No tienes borradores de gastos." };
      case "in-review":
        return { title: "Nada por aquí", description: "No tienes gastos en revisión." };
      case "completed":
        return { title: "Nada por aquí", description: "No tienes gastos finalizados." };
      case "all":
      default:
        return { title: "Nada por aquí", description: "No tienes gastos registrados." };
    }
  }, [currentTab]);

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

  const handleDelete = useMemo(
    () => async (expense: Expense) => {
      if (!confirm("¿Estás seguro de eliminar este gasto?")) return;

      try {
        await deleteExpense(expense.id);
        await fetchMyExpenses();
      } catch (error) {
        console.error("Error al eliminar gasto:", error);
        alert(error instanceof Error ? error.message : "No se pudo eliminar el gasto");
      }
    },
    [deleteExpense, fetchMyExpenses],
  );

  const handleSubmit = useMemo(
    () => async (expense: Expense) => {
      if (!confirm("¿Enviar este gasto a aprobación?")) return;

      try {
        await submitExpense(expense.id);
        await fetchMyExpenses();
      } catch (error) {
        console.error("Error al enviar gasto:", error);
        alert(error instanceof Error ? error.message : "No se pudo enviar el gasto");
      }
    },
    [submitExpense, fetchMyExpenses],
  );

  const handleNewExpense = useMemo(
    () => () => {
      router.push("/dashboard/me/expenses/new");
    },
    [router],
  );

  // Memoizar columnas para evitar recrear en cada render
  const columns = useMemo(
    () =>
      getExpensesColumns({
        onView: handleView,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onSubmit: handleSubmit,
      }),
    [handleView, handleEdit, handleDelete, handleSubmit],
  );

  const table = useReactTable({
    data: filteredExpenses,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
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
      <ExpensesMetrics metrics={metrics} />

      {/* Tabs de gastos */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <div className="flex items-center justify-between gap-2">
          {/* Mobile Select */}
          <div className="flex-1 @4xl/main:hidden">
            <Select value={currentTab} onValueChange={setCurrentTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borradores</SelectItem>
                <SelectItem value="in-review">En revisión</SelectItem>
                <SelectItem value="completed">Finalizados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="draft">Borradores</TabsTrigger>
            <TabsTrigger value="in-review">En revisión</TabsTrigger>
            <TabsTrigger value="completed">Finalizados</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content - Todos */}
        <TabsContent value="all" className="mt-4">
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
        </TabsContent>

        {/* Tab Content - Borradores */}
        <TabsContent value="draft" className="mt-4">
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
        </TabsContent>

        {/* Tab Content - En revisión */}
        <TabsContent value="in-review" className="mt-4">
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
        </TabsContent>

        {/* Tab Content - Finalizados */}
        <TabsContent value="completed" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

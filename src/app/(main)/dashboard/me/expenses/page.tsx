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
import { Receipt, Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Expense, useExpensesStore } from "@/stores/expenses-store";

import { getExpensesColumns } from "./_components/expenses-columns";

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
  });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <SectionHeader
        title="Mis Gastos"
        subtitle="Gestiona tus gastos y solicitudes de reembolso"
        actionLabel="Nuevo Gasto"
        actionIcon={<Plus className="mr-2 size-4" />}
        onAction={handleNewExpense}
      />

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
                <SelectItem value="all">
                  Todos
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {expenses.length}
                  </Badge>
                </SelectItem>
                <SelectItem value="draft">
                  Borradores
                  {draftExpenses.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {draftExpenses.length}
                    </Badge>
                  )}
                </SelectItem>
                <SelectItem value="in-review">
                  En revisión
                  {inReviewExpenses.length > 0 && (
                    <Badge variant="default" className="ml-2 text-xs">
                      {inReviewExpenses.length}
                    </Badge>
                  )}
                </SelectItem>
                <SelectItem value="completed">
                  Finalizados
                  {completedExpenses.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {completedExpenses.length}
                    </Badge>
                  )}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="all" className="relative">
              Todos
              <Badge variant="secondary" className="ml-2 text-xs">
                {expenses.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="draft" className="relative">
              Borradores
              {draftExpenses.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {draftExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="in-review" className="relative">
              En revisión
              {inReviewExpenses.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {inReviewExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="relative">
              Finalizados
              {completedExpenses.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {completedExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <DataTableViewOptions table={table} />
          </div>
        </div>

        {/* Tab Content - Todos */}
        <TabsContent value="all" className="mt-4">
          {expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="text-muted-foreground mx-auto size-12" />}
              title="No hay gastos"
              description="Crea tu primer gasto para empezar"
              action={
                <Button onClick={handleNewExpense}>
                  <Plus className="mr-2 size-4" />
                  Nuevo Gasto
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </div>
          )}
        </TabsContent>

        {/* Tab Content - Borradores */}
        <TabsContent value="draft" className="mt-4">
          {draftExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="text-muted-foreground mx-auto size-12" />}
              title="No hay borradores"
              description="Los gastos guardados como borrador aparecerán aquí"
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </div>
          )}
        </TabsContent>

        {/* Tab Content - En revisión */}
        <TabsContent value="in-review" className="mt-4">
          {inReviewExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="text-muted-foreground mx-auto size-12" />}
              title="No hay gastos en revisión"
              description="Los gastos enviados y en proceso de aprobación aparecerán aquí"
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </div>
          )}
        </TabsContent>

        {/* Tab Content - Finalizados */}
        <TabsContent value="completed" className="mt-4">
          {completedExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="text-muted-foreground mx-auto size-12" />}
              title="No hay gastos finalizados"
              description="Los gastos rechazados o reembolsados aparecerán aquí"
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

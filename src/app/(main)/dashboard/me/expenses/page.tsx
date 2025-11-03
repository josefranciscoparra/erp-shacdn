"use client";

import { useEffect, useState } from "react";

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
  const [currentTab, setCurrentTab] = useState<string>("draft");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const { expenses, isLoading, fetchMyExpenses, deleteExpense, submitExpense } = useExpensesStore();

  // Cargar gastos al montar
  useEffect(() => {
    fetchMyExpenses();
  }, []);

  // Filtrar gastos por estado
  const draftExpenses = expenses.filter((e) => e.status === "DRAFT");
  const submittedExpenses = expenses.filter((e) => e.status === "SUBMITTED");
  const approvedExpenses = expenses.filter((e) => e.status === "APPROVED");
  const rejectedExpenses = expenses.filter((e) => e.status === "REJECTED");
  const reimbursedExpenses = expenses.filter((e) => e.status === "REIMBURSED");

  const getFilteredExpenses = (): Expense[] => {
    switch (currentTab) {
      case "draft":
        return draftExpenses;
      case "submitted":
        return submittedExpenses;
      case "approved":
        return approvedExpenses;
      case "rejected":
        return rejectedExpenses;
      case "reimbursed":
        return reimbursedExpenses;
      case "all":
      default:
        return expenses;
    }
  };

  const handleView = (expense: Expense) => {
    router.push(`/dashboard/me/expenses/${expense.id}`);
  };

  const handleEdit = (expense: Expense) => {
    router.push(`/dashboard/me/expenses/${expense.id}/edit`);
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm("¿Estás seguro de eliminar este gasto?")) return;

    try {
      await deleteExpense(expense.id);
      await fetchMyExpenses();
    } catch (error) {
      console.error("Error al eliminar gasto:", error);
      alert(error instanceof Error ? error.message : "No se pudo eliminar el gasto");
    }
  };

  const handleSubmit = async (expense: Expense) => {
    if (!confirm("¿Enviar este gasto a aprobación?")) return;

    try {
      await submitExpense(expense.id);
      await fetchMyExpenses();
    } catch (error) {
      console.error("Error al enviar gasto:", error);
      alert(error instanceof Error ? error.message : "No se pudo enviar el gasto");
    }
  };

  const handleNewExpense = () => {
    router.push("/dashboard/me/expenses/new");
  };

  const columns = getExpensesColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onSubmit: handleSubmit,
  });

  const table = useReactTable({
    data: getFilteredExpenses(),
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
          <div className="@4xl/main:hidden flex-1">
            <Select value={currentTab} onValueChange={setCurrentTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  Borradores
                  {draftExpenses.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {draftExpenses.length}
                    </Badge>
                  )}
                </SelectItem>
                <SelectItem value="submitted">
                  Enviados
                  {submittedExpenses.length > 0 && (
                    <Badge variant="default" className="ml-2 text-xs">
                      {submittedExpenses.length}
                    </Badge>
                  )}
                </SelectItem>
                <SelectItem value="approved">
                  Aprobados
                  {approvedExpenses.length > 0 && (
                    <Badge variant="success" className="ml-2 text-xs">
                      {approvedExpenses.length}
                    </Badge>
                  )}
                </SelectItem>
                <SelectItem value="rejected">
                  Rechazados
                  {rejectedExpenses.length > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {rejectedExpenses.length}
                    </Badge>
                  )}
                </SelectItem>
                <SelectItem value="reimbursed">
                  Reembolsados
                  {reimbursedExpenses.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {reimbursedExpenses.length}
                    </Badge>
                  )}
                </SelectItem>
                <SelectItem value="all">
                  Todos
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {expenses.length}
                  </Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="draft" className="relative">
              Borradores
              {draftExpenses.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {draftExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="submitted" className="relative">
              Enviados
              {submittedExpenses.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {submittedExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="relative">
              Aprobados
              {approvedExpenses.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {approvedExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="relative">
              Rechazados
              {rejectedExpenses.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {rejectedExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reimbursed" className="relative">
              Reembolsados
              {reimbursedExpenses.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {reimbursedExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="relative">
              Todos
              <Badge variant="secondary" className="ml-2 text-xs">
                {expenses.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <DataTableViewOptions table={table} />
            <Button onClick={handleNewExpense} size="sm" className="hidden @4xl/main:flex">
              <Plus className="mr-2 size-4" />
              Nuevo
            </Button>
          </div>
        </div>

        {/* Tab Content - Borradores */}
        <TabsContent value="draft" className="mt-4">
          {draftExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="mx-auto size-12 text-muted-foreground" />}
              title="No hay borradores"
              description="Crea un nuevo gasto para empezar"
              action={
                <Button onClick={handleNewExpense}>
                  <Plus className="mr-2 size-4" />
                  Nuevo Gasto
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </>
          )}
        </TabsContent>

        {/* Tab Content - Enviados */}
        <TabsContent value="submitted" className="mt-4">
          {submittedExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="mx-auto size-12 text-muted-foreground" />}
              title="No hay gastos enviados"
              description="Los gastos enviados a aprobación aparecerán aquí"
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </>
          )}
        </TabsContent>

        {/* Tab Content - Aprobados */}
        <TabsContent value="approved" className="mt-4">
          {approvedExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="mx-auto size-12 text-muted-foreground" />}
              title="No hay gastos aprobados"
              description="Los gastos aprobados aparecerán aquí"
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </>
          )}
        </TabsContent>

        {/* Tab Content - Rechazados */}
        <TabsContent value="rejected" className="mt-4">
          {rejectedExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="mx-auto size-12 text-muted-foreground" />}
              title="No hay gastos rechazados"
              description="Los gastos rechazados aparecerán aquí"
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </>
          )}
        </TabsContent>

        {/* Tab Content - Reembolsados */}
        <TabsContent value="reimbursed" className="mt-4">
          {reimbursedExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="mx-auto size-12 text-muted-foreground" />}
              title="No hay gastos reembolsados"
              description="Los gastos reembolsados aparecerán aquí"
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </>
          )}
        </TabsContent>

        {/* Tab Content - Todos */}
        <TabsContent value="all" className="mt-4">
          {expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="mx-auto size-12 text-muted-foreground" />}
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
            <>
              <div className="overflow-hidden rounded-lg border">
                <DataTable table={table} columns={columns} />
              </div>
              <DataTablePagination table={table} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckSquare, Loader2, PackageOpen } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getPendingReimbursements,
  getReimbursementHistory,
  getReimbursementStats,
} from "@/server/actions/expense-reimbursements";

import { EmployeeGroupRow } from "./_components/employee-group-row";
import { ReimbursementDialog } from "./_components/reimbursement-dialog";
import { ReimbursementHistoryTable } from "./_components/reimbursement-history-table";
import { ReimbursementMetrics } from "./_components/reimbursement-metrics";

type Expense = {
  id: string;
  date: Date;
  category: string;
  totalAmount: number;
  costCenter: { id: string; name: string } | null;
  daysSinceApproval: number;
  approvals: { decidedAt: Date | null }[];
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    preferredReimbursementMethod: string | null;
  };
  reimbursedAt?: Date | null;
  reimbursementMethod?: string | null;
  reimbursementReference?: string | null;
  reimbursedByUser?: { name: string } | null;
};

type Stats = {
  totalPendingAmount: number;
  pendingCount: number;
  uniqueEmployees: number;
  averageDaysWaiting: number;
};

export default function ReimbursementsPage() {
  const [currentTab, setCurrentTab] = useState("pending");
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [historyExpenses, setHistoryExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [pendingResult, historyResult, statsResult] = await Promise.all([
        getPendingReimbursements(),
        getReimbursementHistory(undefined, historyPage, 20),
        getReimbursementStats(),
      ]);

      if (pendingResult.success && pendingResult.expenses) {
        setPendingExpenses(pendingResult.expenses as Expense[]);
      }

      if (historyResult.success && historyResult.expenses) {
        setHistoryExpenses(historyResult.expenses as Expense[]);
        if (historyResult.pagination) {
          setHistoryPagination(historyResult.pagination);
        }
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error("Error loading reimbursements:", error);
    } finally {
      setIsLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Agrupar gastos pendientes por empleado
  const groupedByEmployee = useMemo(() => {
    const groups = new Map<string, Expense[]>();

    pendingExpenses.forEach((expense) => {
      const employeeId = expense.employee.id;
      if (!groups.has(employeeId)) {
        groups.set(employeeId, []);
      }
      groups.get(employeeId)!.push(expense);
    });

    return Array.from(groups.entries()).map(([employeeId, expenses]) => ({
      employee: expenses[0].employee,
      expenses,
    }));
  }, [pendingExpenses]);

  // Handlers
  const handleToggleExpense = useCallback((expenseId: string) => {
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(expenseId)) {
        next.delete(expenseId);
      } else {
        next.add(expenseId);
      }
      return next;
    });
  }, []);

  const handleToggleAllEmployee = useCallback((expenseIds: string[]) => {
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      const allSelected = expenseIds.every((id) => next.has(id));

      if (allSelected) {
        expenseIds.forEach((id) => next.delete(id));
      } else {
        expenseIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }, []);

  const handleReimburseEmployee = useCallback((employeeId: string, expenseIds: string[]) => {
    setSelectedExpenseIds(new Set(expenseIds));
    setDialogOpen(true);
  }, []);

  const handleReimburseSelected = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleReimburseSuccess = useCallback(() => {
    setSelectedExpenseIds(new Set());
    void loadData();
  }, [loadData]);

  const selectedTotal = useMemo(() => {
    return pendingExpenses
      .filter((exp) => selectedExpenseIds.has(exp.id))
      .reduce((sum, exp) => sum + exp.totalAmount, 0);
  }, [pendingExpenses, selectedExpenseIds]);

  const selectedEmployeeCount = useMemo(() => {
    const employeeIds = new Set(
      pendingExpenses.filter((exp) => selectedExpenseIds.has(exp.id)).map((exp) => exp.employee.id),
    );
    return employeeIds.size;
  }, [pendingExpenses, selectedExpenseIds]);

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Reembolsos" description="Gestión de reembolsos de gastos aprobados." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Reembolsos" description="Gestión de reembolsos de gastos aprobados." />

      {/* Métricas */}
      {stats && (
        <ReimbursementMetrics
          totalPendingAmount={stats.totalPendingAmount}
          pendingCount={stats.pendingCount}
          uniqueEmployees={stats.uniqueEmployees}
          averageDaysWaiting={stats.averageDaysWaiting}
        />
      )}

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <div className="flex items-center justify-between">
          {/* Select para móvil */}
          <Select value={currentTab} onValueChange={setCurrentTab}>
            <SelectTrigger className="w-[200px] @4xl/main:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">
                Pendientes {stats && <Badge variant="secondary">{stats.pendingCount}</Badge>}
              </SelectItem>
              <SelectItem value="history">Procesados</SelectItem>
            </SelectContent>
          </Select>

          {/* Tabs para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="pending">
              Pendientes
              {stats && stats.pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Procesados</TabsTrigger>
          </TabsList>

          {/* Botón reembolsar seleccionados */}
          {currentTab === "pending" && selectedExpenseIds.size > 0 && (
            <Button onClick={handleReimburseSelected}>
              <CheckSquare className="mr-2 h-4 w-4" />
              Reembolsar seleccionados ({selectedExpenseIds.size})
            </Button>
          )}
        </div>

        {/* Tab Pendientes */}
        <TabsContent value="pending">
          <div className="overflow-hidden rounded-lg border">
            {groupedByEmployee.length === 0 ? (
              <EmptyState
                icon={<PackageOpen className="mx-auto h-12 w-12" />}
                title="No hay gastos pendientes"
                description="Todos los gastos aprobados han sido reembolsados."
              />
            ) : (
              <div className="divide-y">
                {groupedByEmployee.map(({ employee, expenses }) => (
                  <EmployeeGroupRow
                    key={employee.id}
                    employee={employee}
                    expenses={expenses}
                    selectedExpenseIds={selectedExpenseIds}
                    onToggleExpense={handleToggleExpense}
                    onToggleAllEmployee={handleToggleAllEmployee}
                    onReimburseEmployee={handleReimburseEmployee}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab Procesados */}
        <TabsContent value="history">
          {historyExpenses.length === 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <EmptyState
                icon={<PackageOpen className="mx-auto h-12 w-12" />}
                title="No hay historial"
                description="Aún no se han procesado reembolsos."
              />
            </div>
          ) : (
            <ReimbursementHistoryTable
              expenses={historyExpenses as never}
              pagination={historyPagination}
              onPageChange={setHistoryPage}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmación */}
      <ReimbursementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expenseIds={Array.from(selectedExpenseIds)}
        totalAmount={selectedTotal}
        employeeCount={selectedEmployeeCount}
        onSuccess={handleReimburseSuccess}
      />
    </div>
  );
}

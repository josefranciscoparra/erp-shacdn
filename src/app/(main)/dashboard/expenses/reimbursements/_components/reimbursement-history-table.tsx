"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, MapPin, User } from "lucide-react";

import {
  ExpenseCategoryIcon,
  getCategoryLabel,
} from "@/app/(main)/dashboard/me/expenses/_components/expense-category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Expense {
  id: string;
  date: Date;
  category: string;
  totalAmount: number;
  costCenter: { id: string; name: string } | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  reimbursedAt: Date | null;
  reimbursementMethod: string | null;
  reimbursementReference: string | null;
  reimbursedByUser: { name: string } | null;
}

interface ReimbursementHistoryTableProps {
  expenses: Expense[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null;
  onPageChange?: (page: number) => void;
}

const METHOD_LABELS: Record<string, string> = {
  TRANSFER: "Transferencia",
  PAYROLL: "Nómina",
  CASH: "Efectivo",
  OTHER: "Otro",
};

const METHOD_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  TRANSFER: "default",
  PAYROLL: "secondary",
  CASH: "outline",
  OTHER: "outline",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export function ReimbursementHistoryTable({ expenses, pagination, onPageChange }: ReimbursementHistoryTableProps) {
  if (expenses.length === 0) {
    return null;
  }

  // Agrupar por fecha de reembolso
  const groupedByDate = expenses.reduce(
    (acc, expense) => {
      const dateKey = expense.reimbursedAt ? format(new Date(expense.reimbursedAt), "yyyy-MM-dd") : "sin-fecha";
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(expense);
      return acc;
    },
    {} as Record<string, Expense[]>,
  );

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      <div className="space-y-6">
        {sortedDates.map((dateKey) => {
          const expensesForDate = groupedByDate[dateKey];
          const totalForDate = expensesForDate.reduce((sum, exp) => sum + exp.totalAmount, 0);
          const displayDate =
            dateKey !== "sin-fecha"
              ? format(new Date(dateKey), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
              : "Sin fecha de reembolso";

          return (
            <div key={dateKey} className="space-y-3">
              {/* Header de fecha */}
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-semibold capitalize">{displayDate}</h3>
                  <p className="text-muted-foreground text-sm">
                    {expensesForDate.length} gasto{expensesForDate.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(totalForDate)}</div>
                </div>
              </div>

              {/* Lista de gastos */}
              <div className="space-y-2">
                {expensesForDate.map((expense) => {
                  return (
                    <div
                      key={expense.id}
                      className="hover:bg-muted/50 flex flex-col gap-3 rounded-lg border p-3 transition-colors md:flex-row md:items-center md:gap-4"
                    >
                      {/* Info empleado */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">
                            {expense.employee.firstName} {expense.employee.lastName}
                          </span>
                          {/* Importe en móvil */}
                          <div className="font-semibold md:hidden">{formatCurrency(expense.totalAmount)}</div>
                        </div>
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm md:gap-3">
                          {/* Categoría */}
                          <div className="flex items-center gap-1">
                            <ExpenseCategoryIcon category={expense.category as never} className="h-3 w-3" />
                            <span>{getCategoryLabel(expense.category as never)}</span>
                          </div>

                          {/* Fecha del gasto */}
                          <span className="hidden md:inline">•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(expense.date), "dd/MM/yyyy")}</span>
                          </div>

                          {/* Centro de costes */}
                          {expense.costCenter && (
                            <>
                              <span className="hidden md:inline">•</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{expense.costCenter.name}</span>
                              </div>
                            </>
                          )}

                          {/* Fecha de reembolso - solo desktop inline */}
                          {expense.reimbursedAt && (
                            <>
                              <span className="hidden md:inline">•</span>
                              <div className="hidden items-center gap-1 md:flex">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>
                                  Reembolsado el {format(new Date(expense.reimbursedAt), "dd/MM/yyyy 'a las' HH:mm")}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Fecha de reembolso - móvil en nueva línea */}
                        {expense.reimbursedAt && (
                          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-sm md:hidden">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              Reembolsado el {format(new Date(expense.reimbursedAt), "dd/MM/yyyy 'a las' HH:mm")}
                            </span>
                          </div>
                        )}

                        {/* Método, referencia y procesado por - móvil */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                          {expense.reimbursementMethod && (
                            <Badge
                              variant={METHOD_COLORS[expense.reimbursementMethod] ?? "outline"}
                              className="text-xs"
                            >
                              <CreditCard className="mr-1 h-3 w-3" />
                              {METHOD_LABELS[expense.reimbursementMethod] ?? expense.reimbursementMethod}
                            </Badge>
                          )}
                          {expense.reimbursementReference && (
                            <span className="text-muted-foreground text-xs">Ref: {expense.reimbursementReference}</span>
                          )}
                          {expense.reimbursedByUser && (
                            <div className="text-muted-foreground flex items-center gap-1 text-xs">
                              <User className="h-3 w-3" />
                              <span>{expense.reimbursedByUser.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Método de reembolso - desktop */}
                      {expense.reimbursementMethod && (
                        <Badge
                          variant={METHOD_COLORS[expense.reimbursementMethod] ?? "outline"}
                          className="hidden md:inline-flex"
                        >
                          <CreditCard className="mr-1 h-3 w-3" />
                          {METHOD_LABELS[expense.reimbursementMethod] ?? expense.reimbursementMethod}
                        </Badge>
                      )}

                      {/* Referencia - desktop */}
                      {expense.reimbursementReference && (
                        <div className="text-muted-foreground hidden text-sm md:block">
                          Ref: {expense.reimbursementReference}
                        </div>
                      )}

                      {/* Procesado por - desktop */}
                      {expense.reimbursedByUser && (
                        <div className="text-muted-foreground hidden items-center gap-1 text-sm md:flex">
                          <User className="h-3 w-3" />
                          <span>{expense.reimbursedByUser.name}</span>
                        </div>
                      )}

                      {/* Importe - desktop */}
                      <div className="hidden w-28 text-right md:block">
                        <div className="font-semibold">{formatCurrency(expense.totalAmount)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-muted-foreground text-sm">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} -{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} reembolsos
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

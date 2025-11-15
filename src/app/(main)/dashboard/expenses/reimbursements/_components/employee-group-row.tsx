"use client";

import { useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronRight, CreditCard, MapPin } from "lucide-react";

import { ExpenseCategoryIcon } from "@/app/(main)/dashboard/me/expenses/_components/expense-category-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Expense {
  id: string;
  date: Date;
  category: string;
  totalAmount: number;
  costCenter: { id: string; name: string } | null;
  daysSinceApproval: number;
  approvals: { decidedAt: Date | null }[];
}

interface EmployeeData {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  preferredReimbursementMethod: string | null;
}

interface EmployeeGroupRowProps {
  employee: EmployeeData;
  expenses: Expense[];
  selectedExpenseIds: Set<string>;
  onToggleExpense: (expenseId: string) => void;
  onToggleAllEmployee: (expenseIds: string[]) => void;
  onReimburseEmployee: (employeeId: string, expenseIds: string[]) => void;
}

const METHOD_LABELS: Record<string, string> = {
  TRANSFER: "Transferencia",
  PAYROLL: "Nómina",
  CASH: "Efectivo",
  OTHER: "Otro",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export function EmployeeGroupRow({
  employee,
  expenses,
  selectedExpenseIds,
  onToggleExpense,
  onToggleAllEmployee,
  onReimburseEmployee,
}: EmployeeGroupRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
  const expenseIds = expenses.map((exp) => exp.id);
  const allSelected = expenseIds.every((id) => selectedExpenseIds.has(id));
  const someSelected = expenseIds.some((id) => selectedExpenseIds.has(id)) && !allSelected;

  const employeeInitials = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();

  return (
    <div className="border-b last:border-b-0">
      {/* Fila de empleado */}
      <div className="hover:bg-muted/50 flex items-center gap-4 p-4">
        {/* Checkbox */}
        <Checkbox
          checked={allSelected}
          ref={(el) => {
            if (el) {
              el.indeterminate = someSelected;
            }
          }}
          onCheckedChange={() => onToggleAllEmployee(expenseIds)}
        />

        {/* Toggle expand */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {/* Avatar + Info empleado */}
        <div className="flex flex-1 items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={employee.photoUrl ?? undefined} alt={`${employee.firstName} ${employee.lastName}`} />
            <AvatarFallback>{employeeInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium">
              {employee.firstName} {employee.lastName}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>{expenses.length} gastos</span>
              {employee.preferredReimbursementMethod && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    {METHOD_LABELS[employee.preferredReimbursementMethod] ?? employee.preferredReimbursementMethod}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(totalAmount)}</div>
        </div>

        {/* Botón reembolsar empleado */}
        <Button size="sm" variant="outline" onClick={() => onReimburseEmployee(employee.id, expenseIds)}>
          Reembolsar empleado
        </Button>
      </div>

      {/* Lista de gastos expandible */}
      {isExpanded && (
        <div className="bg-muted/30 space-y-1 p-2">
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-background hover:bg-muted/50 flex items-center gap-4 rounded-md p-3">
              {/* Checkbox individual */}
              <Checkbox
                checked={selectedExpenseIds.has(expense.id)}
                onCheckedChange={() => onToggleExpense(expense.id)}
                className="ml-12"
              />

              {/* Categoría */}
              <ExpenseCategoryIcon category={expense.category} />

              {/* Fecha */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <span>{format(new Date(expense.date), "dd MMM", { locale: es })}</span>
              </div>

              {/* Centro de costes */}
              {expense.costCenter && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">{expense.costCenter.name}</span>
                </div>
              )}

              {/* Días pendientes */}
              <Badge variant={expense.daysSinceApproval > 30 ? "destructive" : "secondary"} className="ml-auto">
                {expense.daysSinceApproval} días
              </Badge>

              {/* Importe */}
              <div className="w-24 text-right font-medium">{formatCurrency(expense.totalAmount)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

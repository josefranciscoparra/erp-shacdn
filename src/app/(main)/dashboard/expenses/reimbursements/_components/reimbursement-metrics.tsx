"use client";

import { AlertCircle, Banknote, Clock, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReimbursementMetricsProps {
  totalPendingAmount: number;
  pendingCount: number;
  uniqueEmployees: number;
  averageDaysWaiting: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export function ReimbursementMetrics({
  totalPendingAmount,
  pendingCount,
  uniqueEmployees,
  averageDaysWaiting,
}: ReimbursementMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total pendiente */}
      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
          <Banknote className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalPendingAmount)}</div>
          <p className="text-muted-foreground text-xs">Por reembolsar</p>
        </CardContent>
      </Card>

      {/* Gastos pendientes */}
      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gastos Pendientes</CardTitle>
          <AlertCircle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingCount}</div>
          <p className="text-muted-foreground text-xs">Gastos aprobados sin reembolsar</p>
        </CardContent>
      </Card>

      {/* Empleados afectados */}
      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Empleados</CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{uniqueEmployees}</div>
          <p className="text-muted-foreground text-xs">Con gastos pendientes</p>
        </CardContent>
      </Card>

      {/* Promedio días espera */}
      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
          <Clock className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageDaysWaiting}</div>
          <p className="text-muted-foreground text-xs">
            Días desde aprobación
            {averageDaysWaiting > 30 && <span className="text-destructive"> ⚠️</span>}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

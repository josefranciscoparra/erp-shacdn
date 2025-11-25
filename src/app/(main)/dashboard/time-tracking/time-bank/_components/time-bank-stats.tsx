"use client";

import { useEffect, useState, useTransition } from "react";

import Link from "next/link";

import {
  Clock,
  Loader2,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getTimeBankAdminStats,
  type TimeBankAdminStats,
  type TimeBankEmployeeSummary,
} from "@/server/actions/time-bank";

function formatMinutes(minutes: number): string {
  const hours = minutes / 60;
  const prefix = minutes > 0 ? "+" : minutes < 0 ? "" : "";
  return `${prefix}${hours.toFixed(1)}h`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  variant?: "default" | "positive" | "negative" | "warning";
}) {
  const iconColor = {
    default: "text-primary",
    positive: "text-emerald-600",
    negative: "text-red-600",
    warning: "text-amber-600",
  }[variant];

  const bgColor = {
    default: "bg-primary/10",
    positive: "bg-emerald-100 dark:bg-emerald-900/30",
    negative: "bg-red-100 dark:bg-red-900/30",
    warning: "bg-amber-100 dark:bg-amber-900/30",
  }[variant];

  return (
    <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-10 items-center justify-center rounded-full", bgColor)}>
            <Icon className={cn("size-5", iconColor)} />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">{title}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeRow({ employee }: { employee: TimeBankEmployeeSummary }) {
  const isPositive = employee.totalMinutes >= 0;

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/dashboard/employees/${employee.employeeId}`}
          className="hover:underline"
        >
          <span className="font-medium">
            {employee.firstName} {employee.lastName}
          </span>
        </Link>
        {employee.employeeNumber && (
          <span className="text-muted-foreground ml-2 text-xs">
            ({employee.employeeNumber})
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={cn(
            "font-semibold",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {formatMinutes(employee.totalMinutes)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        {employee.pendingRequests > 0 ? (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {employee.pendingRequests}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export function TimeBankStats() {
  const [stats, setStats] = useState<TimeBankAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadStats = () => {
    startTransition(async () => {
      setIsLoading(true);
      try {
        const data = await getTimeBankAdminStats();
        setStats(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al cargar estadísticas";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    });
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-muted" />
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-5 w-16 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Empleados con saldo"
          value={stats.totalEmployeesWithBalance}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Horas acumuladas (+)"
          value={formatMinutes(stats.totalPositiveMinutes)}
          icon={TrendingUp}
          variant="positive"
        />
        <StatCard
          title="Horas en déficit (-)"
          value={formatMinutes(-stats.totalNegativeMinutes)}
          icon={TrendingDown}
          variant="negative"
        />
        <StatCard
          title="Solicitudes pendientes"
          value={stats.pendingRequestsCount}
          icon={Clock}
          variant={stats.pendingRequestsCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* Tabla de saldos por empleado */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="h-5 w-5" />
              Saldos por Empleado
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Vista general de la bolsa de horas de cada empleado.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          {stats.employeeSummaries.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
              No hay empleados con movimientos en la bolsa de horas.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-center">Pendientes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.employeeSummaries.map((employee) => (
                    <EmployeeRow key={employee.employeeId} employee={employee} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

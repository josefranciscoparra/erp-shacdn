"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import Link from "next/link";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Clock,
  Loader2,
  PiggyBank,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

function EmployeeBalanceTable({ data, showOrgBadges }: { data: TimeBankEmployeeSummary[]; showOrgBadges: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const columns = useMemo<ColumnDef<TimeBankEmployeeSummary>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Empleado
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => {
          const employee = row.original;
          return (
            <Link href={`/dashboard/employees/${employee.employeeId}`} className="hover:underline">
              <span className="font-medium">
                {employee.firstName} {employee.lastName}
              </span>
              {employee.employeeNumber && (
                <span className="text-muted-foreground ml-2 text-xs">({employee.employeeNumber})</span>
              )}
              {showOrgBadges && employee.organization && (
                <Badge variant="outline" className="ml-2 text-[10px] font-medium">
                  {employee.organization.name ?? "Organización"}
                </Badge>
              )}
            </Link>
          );
        },
        filterFn: (row, _, filterValue) => {
          const employee = row.original;
          const searchValue = filterValue.toLowerCase();
          const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
          const empNumber = employee.employeeNumber?.toLowerCase() ?? "";
          return fullName.includes(searchValue) || empNumber.includes(searchValue);
        },
      },
      {
        accessorKey: "totalMinutes",
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-mr-4"
            >
              Saldo
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const minutes = row.getValue("totalMinutes");
          const isPositive = minutes >= 0;
          return (
            <div className="text-right">
              <span
                className={cn(
                  "font-semibold",
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                )}
              >
                {formatMinutes(minutes)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "pendingRequests",
        header: () => <div className="text-center">Pendientes</div>,
        cell: ({ row }) => {
          const pending = row.getValue("pendingRequests");
          return (
            <div className="text-center">
              {pending > 0 ? (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                >
                  {pending}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-xs">-</span>
              )}
            </div>
          );
        },
      },
    ],
    [showOrgBadges],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _, filterValue) => {
      const employee = row.original;
      const searchValue = filterValue.toLowerCase();
      const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
      const empNumber = employee.employeeNumber?.toLowerCase() ?? "";
      return fullName.includes(searchValue) || empNumber.includes(searchValue);
    },
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por nombre o número de empleado..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {globalFilter ? "No se encontraron empleados." : "No hay empleados con saldo."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación - solo si hay más de 10 */}
      {table.getFilteredRowModel().rows.length > 10 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            Mostrando {table.getRowModel().rows.length} de {table.getFilteredRowModel().rows.length} empleados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </span>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TimeBankStats({ orgIds, showOrgBadges }: { orgIds: string[]; showOrgBadges: boolean }) {
  const [stats, setStats] = useState<TimeBankAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadStats = () => {
    startTransition(async () => {
      setIsLoading(true);
      try {
        if (orgIds.length === 0) {
          setStats(null);
          return;
        }

        if (orgIds.length === 1) {
          const data = await getTimeBankAdminStats(orgIds[0]);
          setStats(data);
          return;
        }

        const results = await Promise.allSettled(orgIds.map((orgId) => getTimeBankAdminStats(orgId)));
        let partialFailure = false;
        let totalPositiveMinutes = 0;
        let totalNegativeMinutes = 0;
        let pendingRequestsCount = 0;
        const employeeSummaries: TimeBankEmployeeSummary[] = [];

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            totalPositiveMinutes += result.value.totalPositiveMinutes;
            totalNegativeMinutes += result.value.totalNegativeMinutes;
            pendingRequestsCount += result.value.pendingRequestsCount;
            employeeSummaries.push(...result.value.employeeSummaries);
          } else {
            partialFailure = true;
            console.error("Error al cargar estadísticas de bolsa:", result.reason);
          }
        });

        employeeSummaries.sort((a, b) => b.totalMinutes - a.totalMinutes);

        setStats({
          totalEmployeesWithBalance: employeeSummaries.length,
          totalPositiveMinutes,
          totalNegativeMinutes,
          pendingRequestsCount,
          employeeSummaries,
        });

        if (partialFailure) {
          toast.warning("Algunas organizaciones no se pudieron cargar.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al cargar estadísticas";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const orgKey = useMemo(() => orgIds.join("|"), [orgIds]);

  useEffect(() => {
    loadStats();
  }, [orgKey]);

  if (isLoading && !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-muted size-10 rounded-full" />
                  <div className="space-y-2">
                    <div className="bg-muted h-3 w-20 rounded" />
                    <div className="bg-muted h-5 w-16 rounded" />
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
    return (
      <div className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
        No hay datos para mostrar.
      </div>
    );
  }

  const orgSet = new Set(stats.employeeSummaries.map((summary) => summary.orgId));
  const shouldShowOrgBadges = showOrgBadges || orgSet.size > 1;

  return (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Empleados con saldo" value={stats.totalEmployeesWithBalance} icon={Users} variant="default" />
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
            <p className="text-muted-foreground text-sm">Vista general de la bolsa de horas de cada empleado.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadStats} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          {stats.employeeSummaries.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
              No hay empleados con movimientos en la bolsa de horas.
            </div>
          ) : (
            <EmployeeBalanceTable data={stats.employeeSummaries} showOrgBadges={shouldShowOrgBadges} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

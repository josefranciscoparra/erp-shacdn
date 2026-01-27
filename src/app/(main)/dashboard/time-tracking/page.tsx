"use client";

import { useCallback, useEffect, useState } from "react";

import { ShieldAlert, Users, Clock, Coffee } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmployeeSearchInput } from "@/components/hr/employee-search-input";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Card } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { getEmployeesForTimeTracking } from "@/server/actions/admin-time-tracking";

import { employeeColumns, type EmployeeTimeTracking } from "./_components/employee-columns";

export default function TimeTrackingPage() {
  const [employees, setEmployees] = useState<EmployeeTimeTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [stats, setStats] = useState({
    totalEmployees: 0,
    workingCount: 0,
    breakCount: 0,
    clockedTodayCount: 0,
  });

  const pageCount = totalRows > 0 ? Math.ceil(totalRows / pagination.pageSize) : 0;

  const table = useDataTableInstance({
    data: employees,
    columns: employeeColumns,
    getRowId: (row) => row.id,
    manualPagination: true,
    pageCount,
    paginationState: pagination,
    onPaginationChange: setPagination,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getEmployeesForTimeTracking(pagination.pageIndex, pagination.pageSize, appliedSearch);
      setEmployees(data.data);
      setTotalRows(data.total);
      setStats(data.stats);
    } catch (error) {
      console.error("Error al cargar empleados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = useCallback(
    (value: string) => {
      if (value === appliedSearch) {
        return;
      }
      setAppliedSearch(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    [appliedSearch],
  );

  useEffect(() => {
    loadData();
  }, [pagination.pageIndex, pagination.pageSize, appliedSearch]);

  return (
    <PermissionGuard
      permissions={["view_time_tracking", "manage_time_tracking"]}
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Control Horario" description="Gestión de fichajes y control de asistencia" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Control Horario" description="Gestión de fichajes por empleado" />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card className="from-primary/5 to-card bg-gradient-to-t p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                <Users className="text-primary size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Total empleados</span>
                <span className="text-2xl font-bold">{stats.totalEmployees}</span>
              </div>
            </div>
          </Card>

          <Card className="to-card bg-gradient-to-t from-green-500/5 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
                <div className="size-3 rounded-full bg-green-500" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Trabajando ahora</span>
                <span className="text-2xl font-bold">{stats.workingCount}</span>
              </div>
            </div>
          </Card>

          <Card className="to-card bg-gradient-to-t from-yellow-500/5 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-yellow-500/10">
                <Coffee className="size-5 text-yellow-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">En pausa</span>
                <span className="text-2xl font-bold">{stats.breakCount}</span>
              </div>
            </div>
          </Card>

          <Card className="to-card bg-gradient-to-t from-blue-500/5 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
                <Clock className="size-5 text-blue-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Fichados hoy</span>
                <span className="text-2xl font-bold">{stats.clockedTodayCount}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* DataTable */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-[320px]">
              <EmployeeSearchInput
                value={searchValue}
                onValueChange={setSearchValue}
                onSearch={handleSearch}
                placeholder="Buscar por nombre o email..."
                minChars={2}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-muted-foreground text-sm font-medium">Vista</span>
              <DataTableViewOptions table={table} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <span className="text-muted-foreground">Cargando empleados...</span>
            </div>
          ) : employees.length === 0 ? (
            <EmptyState
              icon="users"
              title="No hay empleados"
              description="No se encontraron empleados en la organización"
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <DataTableNew table={table} columns={employeeColumns} />
              </div>
              <DataTablePagination table={table} rowCount={totalRows} />
            </>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}

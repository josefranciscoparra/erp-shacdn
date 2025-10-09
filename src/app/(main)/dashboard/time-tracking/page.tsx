"use client";

import { useState, useEffect } from "react";

import { ShieldAlert, Users, Clock, Coffee } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Card } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { getEmployeesForTimeTracking } from "@/server/actions/admin-time-tracking";

import { employeeColumns, type EmployeeTimeTracking } from "./_components/employee-columns";

export default function TimeTrackingPage() {
  const [employees, setEmployees] = useState<EmployeeTimeTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const table = useDataTableInstance({
    data: employees,
    columns: employeeColumns,
    getRowId: (row) => row.id,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getEmployeesForTimeTracking();
      setEmployees(data);
    } catch (error) {
      console.error("Error al cargar empleados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const workingCount = employees.filter((e) => e.status === "CLOCKED_IN").length;
  const breakCount = employees.filter((e) => e.status === "ON_BREAK").length;
  const clockedTodayCount = employees.filter((e) => e.todayWorkedMinutes > 0).length;

  return (
    <PermissionGuard
      permission="view_time_tracking"
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
                <span className="text-muted-foreground text-sm">Total Empleados</span>
                <span className="text-2xl font-bold">{employees.length}</span>
              </div>
            </div>
          </Card>

          <Card className="to-card bg-gradient-to-t from-green-500/5 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
                <div className="size-3 rounded-full bg-green-500" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Trabajando Ahora</span>
                <span className="text-2xl font-bold">{workingCount}</span>
              </div>
            </div>
          </Card>

          <Card className="to-card bg-gradient-to-t from-yellow-500/5 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-yellow-500/10">
                <Coffee className="size-5 text-yellow-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">En Pausa</span>
                <span className="text-2xl font-bold">{breakCount}</span>
              </div>
            </div>
          </Card>

          <Card className="to-card bg-gradient-to-t from-blue-500/5 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
                <Clock className="size-5 text-blue-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Fichados Hoy</span>
                <span className="text-2xl font-bold">{clockedTodayCount}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* DataTable */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-end">
            <DataTableViewOptions table={table} />
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
              <DataTablePagination table={table} />
            </>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}

"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, Users, Clock, Coffee, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { cn } from "@/lib/utils";
import { getCurrentlyWorkingEmployees } from "@/server/actions/admin-time-tracking";

import { employeeColumns } from "../_components/employee-columns";

import { SegmentedControl } from "./_components/segmented-control";
import { StatCard } from "./_components/stat-card";

interface EmployeeStatus {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  department: string;
  costCenter: string;
  status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";
  lastAction: Date | null;
  todayWorkedMinutes: number;
  todayBreakMinutes: number;
  clockIn?: Date;
  clockOut?: Date;
}

type FilterValue = "all" | "working" | "break";

// Orden de prioridad para estados
const statusPriority = {
  CLOCKED_IN: 1,
  ON_BREAK: 2,
  CLOCKED_OUT: 3,
};

export default function LiveMonitorPage() {
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  // Configurar la tabla
  const table = useDataTableInstance({
    data: filteredEmployees,
    columns: employeeColumns,
    getRowId: (row) => row.id,
    initialState: {
      sorting: [
        { id: "status", desc: false },
        { id: "name", desc: false },
      ],
    },
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentlyWorkingEmployees();

      // Ordenar por estado (trabajando primero) y luego por nombre
      const sorted = data.sort((a, b) => {
        const statusDiff = statusPriority[a.status] - statusPriority[b.status];
        if (statusDiff !== 0) return statusDiff;
        return (a.name || "").localeCompare(b.name || "");
      });

      setEmployees(sorted);
      setLastUpdate(new Date());
      applyFilter(sorted, filter);
    } catch (error) {
      console.error("Error al cargar empleados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (data: EmployeeStatus[], filterValue: FilterValue) => {
    let filtered = data;

    switch (filterValue) {
      case "working":
        filtered = data.filter((e) => e.status === "CLOCKED_IN");
        break;
      case "break":
        filtered = data.filter((e) => e.status === "ON_BREAK");
        break;
      case "all":
      default:
        filtered = data;
        break;
    }

    setFilteredEmployees(filtered);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilter(employees, filter);
  }, [filter, employees]);

  const workingCount = employees.filter((e) => e.status === "CLOCKED_IN").length;
  const breakCount = employees.filter((e) => e.status === "ON_BREAK").length;
  const offlineCount = employees.filter((e) => e.status === "CLOCKED_OUT").length;

  return (
    <PermissionGuard
      permission="view_time_tracking"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Monitor en Vivo" description="Estado actual de fichajes de empleados" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-6">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Monitor en Vivo</h1>
            <p className="text-muted-foreground">Supervisa el estado de fichaje de los empleados en tiempo real.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            <span className="ml-2">Actualizar</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Trabajando" value={workingCount} icon={Clock} color="green" />
          <StatCard title="En Pausa" value={breakCount} icon={Coffee} color="amber" />
          <StatCard title="Sin Fichar" value={offlineCount} icon={Users} color="gray" />
        </div>

        {/* Filtros y Tabla */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <SegmentedControl
                options={[
                  { label: "Todos", value: "all", badge: employees.length },
                  { label: "Trabajando", value: "working", badge: workingCount },
                  { label: "En Pausa", value: "break", badge: breakCount },
                ]}
                value={filter}
                onChange={(value) => setFilter(value)}
              />
              <DataTableViewOptions table={table} />
            </div>
            <div className="overflow-hidden rounded-lg border">
              <DataTableNew table={table} columns={employeeColumns} />
            </div>
            <DataTablePagination table={table} />
          </div>
        </Card>
      </div>
    </PermissionGuard>
  );
}

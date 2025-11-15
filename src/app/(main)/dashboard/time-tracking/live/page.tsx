"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, Users, Clock, Coffee, ShieldAlert, AlertTriangle, CalendarX } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { getCurrentlyWorkingEmployees } from "@/server/actions/admin-time-tracking";

import { employeeColumns, EmployeeTimeTracking } from "../_components/employee-columns";

type FilterValue = "all" | "working" | "break" | "absent" | "non-working";

// Orden de prioridad para estados
const statusPriority = {
  CLOCKED_IN: 1,
  ON_BREAK: 2,
  CLOCKED_OUT: 3,
};

export default function LiveMonitorPage() {
  const [employees, setEmployees] = useState<EmployeeTimeTracking[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeTimeTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  // Configurar la tabla
  const table = useDataTableInstance({
    data: filteredEmployees,
    columns: employeeColumns,
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
      }) as EmployeeTimeTracking[];

      setEmployees(sorted);
      setLastUpdate(new Date());
      applyFilter(sorted, filter);
    } catch (error) {
      console.error("Error al cargar empleados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (data: EmployeeTimeTracking[], filterValue: FilterValue) => {
    let filtered = data;

    switch (filterValue) {
      case "working":
        filtered = data.filter((e) => e.status === "CLOCKED_IN");
        break;
      case "break":
        filtered = data.filter((e) => e.status === "ON_BREAK");
        break;
      case "absent":
        filtered = data.filter((e) => e.isAbsent);
        break;
      case "non-working":
        filtered = data.filter((e) => !e.isWorkingDay);
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
  const absentCount = employees.filter((e) => e.isAbsent).length;
  const nonWorkingCount = employees.filter((e) => !e.isWorkingDay).length;

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
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Monitor en Vivo"
          description="Estado actual de fichajes de empleados"
          action={
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={isLoading ? "animate-spin" : ""} />
              Actualizar
            </Button>
          }
        />

        {/* Última actualización */}
        {lastUpdate && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Clock className="size-4" />
            <span>Última actualización: {format(lastUpdate, "HH:mm:ss", { locale: es })}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @3xl/main:grid-cols-4">
          <Card className="to-card bg-gradient-to-t from-green-500/5 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
                <div className="size-3 rounded-full bg-green-500" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Trabajando</span>
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
                <span className="text-muted-foreground text-sm">En pausa</span>
                <span className="text-2xl font-bold">{breakCount}</span>
              </div>
            </div>
          </Card>

          <Card className="to-card bg-gradient-to-t from-red-500/5 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Ausentes</span>
                <span className="text-2xl font-bold">{absentCount}</span>
              </div>
            </div>
          </Card>

          <Card className="to-card bg-gradient-to-t from-blue-500/5 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
                <CalendarX className="size-5 text-blue-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Día no laborable</span>
                <span className="text-2xl font-bold">{nonWorkingCount}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs con filtros */}
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterValue)}
          className="w-full flex-col justify-start gap-6"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="filter-selector" className="sr-only">
              Filtro
            </Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
              <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="filter-selector">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working">Trabajando</SelectItem>
                <SelectItem value="break">En pausa</SelectItem>
                <SelectItem value="absent">Ausentes</SelectItem>
                <SelectItem value="non-working">Día no laborable</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>

            <TabsList className="hidden @4xl/main:flex">
              <TabsTrigger value="working">
                Trabajando{" "}
                <Badge variant="secondary" className="ml-2">
                  {workingCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="break">
                En pausa{" "}
                <Badge variant="secondary" className="ml-2">
                  {breakCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="absent">
                Ausentes{" "}
                <Badge variant="destructive" className="ml-2">
                  {absentCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="non-working">
                Día no laborable{" "}
                <Badge variant="secondary" className="ml-2">
                  {nonWorkingCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="all">
                Todos{" "}
                <Badge variant="secondary" className="ml-2">
                  {employees.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <DataTableViewOptions table={table} />
            </div>
          </div>

          {["working", "break", "absent", "non-working", "all"].map((tab) => {
            const getEmptyMessage = () => {
              switch (tab) {
                case "working":
                  return "No hay empleados trabajando en este momento";
                case "break":
                  return "No hay empleados en pausa en este momento";
                case "absent":
                  return "No hay ausencias registradas";
                case "non-working":
                  return "Todos los empleados tienen día laborable hoy";
                default:
                  return "No hay empleados para mostrar";
              }
            };

            return (
              <TabsContent key={tab} value={tab} className="relative flex flex-col gap-4">
                {isLoading ? (
                  <div className="flex h-96 items-center justify-center">
                    <span className="text-muted-foreground">Cargando...</span>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <EmptyState
                    icon={<Users className="size-12" />}
                    title="No hay empleados"
                    description={getEmptyMessage()}
                  />
                ) : (
                  <>
                    <div className="overflow-hidden rounded-lg border">
                      <DataTableNew table={table} columns={employeeColumns} />
                    </div>
                    <DataTablePagination table={table} />
                  </>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

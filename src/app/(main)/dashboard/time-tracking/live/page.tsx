"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Users, Clock, Coffee, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { getCurrentlyWorkingEmployees } from "@/server/actions/admin-time-tracking";

interface EmployeeStatus {
  id: string;
  name: string | null;
  email: string;
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

const statusConfig = {
  CLOCKED_IN: {
    label: "Trabajando",
    variant: "default" as const,
    icon: "🟢",
    color: "bg-green-500",
  },
  ON_BREAK: {
    label: "En pausa",
    variant: "secondary" as const,
    icon: "🟡",
    color: "bg-yellow-500",
  },
  CLOCKED_OUT: {
    label: "Sin fichar",
    variant: "outline" as const,
    icon: "⚪",
    color: "bg-gray-400",
  },
};

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}

export default function LiveMonitorPage() {
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentlyWorkingEmployees();
      setEmployees(data);
      setLastUpdate(new Date());
      applyFilter(data, filter);
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
        filtered = data.filter(e => e.status === "CLOCKED_IN");
        break;
      case "break":
        filtered = data.filter(e => e.status === "ON_BREAK");
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

  const workingCount = employees.filter(e => e.status === "CLOCKED_IN").length;
  const breakCount = employees.filter(e => e.status === "ON_BREAK").length;
  const offlineCount = employees.filter(e => e.status === "CLOCKED_OUT").length;

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
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} />
            Actualizar
          </Button>
        }
      />

      {/* Última actualización */}
      {lastUpdate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          <span>
            Última actualización: {format(lastUpdate, "HH:mm:ss", { locale: es })}
          </span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
        <Card className="from-green-500/5 to-card bg-gradient-to-t p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
              <div className="size-3 rounded-full bg-green-500" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Trabajando</span>
              <span className="text-2xl font-bold">{workingCount}</span>
            </div>
          </div>
        </Card>

        <Card className="from-yellow-500/5 to-card bg-gradient-to-t p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-yellow-500/10">
              <Coffee className="size-5 text-yellow-600" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">En pausa</span>
              <span className="text-2xl font-bold">{breakCount}</span>
            </div>
          </div>
        </Card>

        <Card className="from-gray-500/5 to-card bg-gradient-to-t p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-gray-500/10">
              <Users className="size-5 text-gray-600" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Sin fichar</span>
              <span className="text-2xl font-bold">{offlineCount}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs con filtros */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)} className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="filter-selector" className="sr-only">
            Filtro
          </Label>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
            <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="filter-selector">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="working">Solo trabajando</SelectItem>
              <SelectItem value="break">En pausa</SelectItem>
            </SelectContent>
          </Select>

          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="all">
              Todos <Badge variant="secondary" className="ml-2">{employees.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="working">
              Trabajando <Badge variant="secondary" className="ml-2">{workingCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="break">
              En pausa <Badge variant="secondary" className="ml-2">{breakCount}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {["all", "working", "break"].map((tab) => (
          <TabsContent key={tab} value={tab} className="relative flex flex-col gap-4">
            {isLoading ? (
              <div className="flex h-96 items-center justify-center">
                <span className="text-muted-foreground">Cargando...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <EmptyState
                icon="users"
                title="No hay empleados"
                description={`No hay empleados ${tab === "working" ? "trabajando" : tab === "break" ? "en pausa" : "para mostrar"} en este momento`}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
                {filteredEmployees.map((employee) => {
                  const config = statusConfig[employee.status];
                  return (
                    <Card key={employee.id} className="from-primary/5 to-card bg-gradient-to-t p-4 shadow-xs">
                      <div className="flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`size-3 rounded-full ${config.color}`} />
                            <Badge variant={config.variant}>{config.label}</Badge>
                          </div>
                        </div>

                        {/* Nombre y email */}
                        <div className="flex flex-col">
                          <span className="font-semibold">{employee.name || "Sin nombre"}</span>
                          <span className="text-sm text-muted-foreground">{employee.email}</span>
                        </div>

                        {/* Departamento */}
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="text-muted-foreground">Departamento</span>
                          <span className="font-medium">{employee.department}</span>
                        </div>

                        {/* Hora de entrada */}
                        {employee.clockIn && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Entrada:</span>
                            <span className="font-medium">
                              {format(new Date(employee.clockIn), "HH:mm", { locale: es })}
                            </span>
                          </div>
                        )}

                        {/* Tiempo trabajado hoy */}
                        <div className="flex items-center justify-between rounded-lg border bg-card p-2 text-sm">
                          <span className="text-muted-foreground">Trabajado hoy</span>
                          <span className="font-semibold">{formatMinutes(employee.todayWorkedMinutes)}</span>
                        </div>

                        {/* Última acción */}
                        {employee.lastAction && (
                          <div className="text-xs text-muted-foreground">
                            Última acción: {format(new Date(employee.lastAction), "HH:mm:ss", { locale: es })}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      </div>
    </PermissionGuard>
  );
}

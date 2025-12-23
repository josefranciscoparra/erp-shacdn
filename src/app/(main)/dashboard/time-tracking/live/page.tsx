"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, Clock, ShieldAlert, Search } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getCurrentlyWorkingEmployees } from "@/server/actions/admin-time-tracking";

import { EmployeeTimeTracking } from "../_components/employee-columns";

import { StatusBoard } from "./_components/status-board";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyWorkingDay, setShowOnlyWorkingDay] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentlyWorkingEmployees();

      // Ordenar por estado (trabajando primero) y luego por nombre
      const sorted = data.sort((a, b) => {
        const statusDiff = statusPriority[a.status] - statusPriority[b.status];
        if (statusDiff !== 0) return statusDiff;
        return (a.name ?? "").localeCompare(b.name ?? "");
      }) as EmployeeTimeTracking[];

      setEmployees(sorted);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error al cargar empleados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = employees;

    // Filtro: Solo empleados con jornada hoy
    if (showOnlyWorkingDay) {
      filtered = filtered.filter((e) => e.isWorkingDay);
    }

    // Filtro: Búsqueda por nombre o departamento
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) => e.name.toLowerCase().includes(query) || e.department.toLowerCase().includes(query),
      );
    }

    setFilteredEmployees(filtered);
  }, [employees, showOnlyWorkingDay, searchQuery]);

  const workingCount = filteredEmployees.filter((e) => e.status === "CLOCKED_IN").length;
  const breakCount = filteredEmployees.filter((e) => e.status === "ON_BREAK").length;
  const absentCount = filteredEmployees.filter((e) => e.isAbsent).length;
  const nonWorkingCount = filteredEmployees.filter((e) => !e.isWorkingDay).length;

  return (
    <PermissionGuard
      permissions={["view_time_tracking", "manage_time_tracking"]}
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
          description="Vista en tiempo real de fichajes por estado"
          action={
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={isLoading ? "animate-spin" : ""} />
              Actualizar
            </Button>
          }
        />

        {/* Última actualización + Filtros */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {lastUpdate && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Clock className="size-4" />
              <span>Última actualización: {format(lastUpdate, "HH:mm:ss", { locale: es })}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Búsqueda */}
            <div className="relative flex-1 sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por nombre o departamento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Toggle solo jornada */}
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Switch id="working-day-filter" checked={showOnlyWorkingDay} onCheckedChange={setShowOnlyWorkingDay} />
              <Label htmlFor="working-day-filter" className="cursor-pointer text-sm">
                Solo con jornada hoy
              </Label>
            </div>
          </div>
        </div>

        {/* Stats compactos */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-green-500" />
              <span className="text-sm">Trabajando:</span>
              <span className="font-semibold">{workingCount}</span>
            </div>

            <div className="text-border h-4 w-px" />

            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-yellow-500" />
              <span className="text-sm">En pausa:</span>
              <span className="font-semibold">{breakCount}</span>
            </div>

            <div className="text-border h-4 w-px" />

            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-red-500" />
              <span className="text-sm">Ausentes:</span>
              <span className="font-semibold">{absentCount}</span>
            </div>

            <div className="text-border h-4 w-px" />

            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-blue-500" />
              <span className="text-sm">Día no laborable:</span>
              <span className="font-semibold">{nonWorkingCount}</span>
            </div>
          </div>
        </Card>

        {/* Board Kanban */}
        <StatusBoard employees={filteredEmployees} isLoading={isLoading} />
      </div>
    </PermissionGuard>
  );
}

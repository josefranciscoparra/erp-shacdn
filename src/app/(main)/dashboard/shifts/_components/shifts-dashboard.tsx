"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { startOfMonth, endOfMonth } from "date-fns";
import { CalendarClock, Users, CheckCircle2, Clock, Settings, Plus, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCostCentersStore } from "@/stores/cost-centers-store";
import { useShiftConfigurationStore } from "@/stores/shift-configuration-store";
import { useShiftsStore } from "@/stores/shifts-store";

export function ShiftsDashboard() {
  const { config, fetchConfiguration } = useShiftConfigurationStore();
  const { shifts, fetchShifts } = useShiftsStore();
  const { costCenters, fetchCostCenters } = useCostCentersStore();
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("all");

  useEffect(() => {
    fetchConfiguration();
    if (costCenters.length === 0) {
      fetchCostCenters();
    }
  }, [fetchConfiguration, costCenters.length, fetchCostCenters]);

  // Cargar turnos del mes actual con filtro de centro
  useEffect(() => {
    const now = new Date();
    const filters: any = {
      dateFrom: startOfMonth(now),
      dateTo: endOfMonth(now),
    };

    if (selectedCostCenter !== "all") {
      filters.costCenterId = selectedCostCenter;
    }

    fetchShifts(filters);
  }, [selectedCostCenter, fetchShifts]);

  // Filtrar shifts por centro de coste si está seleccionado
  const filteredShifts =
    selectedCostCenter === "all" ? shifts : shifts.filter((s) => s.costCenterId === selectedCostCenter);

  // KPIs calculados
  const totalShifts = filteredShifts.length;
  const publishedShifts = filteredShifts.filter((s) => s.status === "PUBLISHED").length;
  const pendingApproval = filteredShifts.filter((s) => s.status === "PENDING_APPROVAL").length;

  // Calcular cobertura media real
  const averageCoverage =
    totalShifts > 0
      ? Math.round(
          filteredShifts.reduce((sum, shift) => {
            const assignedCount = shift.assignments?.length ?? 0;
            const required = shift.requiredHeadcount;
            return sum + (assignedCount / required) * 100;
          }, 0) / totalShifts || 0,
        )
      : 0;

  const handleCostCenterChange = (value: string) => {
    setSelectedCostCenter(value);
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Turnos</h1>
          <p className="text-muted-foreground">Planifica, asigna y gestiona turnos para tu equipo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Centro/Tienda */}
          <Select value={selectedCostCenter} onValueChange={handleCostCenterChange}>
            <SelectTrigger className="w-[220px]">
              <Store className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Seleccionar tienda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las tiendas</SelectItem>
              {costCenters.map((center) => (
                <SelectItem key={center.id} value={center.id}>
                  {center.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" asChild>
            <Link href="/dashboard/shifts/settings">
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/shifts/calendar">
              <Plus className="mr-2 h-4 w-4" />
              Crear Turno
            </Link>
          </Button>
        </div>
      </div>

      {/* Mensaje de bienvenida si no hay configuración */}
      {!config && (
        <Card className="border-primary/50 bg-primary/5 border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <CalendarClock className="text-primary h-12 w-12" />
            <div>
              <h3 className="text-lg font-semibold">Bienvenido al módulo de turnos</h3>
              <p className="text-muted-foreground text-sm">
                Configura los parámetros básicos para empezar a gestionar turnos
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/shifts/settings">Configurar ahora</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {config && (
        <div className="grid grid-cols-1 gap-4 md:gap-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
          <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Turnos</CardTitle>
              <CalendarClock className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalShifts}</div>
              <p className="text-muted-foreground text-xs">Turnos planificados este mes</p>
            </CardContent>
          </Card>

          <Card className="to-card bg-gradient-to-t from-green-500/5 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Publicados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{publishedShifts}</div>
              <p className="text-muted-foreground text-xs">Turnos visibles para empleados</p>
            </CardContent>
          </Card>

          <Card className="to-card bg-gradient-to-t from-amber-500/5 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes Aprobación</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApproval}</div>
              <p className="text-muted-foreground text-xs">Requieren revisión</p>
            </CardContent>
          </Card>

          <Card className="to-card bg-gradient-to-t from-blue-500/5 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobertura Media</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageCoverage}%</div>
              <p className="text-muted-foreground text-xs">De los turnos cubiertos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      {config && (
        <div className="grid grid-cols-1 gap-4 md:gap-6 @xl/main:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/shifts/calendar">
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Ver Calendario de Turnos
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/shifts/coverage">
                  <Users className="mr-2 h-4 w-4" />
                  Análisis de Cobertura
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/shifts/templates">
                  <Plus className="mr-2 h-4 w-4" />
                  Gestionar Plantillas
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/shifts/publish">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Publicar Turnos
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuración Actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Granularidad de planning</span>
                <Badge variant="secondary">{config?.planningGranularityMinutes ?? 30} min</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Límite horas diarias</span>
                <Badge variant="secondary">{config?.maxDailyHours ? Number(config.maxDailyHours) : 9}h</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Requiere aprobación</span>
                <Badge variant={config?.publishRequiresApproval ? "default" : "secondary"}>
                  {config?.publishRequiresApproval ? "Sí" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Descanso mínimo</span>
                <Badge variant="secondary">
                  {config?.minRestBetweenShiftsHours ? Number(config.minRestBetweenShiftsHours) : 12}h
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

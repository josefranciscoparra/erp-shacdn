/**
 * Dashboard Principal de Turnos
 *
 * Vista completa con métricas, avisos y resumen por centro
 * Incluye filtros por centro y rango de fechas
 */

"use client";

import { useMemo, useState } from "react";

import { SectionHeader } from "@/components/hr/section-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { getDashboardMetrics, getCriticalAlerts, getCenterSummaries, type DateRange } from "../_lib/dashboard-utils";
import { formatWeekRange, getWeekStart } from "../_lib/shift-utils";
import { useShiftsStore } from "../_store/shifts-store";

import { CenterSummaryAccordion } from "./center-summary";
import { CriticalAlerts } from "./critical-alerts";
import { DashboardMetricsCards } from "./dashboard-metrics";

export function ShiftsDashboard() {
  const { shifts, employees, zones, costCenters, currentWeekStart, isLoading } = useShiftsStore();

  // Estados de filtros
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const [rangeType, setRangeType] = useState<"week" | "month">("week");

  // Calcular rango de fechas según el tipo seleccionado
  const dateRange = useMemo<DateRange>(() => {
    const start = new Date(currentWeekStart);

    if (rangeType === "week") {
      const end = new Date(start);
      end.setDate(end.getDate() + 6); // Domingo

      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    } else {
      // Mes actual
      const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);

      return {
        start: monthStart.toISOString().split("T")[0],
        end: monthEnd.toISOString().split("T")[0],
      };
    }
  }, [currentWeekStart, rangeType]);

  // Filtrar datos por centro si está seleccionado
  const filteredShifts = useMemo(() => {
    if (selectedCenter === "all") return shifts;
    return shifts.filter((s) => s.costCenterId === selectedCenter);
  }, [shifts, selectedCenter]);

  const filteredEmployees = useMemo(() => {
    if (selectedCenter === "all") return employees;
    return employees.filter((e) => e.costCenterId === selectedCenter);
  }, [employees, selectedCenter]);

  const filteredZones = useMemo(() => {
    if (selectedCenter === "all") return zones;
    return zones.filter((z) => z.costCenterId === selectedCenter);
  }, [zones, selectedCenter]);

  const filteredCostCenters = useMemo(() => {
    if (selectedCenter === "all") return costCenters;
    return costCenters.filter((cc) => cc.id === selectedCenter);
  }, [costCenters, selectedCenter]);

  // Calcular métricas
  const metrics = useMemo(() => {
    return getDashboardMetrics(filteredShifts, filteredEmployees, filteredZones, dateRange);
  }, [filteredShifts, filteredEmployees, filteredZones, dateRange]);

  // Calcular avisos críticos
  const alerts = useMemo(() => {
    return getCriticalAlerts(filteredShifts, filteredEmployees, filteredZones, filteredCostCenters, dateRange);
  }, [filteredShifts, filteredEmployees, filteredZones, filteredCostCenters, dateRange]);

  // Calcular resumen por centro
  const centerSummaries = useMemo(() => {
    return getCenterSummaries(filteredShifts, filteredEmployees, filteredZones, filteredCostCenters, dateRange);
  }, [filteredShifts, filteredEmployees, filteredZones, filteredCostCenters, dateRange]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <SectionHeader
        title="Dashboard de Turnos"
        description={
          rangeType === "week"
            ? `Resumen y avisos de la semana ${formatWeekRange(currentWeekStart)}`
            : `Resumen y avisos del mes actual`
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Filtro por Centro */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">Centro:</span>
          <Select value={selectedCenter} onValueChange={setSelectedCenter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {costCenters.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Rango */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">Período:</span>
          <ToggleGroup
            type="single"
            value={rangeType}
            onValueChange={(value) => value && setRangeType(value as "week" | "month")}
          >
            <ToggleGroupItem value="week" aria-label="Semana actual" className="gap-2 px-4">
              Semana actual
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Mes actual" className="gap-2 px-4">
              Mes actual
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Métricas Principales */}
      <DashboardMetricsCards metrics={metrics} isLoading={isLoading} />

      {/* Grid de Avisos y Resumen */}
      <div className="grid gap-4 @4xl/main:grid-cols-2">
        {/* Avisos Críticos */}
        <CriticalAlerts alerts={alerts} isLoading={isLoading} />

        {/* Resumen por Centro (solo si "Todos" está seleccionado) */}
        {selectedCenter === "all" && <CenterSummaryAccordion summaries={centerSummaries} isLoading={isLoading} />}
      </div>

      {/* Resumen expandido por centro (cuando un centro específico está seleccionado) */}
      {selectedCenter !== "all" && centerSummaries.length > 0 && (
        <CenterSummaryAccordion summaries={centerSummaries} isLoading={isLoading} />
      )}
    </div>
  );
}

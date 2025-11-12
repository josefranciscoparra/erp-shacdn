/**
 * Barra de Filtros para Turnos (v2 - Estilo moderno)
 *
 * Permite filtrar turnos por lugar, zona, estado con diseño compacto.
 * Incluye selector de vista integrado.
 */

"use client";

import { SlidersHorizontal, Calendar, CalendarDays, Users, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { CalendarView, CalendarMode } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

export function ShiftsFiltersBar() {
  const { filters, costCenters, zones, setFilters, calendarView, calendarMode, setCalendarView, setCalendarMode } =
    useShiftsStore();

  // Filtrar zonas por lugar seleccionado
  const filteredZones = filters.costCenterId ? zones.filter((z) => z.costCenterId === filters.costCenterId) : zones;

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* Grupo: Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro Lugar */}
          <div className="flex h-9 items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">Lugar:</span>
            <Select
              value={filters.costCenterId ?? "all"}
              onValueChange={(value) => {
                setFilters({
                  costCenterId: value === "all" ? undefined : value,
                  zoneId: undefined, // Reset zona cuando cambia lugar
                });
              }}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Zona */}
          <div className="flex h-9 items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">Zona:</span>
            <Select
              value={filters.zoneId ?? "all"}
              onValueChange={(value) => setFilters({ zoneId: value === "all" ? undefined : value })}
              disabled={filteredZones.length === 0}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {filteredZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Estado */}
          <div className="flex h-9 items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">Estado:</span>
            <Select
              value={filters.status ?? "all"}
              onValueChange={(value) => setFilters({ status: value === "all" ? undefined : (value as any) })}
            >
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="conflict">Conflicto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón "Más filtros" */}
          <Button variant="outline" size="sm" className="h-9 text-xs">
            <SlidersHorizontal className="mr-2 size-3" />
            Más filtros
          </Button>
        </div>

        {/* Grupo: Selectores de Vista */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Vista: Semana / Mes */}
          <div className="flex h-9 items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">Vista:</span>
            <ToggleGroup
              type="single"
              value={calendarView}
              onValueChange={(value) => {
                if (value) setCalendarView(value as CalendarView);
              }}
              className="h-9"
            >
              <ToggleGroupItem value="week" aria-label="Vista semanal" className="h-9 gap-1.5 px-3 text-xs">
                <Calendar className="size-3" />
                <span>Semana</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="month" aria-label="Vista mensual" className="h-9 gap-1.5 px-3 text-xs">
                <CalendarDays className="size-3" />
                <span>Mes</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Agrupar por: Empleado / Áreas */}
          <div className="flex h-9 items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">Agrupar por:</span>
            <ToggleGroup
              type="single"
              value={calendarMode}
              onValueChange={(value) => {
                if (value) setCalendarMode(value as CalendarMode);
              }}
              className="h-9"
            >
              <ToggleGroupItem value="employee" aria-label="Vista por empleado" className="h-9 gap-1.5 px-3 text-xs">
                <Users className="size-3" />
                <span>Empleado</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="area" aria-label="Vista por áreas" className="h-9 gap-1.5 px-3 text-xs">
                <Building2 className="size-3" />
                <span>Áreas</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>
    </Card>
  );
}

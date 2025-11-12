/**
 * Barra de Filtros para Turnos (v2 - Estilo moderno)
 *
 * Permite filtrar turnos por lugar, zona, estado con diseño compacto.
 */

"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { useShiftsStore } from "../_store/shifts-store";

export function ShiftsFiltersBar() {
  const { filters, costCenters, zones, setFilters } = useShiftsStore();

  // Filtrar zonas por lugar seleccionado
  const filteredZones = filters.costCenterId ? zones.filter((z) => z.costCenterId === filters.costCenterId) : zones;

  return (
    <Card className="p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Filtro Lugar */}
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
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

        {/* Agrupar por (alineado a la derecha) */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">Agrupar por:</span>
          <ToggleGroup type="single" value="employee" className="bg-muted rounded-lg p-1">
            <ToggleGroupItem
              value="employee"
              aria-label="Agrupar por empleado"
              className="data-[state=on]:bg-background h-7 rounded-md px-3 text-xs data-[state=on]:shadow-sm"
            >
              Empleado
            </ToggleGroupItem>
            <ToggleGroupItem
              value="area"
              aria-label="Agrupar por áreas"
              className="data-[state=on]:bg-background h-7 rounded-md px-3 text-xs data-[state=on]:shadow-sm"
            >
              Áreas
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </Card>
  );
}

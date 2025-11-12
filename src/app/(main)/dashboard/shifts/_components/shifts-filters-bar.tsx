/**
 * Barra de Filtros para Turnos
 *
 * Permite filtrar turnos por lugar, zona, rol, estado.
 */

"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useShiftsStore } from "../_store/shifts-store";

export function ShiftsFiltersBar() {
  const { filters, costCenters, zones, setFilters, clearFilters } = useShiftsStore();

  const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;

  // Filtrar zonas por lugar seleccionado
  const filteredZones = filters.costCenterId ? zones.filter((z) => z.costCenterId === filters.costCenterId) : zones;

  return (
    <div className="space-y-4">
      {/* Header con indicador de filtros activos */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filtros</h3>
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-medium">
              {activeFiltersCount} {activeFiltersCount === 1 ? "filtro" : "filtros"} activo
              {activeFiltersCount === 1 ? "" : "s"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7">
              <X className="mr-1 h-3 w-3" />
              Limpiar
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Filtro por Lugar */}
        <div className="space-y-2">
          <label className="text-muted-foreground text-xs font-medium">Lugar</label>
          <Select
            value={filters.costCenterId ?? "all"}
            onValueChange={(value) => {
              setFilters({
                costCenterId: value === "all" ? undefined : value,
                zoneId: undefined, // Reset zona cuando cambia lugar
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los lugares" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los lugares</SelectItem>
              {costCenters.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Zona */}
        <div className="space-y-2">
          <label className="text-muted-foreground text-xs font-medium">Zona</label>
          <Select
            value={filters.zoneId ?? "all"}
            onValueChange={(value) => setFilters({ zoneId: value === "all" ? undefined : value })}
            disabled={filteredZones.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas las zonas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las zonas</SelectItem>
              {filteredZones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Rol */}
        <div className="space-y-2">
          <label className="text-muted-foreground text-xs font-medium">Rol/Descripción</label>
          <Input
            placeholder="Filtrar por rol..."
            value={filters.role ?? ""}
            onChange={(e) => setFilters({ role: e.target.value || undefined })}
            className="h-10"
          />
        </div>

        {/* Filtro por Estado */}
        <div className="space-y-2">
          <label className="text-muted-foreground text-xs font-medium">Estado</label>
          <Select
            value={filters.status ?? "all"}
            onValueChange={(value) => setFilters({ status: value === "all" ? undefined : (value as any) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
              <SelectItem value="conflict">Con conflictos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

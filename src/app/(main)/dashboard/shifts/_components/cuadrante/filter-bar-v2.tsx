/**
 * Barra de Filtros v2 (Rediseño)
 *
 * Filtros compactos con:
 * - Lugar, Zona, Rol, Estado
 * - Botón "Más filtros"
 * - Toggle "Agrupar por"
 */

"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface FilterBarV2Props {
  selectedCostCenter?: string;
  onCostCenterChange?: (value: string) => void;
  selectedZone?: string;
  onZoneChange?: (value: string) => void;
  selectedStatus?: string;
  onStatusChange?: (value: string) => void;
  groupBy?: "employee" | "area";
  onGroupByChange?: (value: "employee" | "area") => void;
  costCenters?: Array<{ id: string; name: string }>;
  zones?: Array<{ id: string; name: string }>;
}

export function FilterBarV2({
  selectedCostCenter = "all",
  onCostCenterChange,
  selectedZone = "all",
  onZoneChange,
  selectedStatus = "all",
  onStatusChange,
  groupBy = "employee",
  onGroupByChange,
  costCenters = [],
  zones = [],
}: FilterBarV2Props) {
  return (
    <Card className="p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Filtro Lugar */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">Lugar:</span>
          <Select value={selectedCostCenter} onValueChange={onCostCenterChange}>
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
          <Select value={selectedZone} onValueChange={onZoneChange}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {zones.map((zone) => (
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
          <Select value={selectedStatus} onValueChange={onStatusChange}>
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
          <ToggleGroup
            type="single"
            value={groupBy}
            onValueChange={(value) => value && onGroupByChange?.(value as "employee" | "area")}
            className="bg-muted rounded-lg p-1"
          >
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

/**
 * Barra de Filtros Compacta del Dashboard
 *
 * Filtros minimalistas para centro y período
 * Diseño limpio con padding reducido
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { MOCK_CENTERS } from "../_lib/dashboard-mock-data";

interface DashboardFilterBarProps {
  selectedCenter: string;
  onCenterChange: (centerId: string) => void;
  periodType: "week" | "month";
  onPeriodChange: (type: "week" | "month") => void;
}

export function DashboardFilterBar({
  selectedCenter,
  onCenterChange,
  periodType,
  onPeriodChange,
}: DashboardFilterBarProps) {
  return (
    <Card className="rounded-xl border-slate-200 shadow-sm">
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro por Centro */}
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground text-sm font-medium whitespace-nowrap">Centro:</label>
            <Select value={selectedCenter} onValueChange={onCenterChange}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Seleccionar centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {MOCK_CENTERS.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Período */}
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground text-sm font-medium whitespace-nowrap">Período:</label>
            <ToggleGroup
              type="single"
              value={periodType}
              onValueChange={(value) => value && onPeriodChange(value as "week" | "month")}
              className="bg-muted rounded-lg p-1"
            >
              <ToggleGroupItem
                value="week"
                aria-label="Semana actual"
                className="data-[state=on]:bg-background h-8 rounded-md px-4 text-sm data-[state=on]:shadow-sm"
              >
                Semana actual
              </ToggleGroupItem>
              <ToggleGroupItem
                value="month"
                aria-label="Mes actual"
                className="data-[state=on]:bg-background h-8 rounded-md px-4 text-sm data-[state=on]:shadow-sm"
              >
                Mes actual
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

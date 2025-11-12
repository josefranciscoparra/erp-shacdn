/**
 * Vista Calendario Mensual por Áreas/Zonas
 *
 * Muestra un heatmap de cobertura mensual por zona.
 * Vista compacta con días del mes en columnas y zonas en filas.
 */

"use client";

import { useMemo } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { getMonthStart, getMonthDays, formatDateISO, formatMonthRange } from "../_lib/shift-utils";
import type { Zone, Shift } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

export function CalendarMonthArea() {
  const { shifts, zones, employees, costCenters, currentWeekStart, filters, openShiftDialog } = useShiftsStore();

  // Obtener días del mes actual (derivado de currentWeekStart)
  const monthStart = useMemo(() => getMonthStart(currentWeekStart), [currentWeekStart]);
  const monthDays = useMemo(() => getMonthDays(monthStart), [monthStart]);

  // Filtrar zonas por lugar seleccionado
  const filteredZones = useMemo(() => {
    return zones.filter((zone) => {
      if (!zone.active) return false;
      if (filters.costCenterId && zone.costCenterId !== filters.costCenterId) {
        return false;
      }
      return true;
    });
  }, [zones, filters.costCenterId]);

  // Calcular estadísticas de cobertura por zona y día
  const coverageGrid = useMemo(() => {
    const grid: Record<string, Record<string, { assigned: number; required: number; shifts: Shift[] }>> = {};

    filteredZones.forEach((zone) => {
      grid[zone.id] = {};
      monthDays.forEach((day) => {
        const dateISO = formatDateISO(day);

        // Turnos asignados en esta zona y día
        const dayShifts = shifts.filter(
          (s) =>
            s.zoneId === zone.id &&
            s.date === dateISO &&
            // Aplicar filtros adicionales
            (!filters.role || s.role?.toLowerCase().includes(filters.role.toLowerCase())) &&
            (!filters.status || s.status === filters.status),
        );

        // Calcular empleados únicos asignados
        const uniqueEmployees = new Set(dayShifts.map((s) => s.employeeId));
        const assigned = uniqueEmployees.size;

        // Calcular requeridos según franja horaria (usamos afternoon como referencia)
        const required = zone.requiredCoverage.afternoon;

        grid[zone.id][dateISO] = { assigned, required, shifts: dayShifts };
      });
    });

    return grid;
  }, [filteredZones, monthDays, shifts, filters]);

  // Obtener nombre del lugar
  const getCostCenterName = (costCenterId: string) => {
    const cc = costCenters.find((c) => c.id === costCenterId);
    return cc?.name ?? "Sin lugar";
  };

  // Handler para crear turno en zona/día específico
  const handleCreateShift = (zoneId: string, date: string) => {
    const zone = filteredZones.find((z) => z.id === zoneId);
    if (!zone) return;

    openShiftDialog(undefined, {
      date,
      costCenterId: zone.costCenterId,
      zoneId: zone.id,
    });
  };

  if (filteredZones.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center">
        <AlertTriangle className="text-muted-foreground h-12 w-12" />
        <div>
          <h3 className="text-lg font-semibold">No hay zonas configuradas</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {filters.costCenterId
              ? "No hay zonas activas en el lugar seleccionado."
              : "Configura zonas de trabajo para visualizar la cobertura por áreas."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con nombre del mes */}
      <div className="bg-card flex items-center justify-center rounded-lg border p-3">
        <h3 className="text-lg font-semibold capitalize">{formatMonthRange(monthStart)}</h3>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1800px]">
          {/* Header: Días del mes */}
          <div
            className="bg-background sticky top-0 z-10 mb-2 grid gap-1 pb-2"
            style={{ gridTemplateColumns: `180px repeat(${monthDays.length}, 50px)` }}
          >
            {/* Columna de zonas */}
            <div className="flex items-center px-3 py-2">
              <span className="text-sm font-semibold">Zona / Día</span>
            </div>

            {/* Columnas de días (compactas) */}
            {monthDays.map((day) => {
              const isToday = formatDateISO(day) === formatDateISO(new Date());
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "flex flex-col items-center justify-center rounded border p-1 text-center",
                    isToday && "border-primary bg-primary/5",
                    !isToday && "border-muted",
                    isWeekend && "bg-muted/30",
                  )}
                >
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    {format(day, "EEE", { locale: es })}
                  </span>
                  <span className={cn("text-xs font-bold", isToday && "text-primary")}>{format(day, "d")}</span>
                </div>
              );
            })}
          </div>

          {/* Agrupar zonas por lugar */}
          {Array.from(new Set(filteredZones.map((z) => z.costCenterId))).map((costCenterId) => {
            const zonesInCenter = filteredZones.filter((z) => z.costCenterId === costCenterId);
            const centerName = getCostCenterName(costCenterId);

            return (
              <div key={costCenterId} className="mb-6">
                {/* Header del lugar */}
                {!filters.costCenterId && (
                  <div className="bg-muted/50 mb-2 rounded-lg px-4 py-2">
                    <h3 className="text-sm font-semibold">{centerName}</h3>
                  </div>
                )}

                {/* Filas: Zonas del lugar */}
                <div className="space-y-2">
                  {zonesInCenter.map((zone) => (
                    <div
                      key={zone.id}
                      className="grid gap-1"
                      style={{ gridTemplateColumns: `180px repeat(${monthDays.length}, 50px)` }}
                    >
                      {/* Columna: Nombre de la zona */}
                      <div className="bg-card flex flex-col justify-center rounded-lg border px-3 py-2">
                        <p className="text-sm font-semibold">{zone.name}</p>
                        <p className="text-muted-foreground text-[10px]">
                          Req: {zone.requiredCoverage.morning}/{zone.requiredCoverage.afternoon}/
                          {zone.requiredCoverage.night}
                        </p>
                      </div>

                      {/* Columnas: Días (celdas de cobertura compactas) */}
                      {monthDays.map((day) => {
                        const dateISO = formatDateISO(day);
                        const coverage = coverageGrid[zone.id]?.[dateISO];

                        return (
                          <CompactCoverageCell
                            key={`${zone.id}-${dateISO}`}
                            zone={zone}
                            date={dateISO}
                            assigned={coverage?.assigned ?? 0}
                            required={coverage?.required ?? 0}
                            shifts={coverage?.shifts ?? []}
                            onCreateShift={() => handleCreateShift(zone.id, dateISO)}
                            onEditShift={(shift) => openShiftDialog(shift)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Leyenda de colores */}
          <div className="bg-card mt-6 flex flex-wrap items-center gap-4 rounded-lg border p-4">
            <span className="text-sm font-semibold">Leyenda:</span>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-emerald-500" />
              <span className="text-xs">Cobertura completa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-amber-500" />
              <span className="text-xs">Cobertura insuficiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-500" />
              <span className="text-xs">Sin cobertura</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-blue-500" />
              <span className="text-xs">Sobrecobertura</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Celda compacta de cobertura (una zona en un día) - Vista mensual
 */
interface CompactCoverageCellProps {
  zone: Zone;
  date: string;
  assigned: number;
  required: number;
  shifts: Shift[];
  onCreateShift: () => void;
  onEditShift: (shift: Shift) => void;
}

function CompactCoverageCell({
  zone,
  date,
  assigned,
  required,
  shifts,
  onCreateShift,
  onEditShift,
}: CompactCoverageCellProps) {
  // Calcular color según cobertura
  const getCoverageColor = () => {
    if (assigned === 0) return "bg-red-100 border-red-300 dark:bg-red-950/30 dark:border-red-700";
    if (assigned < required) return "bg-amber-100 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700";
    if (assigned > required) return "bg-blue-100 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700";
    return "bg-emerald-100 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700";
  };

  // Obtener empleados únicos
  const uniqueEmployeeIds = Array.from(new Set(shifts.map((s) => s.employeeId)));

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group relative flex h-12 cursor-pointer items-center justify-center rounded border transition-all hover:shadow-md",
              getCoverageColor(),
            )}
            onClick={() => {
              if (shifts.length > 0) {
                onEditShift(shifts[0]);
              } else {
                onCreateShift();
              }
            }}
          >
            {/* Ratio de cobertura (compacto) */}
            <span className="text-[10px] font-bold">
              {assigned}/{required}
            </span>

            {/* Indicador de conflictos */}
            {shifts.some((s) => s.status === "conflict") && (
              <div className="absolute top-0 right-0">
                <AlertTriangle className="text-destructive h-2 w-2" />
              </div>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">
              {zone.name} - {date}
            </p>
            <p>
              <strong>Asignados:</strong> {assigned} / <strong>Requeridos:</strong> {required}
            </p>
            {uniqueEmployeeIds.length > 0 ? (
              <p className="text-muted-foreground">
                {uniqueEmployeeIds.length} {uniqueEmployeeIds.length === 1 ? "empleado" : "empleados"}
              </p>
            ) : (
              <p className="text-muted-foreground italic">Sin asignar</p>
            )}
            {shifts.length > 0 && (
              <p className="text-muted-foreground italic">
                {shifts.length} {shifts.length === 1 ? "turno" : "turnos"}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

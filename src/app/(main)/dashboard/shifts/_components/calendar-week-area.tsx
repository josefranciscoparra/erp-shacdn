/**
 * Vista Calendario Semanal por Áreas/Zonas
 *
 * Muestra un heatmap de cobertura por zona y día.
 * Visualiza cuántos empleados están asignados vs requeridos en cada zona.
 */

"use client";

import { useMemo } from "react";

import { Plus, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { getWeekDays, formatDateShort, formatDateISO, getTimeSlot } from "../_lib/shift-utils";
import type { Zone, Shift } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

export function CalendarWeekArea() {
  const { shifts, zones, employees, costCenters, currentWeekStart, filters, openShiftDialog } = useShiftsStore();

  // Obtener días de la semana actual
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

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

  // Calcular estadísticas de cobertura por zona, día y franja horaria
  const coverageGrid = useMemo(() => {
    const grid: Record<
      string,
      Record<string, Record<'morning' | 'afternoon' | 'night', { assigned: number; required: number; shifts: Shift[] }>>
    > = {};

    filteredZones.forEach((zone) => {
      grid[zone.id] = {};
      weekDays.forEach((day) => {
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

        // Calcular por franja horaria
        const morningShifts = dayShifts.filter((s) => getTimeSlot(s.startTime) === 'morning');
        const afternoonShifts = dayShifts.filter((s) => getTimeSlot(s.startTime) === 'afternoon');
        const nightShifts = dayShifts.filter((s) => getTimeSlot(s.startTime) === 'night');

        grid[zone.id][dateISO] = {
          morning: {
            assigned: new Set(morningShifts.map((s) => s.employeeId)).size,
            required: zone.requiredCoverage.morning,
            shifts: morningShifts,
          },
          afternoon: {
            assigned: new Set(afternoonShifts.map((s) => s.employeeId)).size,
            required: zone.requiredCoverage.afternoon,
            shifts: afternoonShifts,
          },
          night: {
            assigned: new Set(nightShifts.map((s) => s.employeeId)).size,
            required: zone.requiredCoverage.night,
            shifts: nightShifts,
          },
        };
      });
    });

    return grid;
  }, [filteredZones, weekDays, shifts, filters]);

  // Obtener nombre del empleado
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName.charAt(0)}.` : "Desconocido";
  };

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
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header: Días de la semana */}
        <div className="bg-background sticky top-0 z-10 grid grid-cols-8 gap-2 pb-2">
          {/* Columna de zonas */}
          <div className="flex items-center px-3 py-2">
            <span className="text-sm font-semibold">Zona / Día</span>
          </div>

          {/* Columnas de días */}
          {weekDays.map((day) => {
            const isToday = formatDateISO(day) === formatDateISO(new Date());
            return (
              <div
                key={day.toString()}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border p-2 text-center",
                  isToday && "border-primary bg-primary/5",
                )}
              >
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {formatDateShort(day).split(" ")[0]}
                </span>
                <span className={cn("text-lg font-bold", isToday && "text-primary")}>
                  {formatDateShort(day).split(" ")[1]}
                </span>
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

              {/* Filas: Zonas del lugar (header + 3 filas por zona: mañana/tarde/noche) */}
              <div className="space-y-4">
                {zonesInCenter.map((zone) => {
                  const timeSlots: Array<{ key: 'morning' | 'afternoon' | 'night'; label: string; color: string }> = [
                    { key: 'morning', label: 'Mañana', color: 'bg-amber-50 dark:bg-amber-950/20' },
                    { key: 'afternoon', label: 'Tarde', color: 'bg-orange-50 dark:bg-orange-950/20' },
                    { key: 'night', label: 'Noche', color: 'bg-indigo-50 dark:bg-indigo-950/20' },
                  ];

                  return (
                    <div key={zone.id} className="space-y-1">
                      {/* Header de la zona */}
                      <div className="bg-muted/30 rounded-md px-3 py-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">{zone.name}</h4>
                          <span className="text-muted-foreground text-xs">
                            Cobertura: {zone.requiredCoverage.morning}/{zone.requiredCoverage.afternoon}/{zone.requiredCoverage.night}
                          </span>
                        </div>
                      </div>

                      {/* 3 filas: mañana/tarde/noche */}
                      {timeSlots.map((slot) => (
                        <div key={`${zone.id}-${slot.key}`} className="grid grid-cols-8 gap-2">
                          {/* Columna: Franja horaria */}
                          <div className={cn('bg-card flex flex-col justify-center rounded-lg border p-2', slot.color)}>
                            <p className="text-xs font-medium">{slot.label}</p>
                            <p className="text-muted-foreground text-[10px]">
                              Req: {zone.requiredCoverage[slot.key]}
                            </p>
                          </div>

                          {/* Columnas: Días (celdas de cobertura por franja) */}
                          {weekDays.map((day) => {
                            const dateISO = formatDateISO(day);
                            const coverage = coverageGrid[zone.id]?.[dateISO]?.[slot.key];

                            return (
                              <CoverageCell
                                key={`${zone.id}-${slot.key}-${dateISO}`}
                                zone={zone}
                                date={dateISO}
                                assigned={coverage?.assigned ?? 0}
                                required={coverage?.required ?? 0}
                                shifts={coverage?.shifts ?? []}
                                getEmployeeName={getEmployeeName}
                                onCreateShift={() => handleCreateShift(zone.id, dateISO)}
                                onEditShift={(shift) => openShiftDialog(shift)}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })}
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
  );
}

/**
 * Celda individual de cobertura (una zona en un día y franja horaria)
 */
interface CoverageCellProps {
  zone: Zone;
  date: string;
  assigned: number;
  required: number;
  shifts: Shift[];
  getEmployeeName: (id: string) => string;
  onCreateShift: () => void;
  onEditShift: (shift: Shift) => void;
}

function CoverageCell({
  zone,
  date,
  assigned,
  required,
  shifts,
  getEmployeeName,
  onCreateShift,
  onEditShift,
}: CoverageCellProps) {
  // Calcular color según cobertura
  const getCoverageColor = () => {
    if (assigned === 0) return "bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-800";
    if (assigned < required) return "bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800";
    if (assigned > required) return "bg-blue-50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-800";
    return "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800";
  };

  const getBadgeVariant = () => {
    if (assigned === 0) return "destructive";
    if (assigned < required) return "secondary";
    if (assigned > required) return "default";
    return "default";
  };

  // Obtener empleados únicos
  const uniqueEmployeeIds = Array.from(new Set(shifts.map((s) => s.employeeId)));

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group relative min-h-[100px] rounded-lg border-2 p-3 transition-all",
              getCoverageColor(),
              "hover:shadow-md",
            )}
          >
            {/* Header: Ratio de cobertura */}
            <div className="mb-2 flex items-center justify-between">
              <Badge variant={getBadgeVariant()} className="text-xs font-bold">
                {assigned}/{required}
              </Badge>

              {/* Botón para crear turno */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateShift}
                className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Lista de empleados asignados */}
            {uniqueEmployeeIds.length > 0 ? (
              <div className="space-y-1">
                {uniqueEmployeeIds.slice(0, 3).map((empId) => {
                  const empShift = shifts.find((s) => s.employeeId === empId);
                  return (
                    <div
                      key={empId}
                      onClick={() => empShift && onEditShift(empShift)}
                      className="cursor-pointer rounded bg-white/50 px-2 py-1 text-xs font-medium transition-colors hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40"
                    >
                      {getEmployeeName(empId)}
                    </div>
                  );
                })}
                {uniqueEmployeeIds.length > 3 && (
                  <div className="text-muted-foreground px-2 text-xs">+{uniqueEmployeeIds.length - 3} más</div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full min-h-[40px] items-center justify-center text-xs">
                Sin asignar
              </div>
            )}

            {/* Indicador de conflictos */}
            {shifts.some((s) => s.status === "conflict") && (
              <div className="absolute top-1 right-1">
                <AlertTriangle className="text-destructive h-3 w-3" />
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
            {uniqueEmployeeIds.length > 0 && (
              <div>
                <strong>Empleados:</strong>
                <ul className="mt-1 list-inside list-disc">
                  {uniqueEmployeeIds.map((empId) => (
                    <li key={empId}>{getEmployeeName(empId)}</li>
                  ))}
                </ul>
              </div>
            )}
            {shifts.length > 0 && (
              <p className="text-muted-foreground italic">
                {shifts.length} {shifts.length === 1 ? "turno" : "turnos"} asignado{shifts.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

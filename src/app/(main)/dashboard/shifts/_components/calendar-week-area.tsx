/**
 * Vista Calendario Semanal por Áreas/Zonas - Estilo Factorial
 *
 * Vista compacta con 1 fila por zona mostrando todos los empleados del día apilados verticalmente.
 * Incluye badges de resumen (2M 3T 1N), colores de cobertura y Drag & Drop.
 */

"use client";

import { useMemo, useState } from "react";

import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { AlertTriangle, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { getWeekDays, formatDateShort, formatDateISO, getTimeSlot } from "../_lib/shift-utils";
import type { Zone, Shift } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";
import { QuickAddEmployeePopover } from "./quick-add-employee-popover";

export function CalendarWeekArea() {
  const { shifts, zones, employees, costCenters, currentWeekStart, filters, openShiftDialog, moveShift, copyShift } = useShiftsStore();

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isControlPressed, setIsControlPressed] = useState(false);

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

  // Calcular datos por zona y día (TODOS los turnos juntos, no divididos por franja)
  const coverageGrid = useMemo(() => {
    const grid: Record<
      string,
      Record<
        string,
        {
          allShifts: Shift[];
          stats: { morning: number; afternoon: number; night: number };
          totalAssigned: number;
          totalRequired: number;
        }
      >
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

        // Ordenar por hora de inicio
        const sortedShifts = [...dayShifts].sort((a, b) => {
          const [aHour, aMin] = a.startTime.split(":").map(Number);
          const [bHour, bMin] = b.startTime.split(":").map(Number);
          return aHour * 60 + aMin - (bHour * 60 + bMin);
        });

        // Calcular estadísticas por franja
        const morningCount = new Set(dayShifts.filter((s) => getTimeSlot(s.startTime) === "morning").map((s) => s.employeeId)).size;
        const afternoonCount = new Set(dayShifts.filter((s) => getTimeSlot(s.startTime) === "afternoon").map((s) => s.employeeId)).size;
        const nightCount = new Set(dayShifts.filter((s) => getTimeSlot(s.startTime) === "night").map((s) => s.employeeId)).size;

        const totalAssigned = new Set(dayShifts.map((s) => s.employeeId)).size;
        const totalRequired = zone.requiredCoverage.morning + zone.requiredCoverage.afternoon + zone.requiredCoverage.night;

        grid[zone.id][dateISO] = {
          allShifts: sortedShifts,
          stats: {
            morning: morningCount,
            afternoon: afternoonCount,
            night: nightCount,
          },
          totalAssigned,
          totalRequired,
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

  // Handler de Drag & Drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveShift(null);
      return;
    }

    // active.id = shiftId
    // over.id = "zone-date" (ej: "z1-2024-01-15")
    const shiftId = active.id as string;
    const [targetZoneId, targetDate] = (over.id as string).split("-");

    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      setActiveShift(null);
      return;
    }

    // Detectar si cambió algo
    const hasChanged = shift.zoneId !== targetZoneId || shift.date !== targetDate;

    if (!hasChanged) {
      setActiveShift(null);
      return;
    }

    // Determinar si mover o copiar según tecla Control
    if (isControlPressed) {
      // COPIAR (con Control)
      await copyShift(shiftId, undefined, targetDate, targetZoneId);
    } else {
      // MOVER (sin Control)
      await moveShift(shiftId, undefined, targetDate, targetZoneId);
    }

    setActiveShift(null);
  };

  if (filteredZones.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">No hay zonas configuradas</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filters.costCenterId
              ? "No hay zonas activas en el lugar seleccionado."
              : "Configura zonas de trabajo para visualizar la cobertura por áreas."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      onDragStart={(event) => {
        const shiftId = event.active.id as string;
        const shift = shifts.find((s) => s.id === shiftId);
        setActiveShift(shift ?? null);
      }}
      onDragCancel={() => setActiveShift(null)}
    >
      <div
        className="overflow-x-auto"
        onKeyDown={(e) => {
          if (e.key === "Control" || e.key === "Meta") {
            setIsControlPressed(true);
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Control" || e.key === "Meta") {
            setIsControlPressed(false);
          }
        }}
        tabIndex={-1}
      >
        <div className="min-w-[900px]">
        {/* Header: Días de la semana */}
        <div className="sticky top-0 z-10 grid grid-cols-8 gap-2 bg-background pb-2">
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
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                <div className="mb-2 rounded-lg bg-muted/50 px-4 py-2">
                  <h3 className="text-sm font-semibold">{centerName}</h3>
                </div>
              )}

              {/* Filas: 1 fila por zona */}
              <div className="space-y-3">
                {zonesInCenter.map((zone) => (
                  <div key={zone.id} className="grid grid-cols-8 gap-2">
                    {/* Columna: Nombre de zona */}
                    <div className="flex flex-col justify-center rounded-lg border bg-card p-3">
                      <p className="text-sm font-semibold">{zone.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Req: {zone.requiredCoverage.morning}M / {zone.requiredCoverage.afternoon}T / {zone.requiredCoverage.night}N
                      </p>
                    </div>

                    {/* Columnas: Días (celdas con todos los empleados) */}
                    {weekDays.map((day) => {
                      const dateISO = formatDateISO(day);
                      const dayData = coverageGrid[zone.id]?.[dateISO];

                      return (
                        <DayCell
                          key={`${zone.id}-${dateISO}`}
                          zone={zone}
                          date={dateISO}
                          allShifts={dayData?.allShifts ?? []}
                          stats={dayData?.stats ?? { morning: 0, afternoon: 0, night: 0 }}
                          totalAssigned={dayData?.totalAssigned ?? 0}
                          totalRequired={dayData?.totalRequired ?? 0}
                          getEmployeeName={getEmployeeName}
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
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
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

      {/* DragOverlay para mostrar el elemento que se está arrastrando */}
      <DragOverlay>
        {activeShift && (
          <div className="rounded bg-primary/10 px-3 py-2 text-sm font-medium shadow-lg">
            {getEmployeeName(activeShift.employeeId)} - {activeShift.startTime}-{activeShift.endTime}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Celda de un día (todos los empleados del día en una zona)
 */
interface DayCellProps {
  zone: Zone;
  date: string;
  allShifts: Shift[];
  stats: { morning: number; afternoon: number; night: number };
  totalAssigned: number;
  totalRequired: number;
  getEmployeeName: (id: string) => string;
  onEditShift: (shift: Shift) => void;
}

function DayCell({ zone, date, allShifts, stats, totalAssigned, totalRequired, getEmployeeName, onEditShift }: DayCellProps) {
  // Droppable: esta celda puede recibir turnos arrastrados
  const { setNodeRef, isOver } = useDroppable({
    id: `${zone.id}-${date}`,
  });

  // Calcular color según cobertura TOTAL
  const getCoverageColor = () => {
    if (totalAssigned === 0) return "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20";
    if (totalAssigned < totalRequired) return "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20";
    if (totalAssigned > totalRequired) return "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20";
    return "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            className={cn(
              "group relative min-h-[120px] rounded-lg border-2 p-2 transition-all",
              getCoverageColor(),
              "hover:shadow-md",
              isOver && "ring-2 ring-primary ring-offset-2",
            )}
          >
            {/* Header: Badges de resumen + Botón añadir */}
            <div className="mb-2 flex items-center justify-between gap-1">
              {/* Badges: 2M 3T 1N */}
              <div className="flex flex-wrap gap-1">
                {stats.morning > 0 && (
                  <Badge variant="outline" className="h-5 bg-amber-100 text-[10px] dark:bg-amber-950/40">
                    {stats.morning}M
                  </Badge>
                )}
                {stats.afternoon > 0 && (
                  <Badge variant="outline" className="h-5 bg-orange-100 text-[10px] dark:bg-orange-950/40">
                    {stats.afternoon}T
                  </Badge>
                )}
                {stats.night > 0 && (
                  <Badge variant="outline" className="h-5 bg-indigo-100 text-[10px] dark:bg-indigo-950/40">
                    {stats.night}N
                  </Badge>
                )}
              </div>

              {/* Botón para añadir empleado (QuickAddEmployeePopover) */}
              <div className="opacity-0 transition-opacity group-hover:opacity-100">
                <QuickAddEmployeePopover date={date} costCenterId={zone.costCenterId} zoneId={zone.id} />
              </div>
            </div>

            {/* Lista de empleados con horarios */}
            {allShifts.length > 0 ? (
              <div className="space-y-1">
                {allShifts.map((shift) => (
                  <DraggableShiftBlock key={shift.id} shift={shift} getEmployeeName={getEmployeeName} onEdit={onEditShift} />
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[60px] items-center justify-center text-xs text-muted-foreground">Sin asignar</div>
            )}

            {/* Indicador de conflictos */}
            {allShifts.some((s) => s.status === "conflict") && (
              <div className="absolute right-1 top-1">
                <AlertTriangle className="h-3 w-3 text-destructive" />
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
              <strong>Asignados:</strong> {totalAssigned} / <strong>Requeridos:</strong> {totalRequired}
            </p>
            <p className="text-muted-foreground">
              Mañana: {stats.morning} | Tarde: {stats.afternoon} | Noche: {stats.night}
            </p>
            {allShifts.length > 0 && (
              <p className="italic text-muted-foreground">
                {allShifts.length} {allShifts.length === 1 ? "turno" : "turnos"}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Bloque de empleado draggable
 */
interface DraggableShiftBlockProps {
  shift: Shift;
  getEmployeeName: (id: string) => string;
  onEdit: (shift: Shift) => void;
}

function DraggableShiftBlock({ shift, getEmployeeName, onEdit }: DraggableShiftBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "cursor-pointer rounded bg-white/60 px-2 py-1 text-[11px] font-medium transition-colors hover:bg-white/90 dark:bg-black/30 dark:hover:bg-black/50",
        isDragging && "opacity-50",
      )}
      onClick={() => !isDragging && onEdit(shift)}
    >
      <div className="flex items-center gap-1">
        {/* Icono de drag handle */}
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Nombre y horario */}
        <div className="flex flex-1 items-center justify-between gap-1">
          <span className="truncate">{getEmployeeName(shift.employeeId)}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {shift.startTime}-{shift.endTime}
          </span>
        </div>
      </div>
    </div>
  );
}

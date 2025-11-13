/**
 * Vista Calendario Semanal por Áreas/Zonas - Estilo Factorial
 *
 * Vista compacta con 1 fila por zona mostrando todos los empleados del día apilados verticalmente.
 * Incluye badges de resumen (2M 3T 1N), colores de cobertura y Drag & Drop.
 */

"use client";

import { Fragment, useMemo, useState } from "react";

import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { AlertTriangle, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { getWeekDays, formatDateShort, formatDateISO, getTimeSlot, getEmptyDayType } from "../_lib/shift-utils";
import type { Zone, Shift } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

import { QuickAddEmployeePopover } from "./quick-add-employee-popover";
import { RestDayCard } from "./rest-day-card";

export function CalendarWeekArea() {
  const { shifts, zones, employees, costCenters, currentWeekStart, filters, openShiftDialog, moveShift, copyShift } =
    useShiftsStore();

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
        const morningCount = new Set(
          dayShifts.filter((s) => getTimeSlot(s.startTime) === "morning").map((s) => s.employeeId),
        ).size;
        const afternoonCount = new Set(
          dayShifts.filter((s) => getTimeSlot(s.startTime) === "afternoon").map((s) => s.employeeId),
        ).size;
        const nightCount = new Set(
          dayShifts.filter((s) => getTimeSlot(s.startTime) === "night").map((s) => s.employeeId),
        ).size;

        const totalAssigned = new Set(dayShifts.map((s) => s.employeeId)).size;
        const totalRequired =
          zone.requiredCoverage.morning + zone.requiredCoverage.afternoon + zone.requiredCoverage.night;

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
    // over.id = "zoneId-date" (ej: "z1-2025-11-12")
    const shiftId = active.id as string;
    const overId = over.id as string;

    // Extraer zoneId y fecha correctamente
    // El formato es "zoneId-YYYY-MM-DD", por lo que necesitamos extraer solo el primer elemento como zoneId
    const parts = overId.split("-");
    const targetZoneId = parts[0]; // Primer elemento es el zoneId (ej: "z1")
    const targetDate = parts.slice(1).join("-"); // El resto es la fecha (ej: "2025-11-12")

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

    // VALIDACIÓN: Comprobar si el empleado ya tiene un turno en esa zona/fecha que se solape
    const existingShifts = shifts.filter(
      (s) =>
        s.employeeId === shift.employeeId && s.zoneId === targetZoneId && s.date === targetDate && s.id !== shiftId,
    );

    if (existingShifts.length > 0) {
      // Verificar solapamiento de horarios
      const shiftStart = timeToMinutes(shift.startTime);
      const shiftEnd = timeToMinutes(shift.endTime);

      const hasOverlap = existingShifts.some((existing) => {
        const existingStart = timeToMinutes(existing.startTime);
        const existingEnd = timeToMinutes(existing.endTime);

        // Detectar solapamiento
        return (
          (shiftStart >= existingStart && shiftStart < existingEnd) ||
          (shiftEnd > existingStart && shiftEnd <= existingEnd) ||
          (shiftStart <= existingStart && shiftEnd >= existingEnd)
        );
      });

      if (hasOverlap) {
        setActiveShift(null);
        // Mostrar error al usuario
        toast.error("Este empleado ya tiene un turno en ese horario");
        return;
      }
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

  // Helper para convertir tiempo a minutos
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
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
        <div className="min-w-[900px] overflow-auto rounded-lg border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="border-r p-3 text-left text-sm font-semibold">Zona / Día</th>
                {weekDays.map((day) => {
                  const isToday = formatDateISO(day) === formatDateISO(new Date());
                  return (
                    <th
                      key={day.toString()}
                      className={cn(
                        "min-w-[140px] border-r p-2 text-center last:border-r-0",
                        isToday && "bg-primary/5",
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                          {formatDateShort(day).split(" ")[0]}
                        </span>
                        <span className={cn("text-lg font-bold", isToday && "text-primary")}>
                          {formatDateShort(day).split(" ")[1]}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Agrupar zonas por lugar */}
              {Array.from(new Set(filteredZones.map((z) => z.costCenterId))).map((costCenterId) => {
                const zonesInCenter = filteredZones.filter((z) => z.costCenterId === costCenterId);
                const centerName = getCostCenterName(costCenterId);

                return (
                  <Fragment key={costCenterId}>
                    {/* Header del lugar */}
                    {!filters.costCenterId && (
                      <tr key={`header-${costCenterId}`}>
                        <td colSpan={8} className="bg-muted/30 border-b px-4 py-2">
                          <h3 className="text-sm font-semibold">{centerName}</h3>
                        </td>
                      </tr>
                    )}

                    {/* Filas: 1 fila por zona */}
                    {zonesInCenter.map((zone) => (
                      <tr key={zone.id} className="border-b last:border-b-0">
                        {/* Columna: Nombre de zona */}
                        <td className="bg-muted/20 border-r p-3">
                          <div>
                            <p className="text-sm font-semibold">{zone.name}</p>
                            <p className="text-muted-foreground text-[10px]">
                              Req: {zone.requiredCoverage.morning}M / {zone.requiredCoverage.afternoon}T /{" "}
                              {zone.requiredCoverage.night}N
                            </p>
                          </div>
                        </td>

                        {/* Columnas: Días (celdas con todos los empleados divididos por turno) */}
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
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

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

      {/* DragOverlay para mostrar el elemento que se está arrastrando */}
      <DragOverlay>
        {activeShift && (
          <div className="bg-primary/10 rounded px-3 py-2 text-sm font-medium shadow-lg">
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

function DayCell({
  zone,
  date,
  allShifts,
  stats,
  totalAssigned,
  totalRequired,
  getEmployeeName,
  onEditShift,
}: DayCellProps) {
  const { shifts } = useShiftsStore();

  // Droppable: esta celda puede recibir turnos arrastrados
  const { setNodeRef, isOver, active } = useDroppable({
    id: `${zone.id}-${date}`,
  });

  // Helper para convertir tiempo a minutos
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Determinar si el drop es válido (sin solapamiento)
  const canDrop = useMemo(() => {
    if (!isOver || !active) return true;

    const shiftId = active.id as string;
    const draggedShift = shifts.find((s) => s.id === shiftId);

    if (!draggedShift) return true;

    // Si es la misma celda, siempre es válido
    if (draggedShift.zoneId === zone.id && draggedShift.date === date) {
      return true;
    }

    // Verificar solapamiento con turnos existentes del mismo empleado
    const existingShifts = allShifts.filter((s) => s.employeeId === draggedShift.employeeId && s.id !== shiftId);

    if (existingShifts.length === 0) return true;

    const shiftStart = timeToMinutes(draggedShift.startTime);
    const shiftEnd = timeToMinutes(draggedShift.endTime);

    const hasOverlap = existingShifts.some((existing) => {
      const existingStart = timeToMinutes(existing.startTime);
      const existingEnd = timeToMinutes(existing.endTime);

      return (
        (shiftStart >= existingStart && shiftStart < existingEnd) ||
        (shiftEnd > existingStart && shiftEnd <= existingEnd) ||
        (shiftStart <= existingStart && shiftEnd >= existingEnd)
      );
    });

    return !hasOverlap;
  }, [isOver, active, shifts, zone.id, date, allShifts]);

  // Agrupar turnos por franja horaria
  const shiftsByTimeSlot = {
    morning: allShifts.filter((s) => getTimeSlot(s.startTime) === "morning"),
    afternoon: allShifts.filter((s) => getTimeSlot(s.startTime) === "afternoon"),
    night: allShifts.filter((s) => getTimeSlot(s.startTime) === "night"),
  };

  // Calcular color según cobertura TOTAL
  const getCoverageColor = () => {
    if (totalAssigned === 0) return "border-red-500/30";
    if (totalAssigned < totalRequired) return "border-amber-500/30";
    if (totalAssigned > totalRequired) return "border-blue-500/30";
    return "border-emerald-500/30";
  };

  // Determinar el tipo de día vacío (descanso vs sin planificar)
  const emptyDayType = getEmptyDayType(date, shifts);

  return (
    <td
      ref={setNodeRef}
      className={cn(
        "group relative border-r p-0 align-top last:border-r-0",
        "border-l-4",
        getCoverageColor(),
        isOver && canDrop && "bg-emerald-100/50 ring-2 ring-emerald-500 dark:bg-emerald-900/20",
        isOver && !canDrop && "bg-red-100/50 ring-2 ring-red-500 dark:bg-red-900/20",
      )}
    >
      {/* Si no hay turnos en todo el día, mostrar card de día sin planificar o descanso */}
      {allShifts.length === 0 ? (
        <div className="flex min-h-[150px] items-center justify-center p-4">
          <RestDayCard type={emptyDayType} compact />
        </div>
      ) : (
        <>
          {/* Dividir celda en 3 secciones: Mañana, Tarde, Noche */}
          <div className="flex min-h-[150px] flex-col divide-y">
            {/* Mañana */}
            <div className="flex-1 p-2">
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-[10px] font-semibold">M</span>
                {shiftsByTimeSlot.morning.length === 0 && (
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <QuickAddEmployeePopover date={date} costCenterId={zone.costCenterId} zoneId={zone.id} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {shiftsByTimeSlot.morning.map((shift) => (
                  <DraggableShiftBlock
                    key={shift.id}
                    shift={shift}
                    getEmployeeName={getEmployeeName}
                    onEdit={onEditShift}
                  />
                ))}
              </div>
            </div>

            {/* Tarde */}
            <div className="flex-1 p-2">
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-[10px] font-semibold">T</span>
                {shiftsByTimeSlot.afternoon.length === 0 && (
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <QuickAddEmployeePopover date={date} costCenterId={zone.costCenterId} zoneId={zone.id} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {shiftsByTimeSlot.afternoon.map((shift) => (
                  <DraggableShiftBlock
                    key={shift.id}
                    shift={shift}
                    getEmployeeName={getEmployeeName}
                    onEdit={onEditShift}
                  />
                ))}
              </div>
            </div>

            {/* Noche */}
            <div className="flex-1 p-2">
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-[10px] font-semibold">N</span>
                {shiftsByTimeSlot.night.length === 0 && (
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <QuickAddEmployeePopover date={date} costCenterId={zone.costCenterId} zoneId={zone.id} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {shiftsByTimeSlot.night.map((shift) => (
                  <DraggableShiftBlock
                    key={shift.id}
                    shift={shift}
                    getEmployeeName={getEmployeeName}
                    onEdit={onEditShift}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Indicador de conflictos */}
          {allShifts.some((s) => s.status === "conflict") && (
            <div className="absolute top-1 right-1">
              <AlertTriangle className="text-destructive h-3 w-3" />
            </div>
          )}
        </>
      )}
    </td>
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
          <GripVertical className="text-muted-foreground h-3 w-3" />
        </div>

        {/* Nombre y horario */}
        <div className="flex flex-1 items-center justify-between gap-1">
          <span className="truncate">{getEmployeeName(shift.employeeId)}</span>
          <span className="text-muted-foreground shrink-0 text-[10px]">
            {shift.startTime}-{shift.endTime}
          </span>
        </div>
      </div>
    </div>
  );
}

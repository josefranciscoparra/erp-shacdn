/**
 * Vista Calendario Semanal por Empleado
 *
 * Grid interactivo que muestra empleados en filas y días de la semana en columnas.
 * Soporta drag & drop de turnos entre empleados y días.
 */

"use client";

import { useMemo, useState, useEffect, useRef } from "react";

import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Plus, User, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  getWeekDays,
  formatDateShort,
  formatDateISO,
  calculateDuration,
  formatDuration,
  getEmptyDayType,
} from "../_lib/shift-utils";
import type { Shift, EmployeeShift } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

import { RestDayCard } from "./rest-day-card";
import { ShiftBlock, ShiftDropZone } from "./shift-block";

export function CalendarWeekEmployee() {
  const {
    shifts,
    employees,
    currentWeekStart,
    filters,
    openShiftDialog,
    moveShift,
    fetchEmployees,
    employeesPage,
    hasMoreEmployees,
    isLoadingMoreEmployees,
  } = useShiftsStore();

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Configurar sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere arrastrar 8px antes de activar
      },
    }),
  );

  // Scroll Infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreEmployees && !isLoadingMoreEmployees) {
          fetchEmployees(employeesPage + 1);
        }
      },
      { threshold: 0.5, rootMargin: "100px" },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMoreEmployees, isLoadingMoreEmployees, employeesPage, fetchEmployees]);

  // Obtener días de la semana actual
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

  // Filtrar empleados que usan sistema de turnos
  const filteredEmployees = useMemo(() => {
    // IMPORTANTE: Si estamos filtrando localmente, la paginación del backend puede ser confusa
    // porque podríamos traer 20 empleados y filtrar 18.
    // Idealmente el filtro de CostCenter ya se aplica en backend.
    // Mantenemos el filtro de "usesShiftSystem" por seguridad UI.
    return employees
      .filter((emp) => emp.usesShiftSystem)
      .filter((emp) => {
        // Aplicar filtro de lugar si está activo
        if (filters.costCenterId) {
          // Condición 1: El empleado pertenece al centro (ya filtrado en backend, pero validamos)
          const isBaseCenter = emp.costCenterId === filters.costCenterId;

          // NOTA: Si filtramos por CostCenter en backend, 'isBaseCenter' debería ser true para la mayoría.
          // La condición de "tener turno en el centro" es compleja con paginación porque los turnos
          // pueden no haberse cargado si el empleado no está en la página actual.
          // Asumimos que el backend hace el trabajo pesado.
          return isBaseCenter;
        }
        return true;
      });
  }, [employees, filters.costCenterId]);

  // Agrupar turnos por empleado y día
  const shiftsGrid = useMemo(() => {
    const grid: Record<string, Record<string, Shift[]>> = {};

    filteredEmployees.forEach((emp) => {
      grid[emp.id] = {};
      weekDays.forEach((date) => {
        const dateISO = formatDateISO(date);
        grid[emp.id][dateISO] = shifts
          .filter(
            (s) =>
              s.employeeId === emp.id &&
              s.date === dateISO &&
              // Aplicar filtros adicionales
              (!filters.zoneId || s.zoneId === filters.zoneId) &&
              (!filters.role || s.role?.toLowerCase().includes(filters.role.toLowerCase())) &&
              (!filters.status || s.status === filters.status),
          )
          .sort((a, b) => a.startTime.localeCompare(b.startTime)); // Ordenar por hora
      });
    });

    return grid;
  }, [filteredEmployees, weekDays, shifts, filters]);

  // Calcular estadísticas por empleado (horas semanales)
  const employeeWeekStats = useMemo(() => {
    const stats: Record<string, { totalHours: number; shiftCount: number }> = {};

    filteredEmployees.forEach((emp) => {
      let totalHours = 0;
      let shiftCount = 0;

      weekDays.forEach((date) => {
        const dateISO = formatDateISO(date);
        const dayShifts = shiftsGrid[emp.id]?.[dateISO] ?? [];
        dayShifts.forEach((shift) => {
          totalHours += calculateDuration(shift.startTime, shift.endTime);
          shiftCount++;
        });
      });

      stats[emp.id] = { totalHours, shiftCount };
    });

    return stats;
  }, [filteredEmployees, weekDays, shiftsGrid]);

  // Handlers de drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const shift = active.data.current?.shift as Shift | undefined;
    if (shift) {
      setActiveShift(shift);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShift(null);

    if (!over) return;

    const shift = active.data.current?.shift as Shift | undefined;
    const dropTarget = over.data.current as { employeeId: string; date: string } | undefined;

    if (!shift || !dropTarget) return;

    // Si es la misma celda, no hacer nada
    if (shift.employeeId === dropTarget.employeeId && shift.date === dropTarget.date) {
      return;
    }

    // Buscar si hay turnos en la celda destino
    const targetShifts = shiftsGrid[dropTarget.employeeId]?.[dropTarget.date] ?? [];

    if (targetShifts.length > 0) {
      // INTERCAMBIAR: mover todos los turnos de la celda destino a la celda origen
      const swapPromises = targetShifts.map((targetShift) => moveShift(targetShift.id, shift.employeeId, shift.date));

      // Esperar a que se completen todos los swaps
      await Promise.all(swapPromises);
    }

    // Mover el turno arrastrado a la celda destino
    await moveShift(shift.id, dropTarget.employeeId, dropTarget.date);
  };

  // Handler para crear turno en celda vacía
  const handleCreateShift = (employeeId: string, date: string) => {
    const employee = filteredEmployees.find((e) => e.id === employeeId);
    if (!employee) return;

    // Pre-rellenar datos con empleado y fecha
    openShiftDialog(undefined, {
      employeeId,
      date,
      costCenterId: employee.costCenterId,
    });
  };

  if (filteredEmployees.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center">
        <User className="text-muted-foreground h-12 w-12" />
        <div>
          <h3 className="text-lg font-semibold">No hay empleados con sistema de turnos</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {filters.costCenterId
              ? "No hay empleados en el lugar seleccionado que usen turnos."
              : "No hay empleados configurados para usar el sistema de turnos."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header: Días de la semana */}
          <div className="bg-background sticky top-0 z-10 grid grid-cols-8 gap-2 pb-2">
            {/* Columna de empleados */}
            <div className="flex items-center px-3 py-2">
              <span className="text-sm font-semibold">Empleado</span>
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

          {/* Filas: Empleados */}
          <div className="space-y-2">
            {filteredEmployees.map((employee) => {
              const stats = employeeWeekStats[employee.id];
              const hasConflicts = weekDays.some((day) => {
                const dayShifts = shiftsGrid[employee.id]?.[formatDateISO(day)] ?? [];
                return dayShifts.some((s) => s.status === "conflict");
              });

              return (
                <div key={employee.id} className="grid grid-cols-8 gap-2">
                  {/* Columna: Nombre del empleado + Estadísticas */}
                  <div className="bg-card flex flex-col justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {employee.firstName} {employee.lastName}
                      </p>
                      {employee.costCenterId && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {/* Aquí podríamos mostrar el nombre del lugar */}
                        </p>
                      )}
                    </div>

                    {/* Estadísticas de la semana */}
                    <div className="mt-2 space-y-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  stats.totalHours < employee.contractHours
                                    ? "destructive"
                                    : stats.totalHours > employee.contractHours * 1.1
                                      ? "secondary"
                                      : "default"
                                }
                                className="text-xs"
                              >
                                {formatDuration(stats.totalHours)}/{formatDuration(employee.contractHours)}
                              </Badge>
                              {hasConflicts && (
                                <Badge variant="destructive" className="text-xs">
                                  ⚠️
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <p>Total semana: {formatDuration(stats.totalHours)}</p>
                              <p>Contrato: {formatDuration(employee.contractHours)}</p>
                              <p>Turnos: {stats.shiftCount}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Columnas: Días (celdas de turnos) */}
                  {weekDays.map((day) => {
                    const dateISO = formatDateISO(day);
                    const dayShifts = shiftsGrid[employee.id]?.[dateISO] ?? [];

                    return (
                      <ShiftCell
                        key={`${employee.id}-${dateISO}`}
                        employeeId={employee.id}
                        date={dateISO}
                        shifts={dayShifts}
                        allShifts={shifts}
                        activeShiftId={activeShift?.id}
                        onCreateShift={() => handleCreateShift(employee.id, dateISO)}
                        onEditShift={(shift) => openShiftDialog(shift)}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* Sentry & Loading Indicator */}
            {hasMoreEmployees && (
              <div ref={loadMoreRef} className="flex justify-center py-4">
                {isLoadingMoreEmployees && <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay de drag (muestra el turno mientras se arrastra) */}
      <DragOverlay>
        {activeShift ? (
          <div className="rotate-2 opacity-90">
            <ShiftBlock shift={activeShift} onClick={() => {}} isDraggable={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Celda individual del calendario (un día para un empleado)
 */
interface ShiftCellProps {
  employeeId: string;
  date: string;
  shifts: Shift[];
  allShifts: Shift[];
  activeShiftId?: string;
  onCreateShift: () => void;
  onEditShift: (shift: Shift) => void;
}

function ShiftCell({ employeeId, date, shifts, allShifts, activeShiftId, onCreateShift, onEditShift }: ShiftCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${employeeId}-${date}`,
    data: {
      employeeId,
      date,
    },
  });

  // Determinar si esta celda contiene el shift que se está arrastrando
  const containsActiveShift = shifts.some((s) => s.id === activeShiftId);

  // Determinar el tipo de día vacío (descanso vs sin planificar)
  const emptyDayType = getEmptyDayType(date, allShifts, { employeeId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative min-h-[100px] rounded-lg border-2 p-2 transition-all",
        isOver ? "border-primary bg-primary/5" : "bg-muted/30 border-transparent",
        shifts.length === 0 && "hover:border-primary/50 hover:border-dashed",
        (isOver || containsActiveShift) && "opacity-50",
      )}
    >
      {/* Turnos existentes */}
      {shifts.length > 0 ? (
        <div className="space-y-1">
          {shifts.map((shift) => (
            <ShiftBlock key={shift.id} shift={shift} onClick={() => onEditShift(shift)} isDraggable />
          ))}
        </div>
      ) : (
        /* Celda vacía con tarjeta de descanso o sin planificar */
        <div className="flex h-full min-h-[80px] flex-col items-center justify-center gap-2">
          <RestDayCard type={emptyDayType} />
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateShift}
            className="text-muted-foreground h-8 w-full opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

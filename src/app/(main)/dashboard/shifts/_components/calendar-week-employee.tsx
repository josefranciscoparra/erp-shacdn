/**
 * Vista Calendario Semanal por Empleado
 *
 * Grid interactivo que muestra empleados en filas y días de la semana en columnas.
 * Soporta drag & drop de turnos entre empleados y días.
 * Diseño optimizado con CSS Grid y Sticky Headers/Columns.
 */

"use client";

import { useMemo, useState, useEffect, useRef, Fragment } from "react";

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
import { Plus, User, Loader2, Briefcase, Mail, Hash } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { Shift, EmployeeShift, Absence } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

import { RestDayCard } from "./rest-day-card";
import { ShiftBlock } from "./shift-block";

export function CalendarWeekEmployee() {
  const {
    shifts,
    absences,
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
        distance: 8,
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
      { threshold: 0.1, rootMargin: "200px" },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMoreEmployees, isLoadingMoreEmployees, employeesPage, fetchEmployees]);

  // Obtener días de la semana actual
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

  // Filtrar empleados
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => emp.usesShiftSystem)
      .filter((emp) => {
        if (filters.costCenterId) {
          return emp.costCenterId === filters.costCenterId;
        }
        return true;
      });
  }, [employees, filters.costCenterId]);

  // Agrupar turnos
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
              (!filters.zoneId || s.zoneId === filters.zoneId) &&
              (!filters.role || s.role?.toLowerCase().includes(filters.role.toLowerCase())) &&
              (!filters.status || s.status === filters.status),
          )
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
      });
    });

    return grid;
  }, [filteredEmployees, weekDays, shifts, filters]);

  // Estadísticas por empleado
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

  // Handlers Drag & Drop
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

    if (shift.employeeId === dropTarget.employeeId && shift.date === dropTarget.date) {
      return;
    }

    const targetShifts = shiftsGrid[dropTarget.employeeId]?.[dropTarget.date] ?? [];

    if (targetShifts.length > 0) {
      // Swap Logic (Simplificada)
      const tempDate = "2000-01-01";
      const targetShift = targetShifts[0];

      try {
        await moveShift(shift.id, shift.employeeId, tempDate);
        await moveShift(targetShift.id, shift.employeeId, shift.date);
        await moveShift(shift.id, dropTarget.employeeId, dropTarget.date);
      } catch (error) {
        console.error("Error during shift swap:", error);
      }
    } else {
      await moveShift(shift.id, dropTarget.employeeId, dropTarget.date);
    }
  };

  const handleCreateShift = (employeeId: string, date: string) => {
    const employee = filteredEmployees.find((e) => e.id === employeeId);
    if (!employee) return;
    openShiftDialog(undefined, {
      employeeId,
      date,
      costCenterId: employee.costCenterId,
    });
  };

  if (filteredEmployees.length === 0) {
    return (
      <div className="bg-muted/10 flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
        <User className="text-muted-foreground h-12 w-12 opacity-20" />
        <div>
          <h3 className="text-lg font-semibold">No hay empleados disponibles</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {filters.costCenterId
              ? "No hay empleados en el centro seleccionado."
              : "No se encontraron empleados que coincidan con los filtros."}
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
      <div className="bg-background relative h-[calc(100vh-220px)] w-full overflow-auto rounded-lg border shadow-sm">
        {/* Grid Container */}
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: "260px repeat(7, minmax(160px, 1fr))",
          }}
        >
          {/* HEADER ROW */}
          <div className="bg-background sticky top-0 left-0 z-30 flex h-14 items-center border-r border-b px-4 text-sm font-semibold shadow-sm">
            <span className="text-muted-foreground">Empleados ({filteredEmployees.length})</span>
          </div>

          {weekDays.map((day) => {
            const isToday = formatDateISO(day) === formatDateISO(new Date());
            return (
              <div
                key={day.toString()}
                className={cn(
                  "bg-background sticky top-0 z-20 flex flex-col items-center justify-center border-r border-b p-2 text-center transition-colors",
                  isToday && "bg-primary/5 shadow-[inset_0_-2px_0_0_hsl(var(--primary))]",
                )}
              >
                <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {formatDateShort(day).split(" ")[0]}
                </span>
                <span className={cn("text-lg leading-none font-semibold", isToday && "text-primary")}>
                  {formatDateShort(day).split(" ")[1]}
                </span>
              </div>
            );
          })}

          {/* EMPLOYEE ROWS */}
          {filteredEmployees.map((employee) => {
            const stats = employeeWeekStats[employee.id];
            const initials = `${employee.firstName[0]}${employee.lastName[0]}`;

            return (
              <Fragment key={employee.id}>
                {/* Employee Column (Sticky Left) */}
                <div className="bg-background hover:bg-muted/50 group sticky left-0 z-10 flex flex-col justify-center border-r border-b px-4 py-3 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border">
                      <AvatarImage src={employee.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-sm leading-none font-medium">
                        {employee.firstName} {employee.lastName}
                      </span>
                      <span className="text-muted-foreground mt-1 truncate text-xs">
                        {employee.position ?? "Sin puesto"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="text-muted-foreground flex items-center gap-1.5" title="Horas Contrato">
                      <Briefcase className="h-3 w-3" />
                      <span>{employee.contractHours}h</span>
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "h-5 px-1.5 font-normal",
                              stats.totalHours < employee.contractHours
                                ? "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                                : stats.totalHours > employee.contractHours
                                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                  : "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
                            )}
                          >
                            {formatDuration(stats.totalHours)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Total semana: {formatDuration(stats.totalHours)}</p>
                          <p>Contrato: {formatDuration(employee.contractHours)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Day Cells */}
                {weekDays.map((day) => {
                  const dateISO = formatDateISO(day);
                  const dayShifts = shiftsGrid[employee.id]?.[dateISO] ?? [];

                  return (
                    <ShiftCell
                      key={`${employee.id}-${dateISO}`}
                      employeeId={employee.id}
                      date={dateISO}
                      shifts={dayShifts}
                      absences={absences}
                      allShifts={shifts}
                      activeShiftId={activeShift?.id}
                      onCreateShift={() => handleCreateShift(employee.id, dateISO)}
                      onEditShift={(shift) => openShiftDialog(shift)}
                    />
                  );
                })}
              </Fragment>
            );
          })}

          {/* Loading Skeleton / Infinite Scroll Trigger */}
          {hasMoreEmployees && (
            <div ref={loadMoreRef} className="col-span-full flex justify-center border-t py-8">
              {isLoadingMoreEmployees && <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeShift ? (
          <div className="w-[150px] rotate-2 cursor-grabbing opacity-90">
            <ShiftBlock shift={activeShift} onClick={() => {}} isDraggable={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Celda individual del calendario
 */
interface ShiftCellProps {
  employeeId: string;
  date: string;
  shifts: Shift[];
  absences: Absence[];
  allShifts: Shift[];
  activeShiftId?: string;
  onCreateShift: () => void;
  onEditShift: (shift: Shift) => void;
}

function ShiftCell({
  employeeId,
  date,
  shifts,
  absences,
  allShifts,
  activeShiftId,
  onCreateShift,
  onEditShift,
}: ShiftCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${employeeId}-${date}`,
    data: {
      employeeId,
      date,
    },
  });

  const containsActiveShift = shifts.some((s) => s.id === activeShiftId);
  const emptyDayType = getEmptyDayType(date, allShifts, { employeeId });

  // Filtrar ausencias para este día y empleado
  const cellAbsences = absences.filter((a) => a.employeeId === employeeId && date >= a.startDate && date <= a.endDate);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative flex min-h-[100px] flex-col gap-1 border-r border-b p-1.5 transition-colors",
        isOver ? "bg-primary/5 ring-primary/20 ring-2 ring-inset" : "bg-background",
        !isOver && shifts.length === 0 && cellAbsences.length === 0 && "hover:bg-muted/30",
        (isOver || containsActiveShift) && "opacity-60",
      )}
    >
      {/* Renderizar Ausencias */}
      {cellAbsences.map((absence) => (
        <div
          key={absence.id}
          className="mb-1 rounded border border-amber-200 bg-amber-50 p-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
        >
          <span className="line-clamp-1 font-medium">{absence.type}</span>
        </div>
      ))}

      {shifts.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {shifts.map((shift) => (
            <ShiftBlock key={shift.id} shift={shift} onClick={() => onEditShift(shift)} isDraggable />
          ))}
        </div>
      ) : (
        /* Empty State / Add Button */
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 py-2">
          {emptyDayType === "rest" && cellAbsences.length === 0 && (
            <div className="flex flex-col items-center justify-center opacity-40">
              <span className="text-muted-foreground text-xs font-medium">Descanso</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-primary/10 hover:text-primary h-7 w-7 rounded-full opacity-0 transition-all group-hover:opacity-100"
            onClick={onCreateShift}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

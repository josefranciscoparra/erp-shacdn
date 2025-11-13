/**
 * Vista Calendario Mensual por Empleado
 *
 * Vista compacta mostrando todo el mes con indicadores de turnos.
 */

"use client";

import { useMemo } from "react";

import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { formatDateISO, formatDuration, calculateDuration, getEmptyDayType } from "../_lib/shift-utils";
import type { Shift } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

import { RestDayCard } from "./rest-day-card";

export function CalendarMonthEmployee() {
  const { shifts, employees, currentWeekStart, filters, openShiftDialog } = useShiftsStore();

  // Usar currentWeekStart para derivar el mes actual
  const currentMonth = useMemo(() => startOfMonth(currentWeekStart), [currentWeekStart]);

  // Obtener todos los días del mes
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Filtrar empleados que usan sistema de turnos
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => emp.usesShiftSystem)
      .filter((emp) => {
        if (filters.costCenterId && emp.costCenterId !== filters.costCenterId) {
          return false;
        }
        return true;
      });
  }, [employees, filters.costCenterId]);

  // Agrupar turnos por empleado y día
  const shiftsGrid = useMemo(() => {
    const grid: Record<string, Record<string, Shift[]>> = {};

    filteredEmployees.forEach((emp) => {
      grid[emp.id] = {};
      monthDays.forEach((date) => {
        const dateISO = formatDateISO(date);
        grid[emp.id][dateISO] = shifts.filter(
          (s) =>
            s.employeeId === emp.id &&
            s.date === dateISO &&
            (!filters.zoneId || s.zoneId === filters.zoneId) &&
            (!filters.role || s.role?.toLowerCase().includes(filters.role.toLowerCase())) &&
            (!filters.status || s.status === filters.status),
        );
      });
    });

    return grid;
  }, [filteredEmployees, monthDays, shifts, filters]);

  // Calcular totales por empleado en el mes
  const employeeMonthTotals = useMemo(() => {
    const totals: Record<string, { hours: number; shifts: number }> = {};

    filteredEmployees.forEach((emp) => {
      let totalHours = 0;
      let totalShifts = 0;

      monthDays.forEach((date) => {
        const dateISO = formatDateISO(date);
        const dayShifts = shiftsGrid[emp.id]?.[dateISO] ?? [];
        dayShifts.forEach((shift) => {
          totalHours += calculateDuration(shift.startTime, shift.endTime);
          totalShifts++;
        });
      });

      totals[emp.id] = { hours: totalHours, shifts: totalShifts };
    });

    return totals;
  }, [filteredEmployees, monthDays, shiftsGrid]);

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
    <div className="space-y-4">
      {/* Header: Navegación de mes */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold capitalize">{format(currentMonth, "MMMM yyyy", { locale: es })}</h3>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {filteredEmployees.length} {filteredEmployees.length === 1 ? "empleado" : "empleados"}
          </span>
        </div>
      </div>

      {/* Grid de empleados */}
      <div className="space-y-4">
        {filteredEmployees.map((employee) => {
          const totals = employeeMonthTotals[employee.id];

          return (
            <div key={employee.id} className="bg-card rounded-lg border p-4">
              {/* Header del empleado */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDuration(totals.hours)} • {totals.shifts} {totals.shifts === 1 ? "turno" : "turnos"}
                  </p>
                </div>

                <Badge
                  variant={
                    totals.hours < employee.contractHours * 4
                      ? "destructive"
                      : totals.hours > employee.contractHours * 4.4
                        ? "secondary"
                        : "default"
                  }
                >
                  {((totals.hours / (employee.contractHours * 4)) * 100).toFixed(0)}%
                </Badge>
              </div>

              {/* Calendario del mes */}
              <div className="grid grid-cols-7 gap-1">
                {/* Headers de días de la semana */}
                {["L", "M", "X", "J", "V", "S", "D"].map((day, idx) => (
                  <div
                    key={idx}
                    className="text-muted-foreground flex h-6 items-center justify-center text-xs font-medium"
                  >
                    {day}
                  </div>
                ))}

                {/* Días del mes */}
                {monthDays.map((day) => {
                  const dateISO = formatDateISO(day);
                  const dayShifts = shiftsGrid[employee.id]?.[dateISO] ?? [];
                  const isToday = dateISO === formatDateISO(new Date());
                  const hasShifts = dayShifts.length > 0;

                  return (
                    <MonthDayCell
                      key={dateISO}
                      day={day}
                      isToday={isToday}
                      hasShifts={hasShifts}
                      shifts={dayShifts}
                      allShifts={shifts}
                      onCreateShift={() =>
                        openShiftDialog(undefined, {
                          employeeId: employee.id,
                          date: dateISO,
                          costCenterId: employee.costCenterId,
                        })
                      }
                      onEditShift={(shift) => openShiftDialog(shift)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Celda individual del calendario mensual
 */
interface MonthDayCellProps {
  day: Date;
  isToday: boolean;
  hasShifts: boolean;
  shifts: Shift[];
  allShifts: Shift[];
  onCreateShift: () => void;
  onEditShift: (shift: Shift) => void;
}

function MonthDayCell({ day, isToday, hasShifts, shifts, allShifts, onCreateShift, onEditShift }: MonthDayCellProps) {
  const dayNumber = format(day, "d");
  const dateISO = formatDateISO(day);

  // Determinar el tipo de día vacío (descanso vs sin planificar)
  const emptyDayType = getEmptyDayType(dateISO, allShifts);

  const getCellColor = () => {
    if (shifts.some((s) => s.status === "conflict")) {
      return "bg-destructive/10 border-destructive hover:bg-destructive/20";
    }
    if (shifts.some((s) => s.status === "draft")) {
      return "bg-amber-50 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/20 dark:border-amber-800";
    }
    if (hasShifts) {
      return "bg-primary/10 border-primary hover:bg-primary/20";
    }
    return "bg-muted/30 border-transparent hover:bg-muted/50";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => (hasShifts ? onEditShift(shifts[0]) : onCreateShift())}
            className={cn(
              "relative flex h-10 w-full cursor-pointer items-center justify-center rounded border text-xs font-medium transition-colors",
              getCellColor(),
              isToday && "ring-primary ring-2 ring-offset-1",
            )}
          >
            {dayNumber}
            {shifts.length > 1 && <span className="bg-primary absolute right-0 bottom-0 h-1.5 w-1.5 rounded-full" />}
          </button>
        </TooltipTrigger>

        <TooltipContent side="top">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">{format(day, "EEEE d MMMM", { locale: es })}</p>
            {hasShifts ? (
              <>
                <p>
                  {shifts.length} {shifts.length === 1 ? "turno" : "turnos"}:
                </p>
                <ul className="list-inside list-disc">
                  {shifts.map((shift) => (
                    <li key={shift.id}>
                      {shift.startTime}-{shift.endTime} • {shift.role ?? "Sin rol"}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <RestDayCard type={emptyDayType} compact />
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

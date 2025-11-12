/**
 * Vista Calendario Semanal por Empleado v2 (Rediseño)
 *
 * Diseño moderno estilo Google Calendar/Factorial/Linear
 * - Grid limpio con sticky navigator
 * - Tarjetas de turno con diseño morado suave
 * - Modo compacto toggle
 * - Solo UI, usa datos MOCK
 */

"use client";

import { useMemo, useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatWeekRange } from "../../_lib/shift-utils";
import type { Shift } from "../../_lib/types";
import { useShiftsStore } from "../../_store/shifts-store";

import { CompactModeToggle } from "./compact-mode-toggle";
import { EmployeeRowV2 } from "./employee-row-v2";
import { FilterBarV2 } from "./filter-bar-v2";
import { WeekDaysHeaderV2 } from "./week-days-header-v2";
import { WeekNavigatorV2 } from "./week-navigator-v2";

export function CalendarWeekEmployeeV2() {
  const {
    shifts,
    employees,
    costCenters,
    zones,
    currentWeekStart,
    filters,
    openShiftDialog,
    goToPreviousWeek,
    goToNextWeek,
    goToToday,
    setFilters,
  } = useShiftsStore();

  const [isCompact, setIsCompact] = useState(false);
  const [groupBy, setGroupBy] = useState<"employee" | "area">("employee");

  // Generar días de la semana
  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);

      const dayNames = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
      const dayNumber = date.getDate().toString();
      const dateISO = date.toISOString().split("T")[0];

      days.push({
        date: dateISO,
        dayName: dayNames[date.getDay()],
        dayNumber,
        isToday: date.getTime() === today.getTime(),
      });
    }

    return days;
  }, [currentWeekStart]);

  // Filtrar turnos
  const filteredShifts = useMemo(() => {
    let result = shifts;

    if (filters.costCenterId) {
      result = result.filter((s) => s.costCenterId === filters.costCenterId);
    }

    if (filters.zoneId) {
      result = result.filter((s) => s.zoneId === filters.zoneId);
    }

    if (filters.status) {
      result = result.filter((s) => s.status === filters.status);
    }

    return result;
  }, [shifts, filters]);

  // Organizar turnos por empleado y día
  const employeesWithShifts = useMemo(() => {
    return employees.map((employee) => {
      const employeeShifts = filteredShifts.filter((s) => s.employeeId === employee.id);

      // Calcular horas asignadas
      const assignedHours = employeeShifts.reduce((total, shift) => {
        const startHour = parseInt(shift.startTime.split(":")[0]);
        const endHour = parseInt(shift.endTime.split(":")[0]);
        const hours = endHour - startHour - (shift.breakMinutes ?? 0) / 60;
        return total + hours;
      }, 0);

      // Agrupar turnos por día
      const shiftsPerDay: Record<string, Shift[]> = {};
      employeeShifts.forEach((shift) => {
        if (!shiftsPerDay[shift.date]) {
          shiftsPerDay[shift.date] = [];
        }
        shiftsPerDay[shift.date].push(shift);
      });

      return {
        employee,
        assignedHours,
        shiftsPerDay,
      };
    });
  }, [employees, filteredShifts]);

  // Formato de semana para navegador
  const weekDisplay = formatWeekRange(currentWeekStart);

  return (
    <div className="@container/main flex flex-col gap-4">
      {/* Header con filtros */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cuadrante de Turnos</h2>
        <div className="flex items-center gap-3">
          <CompactModeToggle isCompact={isCompact} onToggle={setIsCompact} />
          <Button onClick={() => openShiftDialog()}>
            <Plus className="mr-2 size-4" />
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <FilterBarV2
        selectedCostCenter={filters.costCenterId}
        onCostCenterChange={(value) => setFilters({ costCenterId: value === "all" ? undefined : value })}
        selectedZone={filters.zoneId}
        onZoneChange={(value) => setFilters({ zoneId: value === "all" ? undefined : value })}
        selectedStatus={filters.status}
        onStatusChange={(value) => setFilters({ status: value === "all" ? undefined : (value as any) })}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        costCenters={costCenters}
        zones={zones}
      />

      {/* Navegador de semana (sticky) */}
      <WeekNavigatorV2
        weekDisplay={weekDisplay}
        onPrevious={goToPreviousWeek}
        onNext={goToNextWeek}
        onToday={goToToday}
      />

      {/* Calendario */}
      <div className="bg-background overflow-hidden rounded-lg border">
        {/* Cabecera de días */}
        <WeekDaysHeaderV2 weekDays={weekDays} />

        {/* Filas de empleados */}
        <div>
          {employeesWithShifts.map(({ employee, assignedHours, shiftsPerDay }) => (
            <EmployeeRowV2
              key={employee.id}
              employeeName={employee.firstName + (employee.lastName ? ` ${employee.lastName}` : "")}
              employeeInitial={employee.firstName.charAt(0).toUpperCase()}
              assignedHours={assignedHours}
              contractHours={employee.contractHours}
              weekDays={weekDays}
              shiftsPerDay={shiftsPerDay}
              isCompact={isCompact}
              onShiftClick={(shift) => {
                // TODO: Abrir modal de edición
                console.log("Click en turno:", shift);
              }}
            />
          ))}
        </div>

        {/* Estado vacío */}
        {employeesWithShifts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground text-sm">No hay empleados que mostrar</p>
            <p className="text-muted-foreground mt-1 text-xs">Ajusta los filtros para ver más resultados</p>
          </div>
        )}
      </div>
    </div>
  );
}

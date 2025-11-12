/**
 * Página "Mis Turnos" (Empleados)
 *
 * Vista personal de turnos asignados con:
 * - Métricas personales (horas, próximo turno, balance)
 * - Calendario semana/mes (solo lectura)
 * - Lista de próximos turnos
 */

"use client";

import { useEffect, useMemo } from "react";

import { Calendar, FileDown, List, LayoutGrid } from "lucide-react";

import { CalendarMonthEmployee } from "@/app/(main)/dashboard/shifts/_components/calendar-month-employee";
import { CalendarWeekEmployee } from "@/app/(main)/dashboard/shifts/_components/calendar-week-employee";
import { WeekNavigator } from "@/app/(main)/dashboard/shifts/_components/week-navigator";
import { useShiftsStore } from "@/app/(main)/dashboard/shifts/_store/shifts-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { MyShiftsMetricsCards } from "./_components/my-shifts-metrics";
import { calculateMyShiftsMetrics } from "./_lib/my-shifts-utils";
import { useMyShiftsStore } from "./_store/my-shifts-store";

export default function MyShiftsPage() {
  // Store de turnos (compartido con el módulo de gestión)
  const {
    shifts,
    employees,
    costCenters,
    zones,
    isLoading,
    weekStart,
    setWeekStart,
    nextWeek,
    previousWeek,
    goToToday,
    fetchShifts,
    fetchEmployees,
    fetchCostCenters,
    fetchZones,
  } = useShiftsStore();

  // Store de mis turnos
  const { calendarView, setCalendarView } = useMyShiftsStore();

  // Cargar datos iniciales
  useEffect(() => {
    void fetchShifts();
    void fetchEmployees();
    void fetchCostCenters();
    void fetchZones();
  }, [fetchShifts, fetchEmployees, fetchCostCenters, fetchZones]);

  // Obtener el primer empleado como "empleado actual" (MOCK)
  // En producción, esto vendría del contexto de autenticación
  const currentEmployee = useMemo(() => {
    // Buscar el primer empleado que use el sistema de turnos
    const employee = employees.find((e) => e.usesShiftSystem);
    return employee ?? null;
  }, [employees]);

  // Filtrar solo MIS turnos
  const myShifts = useMemo(() => {
    if (!currentEmployee) return [];
    return shifts.filter((s) => s.employeeId === currentEmployee.id);
  }, [shifts, currentEmployee]);

  // Calcular métricas personales
  const metrics = useMemo(() => {
    if (!currentEmployee) return null;
    return calculateMyShiftsMetrics(shifts, currentEmployee);
  }, [shifts, currentEmployee]);

  if (!currentEmployee) {
    return (
      <div className="@container/main flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Calendar className="text-muted-foreground size-12" />
            <p className="text-muted-foreground text-sm">
              No tienes un perfil de empleado configurado o no estás en el sistema de turnos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @xl/main:flex-row @xl/main:items-center @xl/main:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Mis Turnos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Hola {currentEmployee.firstName}, aquí puedes consultar tus turnos asignados
          </p>
        </div>

        <div className="flex gap-2">
          {/* Botón exportar (placeholder) */}
          <Button variant="outline" disabled>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <MyShiftsMetricsCards metrics={metrics} isLoading={isLoading} />

      {/* Vista rápida de próximos turnos */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos 7 Días</CardTitle>
          <CardDescription>Tus turnos programados para esta semana</CardDescription>
        </CardHeader>
        <CardContent>
          {myShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Calendar className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">No tienes turnos asignados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myShifts.slice(0, 7).map((shift) => {
                const zone = zones.find((z) => z.id === shift.zoneId);
                const costCenter = costCenters.find((cc) => cc.id === shift.costCenterId);

                return (
                  <div
                    key={shift.id}
                    className="hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {new Date(shift.date).toLocaleDateString("es-ES", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {shift.startTime} - {shift.endTime}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {zone?.name ?? "Sin zona"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {costCenter?.name ?? "Sin lugar"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendario */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calendario de Turnos</CardTitle>
              <CardDescription>Vista completa de tus turnos asignados</CardDescription>
            </div>

            <div className="flex gap-2">
              <Button
                variant={calendarView === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setCalendarView("week")}
              >
                <List className="mr-2 h-4 w-4" />
                Semana
              </Button>
              <Button
                variant={calendarView === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setCalendarView("month")}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Mes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Navegador de semana */}
          <WeekNavigator weekStart={weekStart} onPrevious={previousWeek} onNext={nextWeek} onToday={goToToday} />

          {/* Calendario */}
          {calendarView === "week" ? (
            <CalendarWeekEmployee
              shifts={myShifts}
              employees={[currentEmployee]}
              costCenters={costCenters}
              zones={zones}
              weekStart={weekStart}
              onShiftClick={(shift) => {
                // Abrir dialog de detalles del turno
                console.log("Ver turno:", shift);
              }}
            />
          ) : (
            <CalendarMonthEmployee
              shifts={myShifts}
              employees={[currentEmployee]}
              costCenters={costCenters}
              zones={zones}
              onShiftClick={(shift) => {
                console.log("Ver turno:", shift);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

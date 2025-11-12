/**
 * Página "Mis Turnos" (Empleados)
 *
 * Vista personal de turnos asignados con:
 * - Métricas personales (horas, próximo turno, balance)
 * - Calendario semana/mes (solo lectura)
 * - Solicitudes de cambio de turno
 * - Exportación de turnos
 */

"use client";

import { useEffect, useMemo, useState } from "react";

import { Calendar, FileDown, ArrowLeftRight, LayoutGrid, List } from "lucide-react";

import { CalendarMonthEmployee } from "@/app/(main)/dashboard/shifts/_components/calendar-month-employee";
import { CalendarWeekEmployee } from "@/app/(main)/dashboard/shifts/_components/calendar-week-employee";
import { WeekNavigator } from "@/app/(main)/dashboard/shifts/_components/week-navigator";
import { useShiftsStore } from "@/app/(main)/dashboard/shifts/_store/shifts-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MyShiftsMetricsCards } from "./_components/my-shifts-metrics";
import { calculateMyShiftsMetrics } from "./_lib/my-shifts-utils";
import { useMyShiftsStore, useCurrentEmployee } from "./_store/my-shifts-store";

export default function MyShiftsPage() {
  const currentEmployee = useCurrentEmployee();

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
  const {
    changeRequests,
    isLoadingRequests,
    calendarView,
    setCalendarView,
    fetchChangeRequests,
    openChangeRequestDialog,
  } = useMyShiftsStore();

  const [activeTab, setActiveTab] = useState("dashboard");

  // Cargar datos iniciales
  useEffect(() => {
    void fetchShifts();
    void fetchEmployees();
    void fetchCostCenters();
    void fetchZones();
    void fetchChangeRequests();
  }, []);

  // Filtrar solo MIS turnos
  const myShifts = useMemo(() => {
    return shifts.filter((s) => s.employeeId === currentEmployee.id);
  }, [shifts, currentEmployee.id]);

  // Calcular métricas personales
  const metrics = useMemo(() => {
    const employee = employees.find((e) => e.id === currentEmployee.id);
    if (!employee) return null;

    return calculateMyShiftsMetrics(shifts, employee);
  }, [shifts, employees, currentEmployee.id]);

  // Solicitudes pendientes
  const pendingRequests = changeRequests.filter((r) => r.status === "pending");

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @xl/main:flex-row @xl/main:items-center @xl/main:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Mis Turnos</h1>
          <p className="text-muted-foreground mt-1 text-sm">Consulta tus turnos asignados y solicita cambios</p>
        </div>

        <div className="flex gap-2">
          {/* Botón exportar (placeholder) */}
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>

          {/* Solicitar cambio (placeholder - se abrirá desde un turno específico) */}
          <Button variant="outline" disabled>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Solicitar Cambio
          </Button>
        </div>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="requests">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Solicitudes
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
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
        </TabsContent>

        {/* Tab 2: Calendario */}
        <TabsContent value="calendar" className="space-y-6">
          {/* Navegador de semana/mes */}
          <div className="flex items-center justify-between">
            <WeekNavigator weekStart={weekStart} onPrevious={previousWeek} onNext={nextWeek} onToday={goToToday} />

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

          {/* Calendario */}
          {calendarView === "week" ? (
            <CalendarWeekEmployee
              shifts={myShifts}
              employees={[employees.find((e) => e.id === currentEmployee.id)!]}
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
              employees={[employees.find((e) => e.id === currentEmployee.id)!]}
              costCenters={costCenters}
              zones={zones}
              onShiftClick={(shift) => {
                console.log("Ver turno:", shift);
              }}
            />
          )}
        </TabsContent>

        {/* Tab 3: Solicitudes de Cambio */}
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Cambio</CardTitle>
              <CardDescription>Historial de solicitudes de cambio o intercambio de turnos</CardDescription>
            </CardHeader>
            <CardContent>
              {changeRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <ArrowLeftRight className="text-muted-foreground size-8" />
                  <p className="text-muted-foreground text-sm">No has realizado ninguna solicitud de cambio</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {changeRequests.map((request) => {
                    const shift = shifts.find((s) => s.id === request.shiftId);

                    return (
                      <div key={request.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {shift ? `${shift.startTime} - ${shift.endTime}` : "Turno no encontrado"}
                            </span>
                            <Badge
                              variant={
                                request.status === "approved"
                                  ? "default"
                                  : request.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {request.status === "pending" && "Pendiente"}
                              {request.status === "approved" && "Aprobado"}
                              {request.status === "rejected" && "Rechazado"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs">{request.reason}</p>
                          {request.reviewNotes && (
                            <p className="text-muted-foreground text-xs italic">Nota: {request.reviewNotes}</p>
                          )}
                        </div>

                        <div className="text-muted-foreground text-xs">
                          {request.createdAt.toLocaleDateString("es-ES")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

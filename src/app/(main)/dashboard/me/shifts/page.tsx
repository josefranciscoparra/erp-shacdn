/**
 * Página "Mis Turnos" (Empleados)
 *
 * Vista personal de turnos asignados con:
 * - Métricas personales (horas, próximo turno, balance)
 * - Calendario semana/mes (solo lectura)
 * - Lista de próximos turnos
 */

"use client";

import { useEffect, useMemo, useState } from "react";

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, FileDown, Clock, MapPin, Coffee, ChevronLeft, ChevronRight } from "lucide-react";

import { formatShiftTime } from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
import type { Shift } from "@/app/(main)/dashboard/shifts/_lib/types";
import { useShiftsStore } from "@/app/(main)/dashboard/shifts/_store/shifts-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { MyShiftsMetricsCards } from "./_components/my-shifts-metrics";
import { ShiftChangeRequestDialog } from "./_components/shift-change-request-dialog";
import { calculateMyShiftsMetrics } from "./_lib/my-shifts-utils";

export default function MyShiftsPage() {
  // Store de turnos (compartido con el módulo de gestión)
  const {
    shifts,
    employees,
    costCenters,
    zones,
    isLoading,
    fetchShifts,
    fetchEmployees,
    fetchCostCenters,
    fetchZones,
  } = useShiftsStore();

  // Estado local para navegación de calendario y dialog
  const [currentMonth, setCurrentMonth] = useState(startOfToday());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  // Obtener días del mes actual seleccionado
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Funciones de navegación
  const goToPreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(startOfToday());

  // Función para abrir dialog con turno seleccionado
  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
    setIsDialogOpen(true);
  };

  // Agrupar turnos por fecha
  const shiftsByDate = useMemo(() => {
    const grouped = new Map<string, typeof myShifts>();
    myShifts.forEach((shift) => {
      const dateKey = shift.date;
      const existing = grouped.get(dateKey) ?? [];
      grouped.set(dateKey, [...existing, shift]);
    });
    return grouped;
  }, [myShifts]);

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

      {/* Calendario de Turnos Mensual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* Navegación izquierda */}
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Mes en el centro */}
            <div className="text-center">
              <h2 className="text-xl font-bold capitalize">{format(currentMonth, "MMMM yyyy", { locale: es })}</h2>
            </div>

            {/* Navegación derecha */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoy
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {myShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Calendar className="text-muted-foreground size-12" />
              <p className="text-muted-foreground text-sm">No tienes turnos asignados este mes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Grid de calendario */}
              <div className="grid grid-cols-7 gap-2">
                {/* Headers de días de la semana */}
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                  <div key={day} className="text-muted-foreground py-2 text-center text-xs font-medium">
                    {day}
                  </div>
                ))}

                {/* Días del mes */}
                {daysInMonth.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayShifts = shiftsByDate.get(dateKey) ?? [];
                  const hasShifts = dayShifts.length > 0;
                  const today = isToday(day);

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        "hover:border-primary/50 min-h-[120px] rounded-lg border p-2 transition-all",
                        today && "border-primary bg-primary/5",
                        hasShifts && "from-primary/10 bg-gradient-to-br to-transparent",
                        !hasShifts && "bg-muted/30",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            today && "text-primary",
                            !isSameMonth(day, currentMonth) && "text-muted-foreground",
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {hasShifts && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {dayShifts.length}
                          </Badge>
                        )}
                      </div>

                      {/* Turnos del día */}
                      <div className="space-y-1">
                        {dayShifts.map((shift) => {
                          const zone = zones.find((z) => z.id === shift.zoneId);
                          const costCenter = costCenters.find((cc) => cc.id === shift.costCenterId);

                          return (
                            <button
                              key={shift.id}
                              onClick={() => handleShiftClick(shift)}
                              className="hover:bg-primary/20 bg-card hover:border-primary/30 w-full cursor-pointer rounded border border-transparent p-1.5 text-left shadow-sm transition-colors"
                            >
                              <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold">
                                <Clock className="h-3 w-3" />
                                <span>{formatShiftTime(shift.startTime, shift.endTime)}</span>
                                {shift.breakMinutes && shift.breakMinutes > 0 && (
                                  <Coffee
                                    className="text-muted-foreground h-3 w-3"
                                    title={`${shift.breakMinutes}min`}
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[9px]">
                                <MapPin className="text-muted-foreground h-2.5 w-2.5" />
                                <span className="text-muted-foreground truncate">
                                  {costCenter?.name ?? "Sin lugar"}
                                </span>
                              </div>
                              {zone && (
                                <Badge variant="outline" className="mt-1 h-4 text-[8px]">
                                  {zone.name}
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Solicitud de Cambio */}
      {currentEmployee && (
        <ShiftChangeRequestDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          shift={selectedShift}
          employee={currentEmployee}
          employees={employees}
        />
      )}
    </div>
  );
}

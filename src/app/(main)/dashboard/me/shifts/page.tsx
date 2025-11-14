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
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { formatShiftTime, getEmptyDayType } from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
import type { Shift } from "@/app/(main)/dashboard/shifts/_lib/types";
import { useShiftsStore } from "@/app/(main)/dashboard/shifts/_store/shifts-store";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { MyShiftsMetricsCards } from "./_components/my-shifts-metrics";
import { ShiftChangeRequestDialog } from "./_components/shift-change-request-dialog";
import { calculateMyShiftsMetrics } from "./_lib/my-shifts-utils";

// Helper: Determinar tipo de turno según hora de inicio
function getShiftType(startTime: string): "morning" | "afternoon" | "night" | "vacation" {
  const hour = parseInt(startTime.split(":")[0] ?? "0", 10);
  if (hour >= 6 && hour < 14) return "morning";
  if (hour >= 14 && hour < 22) return "afternoon";
  return "night";
}

// Helper: Colores pastel más fuertes estilo Linear/Factorial
function getShiftColors(type: "morning" | "afternoon" | "night" | "rest" | "vacation") {
  switch (type) {
    case "morning":
      return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100";
    case "afternoon":
      return "bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100";
    case "night":
      return "bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100";
    case "vacation":
      return "bg-orange-100 dark:bg-orange-900/50 text-orange-900 dark:text-orange-100";
    case "rest":
      return "bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100";
  }
}

// Helper: Etiqueta del tipo de turno
function getShiftLabel(type: "morning" | "afternoon" | "night" | "vacation") {
  switch (type) {
    case "morning":
      return "Mañana";
    case "afternoon":
      return "Tarde";
    case "night":
      return "Noche";
    case "vacation":
      return "Vacaciones";
  }
}

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
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <SectionHeader
        title="Mis Turnos"
        description="Consulta tu planificación de turnos y gestiona tus horarios asignados."
      />

      {/* Métricas */}
      <MyShiftsMetricsCards metrics={metrics} isLoading={isLoading} />

      {/* Calendario de Turnos Mensual */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            {/* Navegación y mes juntos (izquierda) */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="px-3 text-xl font-bold capitalize">{format(currentMonth, "MMMM yyyy", { locale: es })}</h2>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Botón Hoy (derecha) */}
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {myShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Calendar className="text-muted-foreground size-12" />
              <p className="text-muted-foreground text-sm">No tienes turnos asignados este mes</p>
            </div>
          ) : (
            <>
              {/* Grid de calendario */}
              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {/* Headers de días de la semana */}
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                  <div key={day} className="text-muted-foreground pb-2 text-center text-xs font-medium uppercase">
                    {day}
                  </div>
                ))}

                {/* Días del mes */}
                {daysInMonth.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayShifts = shiftsByDate.get(dateKey) ?? [];
                  const hasShifts = dayShifts.length > 0;
                  const today = isToday(day);

                  // Determinar el tipo de día vacío (descanso vs sin planificar)
                  const emptyDayType = getEmptyDayType(dateKey, shifts);

                  return (
                    <div key={dateKey} className="min-h-[60px] md:min-h-[80px]">
                      {/* Turnos del día */}
                      {hasShifts ? (
                        dayShifts.map((shift) => {
                          // Detectar vacaciones basándose en el campo role
                          const isVacation = shift.role?.toLowerCase().includes("vacaciones");
                          const shiftType = isVacation ? "vacation" : getShiftType(shift.startTime);
                          const colors = getShiftColors(shiftType);
                          const label = getShiftLabel(shiftType);

                          return (
                            <button
                              key={shift.id}
                              onClick={() => handleShiftClick(shift)}
                              className={cn(
                                "h-full w-full rounded-lg p-2 text-left transition-all hover:scale-[1.02] hover:opacity-90",
                                colors,
                              )}
                            >
                              {/* Vacaciones: centrado */}
                              {isVacation ? (
                                <div className="flex h-full items-center justify-center">
                                  {/* Desktop: texto completo */}
                                  <span className="hidden text-[10px] font-bold tracking-wider uppercase md:inline">
                                    {label}
                                  </span>
                                  {/* Móvil: solo letra V centrada */}
                                  <span className="text-xs font-bold uppercase md:hidden">V</span>
                                </div>
                              ) : (
                                /* Turnos normales: layout completo */
                                <div className="flex h-full flex-col justify-between">
                                  {/* Fila superior: Tipo turno (izq) + Fecha (der) */}
                                  <div className="flex items-start justify-between md:justify-start">
                                    {/* Desktop: tipo turno izquierda + fecha derecha */}
                                    <span className="hidden text-[10px] font-bold tracking-wider uppercase md:inline">
                                      {label}
                                    </span>
                                    <span className="hidden text-[10px] font-medium opacity-60 md:ml-auto md:inline">
                                      {format(day, "d")}
                                    </span>

                                    {/* Móvil: solo letra centrada */}
                                    <span className="mx-auto text-xs font-bold uppercase md:hidden">
                                      {label.charAt(0)}
                                    </span>
                                  </div>

                                  {/* Fila inferior: Horario abajo derecha - solo desktop */}
                                  <div className="hidden justify-end md:flex">
                                    <span className="text-[9px] font-medium opacity-80">
                                      {formatShiftTime(shift.startTime, shift.endTime)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        // Días sin turnos
                        <div
                          className={cn(
                            "flex h-full w-full items-center justify-center rounded-lg p-2",
                            emptyDayType === "rest" ? getShiftColors("rest") : "bg-muted/50 dark:bg-muted/30",
                          )}
                        >
                          {/* Descanso: centrado */}
                          {emptyDayType === "rest" ? (
                            <>
                              {/* Desktop: texto completo */}
                              <span className="hidden text-[9px] font-bold tracking-wider uppercase opacity-70 md:inline">
                                Descanso
                              </span>
                              {/* Móvil: solo letra D centrada */}
                              <span className="text-xs font-bold uppercase opacity-70 md:hidden">D</span>
                            </>
                          ) : (
                            // Sin planificar: texto solo en desktop, NADA en móvil
                            <span className="hidden text-[8px] tracking-wide uppercase opacity-40 md:inline">
                              Sin planificar
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
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

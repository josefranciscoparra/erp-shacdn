"use client";

import { useEffect, useMemo, useState } from "react";

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
  startOfToday,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { formatShiftTime, getEmptyDayType } from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
import type { Shift, EmployeeShift } from "@/app/(main)/dashboard/shifts/_lib/types";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMyMonthlyShifts, getMyEmployeeProfile } from "@/server/actions/my-shifts";

import { MyShiftsMetricsCards } from "./_components/my-shifts-metrics";
import { ShiftChangeRequestDialog } from "./_components/shift-change-request-dialog";
import { calculateMyShiftsMetrics } from "./_lib/my-shifts-utils";

// Helper: Determinar tipo de turno según hora de inicio
function getShiftType(shift: Shift): "morning" | "afternoon" | "night" | "vacation" {
  // Si es vacaciones o ausencia, forzamos tipo vacation para el color
  if (shift.role?.toLowerCase().includes("vacaciones") || shift.role?.toLowerCase().includes("ausencia")) {
    return "vacation";
  }

  const hour = parseInt(shift.startTime.split(":")[0] ?? "0", 10);
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
  // Estado local
  const [currentMonth, setCurrentMonth] = useState(startOfToday());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar perfil de empleado
  useEffect(() => {
    getMyEmployeeProfile().then((emp) => {
      if (emp) setCurrentEmployee(emp as unknown as EmployeeShift);
    });
  }, []);

  // Cargar turnos al cambiar de mes
  useEffect(() => {
    setIsLoading(true);
    getMyMonthlyShifts(currentMonth)
      .then((result) => {
        if (result.success) {
          setShifts(result.shifts);
        }
      })
      .finally(() => setIsLoading(false));
  }, [currentMonth]);

  // Filtrar solo MIS turnos (ya vienen filtrados del server, pero mantenemos consistencia)
  const myShifts = shifts;

  // Calcular métricas personales
  const metrics = useMemo(() => {
    if (!currentEmployee) return null;
    return calculateMyShiftsMetrics(shifts, currentEmployee);
  }, [shifts, currentEmployee]);

  // Obtener días del mes actual seleccionado
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calcular días vacíos al inicio para alinear el calendario (lunes = 0)
  const firstDayOfMonth = getDay(monthStart);
  // getDay devuelve 0=domingo, 1=lunes, etc. Convertir a lunes=0
  const emptyDaysCount = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

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
    const grouped = new Map<string, Shift[]>();
    myShifts.forEach((shift) => {
      const dateKey = shift.date;
      const existing = grouped.get(dateKey) ?? [];
      grouped.set(dateKey, [...existing, shift]);
    });
    return grouped;
  }, [myShifts]);

  if (!currentEmployee && !isLoading) {
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
        title="Mi Horario"
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
              <Button variant="outline" size="icon" onClick={goToPreviousMonth} disabled={isLoading}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="flex items-center gap-2 px-3 text-xl font-bold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
                {isLoading && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
              </h2>
              <Button variant="outline" size="icon" onClick={goToNextMonth} disabled={isLoading}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Botón Hoy (derecha) */}
            <Button variant="outline" size="sm" onClick={goToToday} disabled={isLoading}>
              Hoy
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLoading && myShifts.length === 0 ? (
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

                {/* Días vacíos al inicio para alinear el calendario */}
                {Array.from({ length: emptyDaysCount }).map((_, index) => (
                  <div key={`empty-${index}`} className="min-h-[60px] md:min-h-[80px]" />
                ))}

                {/* Días del mes */}
                {daysInMonth.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayShifts = shiftsByDate.get(dateKey) ?? [];
                  const hasShifts = dayShifts.length > 0;
                  const today = isToday(day);

                  // Determinar el tipo de día vacío (descanso vs sin planificar)
                  const emptyDayType = getEmptyDayType(dateKey, shifts);

                  // Lógica de consolidación: Si hay trabajo, ocultamos las ausencias parciales pero marcamos el día
                  const workShifts = dayShifts.filter(
                    (s) => !s.role?.toLowerCase().includes("vacaciones") && !s.role?.toLowerCase().includes("ausencia"),
                  );
                  const absenceShifts = dayShifts.filter((s) => {
                    const role = s.role?.toLowerCase();
                    if (!role) return false;
                    return role.includes("vacaciones") || role.includes("ausencia");
                  });

                  const hasWork = workShifts.length > 0;
                  const hasAbsence = absenceShifts.length > 0;

                  // Si hay trabajo y ausencia, mostramos trabajo con indicador (split card).
                  // Si solo hay ausencia, mostramos ausencia.
                  // Si solo hay trabajo, mostramos trabajo.
                  // Fallback a dayShifts si algo raro pasa.
                  const visibleShifts = hasWork ? workShifts : hasAbsence ? absenceShifts : dayShifts;
                  const showAbsenceIndicator = hasWork && hasAbsence;

                  return (
                    <div key={dateKey} className="relative min-h-[60px] md:min-h-[80px]">
                      {/* Indicador de día actual */}
                      {today && (
                        <div className="absolute -top-1 left-1/2 z-10 flex size-2 -translate-x-1/2 items-center justify-center">
                          <div className="bg-primary size-2 rounded-full" />
                        </div>
                      )}

                      {/* Turnos del día */}
                      {hasShifts ? (
                        visibleShifts.map((shift) => {
                          const shiftType = getShiftType(shift);
                          const colors = getShiftColors(shiftType);

                          let label = getShiftLabel(shiftType);
                          if (shift.role?.toLowerCase().includes("ausencia")) label = "Ausencia";

                          const isFullDayVacation = shiftType === "vacation" && shift.startTime === "00:00";

                          return (
                            <button
                              key={shift.id}
                              onClick={() => handleShiftClick(shift)}
                              className={cn(
                                "relative h-full w-full overflow-hidden rounded-lg border border-transparent text-left transition-all hover:scale-[1.02] hover:opacity-90",
                                // Si hay indicador de ausencia (mixto), usamos un fondo base neutro o del trabajo,
                                // pero el contenido lo dividimos. Si no, usamos el color normal.
                                showAbsenceIndicator
                                  ? "dark:bg-card border-input bg-white p-0 shadow-sm"
                                  : cn("p-2", colors),
                              )}
                            >
                              {/* CASO MIXTO: TRABAJO + VACACIONES (Tarjeta Dividida) */}
                              {showAbsenceIndicator ? (
                                <div className="flex h-full flex-col">
                                  {/* Parte Superior: TRABAJO */}
                                  <div className={cn("flex flex-1 flex-col justify-between p-1.5", colors)}>
                                    <div className="flex items-start justify-between">
                                      <span className="hidden text-[10px] font-bold tracking-wider uppercase md:inline">
                                        {label}
                                      </span>
                                      <span className="hidden text-[10px] font-medium opacity-60 md:ml-auto md:inline">
                                        {format(day, "d")}
                                      </span>
                                      {/* Móvil: Letra turno */}
                                      <span className="mx-auto text-xs font-bold uppercase md:hidden">
                                        {label.charAt(0)}
                                      </span>
                                    </div>
                                    {/* Hora solo desktop */}
                                    <div className="hidden justify-end md:flex">
                                      <span className="text-[9px] font-medium opacity-80">
                                        {formatShiftTime(shift.startTime, shift.endTime)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Parte Inferior: VACACIONES / AUSENCIA */}
                                  <div className="flex h-[22px] items-center justify-center border-t border-orange-200/50 bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-100">
                                    <span className="truncate px-1 text-[9px] font-bold tracking-wider uppercase">
                                      {/* En móvil ponemos icono o texto corto, desktop texto completo */}
                                      <span className="md:hidden">VAC</span>
                                      <span className="hidden md:inline">VACACIONES</span>
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                /* CASO NORMAL (Solo Trabajo O Solo Vacaciones Día Completo) */
                                <>
                                  {isFullDayVacation ? (
                                    <div className="flex h-full items-center justify-center">
                                      <span className="hidden text-[10px] font-bold tracking-wider uppercase md:inline">
                                        {label}
                                      </span>
                                      <span className="text-xs font-bold uppercase md:hidden">V</span>
                                    </div>
                                  ) : (
                                    /* Turnos normales */
                                    <div className="relative z-10 flex h-full flex-col justify-between">
                                      <div className="flex items-start justify-between md:justify-start">
                                        <span className="hidden text-[10px] font-bold tracking-wider uppercase md:inline">
                                          {label}
                                        </span>
                                        <span className="hidden text-[10px] font-medium opacity-60 md:ml-auto md:inline">
                                          {format(day, "d")}
                                        </span>
                                        <span className="mx-auto text-xs font-bold uppercase md:hidden">
                                          {label.charAt(0)}
                                        </span>
                                      </div>

                                      <div className="hidden justify-end md:flex">
                                        <span className="text-[9px] font-medium opacity-80">
                                          {formatShiftTime(shift.startTime, shift.endTime)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </>
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
                          {emptyDayType === "rest" ? (
                            <>
                              <span className="hidden text-[9px] font-bold tracking-wider uppercase opacity-70 md:inline">
                                Descanso
                              </span>
                              <span className="text-xs font-bold uppercase opacity-70 md:hidden">D</span>
                            </>
                          ) : (
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
          dayShifts={selectedShift ? (shiftsByDate.get(selectedShift.date) ?? []) : []}
          employee={currentEmployee}
          employees={[]} // Deshabilitado temporalmente
        />
      )}
    </div>
  );
}

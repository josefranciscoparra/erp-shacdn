"use client";

import { useEffect, useState } from "react";

import type { Shift } from "@prisma/client";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getShiftAssignments } from "@/server/actions/shifts";
import { useShiftConfigurationStore } from "@/stores/shift-configuration-store";

import { EmployeeShiftCard } from "./employee-shift-card";

type ShiftWithRelations = Shift & {
  position: { id: string; title: string } | null;
  costCenter: { id: string; name: string };
  template: { id: string; name: string; color: string } | null;
  assignments: Array<{
    id: string;
    employeeId: string;
    status: string;
  }>;
};

interface EmployeeShiftCalendarProps {
  employeeId: string;
}

export function EmployeeShiftCalendar({ employeeId }: EmployeeShiftCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { config } = useShiftConfigurationStore();

  const weekStartDay = config?.weekStartDay ?? 1;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    // Cargar asignaciones del empleado actual para la semana
    const loadAssignments = async () => {
      setIsLoading(true);
      try {
        const data = await getShiftAssignments({
          employeeId,
          dateFrom: currentWeekStart,
          dateTo: addDays(currentWeekStart, 6),
        });
        setAssignments(data);
      } catch (error) {
        console.error("Error cargando turnos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssignments();
  }, [employeeId, currentWeekStart]);

  // Extraer los shifts de las asignaciones
  const shifts = assignments.map((a) => a.shift);

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: weekStartDay }));
  };

  const getShiftsForDay = (day: Date) => {
    return shifts.filter((shift) => isSameDay(new Date(shift.date), day));
  };

  const weekTotalHours =
    shifts.reduce((total, shift) => {
      return total + shift.durationMinutes;
    }, 0) / 60;

  const weekShifts = shifts.length;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Turnos</h1>
          <p className="text-muted-foreground">Consulta tus turnos asignados y horarios</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week summary */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 @xl/main:grid-cols-3">
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnos esta semana</CardTitle>
            <CalendarIcon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekShifts}</div>
            <p className="text-muted-foreground text-xs">
              {format(currentWeekStart, "d MMM", { locale: es })} -{" "}
              {format(addDays(currentWeekStart, 6), "d MMM", { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card className="to-card bg-gradient-to-t from-blue-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas totales</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekTotalHours.toFixed(1)}h</div>
            <p className="text-muted-foreground text-xs">Horas programadas</p>
          </CardContent>
        </Card>

        <Card className="to-card bg-gradient-to-t from-green-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <CalendarIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Confirmado</div>
            <p className="text-muted-foreground text-xs">Todos los turnos publicados</p>
          </CardContent>
        </Card>
      </div>

      {/* Info alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Información</AlertTitle>
        <AlertDescription>
          Los turnos mostrados son solo aquellos que han sido publicados por tu responsable. Si necesitas cambiar un
          turno, contacta con tu supervisor.
        </AlertDescription>
      </Alert>

      {/* Week header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(currentWeekStart, "d 'de' MMMM", { locale: es })} -{" "}
          {format(addDays(currentWeekStart, 6), "d 'de' MMMM yyyy", { locale: es })}
        </h2>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Cargando turnos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:gap-6 @2xl/main:grid-cols-2 @5xl/main:grid-cols-7">
          {weekDays.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const isToday = isSameDay(day, new Date());
            const dayId = format(day, "yyyy-MM-dd");

            return (
              <Card
                key={dayId}
                className={`flex min-h-[200px] flex-col p-3 ${isToday ? "border-primary bg-primary/5" : ""}`}
              >
                {/* Day header */}
                <div className="mb-3 flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="text-muted-foreground text-xs font-medium uppercase">
                      {format(day, "EEE", { locale: es })}
                    </div>
                    <div className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
                  </div>
                  {dayShifts.length > 0 && <Badge variant="secondary">{dayShifts.length}</Badge>}
                </div>

                {/* Shifts for this day */}
                <div className="flex flex-1 flex-col gap-2">
                  {dayShifts.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center">
                      <p className="text-muted-foreground text-sm">Día libre</p>
                    </div>
                  ) : (
                    dayShifts.map((shift) => <EmployeeShiftCard key={shift.id} shift={shift} />)
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

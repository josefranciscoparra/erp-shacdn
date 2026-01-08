"use client";

import { useState } from "react";

import Link from "next/link";

import type { ScheduleTemplate, SchedulePeriod, WorkDayPattern, TimeSlot } from "@prisma/client";
import { Calendar, Plus, AlertTriangle, CheckCircle2, Circle, Construction, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CopyDayDialog } from "./copy-day-dialog";
import { CreatePeriodDialog } from "./create-period-dialog";
import { DeletePeriodDialog } from "./delete-period-dialog";
import { EditDayScheduleDialog } from "./edit-day-schedule-dialog";
import { EditPeriodDialog } from "./edit-period-dialog";

type PeriodWithPatterns = SchedulePeriod & {
  workDayPatterns: (WorkDayPattern & {
    timeSlots: TimeSlot[];
  })[];
};

interface WeekScheduleEditorProps {
  template: ScheduleTemplate;
  periods: PeriodWithPatterns[];
}

const periodTypeLabels = {
  REGULAR: {
    label: "Regular",
    variant: "default" as const,
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300",
  },
  INTENSIVE: {
    label: "Intensivo",
    variant: "secondary" as const,
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300",
  },
  SPECIAL: {
    label: "Especial",
    variant: "outline" as const,
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300",
  },
};

const weekDays = [
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 0, label: "Domingo", short: "Dom" },
];

export function WeekScheduleEditor({ template, periods }: WeekScheduleEditorProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0]?.id ?? "");

  const activePeriod = periods.find((p) => p.id === selectedPeriod);

  if (periods.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Selector de período */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 @lg/main:flex-row @lg/main:items-center @lg/main:justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">Período Activo</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">Selecciona el período que deseas configurar</p>
            </div>

            <div className="flex gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Selecciona un período" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => {
                    const typeInfo = periodTypeLabels[period.periodType];
                    return (
                      <SelectItem key={period.id} value={period.id}>
                        <div className="flex items-center gap-2">
                          <span>{period.name}</span>
                          <Badge variant={typeInfo.variant} className={`text-xs ${typeInfo.className}`}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {activePeriod && (
                <>
                  <EditPeriodDialog period={activePeriod} templateType={template.templateType} />
                  <DeletePeriodDialog period={activePeriod} />
                </>
              )}

              <CreatePeriodDialog
                templateId={template.id}
                templateType={template.templateType}
                templateWeeklyHours={template.weeklyHours ? Number(template.weeklyHours) : null}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor de horarios según tipo de plantilla */}
      {activePeriod && (
        <>
          {template.templateType === "FIXED" && <FixedScheduleEditor period={activePeriod} />}
          {template.templateType === "SHIFT" && <ShiftScheduleEditor />}
          {template.templateType === "ROTATION" && <RotationScheduleEditor />}
          {template.templateType === "FLEXIBLE" && (
            <FlexibleScheduleEditor period={activePeriod} templateWeeklyHours={template.weeklyHours ?? null} />
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// FIXED SCHEDULE EDITOR
// ============================================================================

function FixedScheduleEditor({ period }: { period: SchedulePeriod }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Horario Semanal Fijo</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">Configura el horario para cada día de la semana</p>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Copiar Horario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {weekDays.map((day) => (
            <DayScheduleRow key={day.value} day={day} period={period} />
          ))}

          {/* Resumen semanal */}
          <WeeklySummary period={period} />
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklySummary({ period }: { period: PeriodWithPatterns }) {
  const totalWeekMinutes = period.workDayPatterns.reduce((acc, pattern) => {
    if (!pattern.isWorkingDay) return acc;
    const dayMinutes = pattern.timeSlots.reduce((sum, slot) => {
      if (slot.slotType === "BREAK" || slot.countsAsWork === false) {
        return sum;
      }
      return sum + (slot.endTimeMinutes - slot.startTimeMinutes);
    }, 0);
    return acc + dayMinutes;
  }, 0);

  const totalWeekHours = (totalWeekMinutes / 60).toFixed(1);
  const workingDays = period.workDayPatterns.filter((p) => p.isWorkingDay).length;
  const avgDayHours = workingDays > 0 ? (totalWeekMinutes / 60 / workingDays).toFixed(1) : "0.0";

  return (
    <div className="mt-3 border-t pt-3">
      <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
        <div>
          <p className="text-sm font-medium">Resumen Semanal</p>
          <p className="text-muted-foreground text-xs">
            {workingDays} día{workingDays !== 1 ? "s" : ""} laborable{workingDays !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Promedio/día</p>
            <p className="text-sm font-semibold">{avgDayHours}h</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Total semana</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold">{totalWeekHours}h</p>
              {totalWeekMinutes > 0 && (
                <Badge
                  variant={totalWeekMinutes > 2400 ? "default" : totalWeekMinutes >= 2340 ? "secondary" : "outline"}
                  className={totalWeekMinutes > 2400 ? "border-amber-500 text-amber-700" : ""}
                >
                  {totalWeekMinutes > 2400 ? "Más de 40h" : totalWeekMinutes >= 2340 ? "~40h" : "Menos de 40h"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayScheduleRow({
  day,
  period,
}: {
  day: { value: number; label: string; short: string };
  period: PeriodWithPatterns;
}) {
  const pattern = period.workDayPatterns.find((p) => p.dayOfWeek === day.value);
  const isWorkingDay = pattern?.isWorkingDay ?? false;

  const totalMinutes =
    pattern?.timeSlots.reduce((acc, slot) => {
      if (slot.slotType === "BREAK" || slot.countsAsWork === false) {
        return acc;
      }
      return acc + (slot.endTimeMinutes - slot.startTimeMinutes);
    }, 0) ?? 0;

  const totalHours = (totalMinutes / 60).toFixed(1);

  function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  }

  const hasTimeSlots = pattern?.timeSlots && pattern.timeSlots.length > 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex w-24 items-center gap-2">
        {hasTimeSlots && isWorkingDay ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
        )}
        <span className="font-medium">{day.label}</span>
      </div>

      {isWorkingDay && pattern ? (
        <>
          <div className="flex-1 space-y-4">
            {/* Timeline visual */}
            <div className="pt-2 pb-1">
              <TimelineBar timeSlots={pattern.timeSlots} />
            </div>

            {/* Badges con horarios */}
            <div className="flex flex-wrap items-center gap-2">
              {pattern.timeSlots.map((slot) => {
                const isBreak = slot.slotType === "BREAK" || slot.countsAsWork === false;
                return (
                  <Badge
                    key={slot.id}
                    variant={isBreak ? "outline" : "secondary"}
                    className={`text-xs ${isBreak ? "border-amber-400 text-amber-700 dark:border-amber-300 dark:text-amber-300" : ""}`}
                  >
                    {minutesToTime(slot.startTimeMinutes)} - {minutesToTime(slot.endTimeMinutes)}
                    {isBreak ? " (Pausa)" : ""}
                  </Badge>
                );
              })}
              {totalMinutes > 0 && (
                <>
                  <span className="text-muted-foreground text-sm">({totalHours}h totales)</span>
                  {totalMinutes > 540 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-700">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Más de 9h
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <CopyDayDialog periodId={period.id} sourceDayOfWeek={day.value} sourceDayLabel={day.label} />
            <EditDayScheduleDialog
              periodId={period.id}
              dayOfWeek={day.value}
              dayLabel={day.label}
              existingPattern={{
                id: pattern.id,
                isWorkingDay: pattern.isWorkingDay,
                timeSlots: pattern.timeSlots.map((slot) => ({
                  id: slot.id,
                  startMinutes: slot.startTimeMinutes,
                  endMinutes: slot.endTimeMinutes,
                  slotType: slot.slotType as "WORK" | "BREAK" | undefined,
                  isAutomatic: slot.isAutomatic ?? false,
                })),
              }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex-1">
            <Badge variant="outline" className="text-muted-foreground">
              Día no laborable
            </Badge>
          </div>

          <EditDayScheduleDialog periodId={period.id} dayOfWeek={day.value} dayLabel={day.label} />
        </>
      )}
    </div>
  );
}

// ============================================================================
// TIMELINE BAR - Visualización de franjas horarias
// ============================================================================

interface TimelineBarProps {
  timeSlots: Array<{
    id: string;
    startTimeMinutes: number;
    endTimeMinutes: number;
    slotType?: string;
  }>;
}

function TimelineBar({ timeSlots }: TimelineBarProps) {
  // Timeline de 6:00 a 22:00 (jornada laboral típica)
  const START_HOUR = 6;
  const END_HOUR = 22;
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 960 minutos

  // Calcular posición y ancho de cada slot
  const slots = timeSlots.map((slot) => {
    const startOffset = Math.max(0, slot.startTimeMinutes - START_HOUR * 60);
    const endOffset = Math.min(TOTAL_MINUTES, slot.endTimeMinutes - START_HOUR * 60);
    const left = (startOffset / TOTAL_MINUTES) * 100;
    const width = ((endOffset - startOffset) / TOTAL_MINUTES) * 100;

    return {
      id: slot.id,
      left: `${left}%`,
      width: `${Math.max(width, 1)}%`, // Mínimo 1% para que sea visible
      slotType: slot.slotType ?? "WORK",
    };
  });

  // Marcadores de hora (6, 9, 12, 15, 18, 21)
  const hourMarkers = [6, 9, 12, 15, 18, 21];

  return (
    <div className="relative mb-5">
      {/* Barra base (fondo gris) */}
      <div className="bg-muted relative h-3 w-full overflow-hidden rounded-full">
        {/* Franjas horarias coloreadas */}
        {slots.map((slot) => {
          const isBreak = slot.slotType === "BREAK";
          return (
            <div
              key={slot.id}
              className={`absolute top-0 h-full rounded-full ${
                isBreak
                  ? "bg-amber-300 dark:bg-amber-500"
                  : slot.slotType === "ON_CALL"
                    ? "bg-purple-400 dark:bg-purple-500"
                    : "bg-primary"
              } ${isBreak ? "opacity-90" : ""}`}
              style={{ left: slot.left, width: slot.width }}
              title={slot.slotType}
            />
          );
        })}
      </div>

      {/* Marcadores de hora */}
      <div className="relative mt-1 h-4 w-full px-0.5">
        {hourMarkers.map((hour) => {
          const position = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
          return (
            <span
              key={hour}
              className="text-muted-foreground absolute text-[10px]"
              style={{ left: `${position}%`, transform: "translateX(-50%)" }}
            >
              {hour}h
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SHIFT SCHEDULE EDITOR
// ============================================================================

function ShiftScheduleEditor() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-base">Plantilla de Turnos</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Esta plantilla define un turno que puede asignarse desde el Cuadrante
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/shifts">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir al Cuadrante
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <Calendar className="text-primary mx-auto mb-3 h-10 w-10 opacity-60" />
          <p className="text-muted-foreground text-sm">
            Las plantillas de tipo <strong>SHIFT</strong> se gestionan desde el{" "}
            <Link href="/dashboard/shifts" className="text-primary underline-offset-4 hover:underline">
              Cuadrante de Turnos
            </Link>
            .
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            Desde allí puedes crear turnos (mañana, tarde, noche) y asignarlos a empleados por día.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ROTATION SCHEDULE EDITOR
// ============================================================================

function RotationScheduleEditor() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-base">Patrón de Rotación</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Define el patrón de rotación (ej: 6 días trabajo, 6 días descanso)
              </p>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <Construction className="mr-1 h-3 w-3" />
              En Desarrollo
            </Badge>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/shifts">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir al Cuadrante
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <Construction className="mx-auto mb-3 h-10 w-10 text-amber-500 opacity-60" />
          <p className="text-muted-foreground text-sm">El editor visual de rotaciones está en desarrollo.</p>
          <p className="text-muted-foreground mt-2 text-xs">
            Por ahora, puedes gestionar turnos rotativos desde el{" "}
            <Link href="/dashboard/shifts" className="text-primary underline-offset-4 hover:underline">
              Cuadrante de Turnos
            </Link>
            .
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Próximamente: patrones automáticos como 6x6 (policía) o 24x72 (bomberos).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FLEXIBLE SCHEDULE EDITOR
// ============================================================================

function FlexibleScheduleEditor({
  period,
  templateWeeklyHours,
}: {
  period: PeriodWithPatterns;
  templateWeeklyHours: number | null;
}) {
  const periodWeeklyHours = period.weeklyHours ? Number(period.weeklyHours) : null;
  const fallbackWeeklyHours = templateWeeklyHours ?? null;
  const resolvedWeeklyHours = periodWeeklyHours ?? fallbackWeeklyHours ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Flexible total (objetivo semanal)</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Este período no define franjas. Solo establece el objetivo semanal de horas.
            </p>
          </div>
          <Badge variant="outline">Sin franjas</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Objetivo semanal del período</p>
            <p className="text-lg font-semibold">{resolvedWeeklyHours.toFixed(1)}h</p>
          </div>
          <p className="text-muted-foreground text-xs">
            {periodWeeklyHours === null
              ? "Usa el objetivo semanal definido en la plantilla."
              : "Este período sobrescribe el objetivo semanal de la plantilla."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

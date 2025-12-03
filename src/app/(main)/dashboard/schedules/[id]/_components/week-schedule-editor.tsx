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
                  <EditPeriodDialog period={activePeriod} />
                  <DeletePeriodDialog period={activePeriod} />
                </>
              )}

              <CreatePeriodDialog templateId={template.id} />
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
          {template.templateType === "FLEXIBLE" && <FlexibleScheduleEditor />}
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
    const dayMinutes = pattern.timeSlots.reduce((sum, slot) => sum + (slot.endTimeMinutes - slot.startTimeMinutes), 0);
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
    pattern?.timeSlots.reduce((acc, slot) => acc + (slot.endTimeMinutes - slot.startTimeMinutes), 0) ?? 0;

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
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {pattern.timeSlots.map((slot) => (
                <Badge key={slot.id} variant="secondary" className="text-xs">
                  {minutesToTime(slot.startTimeMinutes)} - {minutesToTime(slot.endTimeMinutes)}
                </Badge>
              ))}
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

function FlexibleScheduleEditor() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-base">Horario Flexible</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Define franjas obligatorias y franjas flexibles para cada día
              </p>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <Construction className="mr-1 h-3 w-3" />
              En Desarrollo
            </Badge>
          </div>
          <Button variant="outline" size="sm" disabled title="Esta funcionalidad estará disponible próximamente">
            <Plus className="mr-2 h-4 w-4" />
            Configurar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <Construction className="mx-auto mb-3 h-10 w-10 text-amber-500 opacity-60" />
          <p className="text-muted-foreground text-sm">
            El editor de horarios flexibles está en desarrollo.
            <br />
            <span className="text-xs">
              Pronto podrás definir franjas obligatorias (núcleo fijo) y franjas flexibles de entrada/salida.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";

import type { ScheduleTemplate, SchedulePeriod, WorkDayPattern, TimeSlot } from "@prisma/client";
import { Calendar, Plus, AlertTriangle, CheckCircle2, Circle } from "lucide-react";

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
          {template.templateType === "SHIFT" && <ShiftScheduleEditor period={activePeriod} />}
          {template.templateType === "ROTATION" && <RotationScheduleEditor period={activePeriod} />}
          {template.templateType === "FLEXIBLE" && <FlexibleScheduleEditor period={activePeriod} />}
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

function ShiftScheduleEditor({ period }: { period: SchedulePeriod }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Configuración de Turnos</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Define los turnos disponibles (mañana, tarde, noche) y asígnalos por día
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Turno
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="shifts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="shifts">Turnos</TabsTrigger>
            <TabsTrigger value="weekly">Asignación Semanal</TabsTrigger>
          </TabsList>

          <TabsContent value="shifts" className="space-y-3">
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Turno Mañana</h4>
                  <p className="text-muted-foreground text-sm">06:00 - 14:00</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm">
                    Eliminar
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge>8h totales</Badge>
                <Badge variant="secondary">1h descanso</Badge>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Turno Tarde</h4>
                  <p className="text-muted-foreground text-sm">14:00 - 22:00</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm">
                    Eliminar
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge>8h totales</Badge>
                <Badge variant="secondary">1h descanso</Badge>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Turno Noche</h4>
                  <p className="text-muted-foreground text-sm">22:00 - 06:00</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm">
                    Eliminar
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge>8h totales</Badge>
                <Badge variant="secondary">1h descanso</Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-3">
            <p className="text-muted-foreground text-sm">Asignación de turnos por día de la semana (próximamente)</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ROTATION SCHEDULE EDITOR
// ============================================================================

function RotationScheduleEditor({ period }: { period: SchedulePeriod }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Configuración de Rotaciones</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Define el patrón de rotación (ej: 6 días trabajo, 6 días descanso)
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Patrón
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-medium">Rotación Policía (6x6)</h4>
                <p className="text-muted-foreground text-sm">6 días de trabajo, 6 días de descanso</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Editar
                </Button>
                <Button variant="ghost" size="sm">
                  Eliminar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge>Paso 1:</Badge>
                <span className="text-sm">6 días - 08:00 a 16:00 (8h)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Paso 2:</Badge>
                <span className="text-sm">6 días - Descanso</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-medium">Rotación Bomberos (24x72)</h4>
                <p className="text-muted-foreground text-sm">24 horas de trabajo, 72 horas de descanso</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Editar
                </Button>
                <Button variant="ghost" size="sm">
                  Eliminar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge>Paso 1:</Badge>
                <span className="text-sm">1 día - 00:00 a 24:00 (24h)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Paso 2:</Badge>
                <span className="text-sm">3 días - Descanso</span>
              </div>
            </div>
          </div>

          <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
            <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>Haz clic en &quot;Nuevo Patrón&quot; para crear una rotación</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FLEXIBLE SCHEDULE EDITOR
// ============================================================================

function FlexibleScheduleEditor({ period }: { period: SchedulePeriod }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Horario Flexible</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Define franjas obligatorias y franjas flexibles para cada día
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Copiar Horario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {weekDays.slice(0, 5).map((day) => (
            <div key={day.value} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="w-24">
                <span className="font-medium">{day.label}</span>
              </div>

              <div className="flex-1">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">
                      Obligatorio
                    </Badge>
                    <span className="text-sm">09:00 - 15:00 (6h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Flexible
                    </Badge>
                    <span className="text-muted-foreground text-sm">07:00 - 09:00 y 15:00 - 19:00</span>
                  </div>
                </div>
              </div>

              <Button variant="outline" size="sm">
                Editar
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 mt-4 rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            <strong>Ejemplo:</strong> Franja obligatoria de 09:00 a 15:00 (núcleo fijo). Franjas flexibles de 07:00 a
            09:00 (entrada) y de 15:00 a 19:00 (salida). El empleado puede entrar entre 07:00 y 09:00, y salir entre
            15:00 y 19:00, completando las horas totales.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

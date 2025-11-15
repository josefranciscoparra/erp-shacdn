"use client";

import { useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Info, Clock, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ScheduleForm, type ScheduleFormData } from "@/components/schedules/schedule-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ScheduleType } from "@/stores/contracts-store";

interface WizardStep3ScheduleProps {
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
  initialData?: ScheduleFormData | null;
}

export function WizardStep3Schedule({ onSubmit, isLoading = false, initialData }: WizardStep3ScheduleProps) {
  const [skipSchedule, setSkipSchedule] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("FLEXIBLE");

  // Estados para FIXED - días laborables
  const [workDays, setWorkDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });

  // Estados para FIXED - franjas horarias (SIEMPRE activas cuando scheduleType=FIXED)
  const [timeSlots, setTimeSlots] = useState({
    mondayStart: "09:00",
    mondayEnd: "17:00",
    tuesdayStart: "09:00",
    tuesdayEnd: "17:00",
    wednesdayStart: "09:00",
    wednesdayEnd: "17:00",
    thursdayStart: "09:00",
    thursdayEnd: "17:00",
    fridayStart: "09:00",
    fridayEnd: "17:00",
    saturdayStart: "09:00",
    saturdayEnd: "14:00",
    sundayStart: "09:00",
    sundayEnd: "14:00",
  });

  // Estados para FIXED - pausas/breaks
  const [hasBreaks, setHasBreaks] = useState(false);
  const [breakTimes, setBreakTimes] = useState({
    mondayBreakStart: "14:00",
    mondayBreakEnd: "15:00",
    tuesdayBreakStart: "14:00",
    tuesdayBreakEnd: "15:00",
    wednesdayBreakStart: "14:00",
    wednesdayBreakEnd: "15:00",
    thursdayBreakStart: "14:00",
    thursdayBreakEnd: "15:00",
    fridayBreakStart: "14:00",
    fridayBreakEnd: "15:00",
    saturdayBreakStart: "12:00",
    saturdayBreakEnd: "12:30",
    sundayBreakStart: "12:00",
    sundayBreakEnd: "12:30",
  });

  // Estados para FIXED - jornada intensiva
  const [hasIntensiveSchedule, setHasIntensiveSchedule] = useState(false);
  const [intensiveStartDate, setIntensiveStartDate] = useState<Date>();
  const [intensiveEndDate, setIntensiveEndDate] = useState<Date>();
  const [intensiveDateError, setIntensiveDateError] = useState(false);
  const [intensiveTimeSlots, setIntensiveTimeSlots] = useState({
    mondayStart: "08:00",
    mondayEnd: "15:00",
    tuesdayStart: "08:00",
    tuesdayEnd: "15:00",
    wednesdayStart: "08:00",
    wednesdayEnd: "15:00",
    thursdayStart: "08:00",
    thursdayEnd: "15:00",
    fridayStart: "08:00",
    fridayEnd: "15:00",
    saturdayStart: "08:00",
    saturdayEnd: "14:00",
    sundayStart: "08:00",
    sundayEnd: "14:00",
  });

  // Estados para FIXED - pausas durante jornada intensiva
  const [hasIntensiveBreaks, setHasIntensiveBreaks] = useState(false);
  const [intensiveBreakTimes, setIntensiveBreakTimes] = useState({
    mondayBreakStart: "11:00",
    mondayBreakEnd: "11:30",
    tuesdayBreakStart: "11:00",
    tuesdayBreakEnd: "11:30",
    wednesdayBreakStart: "11:00",
    wednesdayBreakEnd: "11:30",
    thursdayBreakStart: "11:00",
    thursdayBreakEnd: "11:30",
    fridayBreakStart: "11:00",
    fridayBreakEnd: "11:30",
    saturdayBreakStart: "11:00",
    saturdayBreakEnd: "11:30",
    sundayBreakStart: "11:00",
    sundayBreakEnd: "11:30",
  });

  // Estados para modo simple - Horario fijo semanal
  const [useSimpleSchedule, setUseSimpleSchedule] = useState(true);
  const [simpleEntry, setSimpleEntry] = useState("09:00");
  const [simpleExit, setSimpleExit] = useState("17:00");
  const [applyToAllDays, setApplyToAllDays] = useState(true);

  // Estados para modo simple - Pausas normales
  const [useSimpleBreak, setUseSimpleBreak] = useState(true);
  const [simpleBreakStart, setSimpleBreakStart] = useState("14:00");
  const [simpleBreakEnd, setSimpleBreakEnd] = useState("15:00");
  const [applyBreakToAllDays, setApplyBreakToAllDays] = useState(true);

  // Estados para modo simple - Horario intensivo
  const [useSimpleIntensiveSchedule, setUseSimpleIntensiveSchedule] = useState(true);
  const [simpleIntensiveEntry, setSimpleIntensiveEntry] = useState("08:00");
  const [simpleIntensiveExit, setSimpleIntensiveExit] = useState("15:00");
  const [applyIntensiveToAllDays, setApplyIntensiveToAllDays] = useState(true);

  // Estados para modo simple - Pausas intensivas
  const [useSimpleIntensiveBreak, setUseSimpleIntensiveBreak] = useState(true);
  const [simpleIntensiveBreakStart, setSimpleIntensiveBreakStart] = useState("11:00");
  const [simpleIntensiveBreakEnd, setSimpleIntensiveBreakEnd] = useState("11:30");
  const [applyIntensiveBreakToAllDays, setApplyIntensiveBreakToAllDays] = useState(true);

  const handleScheduleSubmit = async (data: ScheduleFormData) => {
    if (skipSchedule) {
      // Si está marcado, enviar horarios por defecto (FLEXIBLE, 40h, 5d)
      const defaultSchedule = {
        scheduleType: "FLEXIBLE" as const,
        weeklyHours: 40,
        workingDaysPerWeek: 5,
        hasIntensiveSchedule: false,
        hasCustomWeeklyPattern: false,
      };
      await onSubmit(defaultSchedule);
    } else {
      // Si no está marcado, usar los datos del formulario con scheduleType
      await onSubmit({ ...data, scheduleType: "FLEXIBLE" });
    }
  };

  const handleWizardFinish = () => {
    if (skipSchedule) {
      // Enviar horarios por defecto
      const defaultSchedule = {
        scheduleType: "FLEXIBLE" as const,
        weeklyHours: 40,
        workingDaysPerWeek: 5,
        hasIntensiveSchedule: false,
        hasCustomWeeklyPattern: false,
      };
      return onSubmit(defaultSchedule);
    }
  };

  const handleFixedSubmit = async () => {
    // Validación 1: Al menos 1 día debe estar seleccionado
    const activeDaysCount = Object.values(workDays).filter(Boolean).length;
    if (activeDaysCount === 0) {
      toast.error("Días laborables requeridos", {
        description: "Debes seleccionar al menos un día laboral",
      });
      return;
    }

    // Validación 2: Horarios configurados para todos los días activos
    const dayNames: Record<string, string> = {
      monday: "Lunes",
      tuesday: "Martes",
      wednesday: "Miércoles",
      thursday: "Jueves",
      friday: "Viernes",
      saturday: "Sábado",
      sunday: "Domingo",
    };

    const daysToCheck = Object.keys(workDays).filter((day) => workDays[day as keyof typeof workDays]);
    for (const day of daysToCheck) {
      const startTime =
        useSimpleSchedule && applyToAllDays ? simpleEntry : timeSlots[`${day}Start` as keyof typeof timeSlots];
      const endTime =
        useSimpleSchedule && applyToAllDays ? simpleExit : timeSlots[`${day}End` as keyof typeof timeSlots];

      if (!startTime || !endTime) {
        toast.error("Horario incompleto", {
          description: `Falta configurar el horario para ${dayNames[day]}`,
        });
        return;
      }

      // Validación 3: Hora de salida debe ser mayor que hora de entrada
      if (startTime >= endTime) {
        toast.error("Horario inválido", {
          description: `El horario de ${dayNames[day]} no es válido. La hora de salida debe ser posterior a la hora de entrada.`,
        });
        return;
      }
    }

    // Validación 4: Si jornada intensiva está activada, las fechas son obligatorias
    if (hasIntensiveSchedule && (!intensiveStartDate || !intensiveEndDate)) {
      setIntensiveDateError(true);
      toast.error("Fechas obligatorias", {
        description: "Por favor, selecciona las fechas de inicio y fin para la jornada intensiva",
      });
      return;
    }

    // Limpiar errores si todo está OK
    setIntensiveDateError(false);

    // Función helper: obtener horario (simple o personalizado)
    const getTimeSlot = (day: keyof typeof workDays, type: "Start" | "End") => {
      if (!workDays[day]) return null;
      if (useSimpleSchedule && applyToAllDays) {
        return type === "Start" ? simpleEntry : simpleExit;
      }
      return timeSlots[`${day}${type}`];
    };

    // Función helper: obtener pausa (simple o personalizada)
    const getBreakTime = (day: keyof typeof workDays, type: "Start" | "End") => {
      if (!workDays[day] || !hasBreaks) return null;
      if (useSimpleBreak && applyBreakToAllDays) {
        return type === "Start" ? simpleBreakStart : simpleBreakEnd;
      }
      return breakTimes[`${day}Break${type}`];
    };

    // Función helper: obtener horario intensivo (simple o personalizado)
    const getIntensiveTimeSlot = (day: keyof typeof workDays, type: "Start" | "End") => {
      if (!workDays[day] || !hasIntensiveSchedule) return null;
      if (useSimpleIntensiveSchedule && applyIntensiveToAllDays) {
        return type === "Start" ? simpleIntensiveEntry : simpleIntensiveExit;
      }
      return intensiveTimeSlots[`${day}${type}`];
    };

    // Función helper: obtener pausa intensiva (simple o personalizada)
    const getIntensiveBreakTime = (day: keyof typeof workDays, type: "Start" | "End") => {
      if (!workDays[day] || !hasIntensiveSchedule || !hasIntensiveBreaks) return null;
      if (useSimpleIntensiveBreak && applyIntensiveBreakToAllDays) {
        return type === "Start" ? simpleIntensiveBreakStart : simpleIntensiveBreakEnd;
      }
      return intensiveBreakTimes[`${day}Break${type}`];
    };

    const fixedData = {
      scheduleType: "FIXED" as ScheduleType,
      weeklyHours: 40, // Por defecto, se puede calcular después
      workingDaysPerWeek: activeDaysCount,
      workMonday: workDays.monday,
      workTuesday: workDays.tuesday,
      workWednesday: workDays.wednesday,
      workThursday: workDays.thursday,
      workFriday: workDays.friday,
      workSaturday: workDays.saturday,
      workSunday: workDays.sunday,
      hasFixedTimeSlots: true, // Siempre true para horario FIXED
      // Franjas horarias (SIEMPRE incluidas)
      mondayStartTime: getTimeSlot("monday", "Start"),
      mondayEndTime: getTimeSlot("monday", "End"),
      tuesdayStartTime: getTimeSlot("tuesday", "Start"),
      tuesdayEndTime: getTimeSlot("tuesday", "End"),
      wednesdayStartTime: getTimeSlot("wednesday", "Start"),
      wednesdayEndTime: getTimeSlot("wednesday", "End"),
      thursdayStartTime: getTimeSlot("thursday", "Start"),
      thursdayEndTime: getTimeSlot("thursday", "End"),
      fridayStartTime: getTimeSlot("friday", "Start"),
      fridayEndTime: getTimeSlot("friday", "End"),
      saturdayStartTime: getTimeSlot("saturday", "Start"),
      saturdayEndTime: getTimeSlot("saturday", "End"),
      sundayStartTime: getTimeSlot("sunday", "Start"),
      sundayEndTime: getTimeSlot("sunday", "End"),
      // Pausas/breaks normales
      ...(hasBreaks && {
        mondayBreakStartTime: getBreakTime("monday", "Start"),
        mondayBreakEndTime: getBreakTime("monday", "End"),
        tuesdayBreakStartTime: getBreakTime("tuesday", "Start"),
        tuesdayBreakEndTime: getBreakTime("tuesday", "End"),
        wednesdayBreakStartTime: getBreakTime("wednesday", "Start"),
        wednesdayBreakEndTime: getBreakTime("wednesday", "End"),
        thursdayBreakStartTime: getBreakTime("thursday", "Start"),
        thursdayBreakEndTime: getBreakTime("thursday", "End"),
        fridayBreakStartTime: getBreakTime("friday", "Start"),
        fridayBreakEndTime: getBreakTime("friday", "End"),
        saturdayBreakStartTime: getBreakTime("saturday", "Start"),
        saturdayBreakEndTime: getBreakTime("saturday", "End"),
        sundayBreakStartTime: getBreakTime("sunday", "Start"),
        sundayBreakEndTime: getBreakTime("sunday", "End"),
      }),
      // Jornada intensiva
      hasIntensiveSchedule,
      ...(hasIntensiveSchedule && {
        intensiveStartDate: intensiveStartDate ? format(intensiveStartDate, "MM-dd") : undefined,
        intensiveEndDate: intensiveEndDate ? format(intensiveEndDate, "MM-dd") : undefined,
        // Franjas horarias intensivas
        intensiveMondayStartTime: getIntensiveTimeSlot("monday", "Start"),
        intensiveMondayEndTime: getIntensiveTimeSlot("monday", "End"),
        intensiveTuesdayStartTime: getIntensiveTimeSlot("tuesday", "Start"),
        intensiveTuesdayEndTime: getIntensiveTimeSlot("tuesday", "End"),
        intensiveWednesdayStartTime: getIntensiveTimeSlot("wednesday", "Start"),
        intensiveWednesdayEndTime: getIntensiveTimeSlot("wednesday", "End"),
        intensiveThursdayStartTime: getIntensiveTimeSlot("thursday", "Start"),
        intensiveThursdayEndTime: getIntensiveTimeSlot("thursday", "End"),
        intensiveFridayStartTime: getIntensiveTimeSlot("friday", "Start"),
        intensiveFridayEndTime: getIntensiveTimeSlot("friday", "End"),
        intensiveSaturdayStartTime: getIntensiveTimeSlot("saturday", "Start"),
        intensiveSaturdayEndTime: getIntensiveTimeSlot("saturday", "End"),
        intensiveSundayStartTime: getIntensiveTimeSlot("sunday", "Start"),
        intensiveSundayEndTime: getIntensiveTimeSlot("sunday", "End"),
      }),
      // Pausas durante jornada intensiva
      ...(hasIntensiveSchedule &&
        hasIntensiveBreaks && {
          intensiveMondayBreakStartTime: getIntensiveBreakTime("monday", "Start"),
          intensiveMondayBreakEndTime: getIntensiveBreakTime("monday", "End"),
          intensiveTuesdayBreakStartTime: getIntensiveBreakTime("tuesday", "Start"),
          intensiveTuesdayBreakEndTime: getIntensiveBreakTime("tuesday", "End"),
          intensiveWednesdayBreakStartTime: getIntensiveBreakTime("wednesday", "Start"),
          intensiveWednesdayBreakEndTime: getIntensiveBreakTime("wednesday", "End"),
          intensiveThursdayBreakStartTime: getIntensiveBreakTime("thursday", "Start"),
          intensiveThursdayBreakEndTime: getIntensiveBreakTime("thursday", "End"),
          intensiveFridayBreakStartTime: getIntensiveBreakTime("friday", "Start"),
          intensiveFridayBreakEndTime: getIntensiveBreakTime("friday", "End"),
          intensiveSaturdayBreakStartTime: getIntensiveBreakTime("saturday", "Start"),
          intensiveSaturdayBreakEndTime: getIntensiveBreakTime("saturday", "End"),
          intensiveSundayBreakStartTime: getIntensiveBreakTime("sunday", "Start"),
          intensiveSundayBreakEndTime: getIntensiveBreakTime("sunday", "End"),
        }),
    };

    await onSubmit(fixedData);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-6">
      {/* Switch compacto: Configurar ahora o más tarde */}
      <div className="from-primary/15 to-card border-muted hover:border-primary/40 flex items-center justify-between rounded-xl border-2 bg-gradient-to-br p-5 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex-1 space-y-1">
          <Label htmlFor="skip-schedule" className="text-lg font-semibold">
            Configurar horarios más tarde
          </Label>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Usaremos horario flexible por defecto (40h semanales, 5 días). Podrás personalizarlo después.
          </p>
        </div>
        <Switch id="skip-schedule" checked={skipSchedule} onCheckedChange={setSkipSchedule} className="wizard-switch" />
      </div>

      {skipSchedule && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Se mantendrán los horarios por defecto (40h semanales distribuidas en 5 días).
          </AlertDescription>
        </Alert>
      )}

      {/* Selector de tipo de horario (3 tabs) */}
      {!skipSchedule && (
        <>
          <Card>
            <CardContent className="space-y-4 p-6">
              <Label className="text-lg font-semibold">Tipo de Horario</Label>

              <Tabs value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="FLEXIBLE">
                    <Clock className="mr-2 h-4 w-4" />
                    Flexible
                  </TabsTrigger>
                  <TabsTrigger value="FIXED">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Fijo
                  </TabsTrigger>
                  <TabsTrigger value="SHIFTS" disabled>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Turnos
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Descripciones por tipo */}
              {scheduleType === "FLEXIBLE" && (
                <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    40h semanales, 5 días. El empleado puede fichar cualquier día/hora.
                  </AlertDescription>
                </Alert>
              )}

              {scheduleType === "FIXED" && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Días y horas específicas fijas. El empleado trabaja siempre el mismo horario.
                  </AlertDescription>
                </Alert>
              )}

              {scheduleType === "SHIFTS" && (
                <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950/20">
                  <Info className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-800 dark:text-purple-200">
                    Sistema de turnos rotativos (disponible próximamente).
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Formulario FLEXIBLE (actual) */}
          {scheduleType === "FLEXIBLE" && (
            <div className="animate-in fade-in-50 slide-in-from-top-2 duration-200">
              <ScheduleForm
                initialData={
                  initialData ?? {
                    weeklyHours: 40,
                    workingDaysPerWeek: 5,
                    hasIntensiveSchedule: false,
                    hasCustomWeeklyPattern: false,
                  }
                }
                onSubmit={handleScheduleSubmit}
                onCancel={() => {}}
                isSubmitting={isLoading}
                hideActions={true}
                formId="wizard-step-3-form"
              />
            </div>
          )}

          {/* Formulario FIXED (nuevo) */}
          {scheduleType === "FIXED" && (
            <div className="animate-in fade-in-50 slide-in-from-top-2 space-y-6 duration-200">
              {/* Selección de días laborables */}
              <Card>
                <CardContent className="space-y-4 p-6">
                  <Label className="text-lg font-semibold">Días Laborables</Label>
                  <p className="text-muted-foreground text-sm">Marca los días en los que este empleado debe trabajar</p>

                  <div className="grid grid-cols-7 gap-3">
                    {[
                      { key: "monday" as const, label: "L", full: "Lunes" },
                      { key: "tuesday" as const, label: "M", full: "Martes" },
                      { key: "wednesday" as const, label: "X", full: "Miércoles" },
                      { key: "thursday" as const, label: "J", full: "Jueves" },
                      { key: "friday" as const, label: "V", full: "Viernes" },
                      { key: "saturday" as const, label: "S", full: "Sábado" },
                      { key: "sunday" as const, label: "D", full: "Domingo" },
                    ].map((day) => (
                      <div key={day.key} className="flex flex-col items-center gap-2">
                        <Checkbox
                          id={day.key}
                          checked={workDays[day.key]}
                          onCheckedChange={(checked) =>
                            setWorkDays((prev) => ({ ...prev, [day.key]: checked === true }))
                          }
                        />
                        <Label htmlFor={day.key} className="cursor-pointer text-sm font-medium" title={day.full}>
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {Object.values(workDays).filter(Boolean).length === 0 && (
                    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                      <Info className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 dark:text-orange-200">
                        Debes seleccionar al menos un día laboral
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* BLOQUE 2: Horario fijo semanal */}
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">Horario fijo semanal</Label>
                    <p className="text-muted-foreground text-sm">
                      Define un horario de entrada y salida para los días laborables.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {useSimpleSchedule ? (
                      <>
                        {/* Modo simple */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Entrada</Label>
                            <Input type="time" value={simpleEntry} onChange={(e) => setSimpleEntry(e.target.value)} />
                          </div>
                          <div>
                            <Label>Salida</Label>
                            <Input type="time" value={simpleExit} onChange={(e) => setSimpleExit(e.target.value)} />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox id="apply-all" checked={applyToAllDays} onCheckedChange={setApplyToAllDays} />
                          <Label htmlFor="apply-all" className="cursor-pointer text-sm font-normal">
                            Aplicar a todos los días laborables
                          </Label>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            // Pre-poblar todos los días con los valores simples
                            const entry = simpleEntry;
                            const exit = simpleExit;
                            setTimeSlots({
                              mondayStart: entry,
                              mondayEnd: exit,
                              tuesdayStart: entry,
                              tuesdayEnd: exit,
                              wednesdayStart: entry,
                              wednesdayEnd: exit,
                              thursdayStart: entry,
                              thursdayEnd: exit,
                              fridayStart: entry,
                              fridayEnd: exit,
                              saturdayStart: entry,
                              saturdayEnd: exit,
                              sundayStart: entry,
                              sundayEnd: exit,
                            });
                            setUseSimpleSchedule(false);
                          }}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          Personalizar horario por día
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Modo personalizado - Tabla compacta */}
                        <div className="space-y-3">
                          {Object.entries(workDays)
                            .filter(([_, works]) => works)
                            .map(([day]) => {
                              const dayNames: Record<string, string> = {
                                monday: "Lunes",
                                tuesday: "Martes",
                                wednesday: "Miércoles",
                                thursday: "Jueves",
                                friday: "Viernes",
                                saturday: "Sábado",
                                sunday: "Domingo",
                              };
                              return (
                                <div key={day} className="grid grid-cols-[100px_1fr_1fr] items-center gap-3">
                                  <Label className="text-sm">{dayNames[day]}</Label>
                                  <Input
                                    type="time"
                                    value={timeSlots[`${day}Start` as keyof typeof timeSlots]}
                                    onChange={(e) =>
                                      setTimeSlots((prev) => ({
                                        ...prev,
                                        [`${day}Start`]: e.target.value,
                                      }))
                                    }
                                  />
                                  <Input
                                    type="time"
                                    value={timeSlots[`${day}End` as keyof typeof timeSlots]}
                                    onChange={(e) =>
                                      setTimeSlots((prev) => ({
                                        ...prev,
                                        [`${day}End`]: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              );
                            })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setUseSimpleSchedule(true)}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          Volver a modo simple
                        </button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* BLOQUE 2.5: Pausas en la jornada */}
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="has-breaks" className="text-lg font-semibold">
                        Pausas en la jornada (opcional)
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        Configura pausas que se descontarán del tiempo trabajado.
                      </p>
                    </div>
                    <Switch
                      id="has-breaks"
                      checked={hasBreaks}
                      onCheckedChange={setHasBreaks}
                      className="wizard-switch"
                    />
                  </div>

                  {hasBreaks && (
                    <div className="space-y-4 pt-2">
                      {useSimpleBreak ? (
                        <>
                          {/* Modo simple */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Inicio pausa</Label>
                              <Input
                                type="time"
                                value={simpleBreakStart}
                                onChange={(e) => setSimpleBreakStart(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Fin pausa</Label>
                              <Input
                                type="time"
                                value={simpleBreakEnd}
                                onChange={(e) => setSimpleBreakEnd(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="apply-break-all"
                              checked={applyBreakToAllDays}
                              onCheckedChange={setApplyBreakToAllDays}
                            />
                            <Label htmlFor="apply-break-all" className="cursor-pointer text-sm font-normal">
                              Aplicar a todos los días laborables
                            </Label>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              // Pre-poblar todos los días con los valores simples
                              const start = simpleBreakStart;
                              const end = simpleBreakEnd;
                              setBreakTimes({
                                mondayBreakStart: start,
                                mondayBreakEnd: end,
                                tuesdayBreakStart: start,
                                tuesdayBreakEnd: end,
                                wednesdayBreakStart: start,
                                wednesdayBreakEnd: end,
                                thursdayBreakStart: start,
                                thursdayBreakEnd: end,
                                fridayBreakStart: start,
                                fridayBreakEnd: end,
                                saturdayBreakStart: start,
                                saturdayBreakEnd: end,
                                sundayBreakStart: start,
                                sundayBreakEnd: end,
                              });
                              setUseSimpleBreak(false);
                            }}
                            className="text-primary text-sm font-medium hover:underline"
                          >
                            Personalizar pausas por día
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Modo personalizado - Tabla compacta */}
                          <div className="space-y-3">
                            {Object.entries(workDays)
                              .filter(([_, works]) => works)
                              .map(([day]) => {
                                const dayNames: Record<string, string> = {
                                  monday: "Lunes",
                                  tuesday: "Martes",
                                  wednesday: "Miércoles",
                                  thursday: "Jueves",
                                  friday: "Viernes",
                                  saturday: "Sábado",
                                  sunday: "Domingo",
                                };
                                return (
                                  <div key={day} className="grid grid-cols-[100px_1fr_1fr] items-center gap-3">
                                    <Label className="text-sm">{dayNames[day]}</Label>
                                    <Input
                                      type="time"
                                      value={breakTimes[`${day}BreakStart` as keyof typeof breakTimes]}
                                      onChange={(e) =>
                                        setBreakTimes((prev) => ({
                                          ...prev,
                                          [`${day}BreakStart`]: e.target.value,
                                        }))
                                      }
                                    />
                                    <Input
                                      type="time"
                                      value={breakTimes[`${day}BreakEnd` as keyof typeof breakTimes]}
                                      onChange={(e) =>
                                        setBreakTimes((prev) => ({
                                          ...prev,
                                          [`${day}BreakEnd`]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                );
                              })}
                          </div>

                          <button
                            type="button"
                            onClick={() => setUseSimpleBreak(true)}
                            className="text-primary text-sm font-medium hover:underline"
                          >
                            Volver a modo simple
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* BLOQUE 3: Jornada intensiva */}
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="has-intensive" className="text-lg font-semibold">
                        Jornada intensiva
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        Configura un horario diferente para un periodo concreto del año (por ejemplo, horario de
                        verano).
                      </p>
                    </div>
                    <Switch
                      id="has-intensive"
                      checked={hasIntensiveSchedule}
                      onCheckedChange={setHasIntensiveSchedule}
                      className="wizard-switch"
                    />
                  </div>

                  {hasIntensiveSchedule && (
                    <div className="space-y-4 pt-2">
                      {/* Periodo */}
                      <div>
                        <Label className="text-muted-foreground text-sm font-semibold">
                          Periodo intensivo <span className="text-destructive">*</span>
                        </Label>
                        <div className="mt-2 grid grid-cols-2 gap-4">
                          <div>
                            <Label>
                              Desde <span className="text-destructive">*</span>
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !intensiveStartDate && "text-muted-foreground",
                                    intensiveDateError && !intensiveStartDate && "border-destructive",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {intensiveStartDate ? (
                                    format(intensiveStartDate, "dd/MM/yyyy", { locale: es })
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={intensiveStartDate}
                                  onSelect={(date) => {
                                    setIntensiveStartDate(date);
                                    if (date && intensiveEndDate) setIntensiveDateError(false);
                                  }}
                                  locale={es}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label>
                              Hasta <span className="text-destructive">*</span>
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !intensiveEndDate && "text-muted-foreground",
                                    intensiveDateError && !intensiveEndDate && "border-destructive",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {intensiveEndDate ? (
                                    format(intensiveEndDate, "dd/MM/yyyy", { locale: es })
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={intensiveEndDate}
                                  onSelect={(date) => {
                                    setIntensiveEndDate(date);
                                    if (date && intensiveStartDate) setIntensiveDateError(false);
                                  }}
                                  locale={es}
                                  initialFocus
                                  disabled={(date) => (intensiveStartDate ? date < intensiveStartDate : false)}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>

                      {/* Horario intensivo base */}
                      <div>
                        <Label className="text-muted-foreground text-sm font-semibold">Horario intensivo</Label>
                        {useSimpleIntensiveSchedule ? (
                          <div className="mt-2 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Entrada</Label>
                                <Input
                                  type="time"
                                  value={simpleIntensiveEntry}
                                  onChange={(e) => setSimpleIntensiveEntry(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Salida</Label>
                                <Input
                                  type="time"
                                  value={simpleIntensiveExit}
                                  onChange={(e) => setSimpleIntensiveExit(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="apply-intensive-all"
                                checked={applyIntensiveToAllDays}
                                onCheckedChange={setApplyIntensiveToAllDays}
                              />
                              <Label htmlFor="apply-intensive-all" className="cursor-pointer text-sm font-normal">
                                Aplicar a todos los días laborables
                              </Label>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const entry = simpleIntensiveEntry;
                                const exit = simpleIntensiveExit;
                                setIntensiveTimeSlots({
                                  mondayStart: entry,
                                  mondayEnd: exit,
                                  tuesdayStart: entry,
                                  tuesdayEnd: exit,
                                  wednesdayStart: entry,
                                  wednesdayEnd: exit,
                                  thursdayStart: entry,
                                  thursdayEnd: exit,
                                  fridayStart: entry,
                                  fridayEnd: exit,
                                  saturdayStart: entry,
                                  saturdayEnd: exit,
                                  sundayStart: entry,
                                  sundayEnd: exit,
                                });
                                setUseSimpleIntensiveSchedule(false);
                              }}
                              className="text-primary text-sm font-medium hover:underline"
                            >
                              Personalizar horario intensivo por día
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-3">
                            {Object.entries(workDays)
                              .filter(([_, works]) => works)
                              .map(([day]) => {
                                const dayNames: Record<string, string> = {
                                  monday: "Lunes",
                                  tuesday: "Martes",
                                  wednesday: "Miércoles",
                                  thursday: "Jueves",
                                  friday: "Viernes",
                                  saturday: "Sábado",
                                  sunday: "Domingo",
                                };
                                return (
                                  <div key={day} className="grid grid-cols-[100px_1fr_1fr] items-center gap-3">
                                    <Label className="text-sm">{dayNames[day]}</Label>
                                    <Input
                                      type="time"
                                      value={intensiveTimeSlots[`${day}Start` as keyof typeof intensiveTimeSlots]}
                                      onChange={(e) =>
                                        setIntensiveTimeSlots((prev) => ({
                                          ...prev,
                                          [`${day}Start`]: e.target.value,
                                        }))
                                      }
                                    />
                                    <Input
                                      type="time"
                                      value={intensiveTimeSlots[`${day}End` as keyof typeof intensiveTimeSlots]}
                                      onChange={(e) =>
                                        setIntensiveTimeSlots((prev) => ({
                                          ...prev,
                                          [`${day}End`]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                );
                              })}

                            <button
                              type="button"
                              onClick={() => setUseSimpleIntensiveSchedule(true)}
                              className="text-primary text-sm font-medium hover:underline"
                            >
                              Volver a modo simple
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sub-bloque: Pausas intensivas */}
                      <div className="border-t pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <Label className="text-muted-foreground text-sm font-semibold">
                              Pausa durante la jornada intensiva (opcional)
                            </Label>
                          </div>
                          <Switch
                            id="has-intensive-breaks"
                            checked={hasIntensiveBreaks}
                            onCheckedChange={setHasIntensiveBreaks}
                            className="wizard-switch"
                          />
                        </div>

                        {hasIntensiveBreaks && (
                          <>
                            {useSimpleIntensiveBreak ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Inicio pausa</Label>
                                    <Input
                                      type="time"
                                      value={simpleIntensiveBreakStart}
                                      onChange={(e) => setSimpleIntensiveBreakStart(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label>Fin pausa</Label>
                                    <Input
                                      type="time"
                                      value={simpleIntensiveBreakEnd}
                                      onChange={(e) => setSimpleIntensiveBreakEnd(e.target.value)}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="apply-intensive-break-all"
                                    checked={applyIntensiveBreakToAllDays}
                                    onCheckedChange={setApplyIntensiveBreakToAllDays}
                                  />
                                  <Label
                                    htmlFor="apply-intensive-break-all"
                                    className="cursor-pointer text-sm font-normal"
                                  >
                                    Aplicar a todos los días laborables
                                  </Label>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const start = simpleIntensiveBreakStart;
                                    const end = simpleIntensiveBreakEnd;
                                    setIntensiveBreakTimes({
                                      mondayBreakStart: start,
                                      mondayBreakEnd: end,
                                      tuesdayBreakStart: start,
                                      tuesdayBreakEnd: end,
                                      wednesdayBreakStart: start,
                                      wednesdayBreakEnd: end,
                                      thursdayBreakStart: start,
                                      thursdayBreakEnd: end,
                                      fridayBreakStart: start,
                                      fridayBreakEnd: end,
                                      saturdayBreakStart: start,
                                      saturdayBreakEnd: end,
                                      sundayBreakStart: start,
                                      sundayBreakEnd: end,
                                    });
                                    setUseSimpleIntensiveBreak(false);
                                  }}
                                  className="text-primary text-sm font-medium hover:underline"
                                >
                                  Personalizar pausas por día
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {Object.entries(workDays)
                                  .filter(([_, works]) => works)
                                  .map(([day]) => {
                                    const dayNames: Record<string, string> = {
                                      monday: "Lunes",
                                      tuesday: "Martes",
                                      wednesday: "Miércoles",
                                      thursday: "Jueves",
                                      friday: "Viernes",
                                      saturday: "Sábado",
                                      sunday: "Domingo",
                                    };
                                    return (
                                      <div key={day} className="grid grid-cols-[100px_1fr_1fr] items-center gap-3">
                                        <Label className="text-sm">{dayNames[day]}</Label>
                                        <Input
                                          type="time"
                                          value={
                                            intensiveBreakTimes[`${day}BreakStart` as keyof typeof intensiveBreakTimes]
                                          }
                                          onChange={(e) =>
                                            setIntensiveBreakTimes((prev) => ({
                                              ...prev,
                                              [`${day}BreakStart`]: e.target.value,
                                            }))
                                          }
                                        />
                                        <Input
                                          type="time"
                                          value={
                                            intensiveBreakTimes[`${day}BreakEnd` as keyof typeof intensiveBreakTimes]
                                          }
                                          onChange={(e) =>
                                            setIntensiveBreakTimes((prev) => ({
                                              ...prev,
                                              [`${day}BreakEnd`]: e.target.value,
                                            }))
                                          }
                                        />
                                      </div>
                                    );
                                  })}

                                <button
                                  type="button"
                                  onClick={() => setUseSimpleIntensiveBreak(true)}
                                  className="text-primary text-sm font-medium hover:underline"
                                >
                                  Volver a modo simple
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Formulario oculto para manejar submit de FIXED */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFixedSubmit();
                }}
                id="wizard-step-3-form"
                className="hidden"
              />
            </div>
          )}

          {/* Mensaje SHIFTS (deshabilitado) */}
          {scheduleType === "SHIFTS" && (
            <Card>
              <CardContent className="p-8">
                <div className="space-y-4 text-center">
                  <RefreshCw className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
                  <div>
                    <h3 className="text-muted-foreground text-lg font-semibold">Sistema de Turnos (Próximamente)</h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Esta funcionalidad estará disponible en una actualización futura.
                    </p>
                  </div>
                  <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950/20">
                    <Info className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-800 dark:text-purple-200">
                      Por ahora, el empleado se creará con horario flexible (40h/semana). Podrás configurar turnos
                      rotativos desde la ficha del empleado cuando esta funcionalidad esté lista.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Formulario oculto para manejar el submit cuando skipSchedule está true */}
      {skipSchedule && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleWizardFinish();
          }}
          id="wizard-step-3-form"
          className="hidden"
        />
      )}
    </div>
  );
}

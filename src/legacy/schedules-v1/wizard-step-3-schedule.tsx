"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { Info, Clock, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";

import { ScheduleForm, type ScheduleFormData } from "@/components/schedules/schedule-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScheduleType } from "@/stores/contracts-store";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

const MONTHS = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const getDaysInMonth = (month: string): number => {
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthNum = parseInt(month, 10);
  return monthNum >= 1 && monthNum <= 12 ? daysInMonth[monthNum - 1] : 31;
};

interface WizardStep3ScheduleProps {
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
  initialData?: ScheduleFormData | null;
  isEditMode?: boolean;
}

export function WizardStep3Schedule({
  onSubmit,
  isLoading = false,
  initialData,
  isEditMode = false,
}: WizardStep3ScheduleProps) {
  const [skipSchedule, setSkipSchedule] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("FLEXIBLE");
  const shiftsEnabled = useOrganizationFeaturesStore((state) => state.features.shiftsEnabled);

  // Resetear a FLEXIBLE si se seleccionó SHIFTS pero se deshabilitó la feature
  useEffect(() => {
    if (scheduleType === "SHIFT" && !shiftsEnabled) {
      setScheduleType("FLEXIBLE");
    }
  }, [scheduleType, shiftsEnabled]);

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
  const [intensiveStartMonth, setIntensiveStartMonth] = useState("");
  const [intensiveStartDay, setIntensiveStartDay] = useState("");
  const [intensiveEndMonth, setIntensiveEndMonth] = useState("");
  const [intensiveEndDay, setIntensiveEndDay] = useState("");
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

  // Cargar initialData cuando está en modo edición
  useEffect(() => {
    if (!initialData) return;

    // Cargar tipo de horario
    if (initialData.scheduleType) {
      setScheduleType(initialData.scheduleType);
    }

    // Cargar días laborables (FIXED)
    if (initialData.workMonday !== undefined) {
      setWorkDays({
        monday: initialData.workMonday ?? false,
        tuesday: initialData.workTuesday ?? false,
        wednesday: initialData.workWednesday ?? false,
        thursday: initialData.workThursday ?? false,
        friday: initialData.workFriday ?? false,
        saturday: initialData.workSaturday ?? false,
        sunday: initialData.workSunday ?? false,
      });
    }

    // Cargar franjas horarias normales (FIXED)
    if (initialData.mondayStartTime !== undefined) {
      setTimeSlots({
        mondayStart: initialData.mondayStartTime ?? "09:00",
        mondayEnd: initialData.mondayEndTime ?? "17:00",
        tuesdayStart: initialData.tuesdayStartTime ?? "09:00",
        tuesdayEnd: initialData.tuesdayEndTime ?? "17:00",
        wednesdayStart: initialData.wednesdayStartTime ?? "09:00",
        wednesdayEnd: initialData.wednesdayEndTime ?? "17:00",
        thursdayStart: initialData.thursdayStartTime ?? "09:00",
        thursdayEnd: initialData.thursdayEndTime ?? "17:00",
        fridayStart: initialData.fridayStartTime ?? "09:00",
        fridayEnd: initialData.fridayEndTime ?? "17:00",
        saturdayStart: initialData.saturdayStartTime ?? "09:00",
        saturdayEnd: initialData.saturdayEndTime ?? "14:00",
        sundayStart: initialData.sundayStartTime ?? "09:00",
        sundayEnd: initialData.sundayEndTime ?? "14:00",
      });
    }

    // Cargar pausas normales (FIXED)
    if (initialData.mondayBreakStartTime !== undefined) {
      // Determinar si tiene pausas configuradas
      const hasPausas = !!(
        initialData.mondayBreakStartTime ??
        initialData.tuesdayBreakStartTime ??
        initialData.wednesdayBreakStartTime ??
        initialData.thursdayBreakStartTime ??
        initialData.fridayBreakStartTime ??
        initialData.saturdayBreakStartTime ??
        initialData.sundayBreakStartTime
      );
      setHasBreaks(hasPausas);

      if (hasPausas) {
        setBreakTimes({
          mondayBreakStart: initialData.mondayBreakStartTime ?? "14:00",
          mondayBreakEnd: initialData.mondayBreakEndTime ?? "15:00",
          tuesdayBreakStart: initialData.tuesdayBreakStartTime ?? "14:00",
          tuesdayBreakEnd: initialData.tuesdayBreakEndTime ?? "15:00",
          wednesdayBreakStart: initialData.wednesdayBreakStartTime ?? "14:00",
          wednesdayBreakEnd: initialData.wednesdayBreakEndTime ?? "15:00",
          thursdayBreakStart: initialData.thursdayBreakStartTime ?? "14:00",
          thursdayBreakEnd: initialData.thursdayBreakEndTime ?? "15:00",
          fridayBreakStart: initialData.fridayBreakStartTime ?? "14:00",
          fridayBreakEnd: initialData.fridayBreakEndTime ?? "15:00",
          saturdayBreakStart: initialData.saturdayBreakStartTime ?? "12:00",
          saturdayBreakEnd: initialData.saturdayBreakEndTime ?? "12:30",
          sundayBreakStart: initialData.sundayBreakStartTime ?? "12:00",
          sundayBreakEnd: initialData.sundayBreakEndTime ?? "12:30",
        });
      }
    }

    // Cargar jornada intensiva
    if (initialData.hasIntensiveSchedule !== undefined) {
      setHasIntensiveSchedule(initialData.hasIntensiveSchedule);

      // Cargar fechas de jornada intensiva (parsear MM-DD)
      if (initialData.intensiveStartDate && typeof initialData.intensiveStartDate === "string") {
        const [month, day] = initialData.intensiveStartDate.split("-");
        if (month && day) {
          setIntensiveStartMonth(month);
          setIntensiveStartDay(day);
        }
      }

      if (initialData.intensiveEndDate && typeof initialData.intensiveEndDate === "string") {
        const [month, day] = initialData.intensiveEndDate.split("-");
        if (month && day) {
          setIntensiveEndMonth(month);
          setIntensiveEndDay(day);
        }
      }
    }

    // Cargar franjas horarias intensivas (FIXED)
    if (initialData.intensiveMondayStartTime !== undefined) {
      setIntensiveTimeSlots({
        mondayStart: initialData.intensiveMondayStartTime ?? "08:00",
        mondayEnd: initialData.intensiveMondayEndTime ?? "15:00",
        tuesdayStart: initialData.intensiveTuesdayStartTime ?? "08:00",
        tuesdayEnd: initialData.intensiveTuesdayEndTime ?? "15:00",
        wednesdayStart: initialData.intensiveWednesdayStartTime ?? "08:00",
        wednesdayEnd: initialData.intensiveWednesdayEndTime ?? "15:00",
        thursdayStart: initialData.intensiveThursdayStartTime ?? "08:00",
        thursdayEnd: initialData.intensiveThursdayEndTime ?? "15:00",
        fridayStart: initialData.intensiveFridayStartTime ?? "08:00",
        fridayEnd: initialData.intensiveFridayEndTime ?? "15:00",
        saturdayStart: initialData.intensiveSaturdayStartTime ?? "08:00",
        saturdayEnd: initialData.intensiveSaturdayEndTime ?? "14:00",
        sundayStart: initialData.intensiveSundayStartTime ?? "08:00",
        sundayEnd: initialData.intensiveSundayEndTime ?? "14:00",
      });
    }

    // Cargar pausas intensivas (FIXED)
    if (initialData.intensiveMondayBreakStartTime !== undefined) {
      // Determinar si tiene pausas intensivas configuradas
      const hasPausasIntensivas = !!(
        initialData.intensiveMondayBreakStartTime ??
        initialData.intensiveTuesdayBreakStartTime ??
        initialData.intensiveWednesdayBreakStartTime ??
        initialData.intensiveThursdayBreakStartTime ??
        initialData.intensiveFridayBreakStartTime ??
        initialData.intensiveSaturdayBreakStartTime ??
        initialData.intensiveSundayBreakStartTime
      );
      setHasIntensiveBreaks(hasPausasIntensivas);

      if (hasPausasIntensivas) {
        setIntensiveBreakTimes({
          mondayBreakStart: initialData.intensiveMondayBreakStartTime ?? "11:00",
          mondayBreakEnd: initialData.intensiveMondayBreakEndTime ?? "11:30",
          tuesdayBreakStart: initialData.intensiveTuesdayBreakStartTime ?? "11:00",
          tuesdayBreakEnd: initialData.intensiveTuesdayBreakEndTime ?? "11:30",
          wednesdayBreakStart: initialData.intensiveWednesdayBreakStartTime ?? "11:00",
          wednesdayBreakEnd: initialData.intensiveWednesdayBreakEndTime ?? "11:30",
          thursdayBreakStart: initialData.intensiveThursdayBreakStartTime ?? "11:00",
          thursdayBreakEnd: initialData.intensiveThursdayBreakEndTime ?? "11:30",
          fridayBreakStart: initialData.intensiveFridayBreakStartTime ?? "11:00",
          fridayBreakEnd: initialData.intensiveFridayBreakEndTime ?? "11:30",
          saturdayBreakStart: initialData.intensiveSaturdayBreakStartTime ?? "11:00",
          saturdayBreakEnd: initialData.intensiveSaturdayBreakEndTime ?? "11:30",
          sundayBreakStart: initialData.intensiveSundayBreakStartTime ?? "11:00",
          sundayBreakEnd: initialData.intensiveSundayBreakEndTime ?? "11:30",
        });
      }
    }

    // Cargar hasFixedTimeSlots para determinar modo simple/personalizado
    if (initialData.hasFixedTimeSlots !== undefined) {
      setUseSimpleSchedule(!initialData.hasFixedTimeSlots);
    }
  }, [initialData]);

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
    console.log("🟢 handleFixedSubmit iniciado");
    // Validación 1: Al menos 1 día debe estar seleccionado
    const activeDaysCount = Object.values(workDays).filter(Boolean).length;
    console.log("🟡 Días activos:", activeDaysCount, workDays);
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
    if (
      hasIntensiveSchedule &&
      (!intensiveStartMonth || !intensiveStartDay || !intensiveEndMonth || !intensiveEndDay)
    ) {
      setIntensiveDateError(true);
      toast.error("Fechas obligatorias", {
        description: "Por favor, selecciona mes y día de inicio y fin para la jornada intensiva",
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

    // Función helper: calcular horas semanales intensivas
    const calculateTotalIntensiveHours = () => {
      if (!hasIntensiveSchedule) return undefined;

      let totalHours = 0;
      const days: Array<keyof typeof workDays> = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      for (const day of days) {
        if (!workDays[day]) continue;

        const startTime = getIntensiveTimeSlot(day, "Start");
        const endTime = getIntensiveTimeSlot(day, "End");

        if (startTime && endTime) {
          const [startHour, startMin] = startTime.split(":").map(Number);
          const [endHour, endMin] = endTime.split(":").map(Number);

          let dayHours = endHour - startHour + (endMin - startMin) / 60;

          // Restar pausa si existe
          if (hasIntensiveBreaks) {
            const breakStart = getIntensiveBreakTime(day, "Start");
            const breakEnd = getIntensiveBreakTime(day, "End");

            if (breakStart && breakEnd) {
              const [breakStartHour, breakStartMin] = breakStart.split(":").map(Number);
              const [breakEndHour, breakEndMin] = breakEnd.split(":").map(Number);
              const breakHours = breakEndHour - breakStartHour + (breakEndMin - breakStartMin) / 60;
              dayHours -= breakHours;
            }
          }

          totalHours += dayHours;
        }
      }

      return totalHours > 0 ? Math.round(totalHours * 100) / 100 : undefined;
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
        intensiveStartDate:
          intensiveStartMonth && intensiveStartDay ? `${intensiveStartMonth}-${intensiveStartDay}` : undefined,
        intensiveEndDate: intensiveEndMonth && intensiveEndDay ? `${intensiveEndMonth}-${intensiveEndDay}` : undefined,
        intensiveWeeklyHours: calculateTotalIntensiveHours(),
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

    console.log("🟣 Datos a enviar (fixedData):", fixedData);
    await onSubmit(fixedData);
    console.log("✅ onSubmit completado");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-6">
      {/* Switch compacto: Configurar ahora o más tarde - Solo en modo creación */}
      {!isEditMode && (
        <>
          <div className="from-primary/15 to-card border-muted hover:border-primary/40 flex items-center justify-between rounded-xl border-2 bg-gradient-to-br p-5 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex-1 space-y-1">
              <Label htmlFor="skip-schedule" className="text-lg font-semibold">
                Configurar horarios más tarde
              </Label>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Usaremos horario flexible por defecto (40h semanales, 5 días). Podrás personalizarlo después.
              </p>
            </div>
            <Switch
              id="skip-schedule"
              checked={skipSchedule}
              onCheckedChange={setSkipSchedule}
              className="wizard-switch"
            />
          </div>

          {skipSchedule && (
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Se mantendrán los horarios por defecto (40h semanales distribuidas en 5 días).
              </AlertDescription>
            </Alert>
          )}
        </>
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
                    <Calendar className="mr-2 h-4 w-4" />
                    Fijo
                  </TabsTrigger>
                  <TabsTrigger value="SHIFT" disabled={!shiftsEnabled}>
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

              {scheduleType === "SHIFT" && (
                <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950/20">
                  <Info className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-800 dark:text-purple-200">
                    El empleado no tendrá horario fijo. Sus días y horas de trabajo se planificarán semanalmente desde
                    el módulo de Gestión de Turnos.
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
                          <div className="space-y-2">
                            <Label>
                              Desde <span className="text-destructive">*</span>
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={intensiveStartMonth}
                                onValueChange={(value) => {
                                  setIntensiveStartMonth(value);
                                  if (value && intensiveStartDay && intensiveEndMonth && intensiveEndDay) {
                                    setIntensiveDateError(false);
                                  }
                                }}
                              >
                                <SelectTrigger
                                  className={
                                    intensiveDateError && !intensiveStartMonth ? "border-destructive" : undefined
                                  }
                                >
                                  <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MONTHS.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                      {month.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={intensiveStartDay}
                                onValueChange={(value) => {
                                  setIntensiveStartDay(value);
                                  if (intensiveStartMonth && value && intensiveEndMonth && intensiveEndDay) {
                                    setIntensiveDateError(false);
                                  }
                                }}
                                disabled={!intensiveStartMonth}
                              >
                                <SelectTrigger
                                  className={
                                    intensiveDateError && !intensiveStartDay ? "border-destructive" : undefined
                                  }
                                >
                                  <SelectValue placeholder="Día" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: getDaysInMonth(intensiveStartMonth) }, (_, i) => {
                                    const day = String(i + 1).padStart(2, "0");
                                    return (
                                      <SelectItem key={day} value={day}>
                                        {day}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <p className="text-muted-foreground text-xs">Ejemplo: Junio - 15</p>
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Hasta <span className="text-destructive">*</span>
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={intensiveEndMonth}
                                onValueChange={(value) => {
                                  setIntensiveEndMonth(value);
                                  if (intensiveStartMonth && intensiveStartDay && value && intensiveEndDay) {
                                    setIntensiveDateError(false);
                                  }
                                }}
                              >
                                <SelectTrigger
                                  className={
                                    intensiveDateError && !intensiveEndMonth ? "border-destructive" : undefined
                                  }
                                >
                                  <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MONTHS.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                      {month.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={intensiveEndDay}
                                onValueChange={(value) => {
                                  setIntensiveEndDay(value);
                                  if (intensiveStartMonth && intensiveStartDay && intensiveEndMonth && value) {
                                    setIntensiveDateError(false);
                                  }
                                }}
                                disabled={!intensiveEndMonth}
                              >
                                <SelectTrigger
                                  className={intensiveDateError && !intensiveEndDay ? "border-destructive" : undefined}
                                >
                                  <SelectValue placeholder="Día" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: getDaysInMonth(intensiveEndMonth) }, (_, i) => {
                                    const day = String(i + 1).padStart(2, "0");
                                    return (
                                      <SelectItem key={day} value={day}>
                                        {day}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <p className="text-muted-foreground text-xs">Ejemplo: Septiembre - 15</p>
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

          {/* Formulario oculto para SHIFT (Turnos) */}
          {scheduleType === "SHIFT" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onSubmit({
                  scheduleType: "SHIFT",
                  weeklyHours: 40, // Valor por defecto
                  workingDaysPerWeek: 5, // Valor por defecto
                  hasIntensiveSchedule: false,
                  hasCustomWeeklyPattern: false,
                });
              }}
              id="wizard-step-3-form"
              className="hidden"
            />
          )}
        </>
      )}

      {/* Botón de guardar - Solo en modo edición */}
      {isEditMode && (
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            onClick={async () => {
              console.log("🔵 Click en Guardar, scheduleType:", scheduleType);
              if (scheduleType === "FLEXIBLE") {
                await handleScheduleSubmit({} as ScheduleFormData);
              } else if (scheduleType === "FIXED") {
                await handleFixedSubmit();
              } else if (scheduleType === "SHIFT") {
                // Para turnos, guardamos con tipo SHIFT y valores por defecto
                await onSubmit({
                  scheduleType: "SHIFT",
                  weeklyHours: 40,
                  workingDaysPerWeek: 5,
                  hasIntensiveSchedule: false,
                  hasCustomWeeklyPattern: false,
                });
              }
            }}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </div>
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

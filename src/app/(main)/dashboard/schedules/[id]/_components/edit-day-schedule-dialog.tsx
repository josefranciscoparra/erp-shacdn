"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Coffee, Plus, Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateWorkDayPattern } from "@/server/actions/schedules-v2";

function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

const timeSlotSchema = z
  .object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM"),
    // Pausas Automáticas (Mejora 6)
    slotType: z.enum(["WORK", "BREAK"]).default("WORK"),
    isAutomatic: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const start = timeStringToMinutes(data.startTime);
      const end = timeStringToMinutes(data.endTime);
      return end > start;
    },
    {
      message: "La hora de fin debe ser posterior a la de inicio",
      path: ["endTime"],
    },
  );

const formSchema = z
  .object({
    isWorkingDay: z.boolean(),
    timeSlots: z.array(timeSlotSchema).min(0),
  })
  .refine(
    (data) => {
      if (!data.isWorkingDay || data.timeSlots.length <= 1) return true;

      // Validar que no haya solapamientos entre tramos del MISMO TIPO
      // Las pausas SÍ pueden estar dentro de tramos de trabajo
      const workSlots = data.timeSlots
        .filter((slot) => slot.slotType === "WORK")
        .map((slot) => ({
          start: timeStringToMinutes(slot.startTime),
          end: timeStringToMinutes(slot.endTime),
        }))
        .sort((a, b) => a.start - b.start);

      const breakSlots = data.timeSlots
        .filter((slot) => slot.slotType === "BREAK")
        .map((slot) => ({
          start: timeStringToMinutes(slot.startTime),
          end: timeStringToMinutes(slot.endTime),
        }))
        .sort((a, b) => a.start - b.start);

      // Verificar solapamiento entre tramos de trabajo
      for (let i = 0; i < workSlots.length - 1; i++) {
        if (workSlots[i].end > workSlots[i + 1].start) {
          return false;
        }
      }

      // Verificar solapamiento entre pausas
      for (let i = 0; i < breakSlots.length - 1; i++) {
        if (breakSlots[i].end > breakSlots[i + 1].start) {
          return false;
        }
      }

      return true;
    },
    {
      message: "Los tramos del mismo tipo no pueden solaparse",
      path: ["timeSlots"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

interface EditDayScheduleDialogProps {
  periodId: string;
  dayOfWeek: number;
  dayLabel: string;
  existingPattern?: {
    id: string;
    isWorkingDay: boolean;
    timeSlots: Array<{
      id: string;
      startMinutes: number;
      endMinutes: number;
      // Pausas Automáticas (Mejora 6)
      slotType?: "WORK" | "BREAK";
      isAutomatic?: boolean;
    }>;
  };
}

export function EditDayScheduleDialog({ periodId, dayOfWeek, dayLabel, existingPattern }: EditDayScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const defaultTimeSlots = existingPattern?.timeSlots.map((slot) => ({
    startTime: minutesToTimeString(slot.startMinutes),
    endTime: minutesToTimeString(slot.endMinutes),
    // Pausas Automáticas (Mejora 6)
    slotType: slot.slotType ?? ("WORK" as const),
    isAutomatic: slot.isAutomatic ?? false,
  })) ?? [
    { startTime: "09:00", endTime: "14:00", slotType: "WORK" as const, isAutomatic: false },
    { startTime: "15:00", endTime: "18:00", slotType: "WORK" as const, isAutomatic: false },
  ];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isWorkingDay: existingPattern?.isWorkingDay ?? true,
      timeSlots: defaultTimeSlots,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "timeSlots",
  });

  const isWorkingDay = form.watch("isWorkingDay");

  // Resetear el formulario cuando se abra el diálogo o cambien los datos
  useEffect(() => {
    if (open) {
      const timeSlots = existingPattern?.timeSlots.map((slot) => ({
        startTime: minutesToTimeString(slot.startMinutes),
        endTime: minutesToTimeString(slot.endMinutes),
        // Pausas Automáticas (Mejora 6)
        slotType: slot.slotType ?? ("WORK" as const),
        isAutomatic: slot.isAutomatic ?? false,
      })) ?? [
        { startTime: "09:00", endTime: "14:00", slotType: "WORK" as const, isAutomatic: false },
        { startTime: "15:00", endTime: "18:00", slotType: "WORK" as const, isAutomatic: false },
      ];

      form.reset({
        isWorkingDay: existingPattern?.isWorkingDay ?? true,
        timeSlots,
      });
    }
  }, [open, existingPattern, form]);

  async function onSubmit(data: FormValues) {
    setIsLoading(true);

    try {
      const timeSlots = data.isWorkingDay
        ? data.timeSlots.map((slot) => ({
            startTimeMinutes: timeStringToMinutes(slot.startTime),
            endTimeMinutes: timeStringToMinutes(slot.endTime),
            // Pausas Automáticas (Mejora 6)
            slotType: slot.slotType,
            presenceType: slot.slotType === "BREAK" ? ("FLEXIBLE" as const) : ("MANDATORY" as const),
            isAutomatic: slot.slotType === "BREAK" ? slot.isAutomatic : false,
          }))
        : [];

      const result = await updateWorkDayPattern(periodId, dayOfWeek, {
        isWorkingDay: data.isWorkingDay,
        timeSlots,
      });

      if (result.success) {
        toast.success("Horario actualizado", {
          description: `El horario de ${dayLabel} se ha guardado correctamente`,
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Error al guardar horario", {
          description: result.error ?? "Ha ocurrido un error desconocido",
        });
      }
    } catch (error) {
      console.error("Error updating day schedule:", error);
      toast.error("Error al guardar horario", {
        description: "Ha ocurrido un error al guardar el horario",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {existingPattern ? "Editar" : "Configurar"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configurar {dayLabel}</DialogTitle>
          <DialogDescription>Define los tramos horarios para este día de la semana</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="isWorkingDay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Día laborable</FormLabel>
                    <FormDescription>¿Se trabaja este día de la semana?</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isWorkingDay && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Tramos horarios</h4>
                    <p className="text-muted-foreground text-sm">Define los horarios de entrada y salida</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({ startTime: "09:00", endTime: "14:00", slotType: "WORK", isAutomatic: false })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Trabajo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({ startTime: "13:00", endTime: "14:00", slotType: "BREAK", isAutomatic: false })
                      }
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Pausa
                    </Button>
                  </div>
                </div>

                <ScrollArea className="max-h-[400px] pr-4">
                  <div className="space-y-3 p-1">
                    {fields.map((field, index) => {
                      const slotType = form.watch(`timeSlots.${index}.slotType`);
                      const isBreak = slotType === "BREAK";

                      return (
                        <div
                          key={field.id}
                          className={`space-y-3 rounded-lg border p-3 ${isBreak ? "border-yellow-200 bg-yellow-50/30 dark:border-yellow-900 dark:bg-yellow-950/20" : ""}`}
                        >
                          {/* Cabecera con tipo y badge */}
                          <div className="flex items-center justify-between">
                            <Badge variant={isBreak ? "secondary" : "default"} className="text-xs">
                              {isBreak ? (
                                <>
                                  <Coffee className="mr-1 h-3 w-3" /> Pausa
                                </>
                              ) : (
                                <>
                                  <Clock className="mr-1 h-3 w-3" /> Trabajo
                                </>
                              )}
                            </Badge>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="h-7 w-7"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar tramo</span>
                              </Button>
                            )}
                          </div>

                          {/* Horarios */}
                          <div className="flex items-end gap-3">
                            <FormField
                              control={form.control}
                              name={`timeSlots.${index}.startTime`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel className="text-xs">Inicio</FormLabel>
                                  <FormControl>
                                    <Input type="time" className="h-9" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`timeSlots.${index}.endTime`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel className="text-xs">Fin</FormLabel>
                                  <FormControl>
                                    <Input type="time" className="h-9" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Toggle de pausa automática - solo para tipo BREAK */}
                          {isBreak && (
                            <FormField
                              control={form.control}
                              name={`timeSlots.${index}.isAutomatic`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 p-2 dark:border-blue-900 dark:bg-blue-950/30">
                                  <div className="space-y-0">
                                    <FormLabel className="text-xs font-medium">Registrar automáticamente</FormLabel>
                                    <FormDescription className="text-[10px] leading-tight">
                                      Se añadirá al fichar salida
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {fields.length === 0 && (
                  <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                    <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>Añade al menos un tramo horario</p>
                  </div>
                )}

                {form.formState.errors.timeSlots && (
                  <p className="text-destructive text-sm">{form.formState.errors.timeSlots.message}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Horario"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

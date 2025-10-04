"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { eventFormSchema, EventFormData } from "./calendar-event-schema";
import { CalendarEventData, useCalendarsStore } from "@/stores/calendars-store";

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarId: string;
  event?: CalendarEventData | null;
}

const eventTypeOptions = [
  { value: "HOLIDAY", label: "Festivo" },
  { value: "CLOSURE", label: "Cierre" },
  { value: "EVENT", label: "Evento" },
  { value: "MEETING", label: "Reunión" },
  { value: "DEADLINE", label: "Fecha límite" },
  { value: "OTHER", label: "Otro" },
];

export function CalendarEventDialog({
  open,
  onOpenChange,
  calendarId,
  event = null,
}: CalendarEventDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDateRange, setIsDateRange] = React.useState(false);
  const { createEvent, updateEvent, fetchCalendarById } = useCalendarsStore();

  const isEditing = Boolean(event);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      date: new Date(),
      endDate: null,
      eventType: "HOLIDAY",
      isRecurring: false,
    },
  });

  // Actualizar valores del formulario cuando se cambia el evento
  React.useEffect(() => {
    if (event) {
      const hasEndDate = Boolean(event.endDate);
      setIsDateRange(hasEndDate);
      form.reset({
        name: event.name,
        description: event.description || "",
        date: new Date(event.date),
        endDate: event.endDate ? new Date(event.endDate) : null,
        eventType: event.eventType as any,
        isRecurring: event.isRecurring,
      });
    } else {
      setIsDateRange(false);
      form.reset({
        name: "",
        description: "",
        date: new Date(),
        endDate: null,
        eventType: "HOLIDAY",
        isRecurring: false,
      });
    }
  }, [event, form]);

  const onSubmit = async (data: EventFormData) => {
    setIsLoading(true);
    try {
      if (isEditing && event) {
        await updateEvent(calendarId, event.id, data);
        toast.success("Evento actualizado", {
          description: `${data.name} ha sido actualizado`,
        });
      } else {
        const newEvent = await createEvent(calendarId, data);
        if (newEvent) {
          toast.success("Evento creado", {
            description: `${data.name} ha sido creado`,
          });
        } else {
          throw new Error("Error al crear evento");
        }
      }

      // Recargar el calendario para actualizar la lista de eventos
      await fetchCalendarById(calendarId);
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Error al actualizar evento" : "Error al crear evento", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos del evento" : "Añade un nuevo evento al calendario"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Día de Reyes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción del evento" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{isDateRange ? "Fecha de inicio" : "Fecha"}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <Checkbox
                id="dateRange"
                checked={isDateRange}
                onCheckedChange={(checked) => {
                  setIsDateRange(checked === true);
                  if (!checked) {
                    form.setValue("endDate", null);
                  }
                }}
              />
              <div className="space-y-1 leading-none">
                <label
                  htmlFor="dateRange"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Es un rango de fechas
                </label>
                <p className="text-muted-foreground text-sm">
                  Activa esta opción si el evento dura varios días
                </p>
              </div>
            </div>

            {isDateRange && (
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de evento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eventTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Evento recurrente</FormLabel>
                    <FormDescription>
                      Este evento se repite cada año en la misma fecha
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Guardando..." : "Creando..."}
                  </>
                ) : (
                  <>{isEditing ? "Guardar cambios" : "Crear evento"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createExceptionDay,
  updateExceptionDay,
  type ExceptionTypeEnum,
  getExceptionDaysForTemplate,
} from "@/server/actions/schedules-v2";

interface CreateExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  onSuccess: () => void;
  exceptionToEdit?: Awaited<ReturnType<typeof getExceptionDaysForTemplate>>[0] | null;
}

// Opciones de tipo de excepción
const exceptionTypes: { value: ExceptionTypeEnum; label: string; description: string }[] = [
  { value: "HOLIDAY", label: "Festivo", description: "Día completo sin trabajo" },
  { value: "REDUCED_HOURS", label: "Jornada Reducida", description: "Horario con horas reducidas" },
  { value: "SPECIAL_SCHEDULE", label: "Horario Especial", description: "Horario diferente al habitual" },
  { value: "TRAINING", label: "Formación", description: "Día de formación o evento" },
  { value: "EARLY_CLOSURE", label: "Cierre Anticipado", description: "Cierre antes de lo habitual" },
  { value: "CUSTOM", label: "Personalizado", description: "Otro tipo de excepción" },
];

export function CreateExceptionDialog({
  open,
  onOpenChange,
  templateId,
  templateName,
  onSuccess,
  exceptionToEdit,
}: CreateExceptionDialogProps) {
  const isEditMode = !!exceptionToEdit;
  const [isLoading, setIsLoading] = useState(false);

  // Información básica
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [exceptionType, setExceptionType] = useState<ExceptionTypeEnum>("HOLIDAY");
  const [reason, setReason] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  // Time slots (opcional)
  const [hasCustomSchedule, setHasCustomSchedule] = useState(false);
  const [timeSlots, setTimeSlots] = useState<
    Array<{
      startTime: string;
      endTime: string;
      slotType: "WORK" | "BREAK";
      presenceType: "MANDATORY" | "FLEXIBLE";
    }>
  >([]);

  // Pre-cargar datos cuando se edita
  useEffect(() => {
    if (open && exceptionToEdit) {
      setDate(new Date(exceptionToEdit.date));
      setEndDate(exceptionToEdit.endDate ? new Date(exceptionToEdit.endDate) : undefined);
      setExceptionType(exceptionToEdit.exceptionType);
      setReason(exceptionToEdit.reason ?? "");
      setIsRecurring(exceptionToEdit.isRecurring);

      // Cargar time slots si existen
      if (exceptionToEdit.overrideSlots && exceptionToEdit.overrideSlots.length > 0) {
        setHasCustomSchedule(true);
        setTimeSlots(
          exceptionToEdit.overrideSlots.map((slot) => {
            const startHours = Math.floor(slot.startTimeMinutes / 60);
            const startMinutes = slot.startTimeMinutes % 60;
            const endHours = Math.floor(slot.endTimeMinutes / 60);
            const endMinutes = slot.endTimeMinutes % 60;

            return {
              startTime: `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}`,
              endTime: `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`,
              slotType: slot.slotType,
              presenceType: slot.presenceType,
            };
          }),
        );
      } else {
        setHasCustomSchedule(false);
        setTimeSlots([]);
      }
    } else if (open && !exceptionToEdit) {
      // Resetear al abrir en modo creación
      resetForm();
    }
  }, [open, exceptionToEdit]);

  function resetForm() {
    setDate(new Date());
    setEndDate(undefined);
    setExceptionType("HOLIDAY");
    setReason("");
    setIsRecurring(false);
    setHasCustomSchedule(false);
    setTimeSlots([]);
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!date) {
      toast.error("Debes seleccionar una fecha");
      return;
    }

    setIsLoading(true);

    try {
      // Convertir time slots de HH:mm a minutos
      const timeSlotsInMinutes = hasCustomSchedule
        ? timeSlots.map((slot) => {
            const [startHours, startMinutes] = slot.startTime.split(":").map(Number);
            const [endHours, endMinutes] = slot.endTime.split(":").map(Number);

            return {
              startTimeMinutes: (startHours ?? 0) * 60 + (startMinutes ?? 0),
              endTimeMinutes: (endHours ?? 0) * 60 + (endMinutes ?? 0),
              slotType: slot.slotType,
              presenceType: slot.presenceType,
            };
          })
        : [];

      const result =
        isEditMode && exceptionToEdit
          ? await updateExceptionDay({
              id: exceptionToEdit.id,
              scheduleTemplateId: templateId,
              date,
              endDate,
              exceptionType,
              reason: reason.trim() || undefined,
              isRecurring,
              timeSlots: timeSlotsInMinutes.length > 0 ? timeSlotsInMinutes : undefined,
            })
          : await createExceptionDay({
              scheduleTemplateId: templateId,
              date,
              endDate,
              exceptionType,
              reason: reason.trim() || undefined,
              isRecurring,
              timeSlots: timeSlotsInMinutes.length > 0 ? timeSlotsInMinutes : undefined,
            });

      if (result.success) {
        toast.success(isEditMode ? "Excepción actualizada correctamente" : "Excepción creada correctamente");
        handleClose();
        onSuccess();
      } else {
        toast.error(result.error ?? (isEditMode ? "Error al actualizar la excepción" : "Error al crear la excepción"));
      }
    } catch (error) {
      console.error("Error saving exception:", error);
      toast.error(isEditMode ? "Error al actualizar la excepción" : "Error al crear la excepción");
    } finally {
      setIsLoading(false);
    }
  }

  function addTimeSlot() {
    setTimeSlots([
      ...timeSlots,
      {
        startTime: "09:00",
        endTime: "14:00",
        slotType: "WORK",
        presenceType: "MANDATORY",
      },
    ]);
  }

  function removeTimeSlot(index: number) {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  }

  function updateTimeSlot(index: number, field: keyof (typeof timeSlots)[0], value: string) {
    const updated = [...timeSlots];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setTimeSlots(updated);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar Excepción" : "Nueva Excepción"} - {templateName}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifica los detalles de la excepción de horario"
              : "Configura una excepción de horario para esta plantilla"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sección: Información básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Información Básica</h3>

            {/* Tipo de excepción */}
            <div className="space-y-2">
              <Label>Tipo de Excepción</Label>
              <Select value={exceptionType} onValueChange={(value) => setExceptionType(value as ExceptionTypeEnum)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exceptionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-muted-foreground text-xs">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Fecha de inicio */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: es }) : "Selecciona una fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={es} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Fecha de fin (opcional) */}
              <div className="space-y-2">
                <Label>Fecha de Fin (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: es }) : "Sin fecha de fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      locale={es}
                      disabled={(date) => (date && date ? date < date : false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                placeholder="Ej: Viernes Santo, Cierre de verano, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>

            {/* Recurrencia anual */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked === true)}
              />
              <label
                htmlFor="recurring"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Repetir anualmente
              </label>
            </div>
            {isRecurring && (
              <p className="text-muted-foreground text-xs">
                Esta excepción se aplicará automáticamente cada año en la misma fecha
              </p>
            )}
          </div>

          {/* Sección: Configuración de horario */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Configuración de Horario</h3>

            {/* Toggle de horario personalizado */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customSchedule"
                checked={hasCustomSchedule}
                onCheckedChange={(checked) => {
                  setHasCustomSchedule(checked === true);
                  if (!checked) {
                    setTimeSlots([]);
                  }
                }}
              />
              <label
                htmlFor="customSchedule"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Configurar horario específico
              </label>
            </div>

            {hasCustomSchedule ? (
              <>
                <p className="text-muted-foreground text-sm">Define las franjas horarias para este día excepcional</p>

                {/* Lista de time slots */}
                <div className="space-y-2">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateTimeSlot(index, "startTime", e.target.value)}
                        className="w-28"
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateTimeSlot(index, "endTime", e.target.value)}
                        className="w-28"
                      />
                      <Select value={slot.slotType} onValueChange={(value) => updateTimeSlot(index, "slotType", value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WORK">Trabajo</SelectItem>
                          <SelectItem value="BREAK">Pausa</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTimeSlot(index)}>
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>

                <Button type="button" variant="outline" size="sm" onClick={addTimeSlot} className="w-full">
                  <Clock className="mr-2 h-4 w-4" />
                  Añadir Franja Horaria
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Este día no tendrá horario (día completo sin trabajo)</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? isEditMode
                ? "Actualizando..."
                : "Creando..."
              : isEditMode
                ? "Actualizar Excepción"
                : "Crear Excepción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

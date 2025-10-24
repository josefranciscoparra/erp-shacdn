"use client";

import { useState, useEffect } from "react";

import { format, startOfDay, setHours, setMinutes, isPast, isFuture, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useManualTimeEntryStore } from "@/stores/manual-time-entry-store";
import { useTimeCalendarStore } from "@/stores/time-calendar-store";

interface ManualTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

export function ManualTimeEntryDialog({ open, onOpenChange, initialDate }: ManualTimeEntryDialogProps) {
  const { createRequest, isLoading } = useManualTimeEntryStore();
  const { loadMonthlyData, selectedYear, selectedMonth } = useTimeCalendarStore();

  // Estados del formulario
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [clockInTime, setClockInTime] = useState<string>("09:00");
  const [clockOutTime, setClockOutTime] = useState<string>("18:00");
  const [reason, setReason] = useState<string>("");

  // Errores
  const [error, setError] = useState<string | null>(null);

  // Actualizar fecha cuando cambie initialDate
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Reset del formulario
  const resetForm = () => {
    setSelectedDate(initialDate);
    setClockInTime("09:00");
    setClockOutTime("18:00");
    setReason("");
    setError(null);
  };

  // Validar formulario
  const validateForm = (): boolean => {
    setError(null);

    if (!selectedDate) {
      setError("Selecciona una fecha");
      return false;
    }

    if (isFuture(startOfDay(selectedDate))) {
      setError("No puedes solicitar fichajes para fechas futuras");
      return false;
    }

    if (!clockInTime || !clockOutTime) {
      setError("Completa las horas de entrada y salida");
      return false;
    }

    if (clockInTime >= clockOutTime) {
      setError("La hora de entrada debe ser anterior a la hora de salida");
      return false;
    }

    if (!reason || reason.trim().length < 10) {
      setError("El motivo debe tener al menos 10 caracteres");
      return false;
    }

    return true;
  };

  // Manejar envío
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Construir las fechas completas
      const [inHours, inMinutes] = clockInTime.split(":").map(Number);
      const [outHours, outMinutes] = clockOutTime.split(":").map(Number);

      const clockInDateTime = setMinutes(setHours(selectedDate!, inHours), inMinutes);
      const clockOutDateTime = setMinutes(setHours(selectedDate!, outHours), outMinutes);

      await createRequest({
        date: startOfDay(selectedDate!),
        clockInTime: clockInDateTime,
        clockOutTime: clockOutDateTime,
        reason: reason.trim(),
      });

      // Recargar el calendario para mostrar la solicitud pendiente
      await loadMonthlyData(selectedYear, selectedMonth);

      toast.success("Solicitud enviada correctamente", {
        description: "Tu responsable recibirá una notificación",
      });

      resetForm();
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear la solicitud";
      setError(errorMessage);
      toast.error("Error al enviar solicitud", {
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar fichaje manual</DialogTitle>
          <DialogDescription>
            Si olvidaste fichar un día, puedes solicitar un fichaje manual. Tu responsable deberá aprobarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error general */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="date">Fecha del fichaje olvidado</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Selecciona una fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => isFuture(startOfDay(date)) || isToday(date)}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <p className="text-muted-foreground text-xs">Solo puedes solicitar fichajes de días pasados</p>
          </div>

          {/* Hora de entrada */}
          <div className="space-y-2">
            <Label htmlFor="clockInTime">Hora de entrada</Label>
            <Input
              id="clockInTime"
              type="time"
              value={clockInTime}
              onChange={(e) => setClockInTime(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Hora de salida */}
          <div className="space-y-2">
            <Label htmlFor="clockOutTime">Hora de salida</Label>
            <Input
              id="clockOutTime"
              type="time"
              value={clockOutTime}
              onChange={(e) => setClockOutTime(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Tiempo total calculado */}
          {clockInTime && clockOutTime && clockInTime < clockOutTime && (
            <div className="bg-muted/50 rounded-lg border p-3">
              <p className="text-sm font-medium">Tiempo total</p>
              <p className="text-muted-foreground text-xs">
                {(() => {
                  const [inH, inM] = clockInTime.split(":").map(Number);
                  const [outH, outM] = clockOutTime.split(":").map(Number);
                  const totalMinutes = outH * 60 + outM - (inH * 60 + inM);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  return `${hours}h ${minutes}min`;
                })()}
              </p>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (obligatorio)</Label>
            <Textarea
              id="reason"
              placeholder="Explica por qué olvidaste fichar ese día..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              rows={4}
              className="resize-none"
            />
            <p className="text-muted-foreground text-xs">
              {reason.length}/10 caracteres mínimo • {reason.length > 0 && reason.length < 10 && "Faltan caracteres"}
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar solicitud
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

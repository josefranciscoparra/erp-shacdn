"use client";

import { useState, useEffect } from "react";

import { format, startOfDay, endOfDay, setHours, setMinutes, isPast, isFuture, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, AlertTriangle, Clock, Check, User } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getMyApprover } from "@/server/actions/manual-time-entry";
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

  // Estados para advertencias de fichajes existentes
  const [confirmReplacement, setConfirmReplacement] = useState(false);

  // Aprobador
  const [approver, setApprover] = useState<{ name: string; role: string } | null>(null);
  const [loadingApprover, setLoadingApprover] = useState(false);

  // Actualizar fecha cuando cambie initialDate
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Cargar aprobador cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setLoadingApprover(true);
      getMyApprover()
        .then((data) => {
          if (data) {
            setApprover({ name: data.name, role: data.role });
          }
        })
        .catch((err) => {
          console.error("Error al cargar aprobador:", err);
        })
        .finally(() => {
          setLoadingApprover(false);
        });
    }
  }, [open]);

  // Resetear estados de advertencia cuando cambia la fecha
  useEffect(() => {
    setConfirmReplacement(false);
    // Nota: La detección de fichajes existentes se hace en el backend al enviar
    // Por ahora, solo mostramos un mensaje genérico de advertencia
  }, [selectedDate]);

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

      // IMPORTANTE: Enviar fecha a mediodía UTC para evitar problemas de timezone
      // El servidor está en UTC, pero el navegador puede estar en UTC+1 (España)
      // Si enviamos "5 nov 00:00 UTC+1", el servidor lo recibe como "4 nov 23:00 UTC"
      // Solución: enviamos "5 nov 12:00" para que incluso con offset de timezone, el día se mantenga
      const year = selectedDate!.getFullYear();
      const month = selectedDate!.getMonth();
      const day = selectedDate!.getDate();
      const dateAtNoonUTC = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));

      const clockInDateTime = setMinutes(setHours(selectedDate!, inHours), inMinutes);
      const clockOutDateTime = setMinutes(setHours(selectedDate!, outHours), outMinutes);

      await createRequest({
        date: dateAtNoonUTC,
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
      <DialogContent
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-97 data-[state=open]:zoom-in-98 max-h-[95vh] overflow-y-auto p-4 data-[state=closed]:duration-100 data-[state=open]:duration-150 sm:max-w-[600px] sm:p-6"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <style jsx global>{`
          @supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
            [data-radix-dialog-overlay] {
              background-color: rgba(0, 0, 0, 0.35) !important;
              backdrop-filter: none !important;
            }
          }
        `}</style>
        <DialogHeader>
          <DialogTitle className="mb-2 text-xl font-semibold">Solicitar fichaje manual</DialogTitle>
          <DialogDescription>
            Si olvidaste fichar un día, puedes solicitar un fichaje manual. Tu responsable deberá aprobarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Información del aprobador */}
          {loadingApprover ? (
            <div className="bg-muted/30 flex items-center gap-2 rounded-lg border p-3">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-sm">Cargando información del aprobador...</span>
            </div>
          ) : approver ? (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
              <User className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div className="flex-1 space-y-0.5">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-300">Esta solicitud será revisada por</p>
                <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">{approver.name}</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">{approver.role}</p>
              </div>
            </div>
          ) : null}

          {/* Advertencia de fichajes existentes - Bloque suave y premium */}
          {selectedDate && isPast(startOfDay(selectedDate)) && (
            <Alert className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertTitle className="text-orange-900 dark:text-orange-300">Atención</AlertTitle>
              <AlertDescription className="space-y-1 text-orange-700 dark:text-orange-400">
                <p>
                  Si ya tienes fichajes automáticos para este día, serán cancelados y reemplazados por los datos de esta
                  solicitud.
                </p>
                <p className="text-xs font-medium">
                  Los fichajes cancelados quedarán visibles en auditorías pero no contarán para el cómputo de horas.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Sección 1: Fecha del fichaje olvidado */}
          <div className="border-muted/30 space-y-4 border-b py-4">
            <div className="space-y-3">
              <Label htmlFor="date">Fecha del fichaje olvidado</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "hover:bg-muted/30 focus-visible:ring-primary/20 w-full justify-start text-left font-normal transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-1",
                      !selectedDate && "text-muted-foreground",
                    )}
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
          </div>

          {/* Sección 2: Hora de entrada / salida */}
          <div className="border-muted/30 space-y-4 border-b py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="clockInTime">Hora de entrada</Label>
                <Input
                  id="clockInTime"
                  type="time"
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  disabled={isLoading}
                  className="hover:bg-muted/30 focus-visible:ring-primary/20 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-1"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="clockOutTime">Hora de salida</Label>
                <Input
                  id="clockOutTime"
                  type="time"
                  value={clockOutTime}
                  onChange={(e) => setClockOutTime(e.target.value)}
                  disabled={isLoading}
                  className="hover:bg-muted/30 focus-visible:ring-primary/20 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-1"
                />
              </div>
            </div>

            {/* Tiempo total calculado - Badge Premium */}
            {clockInTime && clockOutTime && clockInTime < clockOutTime && (
              <div className="bg-primary/10 flex w-fit items-center gap-2 rounded-lg px-3 py-2">
                <Clock className="text-primary h-4 w-4" />
                <div>
                  <p className="text-primary/70 text-xs font-medium">Tiempo total</p>
                  <p className="text-primary text-sm font-semibold">
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
              </div>
            )}
          </div>

          {/* Sección 3: Motivo */}
          <div className="border-muted/30 space-y-4 border-b py-4">
            <div className="space-y-3">
              <Label htmlFor="reason">Motivo (obligatorio)</Label>
              <Textarea
                id="reason"
                placeholder="Explica por qué olvidaste fichar ese día..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
                rows={4}
                className="hover:bg-muted/30 focus-visible:ring-primary/20 resize-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-1"
              />
              <p className="text-muted-foreground text-xs">
                {reason.length}/10 caracteres mínimo • {reason.length > 0 && reason.length < 10 && "Faltan caracteres"}
              </p>
            </div>
          </div>

          {/* Sección 4: Confirmación final */}
          {selectedDate && isPast(startOfDay(selectedDate)) && (
            <div className="space-y-4 py-4">
              <div className="mt-4 mb-2 flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50/50 p-4 dark:border-orange-700 dark:bg-orange-950/20">
                <Checkbox
                  id="confirm-replacement"
                  checked={confirmReplacement}
                  onCheckedChange={(checked) => setConfirmReplacement(checked === true)}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <label
                  htmlFor="confirm-replacement"
                  className="cursor-pointer text-sm leading-tight font-medium text-orange-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-orange-300"
                >
                  Entiendo que si hay fichajes automáticos, se cancelarán y reemplazarán por los datos de esta solicitud
                </label>
              </div>
            </div>
          )}

          {/* Error de validación - Mostrado cerca de los botones para mejor visibilidad */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Botones - CTA Premium */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || (selectedDate && isPast(startOfDay(selectedDate)) && !confirmReplacement)}
              className="w-full shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-150 hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] active:scale-[0.97] sm:w-auto"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Enviar solicitud
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

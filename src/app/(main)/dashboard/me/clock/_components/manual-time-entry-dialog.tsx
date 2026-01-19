"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

import { format, startOfDay, isPast, isFuture, isToday } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Loader2,
  AlertTriangle,
  Clock,
  Check,
  User,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getManualTimeEntryPrefill, getMyApprover } from "@/server/actions/manual-time-entry";
import { formatDuration, minutesToTime, timeToMinutes } from "@/services/schedules/schedule-helpers";
import { useManualTimeEntryStore } from "@/stores/manual-time-entry-store";
import { useTimeCalendarStore } from "@/stores/time-calendar-store";

interface ManualTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

type ManualSlotForm = {
  id: string;
  slotType: "WORK" | "BREAK";
  startTime: string;
  endTime: string;
};

const createSlotId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildDefaultSlots = (): ManualSlotForm[] => [
  {
    id: createSlotId(),
    slotType: "WORK",
    startTime: "09:00",
    endTime: "18:00",
  },
];

export function ManualTimeEntryDialog({ open, onOpenChange, initialDate }: ManualTimeEntryDialogProps) {
  const { createRequest, isLoading } = useManualTimeEntryStore();
  const { loadMonthlyData, selectedYear, selectedMonth } = useTimeCalendarStore();

  // Estados del formulario
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [slots, setSlots] = useState<ManualSlotForm[]>(buildDefaultSlots());
  const [reason, setReason] = useState<string>("");

  // Errores
  const [error, setError] = useState<string | null>(null);
  const [prefillError, setPrefillError] = useState<string | null>(null);

  // Estados para advertencias de fichajes existentes
  const [confirmReplacement, setConfirmReplacement] = useState(false);

  // Aprobador
  const [approver, setApprover] = useState<{ name: string; role: string } | null>(null);
  const [loadingApprover, setLoadingApprover] = useState(false);
  const [approverError, setApproverError] = useState<string | null>(null);

  const [isPrefillLoading, setIsPrefillLoading] = useState(false);
  const [hasManualChanges, setHasManualChanges] = useState(false);
  const [prefillSource, setPrefillSource] = useState<"SCHEDULE" | "DEFAULT" | null>(null);

  const getFriendlyErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      const raw = err.message;
      if (raw.includes("No se encontró un aprobador disponible")) {
        return "No hay aprobadores disponibles. Revisa Ajustes → Aprobaciones.";
      }
      if (raw.includes("Empleado no pertenece a la organización activa")) {
        return "Cambia a tu organización de empleado para poder fichar.";
      }
      if (raw.includes("Usuario no tiene un empleado asociado")) {
        return "Tu usuario no tiene ficha de empleado asociada. Contacta con RRHH.";
      }
      return raw;
    }

    return "Error al crear la solicitud. Intenta de nuevo o contacta con RRHH.";
  };

  const resetForm = useCallback(() => {
    setSelectedDate(initialDate);
    setSlots(buildDefaultSlots());
    setReason("");
    setError(null);
    setPrefillError(null);
    setConfirmReplacement(false);
    setHasManualChanges(false);
    setPrefillSource(null);
    setApproverError(null);
  }, [initialDate]);

  const applyPrefill = useCallback(async (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    setIsPrefillLoading(true);
    setPrefillError(null);
    try {
      const result = await getManualTimeEntryPrefill(dateKey);
      if (result.success && result.slots.length > 0) {
        setSlots(
          result.slots.map((slot) => ({
            id: createSlotId(),
            slotType: slot.slotType === "BREAK" ? "BREAK" : "WORK",
            startTime: minutesToTime(slot.startMinutes),
            endTime: minutesToTime(slot.endMinutes),
          })),
        );
        setPrefillSource("SCHEDULE");
      } else {
        setSlots(buildDefaultSlots());
        setPrefillSource("DEFAULT");
        if (!result.success && result.error) {
          setPrefillError(result.error);
        }
      }
    } catch (err) {
      console.error("Error al precargar horario:", err);
      setSlots(buildDefaultSlots());
      setPrefillSource("DEFAULT");
      setPrefillError("No se pudo cargar el horario");
    } finally {
      setIsPrefillLoading(false);
    }
  }, []);

  const handleDateSelection = (date?: Date) => {
    setSelectedDate(date);
    setHasManualChanges(false);
  };

  const handleSlotChange = (slotId: string, field: "slotType" | "startTime" | "endTime", value: string) => {
    setSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, [field]: value } : slot)));
    setHasManualChanges(true);
  };

  const handleAddSlot = (slotType: "WORK" | "BREAK") => {
    setSlots((prev) => [
      ...prev,
      {
        id: createSlotId(),
        slotType,
        startTime: "09:00",
        endTime: "18:00",
      },
    ]);
    setHasManualChanges(true);
  };

  const handleRemoveSlot = (slotId: string) => {
    setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
    setHasManualChanges(true);
  };

  const handleRestoreSchedule = () => {
    if (selectedDate) {
      setHasManualChanges(false);
      applyPrefill(selectedDate);
    }
  };

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
      setApprover(null);
      setApproverError(null);
      getMyApprover()
        .then((data) => {
          if (data) {
            setApprover({ name: data.name, role: data.role });
            return;
          }
          const message = "No se encontró un aprobador disponible. Contacta con RRHH.";
          setApproverError(message);
          toast.error(message);
        })
        .catch((err) => {
          console.error("Error al cargar aprobador:", err);
          const message = err instanceof Error ? err.message : "No se pudo cargar el aprobador. Contacta con RRHH.";
          setApproverError(message);
          toast.error(message);
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

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    if (selectedDate && !hasManualChanges) {
      applyPrefill(selectedDate);
    }
  }, [open, selectedDate, hasManualChanges, applyPrefill, resetForm]);

  const parseSlotsForSubmit = () => {
    if (slots.length === 0) {
      setError("Añade al menos un tramo de trabajo");
      return null;
    }

    const parsed = slots.map((slot, index) => {
      try {
        const startMinutes = timeToMinutes(slot.startTime);
        const endMinutes = timeToMinutes(slot.endTime);
        return {
          startMinutes,
          endMinutes,
          slotType: slot.slotType,
          order: index,
        };
      } catch {
        return null;
      }
    });

    if (parsed.some((slot) => !slot)) {
      setError("Revisa las horas de los tramos");
      return null;
    }

    const normalized = (
      parsed.filter(Boolean) as Array<{
        startMinutes: number;
        endMinutes: number;
        slotType: "WORK" | "BREAK";
        order: number;
      }>
    ).sort((a, b) => {
      if (a.startMinutes === b.startMinutes) {
        return a.order - b.order;
      }
      return a.startMinutes - b.startMinutes;
    });

    if (normalized[0]?.slotType !== "WORK") {
      setError("El primer tramo debe ser de trabajo");
      return null;
    }

    const lastSlot = normalized[normalized.length - 1];
    if (lastSlot?.slotType !== "WORK") {
      setError("El último tramo debe ser de trabajo");
      return null;
    }

    let totalWorkMinutes = 0;
    for (let i = 0; i < normalized.length; i += 1) {
      const slot = normalized[i];
      if (slot.startMinutes >= slot.endMinutes) {
        setError("La hora de inicio debe ser anterior a la hora de fin");
        return null;
      }

      const prev = normalized[i - 1];
      if (prev && slot.startMinutes < prev.endMinutes) {
        setError("Hay solapamientos entre tramos");
        return null;
      }

      if (slot.slotType === "WORK") {
        totalWorkMinutes += slot.endMinutes - slot.startMinutes;
      }
    }

    if (totalWorkMinutes <= 0) {
      setError("Añade al menos un tramo de trabajo");
      return null;
    }

    return normalized;
  };

  // Validar formulario
  const validateForm = (): boolean => {
    setError(null);

    if (approverError) {
      setError(approverError);
      return false;
    }

    if (!selectedDate) {
      setError("Selecciona una fecha");
      return false;
    }

    if (isFuture(startOfDay(selectedDate))) {
      setError("No puedes solicitar fichajes para fechas futuras");
      return false;
    }

    if (!reason || reason.trim().length < 10) {
      setError("El motivo debe tener al menos 10 caracteres");
      return false;
    }

    const slotsPayload = parseSlotsForSubmit();
    if (!slotsPayload) {
      return false;
    }

    return true;
  };

  const slotTotals = useMemo(() => {
    let workMinutes = 0;
    let breakMinutes = 0;
    let hasInvalid = false;

    slots.forEach((slot) => {
      try {
        const start = timeToMinutes(slot.startTime);
        const end = timeToMinutes(slot.endTime);
        if (end <= start) {
          hasInvalid = true;
          return;
        }
        if (slot.slotType === "WORK") {
          workMinutes += end - start;
        } else {
          breakMinutes += end - start;
        }
      } catch {
        hasInvalid = true;
      }
    });

    return {
      workMinutes,
      breakMinutes,
      hasInvalid,
    };
  }, [slots]);

  // Manejar envío
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const slotsPayload = parseSlotsForSubmit();
      if (!slotsPayload) {
        return;
      }

      const dateKey = format(selectedDate!, "yyyy-MM-dd");

      await createRequest({
        dateKey,
        slots: slotsPayload,
        reason: reason.trim(),
        timezoneOffsetMinutes: selectedDate!.getTimezoneOffset(),
      });

      // Recargar el calendario para mostrar la solicitud pendiente
      await loadMonthlyData(selectedYear, selectedMonth);

      toast.success("Solicitud enviada correctamente", {
        description: "Tu responsable recibirá una notificación",
      });

      resetForm();
      onOpenChange(false);
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err);
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
          ) : approverError ? (
            <Alert variant="destructive">
              <AlertTitle>No hay aprobador disponible</AlertTitle>
              <AlertDescription>{approverError}</AlertDescription>
            </Alert>
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
                    onSelect={handleDateSelection}
                    disabled={(date) => isFuture(startOfDay(date)) || isToday(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-muted-foreground text-xs">Solo puedes solicitar fichajes de días pasados</p>
            </div>
          </div>

          {/* Sección 2: Tramos del día */}
          <div className="border-muted/30 space-y-4 border-b py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label>Tramos del día</Label>
                <p className="text-muted-foreground text-xs">Añade trabajo y pausas según lo que realmente ocurrió.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSlot("WORK")}
                  disabled={isLoading}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir trabajo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSlot("BREAK")}
                  disabled={isLoading}
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir pausa
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRestoreSchedule}
                  disabled={!selectedDate || isPrefillLoading || isLoading}
                  aria-label="Restaurar horario"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isPrefillLoading && (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Precargando horario...
              </div>
            )}

            {prefillSource && (
              <div className="text-muted-foreground text-xs">
                {prefillSource === "SCHEDULE"
                  ? "Horario precargado automáticamente. Puedes editarlo libremente."
                  : "Sin horario definido. Se cargó un tramo por defecto."}
              </div>
            )}

            {prefillError && <div className="text-destructive text-xs">{prefillError}</div>}

            <div className="space-y-2">
              {slots.map((slot) => (
                <div key={slot.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                  <Select value={slot.slotType} onValueChange={(value) => handleSlotChange(slot.id, "slotType", value)}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WORK">Trabajo</SelectItem>
                      <SelectItem value="BREAK">Pausa</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => handleSlotChange(slot.id, "startTime", e.target.value)}
                      disabled={isLoading}
                      className="hover:bg-muted/30 focus-visible:ring-primary/20 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-1"
                    />
                    <span className="text-muted-foreground text-xs">—</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => handleSlotChange(slot.id, "endTime", e.target.value)}
                      disabled={isLoading}
                      className="hover:bg-muted/30 focus-visible:ring-primary/20 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-1"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSlot(slot.id)}
                    disabled={slots.length === 1 || isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-primary/10 flex items-center gap-2 rounded-lg px-3 py-2">
                <Clock className="text-primary h-4 w-4" />
                <div>
                  <p className="text-primary/70 text-xs font-medium">Trabajo total</p>
                  <p className="text-primary text-sm font-semibold">{formatDuration(slotTotals.workMinutes)}</p>
                </div>
              </div>

              <div className="bg-muted/30 flex items-center gap-2 rounded-lg px-3 py-2">
                <Clock className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Pausas</p>
                  <p className="text-sm font-semibold">{formatDuration(slotTotals.breakMinutes)}</p>
                </div>
              </div>
            </div>
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
              disabled={
                isLoading ||
                loadingApprover ||
                Boolean(approverError) ||
                (selectedDate && isPast(startOfDay(selectedDate)) && !confirmReplacement)
              }
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

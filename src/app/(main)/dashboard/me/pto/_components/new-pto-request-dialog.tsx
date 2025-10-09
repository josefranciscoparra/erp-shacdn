"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { calculateWorkingDays } from "@/server/actions/employee-pto";
import { usePtoStore } from "@/stores/pto-store";

interface NewPtoRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPtoRequestDialog({ open, onOpenChange }: NewPtoRequestDialogProps) {
  const { absenceTypes, balance, createRequest, isSubmitting } = usePtoStore();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState("");
  const [workingDaysCalc, setWorkingDaysCalc] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Array<{ date: Date; name: string }>>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calcular días hábiles cuando cambien las fechas
  const hasActiveContract = balance?.hasActiveContract !== false;
  const hasProvisionalContract = balance?.hasProvisionalContract === true;

  useEffect(() => {
    if (!hasActiveContract) {
      setWorkingDaysCalc(null);
      setHolidays([]);
      return;
    }

    if (startDate && endDate && startDate <= endDate) {
      setIsCalculating(true);
      calculateWorkingDays(startDate, endDate, "", "")
        .then((result) => {
          setWorkingDaysCalc(result.workingDays);
          setHolidays(result.holidays);
        })
        .catch(() => {
          setWorkingDaysCalc(null);
          setHolidays([]);
        })
        .finally(() => {
          setIsCalculating(false);
        });
    } else {
      setWorkingDaysCalc(null);
      setHolidays([]);
    }
  }, [hasActiveContract, startDate, endDate]);

  const handleSubmit = async () => {
    if (!selectedTypeId || !startDate || !endDate) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      await createRequest({
        absenceTypeId: selectedTypeId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });

      toast.success("Solicitud enviada correctamente");

      // Limpiar formulario
      setSelectedTypeId("");
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
      setWorkingDaysCalc(null);
      setHolidays([]);

      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear la solicitud");
    }
  };

  const selectedType = absenceTypes.find((t) => t.id === selectedTypeId);
  const hasEnoughDays = balance && workingDaysCalc ? balance.daysAvailable >= workingDaysCalc : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-100 dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de ausencia</DialogTitle>
          <DialogDescription>Completa el formulario para solicitar días de ausencia</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!hasActiveContract && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-1 h-4 w-4" />
                <AlertDescription>
                  {hasProvisionalContract
                    ? "Tu contrato está pendiente de completar. Contacta con RRHH para poder solicitar vacaciones."
                    : "Aún no tienes un contrato activo asignado. Contacta con RRHH para poder solicitar vacaciones."}
                </AlertDescription>
              </div>
            </Alert>
          )}
          {/* Tipo de ausencia */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="absence-type">Tipo de ausencia *</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId} disabled={!hasActiveContract}>
              <SelectTrigger id="absence-type" className="bg-white">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {absenceTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                      {type.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType?.description && <p className="text-muted-foreground text-xs">{selectedType.description}</p>}
          </div>

          {/* Fechas */}
          <div className="grid gap-4 @md/card:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Fecha de inicio *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                    disabled={!hasActiveContract}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP", { locale: es }) : "Selecciona fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={es}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Fecha de fin *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    disabled={!hasActiveContract}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: es }) : "Selecciona fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={es}
                    disabled={(date) => {
                      if (!startDate) return date < new Date(new Date().setHours(0, 0, 0, 0));
                      return date < startDate;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Cálculo de días hábiles */}
          {startDate && endDate && (
            <Alert className={cn(!hasEnoughDays && "border-destructive bg-destructive/10")}>
              <div className="flex items-start gap-2">
                {isCalculating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !hasEnoughDays ? (
                  <AlertCircle className="text-destructive h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    {isCalculating ? (
                      "Calculando días hábiles..."
                    ) : workingDaysCalc !== null ? (
                      <>
                        <p className="font-semibold">
                          {workingDaysCalc} {workingDaysCalc === 1 ? "día hábil" : "días hábiles"}
                        </p>
                        {holidays.length > 0 && (
                          <p className="mt-1 text-xs">Festivos en el rango: {holidays.map((h) => h.name).join(", ")}</p>
                        )}
                        {!hasEnoughDays && (
                          <p className="text-destructive mt-1 text-xs">
                            No tienes suficientes días disponibles (faltan{" "}
                            {(workingDaysCalc - (balance?.daysAvailable ?? 0)).toFixed(1)} días)
                          </p>
                        )}
                      </>
                    ) : null}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Motivo */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Describe brevemente el motivo de tu ausencia"
              className="placeholder:text-muted-foreground/50 bg-white"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!hasActiveContract}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedTypeId ||
                !startDate ||
                !endDate ||
                !hasEnoughDays ||
                isSubmitting ||
                isCalculating ||
                !hasActiveContract
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar solicitud"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

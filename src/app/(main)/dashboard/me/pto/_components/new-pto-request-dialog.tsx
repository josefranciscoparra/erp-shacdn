"use client";

import { useState, useEffect, useMemo, memo } from "react";

import type { AbsenceType } from "@prisma/client";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { calculateWorkingDays } from "@/server/actions/employee-pto";
import { usePtoStore, type PtoBalance } from "@/stores/pto-store";

interface NewPtoRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Componente memoizado para la visualización de días hábiles
interface WorkingDaysDisplayProps {
  selectedType: AbsenceType | null;
  balance: PtoBalance | null;
  workingDaysCalc: number | null;
  holidays: Array<{ date: Date; name: string }>;
  isCalculating: boolean;
  hasEnoughDays: boolean;
}

const WorkingDaysDisplay = memo(function WorkingDaysDisplay({
  selectedType,
  balance,
  workingDaysCalc,
  holidays,
  isCalculating,
  hasEnoughDays,
}: WorkingDaysDisplayProps) {
  // Helper para formatear días (quita .0 si es entero)
  const formatDays = (days: number) => (days % 1 === 0 ? days.toFixed(0) : days.toFixed(1));

  const progressBarWidths = useMemo(() => {
    if (!balance || !selectedType?.affectsBalance) return { used: 0, selected: 0 };

    const usedPercent = Math.min((balance.daysUsed / balance.annualAllowance) * 100, 100);
    const selectedPercent = workingDaysCalc
      ? Math.min((workingDaysCalc / balance.annualAllowance) * 100, 100 - usedPercent)
      : 0;

    return {
      used: usedPercent,
      selected: selectedPercent,
    };
  }, [balance, workingDaysCalc, selectedType]);

  if (!selectedType) return null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 dark:bg-gray-800",
        !hasEnoughDays && workingDaysCalc && "border-destructive bg-destructive/5 dark:bg-destructive/10",
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="text-lg font-semibold">{selectedType.name}</h4>
          {selectedType.affectsBalance && balance && (
            <p className="text-muted-foreground text-sm">
              Año {balance.year} • {formatDays(balance.daysAvailable)} de {formatDays(balance.annualAllowance)} días
              disponibles
            </p>
          )}
        </div>
        {workingDaysCalc !== null && (
          <>
            {!hasEnoughDays ? (
              <AlertCircle className="text-destructive h-5 w-5" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
          </>
        )}
      </div>

      {/* Estado de cálculo o información */}
      {isCalculating ? (
        <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando días hábiles...
        </div>
      ) : workingDaysCalc !== null ? (
        <>
          {/* Stats con días */}
          {selectedType.affectsBalance && balance && (
            <div className="space-y-3">
              {/* Resumen numérico */}
              <div className="flex items-baseline justify-center gap-2 rounded-md bg-gray-50 py-3 dark:bg-gray-900">
                <div className="w-full text-center">
                  <div className="text-2xl font-bold whitespace-nowrap">
                    {formatDays(balance.daysUsed)} <span className="text-green-600">+{workingDaysCalc}</span>{" "}
                    <span className="text-muted-foreground">/ {formatDays(balance.annualAllowance)}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">días consumidos + solicitados / total anual</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                {/* Días consumidos (verde oscuro) */}
                <div
                  className="absolute bg-green-700 transition-all duration-300"
                  style={{
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${progressBarWidths.used}%`,
                  }}
                />
                {/* Días seleccionados (verde claro) */}
                <div
                  className="absolute bg-green-400 transition-all duration-300"
                  style={{
                    top: 0,
                    bottom: 0,
                    left: `${progressBarWidths.used}%`,
                    width: `${progressBarWidths.selected}%`,
                  }}
                />
              </div>

              {/* Leyenda de la barra */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-green-700" />
                  <span className="text-muted-foreground">Consumidos ({formatDays(balance.daysUsed)})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-green-400" />
                  <span className="text-muted-foreground">A solicitar (+{workingDaysCalc})</span>
                </div>
              </div>
            </div>
          )}

          {/* Info adicional */}
          <div className="text-muted-foreground mt-3 space-y-1.5 border-t pt-3 text-xs">
            {selectedType.affectsBalance && balance && <p>✓ Válido hasta el 30 de enero de {balance.year + 1}</p>}
            <p>✓ Solo cuenta días laborales según tu contrato</p>
            {holidays.length > 0 && (
              <p className="text-blue-600 dark:text-blue-400">
                🎉 Festivos incluidos: {holidays.map((h) => h.name).join(", ")}
              </p>
            )}
          </div>

          {/* Error message */}
          {!hasEnoughDays && (
            <Alert className="border-destructive bg-destructive/10 mt-3">
              <AlertCircle className="text-destructive h-4 w-4" />
              <AlertDescription className="text-destructive">
                ⚠️ No tienes suficientes días disponibles. Faltan{" "}
                {formatDays(workingDaysCalc - (balance?.daysAvailable ?? 0))} días.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <div className="text-muted-foreground py-2 text-sm">
          Selecciona un rango de fechas para ver el cálculo de días hábiles.
        </div>
      )}
    </div>
  );
});

export function NewPtoRequestDialog({ open, onOpenChange }: NewPtoRequestDialogProps) {
  const { absenceTypes, balance, createRequest, isSubmitting } = usePtoStore();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
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

    if (dateRange?.from && dateRange?.to && dateRange.from <= dateRange.to) {
      // Debounce para evitar cálculos mientras el usuario selecciona
      const timeout = setTimeout(() => {
        setIsCalculating(true);
        calculateWorkingDays(dateRange.from, dateRange.to, "", "")
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
      }, 300);

      return () => clearTimeout(timeout);
    } else {
      setWorkingDaysCalc(null);
      setHolidays([]);
    }
  }, [hasActiveContract, dateRange]);

  const handleSubmit = async () => {
    if (!selectedTypeId || !dateRange?.from || !dateRange?.to) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      await createRequest({
        absenceTypeId: selectedTypeId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        reason: reason.trim() || undefined,
      });

      toast.success("Solicitud enviada correctamente");

      // Limpiar formulario
      setSelectedTypeId("");
      setDateRange(undefined);
      setReason("");
      setWorkingDaysCalc(null);
      setHolidays([]);

      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear la solicitud");
    }
  };

  const selectedType = absenceTypes.find((t) => t.id === selectedTypeId) ?? null;
  const hasEnoughDays =
    selectedType?.affectsBalance && balance && workingDaysCalc ? balance.daysAvailable >= workingDaysCalc : true;

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

          {/* Información del tipo de ausencia */}
          {selectedType && (
            <WorkingDaysDisplay
              selectedType={selectedType}
              balance={balance}
              workingDaysCalc={workingDaysCalc}
              holidays={holidays}
              isCalculating={isCalculating}
              hasEnoughDays={hasEnoughDays}
            />
          )}

          {/* Rango de fechas */}
          <div className="flex flex-col gap-2">
            <Label>Fechas de ausencia *</Label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              placeholder="Selecciona el rango de fechas"
              disabled={!hasActiveContract || !selectedType}
            />
          </div>

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
              disabled={!hasActiveContract || !selectedType}
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
                !dateRange?.from ||
                !dateRange?.to ||
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

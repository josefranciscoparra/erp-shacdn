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

  // Calcular días restantes
  const remainingDays = balance ? balance.daysAvailable - (workingDaysCalc ?? 0) : 0;

  return (
    <div
      className={cn(
        "rounded-[14px] border bg-white p-6 shadow-sm dark:bg-gray-800",
        !hasEnoughDays && workingDaysCalc && "border-destructive bg-destructive/5 dark:bg-destructive/10",
      )}
    >
      {/* Header minimalista */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold">
            {selectedType.name} — Año {balance?.year ?? new Date().getFullYear()}
          </h4>
          {selectedType.affectsBalance && balance && (
            <p className="text-muted-foreground mt-0.5 text-sm">
              {formatDays(balance.daysAvailable)} disponibles / {formatDays(balance.annualAllowance)} totales
            </p>
          )}
        </div>
        {workingDaysCalc !== null && (
          <>
            {!hasEnoughDays ? (
              <AlertCircle className="text-destructive h-5 w-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
            )}
          </>
        )}
      </div>

      {/* Estado de cálculo o información */}
      {isCalculating ? (
        <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando días hábiles...
        </div>
      ) : workingDaysCalc !== null ? (
        <>
          {/* Grid de métricas - estilo Notion/Linear */}
          {selectedType.affectsBalance && balance && (
            <div className="space-y-4">
              {/* Grid de 3 columnas con métricas */}
              <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                <div className="text-center">
                  <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">Consumo</div>
                  <div className="text-xl font-bold">
                    {formatDays(balance.daysUsed)} día{balance.daysUsed !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                    Solicitar
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    +{workingDaysCalc} día{workingDaysCalc !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">Restante</div>
                  <div className={cn("text-xl font-bold", remainingDays < 0 && "text-destructive")}>
                    {formatDays(Math.max(0, remainingDays))} día{remainingDays !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Progress bar minimalista */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                {/* Días consumidos (verde oscuro) */}
                <div
                  className="absolute bg-emerald-600 transition-all duration-300"
                  style={{
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${progressBarWidths.used}%`,
                  }}
                />
                {/* Días seleccionados (verde claro) */}
                <div
                  className="absolute bg-emerald-400 transition-all duration-300"
                  style={{
                    top: 0,
                    bottom: 0,
                    left: `${progressBarWidths.used}%`,
                    width: `${progressBarWidths.selected}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Info adicional minimalista */}
          <div className="text-muted-foreground mt-4 space-y-1.5 text-xs">
            {selectedType.affectsBalance && balance && (
              <p className="flex items-center gap-1.5">
                <span className="text-green-600">✔</span> Válido hasta el 30 de enero de {balance.year + 1}
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <span className="text-green-600">✔</span> Solo días laborables según contrato
            </p>
            {holidays.length > 0 && (
              <p className="flex items-start gap-1.5 text-blue-600 dark:text-blue-400">
                <span>🎉</span>
                <span>Festivos incluidos: {holidays.map((h) => h.name).join(", ")}</span>
              </p>
            )}
          </div>

          {/* Error message */}
          {!hasEnoughDays && (
            <Alert className="border-destructive bg-destructive/10 mt-4">
              <AlertCircle className="text-destructive h-4 w-4" />
              <AlertDescription className="text-destructive text-sm">
                No tienes suficientes días disponibles. Faltan{" "}
                {formatDays(workingDaysCalc - (balance?.daysAvailable ?? 0))} días.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <div className="text-muted-foreground py-3 text-sm">
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

  // Limpiar formulario cuando se cierre la modal
  useEffect(() => {
    if (!open) {
      setSelectedTypeId("");
      setDateRange(undefined);
      setReason("");
      setWorkingDaysCalc(null);
      setHolidays([]);
    }
  }, [open]);

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

      // Cerrar modal (el useEffect se encargará de limpiar)
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-gray-100 dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de ausencia</DialogTitle>
          <DialogDescription>Completa el formulario para solicitar días de ausencia</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {!hasActiveContract && (
            <Alert className="rounded-[14px] border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-1 h-4 w-4 flex-shrink-0" />
                <AlertDescription>
                  {hasProvisionalContract
                    ? "Tu contrato está pendiente de completar. Contacta con RRHH para poder solicitar vacaciones."
                    : "Aún no tienes un contrato activo asignado. Contacta con RRHH para poder solicitar vacaciones."}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Sección 1: Tipo de ausencia */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="absence-type" className="text-muted-foreground text-sm font-medium">
              Tipo de ausencia
            </Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId} disabled={!hasActiveContract}>
              <SelectTrigger id="absence-type" className="rounded-[14px] bg-white shadow-sm dark:bg-gray-800">
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
          </div>

          {/* Sección 2: Resumen visual de días */}
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

          {/* Sección 3: Fechas seleccionadas */}
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-sm font-medium">Fechas seleccionadas</Label>
            <p className="text-muted-foreground mb-1 text-xs">Selecciona un rango de días laborables</p>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              placeholder="Selecciona el rango de fechas"
              disabled={!hasActiveContract || !selectedType}
            />
          </div>

          {/* Sección 4: Motivo (opcional) */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason" className="text-muted-foreground text-sm font-medium">
              Motivo (opcional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Describe brevemente el motivo (si aplica)"
              className="placeholder:text-muted-foreground/50 rounded-[14px] bg-white shadow-sm dark:bg-gray-800"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!hasActiveContract || !selectedType}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-[14px]"
            >
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
              className="rounded-[14px]"
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

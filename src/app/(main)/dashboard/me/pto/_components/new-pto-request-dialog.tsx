"use client";

import { useState, useEffect, useMemo, memo } from "react";

import type { AbsenceType } from "@prisma/client";
import { startOfDay, subDays } from "date-fns";
import { Loader2, AlertCircle, CheckCircle, Paperclip } from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { DocumentUploadZone, type PendingFile } from "@/components/pto";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PTO_BALANCE_TYPE, type PtoBalanceType } from "@/lib/pto/balance-types";
import { cn } from "@/lib/utils";
import { getOrganizationPtoConfig } from "@/server/actions/admin-pto";
import { formatMinutes, formatWorkingDays } from "@/services/pto/pto-helpers-client";
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
  partialDurationMinutes?: number | null;
  workdayMinutesSnapshot?: number;
  holidays: Array<{ date: Date; name: string }>;
  isCalculating: boolean;
  isLoadingBalance: boolean;
  hasEnoughDays: boolean;
  carryoverPolicy: {
    mode: "NONE" | "UNTIL_DATE" | "UNLIMITED";
    requestDeadlineMonth: number;
    requestDeadlineDay: number;
    usageDeadlineMonth: number;
    usageDeadlineDay: number;
  } | null;
}

const monthLabels = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const WorkingDaysDisplay = memo(function WorkingDaysDisplay({
  selectedType,
  balance,
  workingDaysCalc,
  partialDurationMinutes,
  workdayMinutesSnapshot,
  holidays,
  isCalculating,
  isLoadingBalance,
  hasEnoughDays,
  carryoverPolicy,
}: WorkingDaysDisplayProps) {
  const selectedBalanceType: PtoBalanceType =
    (selectedType as { balanceType?: PtoBalanceType | null }).balanceType ?? DEFAULT_PTO_BALANCE_TYPE;
  const isVacationBalance = selectedBalanceType === "VACATION";

  const formatDays = (days: number) => {
    const rounded = Math.round(days * 10) / 10;
    return {
      rounded,
      label: formatWorkingDays(rounded),
    };
  };

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

  const policyDescription = useMemo(() => {
    if (!carryoverPolicy || !balance || !selectedType?.affectsBalance || !isVacationBalance) return null;

    if (carryoverPolicy.mode === "UNLIMITED") {
      return "Las vacaciones no usadas se acumulan sin caducidad.";
    }

    if (carryoverPolicy.mode === "UNTIL_DATE") {
      const requestMonthLabel = monthLabels[carryoverPolicy.requestDeadlineMonth - 1] ?? "enero";
      const usageMonthLabel = monthLabels[carryoverPolicy.usageDeadlineMonth - 1] ?? "enero";
      return `Puedes solicitar hasta el ${carryoverPolicy.requestDeadlineDay} de ${requestMonthLabel} y disfrutarlas hasta el ${carryoverPolicy.usageDeadlineDay} de ${usageMonthLabel} de ${
        balance.year + 1
      }.`;
    }

    return `Las vacaciones no usadas caducan el 31 de diciembre de ${balance.year}.`;
  }, [balance, carryoverPolicy, isVacationBalance, selectedType?.affectsBalance]);

  if (!selectedType) return null;

  if (selectedType.affectsBalance && isLoadingBalance) {
    return (
      <div className="rounded-[14px] border bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando balance disponible...
        </div>
      </div>
    );
  }

  // Calcular días restantes
  const remainingDays = balance ? balance.daysAvailable - (workingDaysCalc ?? 0) : 0;
  const remainingDisplay = formatDays(Math.max(0, remainingDays));
  const usedDisplay = balance ? formatDays(balance.daysUsed) : null;
  const pendingDisplay = balance ? formatDays(balance.daysPending) : null;
  const availableDisplay = balance ? formatDays(balance.daysAvailable) : null;
  const allowanceDisplay = balance ? formatDays(balance.annualAllowance) : null;
  const requestDisplay = workingDaysCalc !== null ? formatDays(workingDaysCalc) : null;
  const hasPartialRequest = partialDurationMinutes !== null && partialDurationMinutes !== undefined;
  const partialRequestLabel = hasPartialRequest
    ? formatMinutes(partialDurationMinutes, workdayMinutesSnapshot ?? 480)
    : null;
  const partialDaysLabel =
    hasPartialRequest && requestDisplay
      ? `${requestDisplay.label} día${requestDisplay.rounded === 1 ? "" : "s"}`
      : null;
  const missingDays = workingDaysCalc !== null ? workingDaysCalc - (balance?.daysAvailable ?? 0) : 0;
  const missingDisplay = formatDays(missingDays);

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
              {availableDisplay?.label} disponibles / {allowanceDisplay?.label} totales
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
                    {usedDisplay?.label} día{usedDisplay?.rounded === 1 ? "" : "s"}
                  </div>
                  {balance.daysPending > 0 && pendingDisplay && (
                    <div className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-500">
                      (+{pendingDisplay.label} en trámite)
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                    Solicitud
                  </div>
                  {hasPartialRequest ? (
                    <div className="flex flex-col items-center">
                      <div className="text-xl font-bold text-green-600">+{partialRequestLabel}</div>
                      {partialDaysLabel && (
                        <div className="text-muted-foreground mt-1 text-xs">≈ {partialDaysLabel}</div>
                      )}
                    </div>
                  ) : (
                    requestDisplay && (
                      <div className="text-xl font-bold text-green-600">
                        +{requestDisplay.label} día{requestDisplay.rounded === 1 ? "" : "s"}
                      </div>
                    )
                  )}
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">Restante</div>
                  <div className={cn("text-xl font-bold", remainingDays < 0 && "text-destructive")}>
                    {remainingDisplay.label} día{remainingDisplay.rounded === 1 ? "" : "s"}
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
          <ul className="text-muted-foreground mt-4 space-y-2 text-xs">
            {policyDescription && (
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                <span>{policyDescription}</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
              <span>Se excluyen festivos y días no laborables</span>
            </li>
            {holidays.length > 0 && (
              <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                <span className="flex-shrink-0">🎉</span>
                <span>Festivos incluidos: {holidays.map((h) => h.name).join(", ")}</span>
              </li>
            )}
          </ul>

          {/* Error message */}
          {!hasEnoughDays && (
            <Alert className="border-destructive bg-destructive/10 mt-4">
              <AlertCircle className="text-destructive h-4 w-4" />
              <AlertDescription className="text-destructive text-sm">
                No tienes suficientes días disponibles. Faltan {missingDisplay.label} días.
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
  const {
    absenceTypes,
    balance,
    balancesByType,
    isLoadingBalanceByType,
    loadBalanceByType,
    createRequest,
    isSubmitting,
    calculateWorkingDays,
    requests,
  } = usePtoStore();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState("");
  const [workingDaysCalc, setWorkingDaysCalc] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Array<{ date: Date; name: string }>>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [carryoverPolicy, setCarryoverPolicy] = useState<{
    mode: "NONE" | "UNTIL_DATE" | "UNLIMITED";
    requestDeadlineMonth: number;
    requestDeadlineDay: number;
    usageDeadlineMonth: number;
    usageDeadlineDay: number;
  } | null>(null);

  // 🆕 Estados para ausencias parciales (horas)
  const [startTime, setStartTime] = useState<string>("09:00"); // Formato HH:mm
  const [endTime, setEndTime] = useState<string>("17:00"); // Formato HH:mm
  const [isPartialDay, setIsPartialDay] = useState<boolean>(false); // Checkbox: ¿pedir solo unas horas?

  // 🆕 Estados para justificantes (Mejora 2)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Calcular días hábiles cuando cambien las fechas
  const hasActiveContract = balance?.hasActiveContract !== false;
  const hasProvisionalContract = balance?.hasProvisionalContract === true;

  // Calcular duración en minutos basándose en startTime y endTime
  const parseTimeToMinutes = (time: string): number | null => {
    if (!time) return null;
    const parts = time.split(":");
    if (parts.length !== 2) return null;
    const hour = Number.parseInt(parts[0], 10);
    const min = Number.parseInt(parts[1], 10);
    if (Number.isNaN(hour) || Number.isNaN(min)) return null;
    if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;
    return hour * 60 + min;
  };

  const calculateDuration = (start: string, end: string): number | null => {
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    if (startMinutes === null || endMinutes === null) return null;
    return Math.max(0, endMinutes - startMinutes);
  };

  const normalizeToLocalDate = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const normalizeToLocalNoon = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);

  const dayMarkers = useMemo(() => {
    if (!requests.length) return [];

    const markers: Array<{ date: Date; color: string; label: string; status: string }> = [];

    requests.forEach((request) => {
      if (request.status !== "APPROVED" && request.status !== "PENDING") {
        return;
      }

      const color = request.absenceType.color ?? "#6366f1";
      const statusLabel = request.status === "PENDING" ? "Pendiente" : "Aprobada";
      const label = `${request.absenceType.name} (${statusLabel})`;
      const rawStart = new Date(request.startDate);
      const rawEnd = new Date(request.endDate);
      const start = normalizeToLocalDate(rawStart);
      const end = normalizeToLocalDate(rawEnd);

      for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setDate(cursor.getDate() + 1)) {
        markers.push({
          date: new Date(cursor),
          color,
          label,
          status: request.status,
        });
      }
    });

    return markers;
  }, [requests]);

  // Leyenda de colores: tipos únicos que aparecen en los markers
  const calendarLegend = useMemo(() => {
    if (!requests.length) return [];

    const legendMap = new Map<string, { name: string; color: string; count: number }>();

    requests.forEach((request) => {
      if (request.status !== "APPROVED" && request.status !== "PENDING") return;

      const key = request.absenceType.id;
      const existing = legendMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        legendMap.set(key, {
          name: request.absenceType.name,
          color: request.absenceType.color ?? "#6366f1",
          count: 1,
        });
      }
    });

    return Array.from(legendMap.values());
  }, [requests]);

  // Determinar si es un único día seleccionado
  const isSingleDay = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return false;
    return dateRange.from.toDateString() === dateRange.to.toDateString();
  }, [dateRange]);

  // Validación básica de horas (solo que la hora fin sea mayor que inicio)
  // La validación contra el horario del empleado la hace el servidor
  const validateTimeRange = useMemo(() => {
    if (!isPartialDay) {
      return { valid: true, error: null };
    }

    const requestedStart = parseTimeToMinutes(startTime);
    const requestedEnd = parseTimeToMinutes(endTime);

    if (requestedStart === null || requestedEnd === null) {
      return {
        valid: false,
        error: "Completa la hora de inicio y fin",
      };
    }

    if (requestedEnd <= requestedStart) {
      return {
        valid: false,
        error: "La hora de fin debe ser posterior a la hora de inicio",
      };
    }

    return { valid: true, error: null };
  }, [isPartialDay, startTime, endTime]);

  const selectedType = absenceTypes.find((t) => t.id === selectedTypeId) ?? null;
  const allowRetroactive = selectedType ? selectedType.allowRetroactive : false;
  const retroactiveMaxDays = selectedType ? selectedType.retroactiveMaxDays : 0;
  const minSelectableDate =
    allowRetroactive && retroactiveMaxDays > 0
      ? subDays(startOfDay(new Date()), retroactiveMaxDays)
      : startOfDay(new Date());
  const retroactiveHint = useMemo(() => {
    if (!selectedType) {
      return "Selecciona un tipo para ver si puedes pedir fechas pasadas.";
    }
    if (allowRetroactive && retroactiveMaxDays > 0) {
      return `Puedes solicitar hasta ${retroactiveMaxDays} día(s) en el pasado (máximo hasta ayer).`;
    }
    return "Este tipo de ausencia no permite solicitar fechas pasadas.";
  }, [allowRetroactive, retroactiveMaxDays, selectedType]);
  const selectedBalanceType = useMemo<PtoBalanceType>(() => {
    if (!selectedType) return DEFAULT_PTO_BALANCE_TYPE;
    return (selectedType as { balanceType?: PtoBalanceType | null }).balanceType ?? DEFAULT_PTO_BALANCE_TYPE;
  }, [selectedType]);
  const balanceForType = selectedType?.affectsBalance
    ? (balancesByType[selectedBalanceType] ?? (selectedBalanceType === "VACATION" ? balance : null))
    : balance;
  const isLoadingSelectedBalance = selectedType?.affectsBalance
    ? (isLoadingBalanceByType[selectedBalanceType] ?? false)
    : false;
  const workdayMinutesSnapshot = balanceForType?.workdayMinutesSnapshot ?? balance?.workdayMinutesSnapshot ?? 480;
  const partialDurationMinutes =
    selectedType?.allowPartialDays && isPartialDay && isSingleDay && validateTimeRange.valid
      ? calculateDuration(startTime, endTime)
      : null;

  useEffect(() => {
    if (!open) return;

    let isActive = true;

    const loadCarryoverPolicy = async () => {
      try {
        const config = await getOrganizationPtoConfig();
        if (!isActive) return;

        setCarryoverPolicy({
          mode: config.carryoverMode ?? "NONE",
          requestDeadlineMonth: Number(config.carryoverRequestDeadlineMonth ?? config.carryoverDeadlineMonth ?? 1),
          requestDeadlineDay: Number(config.carryoverRequestDeadlineDay ?? config.carryoverDeadlineDay ?? 29),
          usageDeadlineMonth: Number(config.carryoverDeadlineMonth ?? 1),
          usageDeadlineDay: Number(config.carryoverDeadlineDay ?? 29),
        });
      } catch (error) {
        console.error("Error loading PTO policy:", error);
        if (isActive) {
          setCarryoverPolicy(null);
        }
      }
    };

    void loadCarryoverPolicy();

    return () => {
      isActive = false;
    };
  }, [open]);

  // Limpiar formulario cuando se cierre la modal
  useEffect(() => {
    if (!open) {
      setSelectedTypeId("");
      setDateRange(undefined);
      setReason("");
      setWorkingDaysCalc(null);
      setHolidays([]);
      setStartTime("09:00");
      setEndTime("17:00");
      setIsPartialDay(false);
      setCarryoverPolicy(null);
      // 🆕 Limpiar archivos pendientes y revocar URLs de preview
      pendingFiles.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setPendingFiles([]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Limpiar isPartialDay cuando se cambia el rango de fechas y ya no es único día
  useEffect(() => {
    if (!isSingleDay) {
      setIsPartialDay(false);
    }
  }, [isSingleDay]);

  useEffect(() => {
    if (!dateRange?.from) return;
    if (dateRange.from < minSelectableDate) {
      setDateRange(undefined);
      setWorkingDaysCalc(null);
      setHolidays([]);
      toast.error("El rango seleccionado no es válido para este tipo de ausencia.");
    }
  }, [dateRange?.from, minSelectableDate]);

  useEffect(() => {
    if (!hasActiveContract) {
      setWorkingDaysCalc(null);
      setHolidays([]);
      return;
    }

    if (dateRange?.from && dateRange?.to && dateRange.from <= dateRange.to) {
      if (isPartialDay && isSingleDay && selectedType?.allowPartialDays && !validateTimeRange.valid) {
        setWorkingDaysCalc(null);
        setHolidays([]);
        setIsCalculating(false);
        return;
      }

      if (partialDurationMinutes !== null) {
        const safeWorkdayMinutes = workdayMinutesSnapshot > 0 ? workdayMinutesSnapshot : 480;
        setWorkingDaysCalc(partialDurationMinutes / safeWorkdayMinutes);
        setHolidays([]);
        setIsCalculating(false);
        return;
      }

      // Debounce para evitar cálculos mientras el usuario selecciona
      const timeout = setTimeout(() => {
        setIsCalculating(true);
        const normalizedStart = normalizeToLocalNoon(dateRange.from);
        const normalizedEnd = normalizeToLocalNoon(dateRange.to);
        calculateWorkingDays(normalizedStart, normalizedEnd, selectedTypeId)
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
  }, [
    hasActiveContract,
    dateRange,
    selectedTypeId,
    calculateWorkingDays,
    isPartialDay,
    isSingleDay,
    selectedType?.allowPartialDays,
    validateTimeRange.valid,
    partialDurationMinutes,
    workdayMinutesSnapshot,
  ]);

  // 🆕 Función para subir archivos a una solicitud creada
  const uploadFilesToRequest = async (ptoRequestId: string): Promise<boolean> => {
    if (pendingFiles.length === 0) return true;

    setIsUploadingFiles(true);
    let allSuccess = true;

    for (const pendingFile of pendingFiles) {
      try {
        const formData = new FormData();
        formData.append("file", pendingFile.file);

        const response = await fetch(`/api/pto-requests/${ptoRequestId}/documents`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            console.error(`Error subiendo ${pendingFile.file.name}:`, errorData);
          } catch {
            console.error(`Error subiendo ${pendingFile.file.name}: Status ${response.status}`);
          }
          allSuccess = false;
        }
      } catch (error) {
        console.error(`Error subiendo ${pendingFile.file.name}:`, error);
        allSuccess = false;
      }
    }

    setIsUploadingFiles(false);
    return allSuccess;
  };

  const handleSubmit = async () => {
    if (!selectedTypeId || !dateRange?.from || !dateRange?.to) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    // 🆕 Validar justificante obligatorio
    if (selectedType?.requiresDocument && pendingFiles.length === 0) {
      toast.error("Este tipo de ausencia requiere adjuntar un justificante");
      return;
    }

    // 🆕 Validar horas si es día parcial
    if (selectedType?.allowPartialDays && isPartialDay && !validateTimeRange.valid) {
      toast.error(validateTimeRange.error ?? "Error en las horas seleccionadas");
      return;
    }

    try {
      const normalizedStart = normalizeToLocalNoon(dateRange.from);
      const normalizedEnd = normalizeToLocalNoon(dateRange.to);

      const requestData: any = {
        absenceTypeId: selectedTypeId,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        reason: reason.trim() || undefined,
      };

      // 🆕 Solo incluir campos de hora si es día parcial (isPartialDay = true)
      if (selectedType?.allowPartialDays && isPartialDay) {
        const parsedStart = parseTimeToMinutes(startTime);
        const parsedEnd = parseTimeToMinutes(endTime);
        const duration = calculateDuration(startTime, endTime);
        if (parsedStart === null || parsedEnd === null || duration === null) {
          toast.error("Completa la hora de inicio y fin");
          return;
        }
        requestData.startTime = parsedStart;
        requestData.endTime = parsedEnd;
        requestData.durationMinutes = duration;
      }
      // Si NO es parcial, NO enviar startTime/endTime/durationMinutes (día completo)

      const createdRequest = await createRequest(requestData);
      if (!createdRequest.success) {
        toast.error(createdRequest.error ?? "Error al crear la solicitud");
        return;
      }

      // 🆕 Subir archivos adjuntos si los hay
      if (pendingFiles.length > 0) {
        const uploadSuccess = await uploadFilesToRequest(createdRequest.id);
        if (!uploadSuccess) {
          toast.warning("Solicitud creada, pero algunos archivos no se pudieron subir. Puedes añadirlos después.");
        }
      }

      toast.success("Solicitud enviada correctamente");

      // Cerrar modal (el useEffect se encargará de limpiar)
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear la solicitud");
    }
  };

  useEffect(() => {
    if (!selectedType?.affectsBalance) return;
    if (balancesByType[selectedBalanceType]) return;
    if ((isLoadingBalanceByType[selectedBalanceType] ?? false) === true) return;
    void loadBalanceByType(selectedBalanceType);
  }, [balancesByType, isLoadingBalanceByType, loadBalanceByType, selectedBalanceType, selectedType?.affectsBalance]);

  const hasEnoughDays = (() => {
    if (!selectedType?.affectsBalance) return true;
    if (workingDaysCalc === null) return true;
    if (isLoadingSelectedBalance) return true;
    if (!balanceForType) return false;
    return balanceForType.daysAvailable >= workingDaysCalc;
  })();
  const requiresDocument = selectedType?.requiresDocument === true;
  const allowsPartialDays = selectedType?.allowPartialDays === true;
  const isSubmitDisabled = [
    !selectedTypeId,
    !dateRange?.from,
    !dateRange?.to,
    !hasEnoughDays,
    isSubmitting,
    isUploadingFiles,
    isCalculating,
    isLoadingSelectedBalance,
    !hasActiveContract,
    requiresDocument && pendingFiles.length === 0,
    allowsPartialDays && isPartialDay && !validateTimeRange.valid,
  ].some(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden bg-gray-100 p-0 dark:bg-gray-900">
        <div className="border-b bg-white px-6 py-4 dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle>Nueva solicitud de ausencia</DialogTitle>
            <DialogDescription>Completa el formulario para solicitar días de ausencia</DialogDescription>
          </DialogHeader>
        </div>

        <div className="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {!hasActiveContract && (
            <Alert className="rounded-[14px] border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-1 h-4 w-4 flex-shrink-0" />
                <AlertDescription>
                  {hasProvisionalContract
                    ? "Tu contrato está pendiente de completar. Contacta con RRHH para poder solicitar ausencias."
                    : "Aún no tienes un contrato activo asignado. Contacta con RRHH para poder solicitar ausencias."}
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
              balance={balanceForType}
              workingDaysCalc={workingDaysCalc}
              partialDurationMinutes={partialDurationMinutes}
              workdayMinutesSnapshot={workdayMinutesSnapshot}
              holidays={holidays}
              isCalculating={isCalculating}
              isLoadingBalance={isLoadingSelectedBalance}
              hasEnoughDays={hasEnoughDays}
              carryoverPolicy={carryoverPolicy}
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
              markers={dayMarkers}
              minDate={minSelectableDate}
            />
            <p className="text-muted-foreground text-xs">{retroactiveHint}</p>
            {/* Leyenda de colores */}
            {calendarLegend.length > 0 && (
              <div className="mt-2 rounded-lg border bg-white p-3 dark:bg-gray-800">
                <p className="text-muted-foreground mb-2 text-xs font-medium">Días ya solicitados:</p>
                <div className="flex flex-wrap gap-3">
                  {calendarLegend.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs">
                        {item.name} ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sección 3.5: Horarios parciales (solo si allowPartialDays) */}
          {selectedType?.allowPartialDays && (
            <div className="rounded-[14px] border bg-white p-4 shadow-sm dark:bg-gray-800">
              {/* Checkbox para activar día parcial */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="partial-day"
                  checked={isPartialDay}
                  onCheckedChange={(checked) => setIsPartialDay(checked === true)}
                  disabled={!isSingleDay || !hasActiveContract}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="partial-day"
                    className={cn(
                      "cursor-pointer font-medium",
                      !isSingleDay && "text-muted-foreground cursor-not-allowed",
                    )}
                  >
                    Pedir solo unas horas de este día
                  </Label>
                  {!isSingleDay && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Para solicitar horas específicas, selecciona un único día
                    </p>
                  )}
                </div>
              </div>

              {/* Selector de horas (solo si isPartialDay && isSingleDay) */}
              {isPartialDay && isSingleDay && (
                <div className="mt-4 space-y-4">
                  {/* Inputs de hora */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="start-time" className="text-xs">
                        Desde
                      </Label>
                      <input
                        id="start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        disabled={!hasActiveContract}
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring rounded-[14px] border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="end-time" className="text-xs">
                        Hasta
                      </Label>
                      <input
                        id="end-time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={!hasActiveContract}
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring rounded-[14px] border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Error de validación */}
                  {!validateTimeRange.valid && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{validateTimeRange.error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Duración */}
                  <div className="flex justify-between rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/50">
                    <span className="text-muted-foreground">Duración:</span>
                    {calculateDuration(startTime, endTime) === null ? (
                      <span className="text-muted-foreground">--</span>
                    ) : (
                      <span className="font-semibold">
                        {Math.floor((calculateDuration(startTime, endTime) ?? 0) / 60)}h{" "}
                        {(calculateDuration(startTime, endTime) ?? 0) % 60}min
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* 🆕 Sección 5: Justificante de ausencia (Mejora 2) */}
          {selectedType && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="text-muted-foreground h-4 w-4" />
                <Label className="text-muted-foreground text-sm font-medium">
                  Justificante
                  {selectedType.requiresDocument ? (
                    <span className="text-destructive ml-1">*</span>
                  ) : (
                    <span className="text-muted-foreground ml-1">(opcional)</span>
                  )}
                </Label>
              </div>
              {selectedType.requiresDocument && (
                <p className="text-muted-foreground text-xs">
                  Este tipo de ausencia requiere adjuntar un documento justificativo.
                </p>
              )}
              <DocumentUploadZone
                pendingFiles={pendingFiles}
                onPendingFilesChange={setPendingFiles}
                required={selectedType.requiresDocument}
                disabled={!hasActiveContract || isSubmitting || isUploadingFiles}
              />
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 border-t bg-white p-4 dark:bg-gray-800">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-[14px]"
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="rounded-[14px]">
            {isSubmitting || isUploadingFiles ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploadingFiles ? "Subiendo archivos..." : "Enviando..."}
              </>
            ) : (
              "Enviar solicitud"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

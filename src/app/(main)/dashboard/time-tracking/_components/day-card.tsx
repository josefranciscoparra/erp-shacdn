"use client";

import { useState, useEffect } from "react";

import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  Coffee,
  LogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  CalendarX,
  PartyPopper,
  FolderKanban,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TimeEntry {
  id: string;
  entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | "PROJECT_SWITCH";
  timestamp: Date;
  location?: string | null;
  notes?: string | null;
  isManual: boolean;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    code: string | null;
    color: string | null;
  } | null;
  task?: string | null;
  // Campos de cancelación
  isCancelled?: boolean;
  cancellationReason?: string | null;
  cancellationNotes?: string | null;
  // Campos GPS
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  isWithinAllowedArea?: boolean | null;
  requiresReview?: boolean;
}

interface DayData {
  date: Date;
  clockIn?: Date | null;
  clockOut?: Date | null;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT" | "HOLIDAY" | "NON_WORKDAY";
  expectedHours: number;
  actualHours: number;
  compliance: number;
  // Nuevos campos
  isWorkingDay?: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  timeEntries: TimeEntry[];
  // Alertas
  alerts?: {
    total: number;
    bySeverity: Record<string, number>;
  };
}

interface DayCardProps {
  day: DayData;
}

const entryTypeConfig = {
  CLOCK_IN: {
    label: "Entrada",
    icon: LogIn,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950",
  },
  CLOCK_OUT: {
    label: "Salida",
    icon: LogOut,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950",
  },
  BREAK_START: {
    label: "Inicio pausa",
    icon: Coffee,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950",
  },
  BREAK_END: {
    label: "Fin pausa",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950",
  },
};

const statusColors = {
  COMPLETED: "bg-emerald-500",
  IN_PROGRESS: "bg-blue-500",
  INCOMPLETE: "bg-amber-500",
  ABSENT: "bg-red-500",
  HOLIDAY: "bg-purple-500",
  NON_WORKDAY: "bg-gray-300 dark:bg-gray-700",
};

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function DayCard({ day }: DayCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [now, setNow] = useState(new Date());

  // Actualizar el tiempo cada minuto para refrescar el contador en vivo
  useEffect(() => {
    // Solo activar el timer si es el día de hoy
    const isToday = new Date().toDateString() === new Date(day.date).toDateString();
    if (!isToday) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [day.date]);

  const visibleEntries = day.timeEntries.filter((entry) => entry.entryType !== "PROJECT_SWITCH");
  const isJustifiedAbsence = !!day.holidayName;
  const showCompliance = day.expectedHours > 0;

  // Calcular bloques de tiempo para la visualización gráfica (0-24h)
  const workBlocks: { start: number; end: number; type: "work" | "break" }[] = [];
  let currentBlockStart: Date | null = null;
  let currentBlockType: "work" | "break" | null = null;
  let additionalHours = 0;

  const getHourValue = (date: Date) => date.getHours() + date.getMinutes() / 60;

  // Construir bloques desde las entradas
  [...visibleEntries]
    .filter((e) => !e.isCancelled)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .forEach((entry) => {
      const entryDate = new Date(entry.timestamp);
      switch (entry.entryType) {
        case "CLOCK_IN":
          if (currentBlockStart) {
            // Cerrar bloque anterior si quedó abierto
            workBlocks.push({
              start: getHourValue(currentBlockStart),
              end: getHourValue(entryDate),
              type: currentBlockType ?? "work",
            });
          }
          currentBlockStart = entryDate;
          currentBlockType = "work";
          break;
        case "BREAK_START":
          if (currentBlockStart) {
            workBlocks.push({
              start: getHourValue(currentBlockStart),
              end: getHourValue(entryDate),
              type: "work",
            });
          }
          currentBlockStart = entryDate;
          currentBlockType = "break";
          break;
        case "BREAK_END":
          if (currentBlockStart) {
            workBlocks.push({
              start: getHourValue(currentBlockStart),
              end: getHourValue(entryDate),
              type: "break",
            });
          }
          currentBlockStart = entryDate;
          currentBlockType = "work";
          break;
        case "CLOCK_OUT":
          if (currentBlockStart) {
            workBlocks.push({
              start: getHourValue(currentBlockStart),
              end: getHourValue(entryDate),
              type: currentBlockType ?? "work",
            });
          }
          currentBlockStart = null;
          break;
      }
    });

  // Si quedó un bloque abierto (en progreso)
  if (currentBlockStart) {
    // Solo cerrar si es el día de hoy
    if (now.getDate() === new Date(day.date).getDate()) {
      const startVal = getHourValue(currentBlockStart);
      const endVal = getHourValue(now);

      workBlocks.push({
        start: startVal,
        end: endVal,
        type: currentBlockType ?? "work",
      });

      // Si es un bloque de trabajo, calcular el tiempo adicional
      if ((currentBlockType ?? "work") === "work") {
        const diffMs = now.getTime() - currentBlockStart.getTime();
        additionalHours = diffMs / (1000 * 60 * 60);
      }
    }
  }

  const displayedActualHours = day.actualHours + additionalHours;

  // Determinar color del borde izquierdo
  let borderClass = statusColors.NON_WORKDAY;
  if (isJustifiedAbsence) {
    borderClass = statusColors.HOLIDAY;
  } else if (day.status === "COMPLETED") {
    borderClass = statusColors.COMPLETED;
  } else if (day.status === "INCOMPLETE") {
    borderClass = statusColors.INCOMPLETE;
  } else if (day.status === "IN_PROGRESS") {
    borderClass = statusColors.IN_PROGRESS;
  } else if (day.status === "ABSENT") {
    borderClass = statusColors.ABSENT;
  }

  // Icono de estado simplificado (opcional, ya no lo usamos en el badge grande)
  const statusColorText =
    day.status === "COMPLETED"
      ? "text-emerald-600"
      : day.status === "INCOMPLETE"
        ? "text-amber-600"
        : day.status === "ABSENT" && !isJustifiedAbsence
          ? "text-red-600"
          : "text-muted-foreground";

  // Calcular duración de cada pausa para el detalle
  const breakDurations: { startIndex: number; duration: number }[] = [];
  for (let i = 0; i < visibleEntries.length; i++) {
    const entry = visibleEntries[i];
    if (entry.entryType === "BREAK_START") {
      const nextEntry = visibleEntries[i + 1];
      if (nextEntry && nextEntry.entryType === "BREAK_END") {
        const duration = differenceInMinutes(new Date(nextEntry.timestamp), new Date(entry.timestamp));
        breakDurations.push({ startIndex: i, duration });
      }
    }
  }

  return (
    <div
      className={cn(
        "group bg-card hover:bg-muted/30 relative flex flex-col rounded-lg border transition-all",
        isExpanded && "bg-muted/30 ring-primary/20 ring-1",
      )}
    >
      {/* Indicador de estado (Borde izquierdo) */}
      <div className={cn("absolute top-0 bottom-0 left-0 w-1.5 rounded-l-lg", borderClass)} />

      {/* Header / Resumen (Clickeable) */}
      <button
        type="button"
        aria-expanded={isExpanded}
        className={cn(
          "flex w-full flex-col gap-4 border-0 bg-transparent py-3 pr-4 pl-5 text-left sm:flex-row sm:items-center",
          "focus-visible:ring-primary focus-visible:ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* 1. Fecha y Estado */}
        <div className="flex min-w-[140px] flex-col gap-0.5">
          <span className="text-sm font-semibold capitalize">
            {format(new Date(day.date), "EEE, d MMM", { locale: es })}
          </span>
          <div className="flex items-center gap-1.5">
            {day.holidayName ? (
              <span className="text-muted-foreground flex items-center text-xs font-medium">
                <PartyPopper className="mr-1 size-3 text-purple-500" />
                {day.holidayName}
              </span>
            ) : (
              <span className={cn("flex items-center text-xs font-medium", statusColorText)}>
                {/* Texto de estado amigable */}
                {day.status === "NON_WORKDAY"
                  ? "No laborable"
                  : day.status === "IN_PROGRESS"
                    ? "En curso"
                    : day.status === "COMPLETED"
                      ? "Correcto"
                      : day.status === "INCOMPLETE"
                        ? "Incompleto"
                        : day.status === "ABSENT"
                          ? "Ausencia"
                          : day.status}
              </span>
            )}
          </div>
        </div>

        {/* 2. Visual Timeline (Barra de 24h) */}
        <div className="flex min-h-[24px] flex-1 flex-col justify-center gap-1">
          {/* Barra */}
          <div className="bg-muted relative h-2.5 w-full overflow-hidden rounded-full">
            {/* Marcadores de horas (opcional, puntos sutiles) */}
            {[6, 12, 18].map((h) => (
              <div
                key={h}
                className="bg-background/50 absolute top-0 bottom-0 z-10 w-px"
                style={{ left: `${(h / 24) * 100}%` }}
              />
            ))}

            {/* Bloques de trabajo */}
            {workBlocks.map((block, i) => (
              <div
                key={i}
                className={cn("absolute top-0 h-full", block.type === "break" ? "bg-amber-400" : "bg-emerald-500")}
                style={{
                  left: `${(block.start / 24) * 100}%`,
                  width: `${Math.max(((block.end - block.start) / 24) * 100, 0.5)}%`,
                }}
                title={`${formatMinutes((block.end - block.start) * 60)}`}
              />
            ))}
          </div>
          {/* Horas extremas (Entrada - Salida) */}
          {day.clockIn && (
            <div className="text-muted-foreground flex justify-between text-[10px]">
              <span>{format(new Date(day.clockIn), "HH:mm")}</span>
              {day.clockOut && <span>{format(new Date(day.clockOut), "HH:mm")}</span>}
            </div>
          )}
        </div>

        {/* 3. Métricas y Acciones */}
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {/* Horas */}
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold tabular-nums">{displayedActualHours.toFixed(2)}h</span>
              <span className="text-muted-foreground text-[10px]">/ {day.expectedHours}h</span>
            </div>
            {showCompliance && (
              <div className="flex items-center gap-1">
                <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      (displayedActualHours / day.expectedHours) * 100 >= 100 ? "bg-emerald-500" : "bg-amber-500",
                    )}
                    style={{ width: `${Math.min((displayedActualHours / day.expectedHours) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botón expandir */}
          <div className="text-muted-foreground hover:bg-muted flex size-8 items-center justify-center rounded-full transition-colors">
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </div>
      </button>

      {/* Detalles Expandibles (Forense) */}
      {isExpanded && (
        <div className="bg-muted/10 border-t px-4 py-4 sm:px-12">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Lista detallada */}
            <div className="space-y-6">
              {/* Fichajes Activos */}
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Fichajes Activos
                </h4>
                <div className="space-y-0">
                  {visibleEntries.filter((e) => !e.isCancelled).length === 0 ? (
                    <p className="text-muted-foreground text-xs italic">No hay registros activos.</p>
                  ) : (
                    visibleEntries
                      .filter((e) => !e.isCancelled)
                      .map((entry, idx, arr) => {
                        const isLast = idx === arr.length - 1;
                        // ... render logic similar to before but simplified for active entries
                        const config = entryTypeConfig[entry.entryType];
                        const Icon = config.icon;
                        return (
                          <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                            {!isLast && (
                              <div className="bg-border absolute top-2 left-1.5 h-full w-px -translate-x-1/2" />
                            )}
                            <div
                              className={cn(
                                "ring-background relative z-10 size-3 rounded-full ring-2",
                                config.bgColor
                                  .replace("bg-", "bg-")
                                  .replace("dark:bg-", "dark:bg-")
                                  .split(" ")[0]
                                  .replace("100", "500"),
                              )}
                            />
                            <div className="-mt-1 flex flex-1 flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{config.label}</span>
                                <span className="text-muted-foreground font-mono text-xs">
                                  {format(new Date(entry.timestamp), "HH:mm:ss")}
                                </span>
                              </div>
                              {(entry.notes ?? entry.location) && (
                                <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                                  {entry.notes && <span>&quot;{entry.notes}&quot;</span>}
                                  {entry.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="size-3" /> {entry.location}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {entry.isManual && (
                                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                    Manual
                                  </Badge>
                                )}
                                {entry.requiresReview && (
                                  <Badge
                                    variant="outline"
                                    className="h-4 border-amber-200 bg-amber-50 px-1 text-[10px] text-amber-700"
                                  >
                                    Revisar
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Fichajes Cancelados / Invalidados */}
              {visibleEntries.some((e) => e.isCancelled) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-muted h-px flex-1" />
                    <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      Invalidados por rectificación
                    </span>
                    <div className="bg-muted h-px flex-1" />
                  </div>

                  <div className="space-y-0 opacity-60 grayscale-[0.5]">
                    {visibleEntries
                      .filter((e) => e.isCancelled)
                      .map((entry, idx, arr) => {
                        const isLast = idx === arr.length - 1;
                        const config = entryTypeConfig[entry.entryType];
                        return (
                          <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                            {!isLast && (
                              <div className="bg-border absolute top-2 left-1.5 h-full w-px -translate-x-1/2" />
                            )}
                            <div className="ring-background bg-muted relative z-10 size-3 rounded-full ring-2" />
                            <div className="-mt-1 flex flex-1 flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="decoration-muted-foreground/50 text-sm font-medium line-through">
                                  {config.label}
                                </span>
                                <span className="text-muted-foreground decoration-muted-foreground/50 font-mono text-xs line-through">
                                  {format(new Date(entry.timestamp), "HH:mm:ss")}
                                </span>
                              </div>

                              {(entry.notes ?? entry.cancellationNotes) && (
                                <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                                  {entry.notes && <span className="line-through">&quot;{entry.notes}&quot;</span>}
                                  {entry.cancellationNotes && (
                                    <span className="text-red-600/80 italic no-underline dark:text-red-400/80">
                                      Cancelado: {entry.cancellationNotes}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1">
                                <Badge
                                  variant="outline"
                                  className="h-4 border-red-200 bg-red-50 px-1 text-[10px] text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
                                >
                                  Invalidado
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Métricas y Alertas */}
            <div className="space-y-4">
              <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Métricas del Día</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-md border p-3">
                  <span className="text-muted-foreground block text-xs">Total Trabajado</span>
                  <span className="text-lg font-bold">{displayedActualHours.toFixed(2)}h</span>
                </div>
                <div className="bg-background rounded-md border p-3">
                  <span className="text-muted-foreground block text-xs">Total Pausas</span>
                  <span className="text-lg font-bold">{formatMinutes(day.totalBreakMinutes)}</span>
                </div>
              </div>

              {day.alerts && day.alerts.total > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
                  <div className="mb-2 flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="size-4" />
                    <span className="text-sm font-semibold">Alertas detectadas ({day.alerts.total})</span>
                  </div>
                  <ul className="list-inside list-disc text-xs text-red-600 dark:text-red-300">
                    {day.alerts.bySeverity.CRITICAL > 0 && (
                      <li>{day.alerts.bySeverity.CRITICAL} Críticas (Retrasos graves, Ausencias)</li>
                    )}
                    {day.alerts.bySeverity.WARNING > 0 && (
                      <li>{day.alerts.bySeverity.WARNING} Advertencias (Olvido de fichaje)</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

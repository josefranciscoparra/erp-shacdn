"use client";

import { useState } from "react";

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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TimeEntry {
  id: string;
  entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
  timestamp: Date;
  location?: string | null;
  notes?: string | null;
  isManual: boolean;
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
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT";
  expectedHours: number;
  actualHours: number;
  compliance: number;
  timeEntries: TimeEntry[];
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

const statusConfig = {
  COMPLETED: {
    label: "Completado",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  IN_PROGRESS: {
    label: "En progreso",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  INCOMPLETE: {
    label: "Incompleto",
    icon: AlertCircle,
    color: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  ABSENT: {
    label: "Ausente",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
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
  const statusInfo = statusConfig[day.status];
  const StatusIcon = statusInfo.icon;

  // Calcular duración de cada pausa
  const breakDurations: { startIndex: number; duration: number }[] = [];
  for (let i = 0; i < day.timeEntries.length; i++) {
    const entry = day.timeEntries[i];
    if (entry.entryType === "BREAK_START") {
      const nextEntry = day.timeEntries[i + 1];
      if (nextEntry && nextEntry.entryType === "BREAK_END") {
        const duration = differenceInMinutes(new Date(nextEntry.timestamp), new Date(entry.timestamp));
        breakDurations.push({ startIndex: i, duration });
      }
    }
  }

  const complianceColor =
    day.compliance >= 100
      ? "text-green-600 dark:text-green-400"
      : day.compliance >= 80
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <Card className="bg-card rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      {/* Contenedor principal con padding compacto */}
      <div className="flex flex-col gap-2 p-3">
        {/* Fila 1: Cabecera compacta - Fecha + Badge + % en una línea */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold capitalize">
              {format(new Date(day.date), "EEEE, d MMM yyyy", { locale: es })}
            </span>
            <Badge className={statusInfo.badgeClass}>
              <StatusIcon className="mr-1 size-3" />
              {statusInfo.label}
            </Badge>
          </div>
          <span className={cn("text-lg font-bold", complianceColor)}>{day.compliance}%</span>
        </div>

        {/* Fila 2: Resumen en 3 bloques con separadores verticales */}
        <div className="grid grid-cols-1 gap-2 @md/card:grid-cols-3 @md/card:gap-0">
          {/* Bloque 1: Esperadas */}
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Esperadas</span>
            <span className="text-sm font-semibold">{day.expectedHours}h</span>
          </div>

          {/* Separador vertical (solo desktop) */}
          <div className="border-border/50 hidden @md/card:block @md/card:border-l" />

          {/* Bloque 2: Trabajadas */}
          <div className="flex flex-col gap-0.5 @md/card:px-3">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Trabajadas</span>
            <span className="text-sm font-semibold">{day.actualHours}h</span>
          </div>

          {/* Separador vertical (solo desktop) */}
          <div className="border-border/50 hidden @md/card:block @md/card:border-l" />

          {/* Bloque 3: Pausas */}
          <div className="flex flex-col gap-0.5 @md/card:px-3">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Pausas</span>
            <span className="text-sm font-semibold">{formatMinutes(day.totalBreakMinutes)}</span>
          </div>
        </div>

        {/* Fila 3: Indicadores visuales (condicional) */}
        {(day.compliance < 80 || day.status === "ABSENT" || day.compliance > 120) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {day.compliance < 80 && day.status !== "ABSENT" && (
              <div className="flex items-center gap-1">
                <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-500" />
                <span className="text-xs text-amber-600 dark:text-amber-500">Por debajo del objetivo</span>
              </div>
            )}
            {day.status === "ABSENT" && (
              <div className="flex items-center gap-1">
                <XCircle className="size-3.5 text-red-600 dark:text-red-500" />
                <span className="text-xs text-red-600 dark:text-red-500">Día ausente</span>
              </div>
            )}
            {day.compliance > 120 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="size-3.5 text-green-600 dark:text-green-500" />
                <span className="text-xs text-green-600 dark:text-green-500">Exceso de horas</span>
              </div>
            )}
          </div>
        )}

        {/* Fila 4: Botón Ver fichajes más integrado */}
        {day.timeEntries.length > 0 && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground h-7 text-xs"
            >
              {isExpanded ? (
                <>
                  Ocultar
                  <ChevronUp className="ml-1.5 size-3.5" />
                </>
              ) : (
                <>
                  Ver fichajes
                  <ChevronDown className="ml-1.5 size-3.5" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Timeline de fichajes (colapsable) */}
      {isExpanded && (
        <div className="p-3 pt-0">
          {day.timeEntries.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">No hay fichajes registrados</div>
          ) : (
            <div className="space-y-6">
              {/* Fichajes activos */}
              <div className="relative space-y-0">
                {day.timeEntries
                  .filter((entry) => !entry.isCancelled)
                  .map((entry, index, filteredArray) => {
                    const config = entryTypeConfig[entry.entryType];
                    const Icon = config.icon;
                    const breakInfo = breakDurations.find((b) => b.startIndex === index);
                    const isLast = index === filteredArray.length - 1;

                    // Determinar color de fondo sólido según tipo
                    const solidBgColor =
                      entry.entryType === "CLOCK_IN"
                        ? "bg-emerald-500"
                        : entry.entryType === "CLOCK_OUT"
                          ? "bg-red-500"
                          : entry.entryType === "BREAK_START"
                            ? "bg-yellow-500"
                            : "bg-emerald-500";

                    return (
                      <div key={entry.id} className={cn("relative flex gap-4 pb-6", isLast && "pb-0")}>
                        {/* Contenedor del punto con línea vertical */}
                        <div className="relative flex flex-col items-center">
                          {/* Línea vertical - solo si no es el último */}
                          {!isLast && (
                            <div
                              className="bg-border absolute top-10 left-1/2 z-0 w-px -translate-x-1/2"
                              style={{ height: "calc(100% + 24px)" }}
                            />
                          )}

                          {/* Punto del timeline */}
                          <div
                            className={cn(
                              "border-background relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 shadow-sm",
                              solidBgColor,
                            )}
                          >
                            <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                          </div>
                        </div>

                        {/* Contenido del evento */}
                        <div className="flex-1 space-y-2 pt-1.5">
                          {/* Tipo de fichaje y hora */}
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm leading-tight font-semibold">{config.label}</span>
                              {entry.isManual && (
                                <Badge variant="outline" className="text-[11px]">
                                  Manual
                                </Badge>
                              )}
                              {breakInfo && (
                                <span className="text-muted-foreground text-xs">
                                  ({formatMinutes(breakInfo.duration)})
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums">
                              {format(new Date(entry.timestamp), "HH:mm:ss", { locale: es })}
                            </span>
                          </div>

                          {/* Notas */}
                          {entry.notes && <p className="text-muted-foreground text-xs">{entry.notes}</p>}

                          {/* Información de geolocalización */}
                          {entry.latitude && entry.longitude ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Badge de precisión GPS */}
                              <Badge
                                variant="outline"
                                className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                              >
                                <MapPin className="h-3 w-3 text-red-500" strokeWidth={2} />
                                {Math.round(entry.accuracy ?? 0)}m
                              </Badge>

                              {/* Badge de área permitida */}
                              {entry.isWithinAllowedArea === true && (
                                <Badge
                                  variant="outline"
                                  className="inline-flex items-center gap-1 rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                                >
                                  <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                                  Dentro del perímetro
                                </Badge>
                              )}

                              {/* Badge de requiere revisión */}
                              {entry.requiresReview && (
                                <Badge
                                  variant="outline"
                                  className="inline-flex items-center gap-1 rounded-full border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                                >
                                  <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                                  Requiere revisión
                                </Badge>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Separador y fichajes cancelados */}
              {day.timeEntries.some((e) => e.isCancelled) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-muted h-px flex-1" />
                    <span className="text-muted-foreground text-xs font-medium">Invalidados por rectificación</span>
                    <div className="bg-muted h-px flex-1" />
                  </div>
                  <div className="relative space-y-0 opacity-60">
                    {day.timeEntries
                      .filter((entry) => entry.isCancelled)
                      .map((entry, index, filteredArray) => {
                        const config = entryTypeConfig[entry.entryType];
                        const Icon = config.icon;
                        const breakInfo = breakDurations.find((b) => b.startIndex === index);
                        const isLast = index === filteredArray.length - 1;

                        // Determinar color de fondo sólido según tipo
                        const solidBgColor =
                          entry.entryType === "CLOCK_IN"
                            ? "bg-emerald-500"
                            : entry.entryType === "CLOCK_OUT"
                              ? "bg-red-500"
                              : entry.entryType === "BREAK_START"
                                ? "bg-yellow-500"
                                : "bg-emerald-500";

                        return (
                          <div key={entry.id} className={cn("relative flex gap-4 pb-6", isLast && "pb-0")}>
                            {/* Contenedor del punto con línea vertical */}
                            <div className="relative flex flex-col items-center">
                              {/* Línea vertical - solo si no es el último */}
                              {!isLast && (
                                <div
                                  className="bg-border absolute top-10 left-1/2 z-0 w-px -translate-x-1/2"
                                  style={{ height: "calc(100% + 24px)" }}
                                />
                              )}

                              {/* Punto del timeline */}
                              <div
                                className={cn(
                                  "border-background relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 shadow-sm",
                                  solidBgColor,
                                )}
                              >
                                <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                              </div>
                            </div>

                            {/* Contenido del evento */}
                            <div className="flex-1 space-y-2 pt-1.5">
                              {/* Tipo de fichaje y hora */}
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm leading-tight font-semibold line-through">
                                    {config.label}
                                  </span>
                                  {entry.isManual && (
                                    <Badge variant="outline" className="text-[11px]">
                                      Manual
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="inline-flex items-center gap-1 rounded-full border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                                  >
                                    <XCircle className="h-3 w-3" strokeWidth={2} />
                                    Cancelado
                                  </Badge>
                                  {breakInfo && (
                                    <span className="text-muted-foreground text-xs">
                                      ({formatMinutes(breakInfo.duration)})
                                    </span>
                                  )}
                                </div>
                                <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums line-through">
                                  {format(new Date(entry.timestamp), "HH:mm:ss", { locale: es })}
                                </span>
                              </div>

                              {/* Notas */}
                              {entry.notes && <p className="text-muted-foreground text-xs">{entry.notes}</p>}

                              {/* Motivo de cancelación */}
                              {entry.cancellationNotes && (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  Motivo: {entry.cancellationNotes}
                                </p>
                              )}

                              {/* Información de geolocalización */}
                              {entry.latitude && entry.longitude ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* Badge de precisión GPS */}
                                  <Badge
                                    variant="outline"
                                    className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                                  >
                                    <MapPin className="h-3 w-3 text-red-500" strokeWidth={2} />
                                    {Math.round(entry.accuracy ?? 0)}m
                                  </Badge>

                                  {/* Badge de área permitida */}
                                  {entry.isWithinAllowedArea === true && (
                                    <Badge
                                      variant="outline"
                                      className="inline-flex items-center gap-1 rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                                    >
                                      <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                                      Dentro del perímetro
                                    </Badge>
                                  )}

                                  {/* Badge de requiere revisión */}
                                  {entry.requiresReview && (
                                    <Badge
                                      variant="outline"
                                      className="inline-flex items-center gap-1 rounded-full border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                                    >
                                      <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                                      Requiere revisión
                                    </Badge>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

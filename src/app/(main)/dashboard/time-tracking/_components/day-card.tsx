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
  CalendarX,
  PartyPopper,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT" | "HOLIDAY" | "NON_WORKDAY";
  expectedHours: number;
  actualHours: number;
  compliance: number;
  // Nuevos campos
  isWorkingDay?: boolean;
  isHoliday?: boolean;
  holidayName?: string;
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
    headerClass: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30",
  },
  IN_PROGRESS: {
    label: "En progreso",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    headerClass: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",
  },
  INCOMPLETE: {
    label: "Incompleto",
    icon: AlertCircle,
    color: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    headerClass: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30",
  },
  ABSENT: {
    label: "Ausente",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    headerClass: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30",
  },
  HOLIDAY: {
    label: "Festivo",
    icon: PartyPopper,
    color: "text-purple-600 dark:text-purple-400",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    headerClass: "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30",
  },
  NON_WORKDAY: {
    label: "Día no laborable",
    icon: CalendarX,
    color: "text-gray-600 dark:text-gray-400",
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
    headerClass: "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/30",
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

  const ComplianceIcon = day.compliance >= 100 ? CheckCircle2 : day.compliance >= 80 ? AlertCircle : XCircle;

  return (
    <Card className="overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md">
      {/* Header Accordion Compacto - Clickeable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex w-full items-center justify-between gap-3 border-b px-4 py-2.5 text-left transition-colors hover:opacity-90",
          statusInfo.headerClass,
        )}
      >
        {/* Izquierda: Fecha + Badge */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-sm font-semibold capitalize">
            {format(new Date(day.date), "EEEE, d MMM", { locale: es })}
          </span>
          <Badge className={cn("shrink-0", statusInfo.badgeClass)}>
            <StatusIcon className="mr-1 size-3" />
            {statusInfo.label}
          </Badge>
          {day.holidayName && (
            <Badge
              variant="outline"
              className="shrink-0 border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300"
            >
              {day.holidayName}
            </Badge>
          )}
        </div>

        {/* Derecha: % + Icono compliance + Chevron */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1">
            <ComplianceIcon className={cn("size-4", complianceColor)} />
            <span className={cn("text-sm font-bold tabular-nums", complianceColor)}>{day.compliance}%</span>
          </div>
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {/* Contenido Expandible */}
      {isExpanded && (
        <div className="flex flex-col gap-3 px-4 py-3">
          {/* Métricas con iconos */}
          <div className="grid grid-cols-1 gap-3 @sm/card:grid-cols-3">
            {/* Esperadas */}
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/30">
                <Clock className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">Esperadas</span>
                <span className="text-sm font-semibold">{day.expectedHours}h</span>
              </div>
            </div>

            {/* Trabajadas */}
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-green-100 dark:bg-green-950/30">
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">Trabajadas</span>
                <span className="text-sm font-semibold">{day.actualHours}h</span>
              </div>
            </div>

            {/* Pausas */}
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950/30">
                <Coffee className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">Pausas</span>
                <span className="text-sm font-semibold">{formatMinutes(day.totalBreakMinutes)}</span>
              </div>
            </div>
          </div>

          {/* Indicadores visuales (condicional) */}
          {(day.compliance < 80 || day.status === "ABSENT" || day.compliance > 120) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {day.compliance < 80 && day.status !== "ABSENT" && (
                <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 dark:bg-amber-950/30">
                  <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-500" />
                  <span className="text-xs text-amber-600 dark:text-amber-500">Por debajo del objetivo</span>
                </div>
              )}
              {day.status === "ABSENT" && (
                <div className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 dark:bg-red-950/30">
                  <XCircle className="size-3.5 text-red-600 dark:text-red-500" />
                  <span className="text-xs text-red-600 dark:text-red-500">Día ausente</span>
                </div>
              )}
              {day.compliance > 120 && (
                <div className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 dark:bg-green-950/30">
                  <TrendingUp className="size-3.5 text-green-600 dark:text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-500">Exceso de horas</span>
                </div>
              )}
            </div>
          )}

          {/* Timeline de fichajes */}
          {day.timeEntries.length > 0 && (
            <div className="space-y-4 border-t pt-3">
              {/* Fichajes activos */}
              <div className="relative space-y-0">
                {day.timeEntries
                  .filter((entry) => !entry.isCancelled)
                  .map((entry, index, filteredArray) => {
                    const config = entryTypeConfig[entry.entryType];
                    const Icon = config.icon;
                    const breakInfo = breakDurations.find((b) => b.startIndex === index);
                    const isLast = index === filteredArray.length - 1;

                    // Determinar color de fondo sólido según tipo (compatible Safari)
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
                                  Rectificado
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

                        // Determinar color de fondo sólido según tipo (compatible Safari)
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
                                      Rectificado
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

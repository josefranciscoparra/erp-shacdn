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
    day.compliance >= 95
      ? "text-green-600 dark:text-green-400"
      : day.compliance >= 80
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <Card className="overflow-hidden">
      {/* Header del día */}
      <div className="bg-muted/50 border-b p-4">
        <div className="@container/card flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">
                {format(new Date(day.date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
              <Badge className={statusInfo.badgeClass}>
                <StatusIcon className="mr-1 size-3" />
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn("text-xl font-bold", complianceColor)}>{day.compliance}%</span>
              <span className="text-muted-foreground text-sm">cumplimiento</span>
            </div>
          </div>

          {/* Resumen de horas */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="text-muted-foreground size-4" />
              <span className="text-muted-foreground">Esperadas:</span>
              <span className="font-medium">{day.expectedHours}h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-muted-foreground">Trabajadas:</span>
              <span className="font-medium">{day.actualHours}h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Coffee className="size-4 text-amber-600 dark:text-amber-400" />
              <span className="text-muted-foreground">Pausas:</span>
              <span className="font-medium">{formatMinutes(day.totalBreakMinutes)}</span>
            </div>

            {/* Botón para expandir/colapsar */}
            {day.timeEntries.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="ml-auto text-xs">
                {isExpanded ? (
                  <>
                    <ChevronUp className="mr-1 size-3" />
                    Ocultar fichajes ({day.timeEntries.length})
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 size-3" />
                    Ver fichajes ({day.timeEntries.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline de fichajes (colapsable) */}
      {isExpanded && (
        <div className="p-4">
          {day.timeEntries.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">No hay fichajes registrados</div>
          ) : (
            <div className="space-y-4">
              {/* Fichajes activos */}
              <div className="space-y-2">
                {day.timeEntries
                  .filter((entry) => !entry.isCancelled)
                  .map((entry, index) => {
                    const config = entryTypeConfig[entry.entryType];
                    const Icon = config.icon;
                    const breakInfo = breakDurations.find((b) => b.startIndex === index);

                    return (
                      <div key={entry.id} className="flex items-start gap-3">
                        <div className={cn("rounded-full p-2", config.bgColor)}>
                          <Icon className={cn("size-4", config.color)} />
                        </div>
                        <div className="flex flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {format(new Date(entry.timestamp), "HH:mm:ss", { locale: es })}
                            </span>
                            <span className="text-sm">{config.label}</span>
                            {entry.isManual && (
                              <Badge variant="outline" className="text-xs">
                                Manual
                              </Badge>
                            )}
                            {breakInfo && (
                              <span className="text-muted-foreground text-xs">
                                ({formatMinutes(breakInfo.duration)})
                              </span>
                            )}
                          </div>
                          {entry.notes && <span className="text-muted-foreground text-xs">{entry.notes}</span>}

                          {/* Badges de GPS */}
                          {entry.latitude && entry.longitude && (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="mr-1 h-3 w-3" />
                                GPS: {Math.round(entry.accuracy ?? 0)}m
                              </Badge>
                              {entry.isWithinAllowedArea === true && (
                                <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-xs">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Dentro del área
                                </Badge>
                              )}
                              {entry.requiresReview && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  Requiere revisión
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Separador y fichajes cancelados */}
              {day.timeEntries.some((e) => e.isCancelled) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-muted h-px flex-1" />
                    <span className="text-muted-foreground text-xs font-medium">Invalidados por rectificación</span>
                    <div className="bg-muted h-px flex-1" />
                  </div>
                  <div className="space-y-2">
                    {day.timeEntries
                      .filter((entry) => entry.isCancelled)
                      .map((entry, index) => {
                        const config = entryTypeConfig[entry.entryType];
                        const Icon = config.icon;
                        const breakInfo = breakDurations.find((b) => b.startIndex === index);

                        return (
                          <div key={entry.id} className="flex items-start gap-3 opacity-50">
                            <div className={cn("rounded-full p-2", config.bgColor)}>
                              <Icon className={cn("size-4", config.color)} />
                            </div>
                            <div className="flex flex-1 flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium line-through">
                                  {format(new Date(entry.timestamp), "HH:mm:ss", { locale: es })}
                                </span>
                                <span className="text-sm line-through">{config.label}</span>
                                {entry.isManual && (
                                  <Badge variant="outline" className="text-xs">
                                    Manual
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className="border-red-500/30 bg-red-500/10 text-xs text-red-700 dark:text-red-400"
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Cancelado
                                </Badge>
                                {breakInfo && (
                                  <span className="text-muted-foreground text-xs">
                                    ({formatMinutes(breakInfo.duration)})
                                  </span>
                                )}
                              </div>
                              {entry.notes && <span className="text-muted-foreground text-xs">{entry.notes}</span>}
                              {entry.cancellationNotes && (
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  Motivo: {entry.cancellationNotes}
                                </span>
                              )}

                              {/* Badges de GPS */}
                              {entry.latitude && entry.longitude && (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <Badge variant="outline" className="text-xs">
                                    <MapPin className="mr-1 h-3 w-3" />
                                    GPS: {Math.round(entry.accuracy ?? 0)}m
                                  </Badge>
                                  {entry.isWithinAllowedArea === true && (
                                    <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-xs">
                                      <CheckCircle2 className="mr-1 h-3 w-3" />
                                      Dentro del área
                                    </Badge>
                                  )}
                                  {entry.requiresReview && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Requiere revisión
                                    </Badge>
                                  )}
                                </div>
                              )}
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

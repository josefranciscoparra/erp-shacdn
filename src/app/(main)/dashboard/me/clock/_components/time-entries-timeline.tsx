"use client";

import { LogIn, LogOut, Coffee, MapPin, CheckCircle2, AlertTriangle, FolderKanban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectInfo {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
}

interface TimeEntry {
  id: string;
  entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | "PROJECT_SWITCH";
  timestamp: Date;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isWithinAllowedArea: boolean | null;
  requiresReview: boolean;
  distanceFromCenter: number | null;
  // Pausas Automáticas (Mejora 6)
  isAutomatic?: boolean;
  automaticBreakNotes?: string | null;
  // Proyecto asociado (Mejora 4)
  project?: ProjectInfo | null;
  task?: string | null;
}

interface TimeEntriesTimelineProps {
  entries: TimeEntry[];
}

export function TimeEntriesTimeline({ entries }: TimeEntriesTimelineProps) {
  const visibleEntries = entries.filter((entry) => entry.entryType !== "PROJECT_SWITCH");

  // Agrupar entradas por día
  const groupedByDay = visibleEntries.reduce(
    (acc, entry) => {
      const dateKey = new Date(entry.timestamp).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }

      acc[dateKey].push(entry);
      return acc;
    },
    {} as Record<string, TimeEntry[]>,
  );

  // Configuración de estilos por tipo de entrada
  // Pausas Automáticas (Mejora 6): Las pausas automáticas tienen color diferente (azul)
  const getEntryConfig = (entryType: TimeEntry["entryType"], isAutomatic?: boolean) => {
    switch (entryType) {
      case "CLOCK_IN":
        return {
          label: "Entrada",
          icon: LogIn,
          bgColor: "bg-emerald-500",
          iconColor: "text-white",
        };
      case "CLOCK_OUT":
        return {
          label: "Salida",
          icon: LogOut,
          bgColor: "bg-red-500",
          iconColor: "text-white",
        };
      case "BREAK_START":
        return {
          label: isAutomatic ? "Pausa automática (inicio)" : "Inicio de pausa",
          icon: Coffee,
          bgColor: isAutomatic ? "bg-blue-500" : "bg-yellow-500",
          iconColor: "text-white",
        };
      case "BREAK_END":
        return {
          label: isAutomatic ? "Pausa automática (fin)" : "Fin de pausa",
          icon: Coffee,
          bgColor: isAutomatic ? "bg-blue-500" : "bg-emerald-500",
          iconColor: "text-white",
        };
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDay).map(([dateKey, dayEntries]) => (
        <div key={dateKey} className="space-y-4">
          {/* Cabecera del día */}
          <div className="flex items-center gap-3">
            <h4 className="text-muted-foreground text-sm font-semibold">
              {dateKey === new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
                ? "Hoy"
                : dateKey}
            </h4>
            <div className="bg-border h-px flex-1" />
          </div>

          {/* Timeline */}
          <div className="relative space-y-0">
            {/* Eventos en orden inverso (más reciente primero) */}
            {dayEntries
              .slice()
              .reverse()
              .map((entry, index) => {
                // Pausas Automáticas (Mejora 6): Pasar isAutomatic para diferente color
                const config = getEntryConfig(entry.entryType, entry.isAutomatic);
                const Icon = config.icon;
                const isLast = index === dayEntries.length - 1;

                return (
                  <div
                    key={entry.id}
                    className={cn("relative flex gap-4 pb-8", isLast && "pb-0")}
                    style={{
                      animation: `fadeIn 300ms ease-out ${index * 50}ms both`,
                    }}
                  >
                    {/* Contenedor del punto con línea vertical */}
                    <div className="relative flex flex-col items-center">
                      {/* Línea vertical - detrás del punto, solo si no es el último */}
                      {!isLast && (
                        <div
                          className="bg-border absolute top-10 left-1/2 z-0 w-px -translate-x-1/2"
                          style={{
                            height: "calc(100% + 32px)",
                          }}
                        />
                      )}

                      {/* Punto del timeline - encima de la línea */}
                      <div
                        className={cn(
                          "border-background relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 shadow-sm",
                          config.bgColor,
                        )}
                      >
                        <Icon className={cn("h-4 w-4", config.iconColor)} strokeWidth={2.5} />
                      </div>
                    </div>

                    {/* Contenido del evento */}
                    <div className="flex-1 space-y-2 pt-1.5">
                      {/* Tipo de fichaje y hora */}
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <span className="text-sm leading-tight font-semibold">{config.label}</span>
                        <span className="text-muted-foreground text-xs font-medium tabular-nums sm:shrink-0">
                          {new Date(entry.timestamp).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Proyecto asociado (solo en CLOCK_IN) */}
                      {entry.entryType === "CLOCK_IN" && entry.project && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]"
                            style={{
                              borderColor: entry.project.color ?? undefined,
                              backgroundColor: entry.project.color ? `${entry.project.color}15` : undefined,
                            }}
                          >
                            {entry.project.color ? (
                              <div
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: entry.project.color }}
                              />
                            ) : (
                              <FolderKanban className="h-3 w-3 shrink-0" />
                            )}
                            {entry.project.name}
                            {entry.project.code && (
                              <span className="text-muted-foreground font-mono">({entry.project.code})</span>
                            )}
                          </Badge>
                          {entry.task && <span className="text-muted-foreground text-[11px] italic">{entry.task}</span>}
                        </div>
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

                          {/* Badge de fuera del área */}
                          {entry.isWithinAllowedArea === false && !entry.requiresReview && (
                            <Badge
                              variant="outline"
                              className="inline-flex items-center gap-1 rounded-full border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
                            >
                              <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                              Fuera del perímetro
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

                          {/* Distancia al centro (si está disponible) */}
                          {entry.distanceFromCenter && (
                            <span className="text-muted-foreground text-[11px]">
                              ({Math.round(entry.distanceFromCenter)}m del centro)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Sin ubicación GPS</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Estilos de animación inline - compatible con Safari */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

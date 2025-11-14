"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, MapPin, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { CalendarEvent } from "./";

interface EventViewDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

// Iconos por tipo de evento
const getEventIcon = () => {
  return <Calendar className="size-5" />;
};

// Badges suaves estilo pill
const eventBadgeMap: Record<string, string> = {
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
};

export function EventViewDialog({ event, isOpen, onClose }: EventViewDialogProps) {
  if (!event) return null;

  const badgeColor = eventBadgeMap[event.color ?? "sky"] ?? eventBadgeMap.sky;
  const isAllDay = event.allDay ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-4">
          {/* Header limpio con icono + título */}
          <div className="flex items-start gap-3">
            <div className="text-primary mt-1">{getEventIcon()}</div>
            <div className="flex-1 space-y-2">
              <DialogTitle className="text-2xl font-bold leading-tight">{event.title}</DialogTitle>
              {/* Badge pill suave en lugar de header con color */}
              {event.color && (
                <Badge variant="secondary" className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
                  Evento
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">Detalles del evento</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Todo el día badge */}
          {isAllDay && (
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground size-5 shrink-0" />
              <Badge variant="outline" className="rounded-full text-xs">
                Todo el día
              </Badge>
            </div>
          )}

          {/* Fecha y hora */}
          <div className="flex items-start gap-3">
            <Clock className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <p className="text-sm font-semibold">Fecha y hora</p>
              <div className="text-muted-foreground space-y-1 text-sm">
                {isAllDay ? (
                  <p>{format(new Date(event.start), "PPP", { locale: es })}</p>
                ) : (
                  <>
                    <p>
                      <span className="font-medium">Inicio:</span>{" "}
                      {format(new Date(event.start), "PPP 'a las' p", { locale: es })}
                    </p>
                    <p>
                      <span className="font-medium">Fin:</span>{" "}
                      {format(new Date(event.end), "PPP 'a las' p", { locale: es })}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Descripción */}
          {event.description && (
            <div className="flex items-start gap-3">
              <Tag className="text-muted-foreground mt-0.5 size-5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <p className="text-sm font-semibold">Descripción</p>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}

          {/* Ubicación */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="text-muted-foreground mt-0.5 size-5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <p className="text-sm font-semibold">Ubicación</p>
                <p className="text-muted-foreground text-sm">{event.location}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

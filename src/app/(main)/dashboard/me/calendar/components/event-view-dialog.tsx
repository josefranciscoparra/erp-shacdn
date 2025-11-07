"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, MapPin, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { CalendarEvent } from "./";

interface EventViewDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

const eventColorMap: Record<string, { bg: string; text: string; badge: string }> = {
  sky: {
    bg: "bg-sky-100 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    badge: "bg-sky-500/15 text-sky-700 dark:bg-sky-400/20 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    badge:
      "bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  violet: {
    bg: "bg-violet-100 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    badge:
      "bg-violet-500/15 text-violet-700 dark:bg-violet-400/20 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-300",
    badge:
      "bg-rose-500/15 text-rose-700 dark:bg-rose-400/20 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    badge:
      "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-300",
    badge:
      "bg-orange-500/15 text-orange-700 dark:bg-orange-400/20 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
};

export function EventViewDialog({ event, isOpen, onClose }: EventViewDialogProps) {
  if (!event) return null;

  const colorScheme = eventColorMap[event.color ?? "sky"] ?? eventColorMap.sky;
  const isAllDay = event.allDay ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="space-y-3">
            <DialogTitle className={cn("rounded-lg px-4 py-3 text-xl", colorScheme.bg, colorScheme.text)}>
              {event.title}
            </DialogTitle>
            {isAllDay && (
              <Badge variant="outline" className="w-fit text-xs">
                Todo el día
              </Badge>
            )}
          </div>
          <DialogDescription className="sr-only">Detalles del evento</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Fecha y hora */}
          <div className="flex items-start gap-3">
            <Clock className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Fecha y hora</p>
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
                      <span className="font-medium">Fin:</span> {format(new Date(event.end), "PPP 'a las' p", { locale: es })}
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
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Descripción</p>
                <p className="text-muted-foreground whitespace-pre-wrap text-sm">{event.description}</p>
              </div>
            </div>
          )}

          {/* Ubicación */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="text-muted-foreground mt-0.5 size-5 shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Ubicación</p>
                <p className="text-muted-foreground text-sm">{event.location}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

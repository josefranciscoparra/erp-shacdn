"use client";

import Link from "next/link";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ArrowRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface UpcomingEventsProps {
  events: MySpaceDashboard["upcomingEvents"];
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <Card className="border-border/50 bg-card rounded-2xl p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Calendar className="text-primary h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Próximos eventos</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-muted/30 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <CalendarDays className="text-muted-foreground/60 h-8 w-8" />
          </div>
          <p className="text-foreground mb-1 text-sm font-medium">No hay eventos próximos</p>
          <p className="text-muted-foreground text-xs">No tienes eventos programados para los próximos días.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card rounded-2xl p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
            <Calendar className="text-primary h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">Próximos eventos</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -mr-2 gap-1" asChild>
          <Link href="/dashboard/me/calendar">
            Ver calendario
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {events.map((event) => {
          const startDate = new Date(event.date);
          const endDate = event.endDate ? new Date(event.endDate) : null;
          const isMultiDay = endDate && !isSameDay(startDate, endDate);

          return (
            <div
              key={event.id}
              className="group border-border/50 hover:border-border hover:bg-muted/30 flex items-start gap-3 rounded-xl border p-4 transition-all duration-200 hover:shadow-sm"
            >
              {/* Indicador de color del calendario */}
              <div
                className="ring-background mt-1 h-3 w-3 flex-shrink-0 rounded-full shadow-sm ring-2"
                style={{ backgroundColor: event.calendar?.color || "var(--border)" }}
              />

              <div className="flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="leading-snug font-semibold">{event.name}</p>
                  <span className="text-xl opacity-70 transition-opacity group-hover:opacity-100">
                    {event.eventType === "HOLIDAY" && "🏖️"}
                    {event.eventType === "COMPANY_EVENT" && "🏢"}
                    {event.eventType === "TRAINING" && "📚"}
                    {event.eventType === "MEETING" && "📅"}
                    {event.eventType === "OTHER" && "📌"}
                  </span>
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="bg-muted/50 rounded-md px-2 py-0.5">{event.calendar?.name || "Calendario"}</span>
                  <span>•</span>
                  <span>
                    {isMultiDay ? (
                      <>
                        {format(startDate, "d MMM", { locale: es })} - {format(endDate, "d MMM", { locale: es })}
                      </>
                    ) : (
                      format(startDate, "EEEE, d 'de' MMMM", { locale: es })
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length >= 5 && (
        <div className="mt-5 text-center">
          <Button variant="outline" size="sm" className="w-full rounded-lg" asChild>
            <Link href="/dashboard/me/calendar">
              Ver todos los eventos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

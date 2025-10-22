"use client";

import Link from "next/link";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ArrowRight, CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface UpcomingEventsProps {
  events: MySpaceDashboard["upcomingEvents"];
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-5 w-5" />
            <h3 className="text-lg font-semibold">Próximos eventos</h3>
          </div>
        </div>
        <EmptyState
          icon={<CalendarDays className="text-muted-foreground/60 h-10 w-10" />}
          title="No hay eventos próximos"
          description="No tienes eventos programados en tu calendario para los próximos días."
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-5 w-5" />
          <h3 className="text-lg font-semibold">Próximos eventos</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/me/calendar">
            Ver calendario
            <ArrowRight className="ml-2 h-4 w-4" />
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
              className="hover:bg-accent flex items-start gap-3 rounded-lg border p-3 transition-colors"
            >
              {/* Indicador de color del calendario */}
              <div
                className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: event.calendar?.color ?? "var(--border)" }}
              />

              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{event.name}</p>
                  <span className="text-muted-foreground text-xs">
                    {event.eventType === "HOLIDAY" && "🏖️"}
                    {event.eventType === "COMPANY_EVENT" && "🏢"}
                    {event.eventType === "TRAINING" && "📚"}
                    {event.eventType === "MEETING" && "📅"}
                    {event.eventType === "OTHER" && "📌"}
                  </span>
                </div>

                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span>{event.calendar?.name ?? "Calendario"}</span>
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
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm" asChild>
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

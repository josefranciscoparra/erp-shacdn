"use client";

import Link from "next/link";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, CalendarDays, Building2, BookOpen, Clock, MapPin, ArrowRight } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface UpcomingEventsProps {
  events: MySpaceDashboard["upcomingEvents"];
}

// Mapeo de tipos de evento a iconos
const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "HOLIDAY":
      return <Calendar className="text-primary size-3" />;
    case "COMPANY_EVENT":
      return <Building2 className="text-primary size-3" />;
    case "TRAINING":
      return <BookOpen className="text-primary size-3" />;
    case "MEETING":
      return <Clock className="text-primary size-3" />;
    default:
      return <MapPin className="text-primary size-3" />;
  }
};

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Próximos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<CalendarDays className="text-muted-foreground/60 h-10 w-10" />}
            title="No hay eventos próximos"
            description="No tienes eventos programados en tu calendario para los próximos días."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos eventos</CardTitle>
        <CardAction>
          <Link
            href="/dashboard/me/calendar"
            className="text-muted-foreground hover:text-primary text-sm hover:underline"
          >
            Ver calendario
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="ps-8">
        <ol className="relative border-s">
          {events.slice(0, 5).map((event, index) => {
            const startDate = new Date(event.date);
            const endDate = event.endDate ? new Date(event.endDate) : null;
            const isMultiDay = endDate && !isSameDay(startDate, endDate);

            return (
              <li key={event.id} className={`ms-6 space-y-2 ${index < events.length - 1 ? "mb-8" : ""}`}>
                <span className="bg-muted absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full border">
                  {getEventIcon(event.eventType)}
                </span>
                <h3 className="font-semibold">{event.name}</h3>
                <time className="text-muted-foreground flex items-center gap-1.5 text-sm leading-none">
                  <Clock className="size-3" />
                  {isMultiDay ? (
                    <>
                      {format(startDate, "d MMM", { locale: es })} - {format(endDate, "d MMM", { locale: es })}
                    </>
                  ) : (
                    format(startDate, "EEEE, d 'de' MMMM", { locale: es })
                  )}
                </time>
                {event.calendar?.name && <p className="text-muted-foreground text-sm">{event.calendar.name}</p>}
              </li>
            );
          })}
        </ol>

        {events.length > 5 && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/me/calendar">
                Ver todos los eventos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

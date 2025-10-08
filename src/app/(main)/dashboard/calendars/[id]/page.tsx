"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Calendar, Edit, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCalendarsStore, CalendarEventData } from "@/stores/calendars-store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarEventDialog } from "../_components/calendar-event-dialog";
import { ImportHolidaysDialog } from "../_components/import-holidays-dialog";

const calendarTypeLabels: Record<string, string> = {
  NATIONAL_HOLIDAY: "Nacional",
  LOCAL_HOLIDAY: "Local",
  CORPORATE_EVENT: "Corporativo",
  CUSTOM: "Personalizado",
};

const eventTypeLabels: Record<string, string> = {
  HOLIDAY: "Festivo",
  CLOSURE: "Cierre",
  EVENT: "Evento",
  MEETING: "Reunión",
  DEADLINE: "Fecha límite",
  OTHER: "Otro",
};

export default function CalendarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { selectedCalendar, isLoading, error, fetchCalendarById, deleteCalendar, deleteEvent } = useCalendarsStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);

  useEffect(() => {
    if (id) {
      fetchCalendarById(id);
    }
  }, [id, fetchCalendarById]);

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este calendario? Se eliminarán todos sus eventos.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCalendar(id);
      toast.success("Calendario eliminado exitosamente");
      router.push("/dashboard/calendars");
    } catch (error) {
      toast.error("Error al eliminar calendario");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("¿Estás seguro de eliminar este evento?")) {
      return;
    }

    try {
      await deleteEvent(id, eventId);
      toast.success("Evento eliminado exitosamente");
      await fetchCalendarById(id);
    } catch (error) {
      toast.error("Error al eliminar evento");
    }
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const handleEditEvent = (event: CalendarEventData) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando calendario...</span>
        </div>
      </div>
    );
  }

  if (error || !selectedCalendar) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar calendario: {error || "No encontrado"}</span>
        </div>
      </div>
    );
  }

  const calendar = selectedCalendar;
  const events = calendar.events || [];

  // Agrupar eventos por mes
  const eventsByMonth = events.reduce((acc, event) => {
    const month = format(new Date(event.date), "MMMM yyyy", { locale: es });
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/calendars">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: calendar.color }}
            />
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{calendar.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{calendarTypeLabels[calendar.calendarType]}</Badge>
                <span>•</span>
                <span>{calendar.year}</span>
                {calendar.costCenter && (
                  <>
                    <span>•</span>
                    <span>{calendar.costCenter.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ImportHolidaysDialog calendarId={id} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/calendars/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Eliminar
          </Button>
        </div>
      </div>

      {/* Description */}
      {calendar.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">{calendar.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 @xl/main:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de eventos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{events.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estado</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={calendar.active ? "default" : "secondary"}>
              {calendar.active ? "Activo" : "Inactivo"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Año</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{calendar.year}</div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Eventos</CardTitle>
              <CardDescription>Fechas y eventos del calendario</CardDescription>
            </div>
            <Button size="sm" onClick={handleNewEvent}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo evento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
              <h3 className="text-foreground mb-1 text-sm font-medium">No hay eventos</h3>
              <p className="text-xs">Agrega eventos a este calendario</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
                <div key={month}>
                  <h3 className="mb-3 text-sm font-medium capitalize">{month}</h3>
                  <div className="space-y-2">
                    {monthEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground flex h-12 w-12 flex-col items-center justify-center rounded-md border">
                            <div className="text-lg font-semibold tabular-nums">
                              {format(new Date(event.date), "dd")}
                            </div>
                            <div className="text-xs uppercase">
                              {format(new Date(event.date), "MMM", { locale: es })}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">{event.name}</div>
                            {event.description && (
                              <div className="text-muted-foreground text-sm">{event.description}</div>
                            )}
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {eventTypeLabels[event.eventType]}
                              </Badge>
                              {event.isRecurring && (
                                <Badge variant="secondary" className="text-xs">
                                  Recurrente
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEvent(event)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CalendarEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        calendarId={id}
        event={selectedEvent}
      />
    </div>
  );
}

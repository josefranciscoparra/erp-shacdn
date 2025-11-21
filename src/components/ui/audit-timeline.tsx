import { CheckCircle2, Circle, Clock, FileText, User, XCircle, Wrench, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type TimelineEvent = {
  id: string;
  type: "CREATED" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMMENT" | "RESOLVED" | "DISMISSED";
  actorName: string;
  actorImage?: string | null;
  date: Date | string;
  comment?: string | null;
  isPending?: boolean; // Para el paso futuro
};

interface AuditTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function AuditTimeline({ events, className }: AuditTimelineProps) {
  // Ordenar eventos por fecha (antiguos primero)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className={cn("flex flex-col space-y-0", className)}>
      {sortedEvents.map((event, index) => {
        const isLast = index === sortedEvents.length - 1;
        const date = new Date(event.date);

        return (
          <div key={event.id} className="relative pl-8 pb-6 last:pb-0">
            {/* Línea conectora */}
            {!isLast && (
              <div 
                className="absolute left-[15px] top-8 h-full w-[2px] bg-border" 
                aria-hidden="true"
              />
            )}

            {/* Icono del evento */}
            <div className="absolute left-0 top-1 bg-background">
               <EventIcon type={event.type} />
            </div>

            {/* Contenido */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{event.actorName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(date, "PP p", { locale: es })}
                </span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {getEventLabel(event.type)}
              </div>

              {event.comment && (
                <div className="mt-1 rounded-md bg-muted/50 p-2 text-sm italic text-foreground/80 border">
                  "{event.comment}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventIcon({ type }: { type: TimelineEvent["type"] }) {
  switch (type) {
    case "CREATED":
      return <Circle className="h-8 w-8 text-blue-500 fill-blue-50 p-1.5 border rounded-full" />;
    case "APPROVED":
      return <CheckCircle2 className="h-8 w-8 text-green-600 fill-green-50 p-1.5 border rounded-full" />;
    case "REJECTED":
      return <XCircle className="h-8 w-8 text-red-600 fill-red-50 p-1.5 border rounded-full" />;
    case "RESOLVED":
      return <CheckCircle2 className="h-8 w-8 text-teal-600 fill-teal-50 p-1.5 border rounded-full" />;
    case "DISMISSED":
      return <EyeOff className="h-8 w-8 text-gray-500 fill-gray-100 p-1.5 border rounded-full" />;
    case "CANCELLED":
      return <XCircle className="h-8 w-8 text-gray-500 fill-gray-50 p-1.5 border rounded-full" />;
    case "COMMENT":
      return <FileText className="h-8 w-8 text-amber-500 fill-amber-50 p-1.5 border rounded-full" />;
    default:
      return <Clock className="h-8 w-8 text-gray-400 fill-gray-50 p-1.5 border rounded-full" />;
  }
}

function getEventLabel(type: TimelineEvent["type"]) {
  switch (type) {
    case "CREATED": return "Solicitud creada";
    case "APPROVED": return "Aprobó la solicitud";
    case "REJECTED": return "Rechazó la solicitud";
    case "RESOLVED": return "Resolvió la incidencia";
    case "DISMISSED": return "Descartó la incidencia";
    case "CANCELLED": return "Canceló la solicitud";
    case "COMMENT": return "Añadió un comentario";
    default: return "Evento";
  }
}

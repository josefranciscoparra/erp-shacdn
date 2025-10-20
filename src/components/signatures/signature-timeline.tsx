import { CheckCircle2, Circle, FileSignature, FileText, XCircle } from "lucide-react";

interface TimelineEvent {
  event: string;
  timestamp: string;
  actor?: string;
  details?: Record<string, unknown>;
}

interface SignatureTimelineProps {
  timeline: TimelineEvent[];
  className?: string;
}

const eventIcons: Record<string, { icon: typeof FileText; color: string }> = {
  SIGNATURE_REQUEST_CREATED: { icon: FileText, color: "text-blue-500" },
  CONSENT_GIVEN: { icon: Circle, color: "text-yellow-500" },
  DOCUMENT_SIGNED: { icon: CheckCircle2, color: "text-green-500" },
  SIGNATURE_REJECTED: { icon: XCircle, color: "text-red-500" },
};

const eventLabels: Record<string, string> = {
  SIGNATURE_REQUEST_CREATED: "Solicitud de firma creada",
  CONSENT_GIVEN: "Consentimiento otorgado",
  DOCUMENT_SIGNED: "Documento firmado",
  SIGNATURE_REJECTED: "Firma rechazada",
};

export function SignatureTimeline({ timeline, className = "" }: SignatureTimelineProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {timeline.map((event, index) => {
        const config = eventIcons[event.event] ?? { icon: FileSignature, color: "text-gray-500" };
        const Icon = config.icon;
        const label = eventLabels[event.event] ?? event.event;
        const isLast = index === timeline.length - 1;

        return (
          <div key={index} className="relative flex gap-4">
            {/* Línea vertical */}
            {!isLast && <div className="bg-border absolute top-8 bottom-0 left-4 w-0.5" />}

            {/* Icono */}
            <div
              className={`bg-background relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${config.color}`}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Contenido */}
            <div className="flex-1 pb-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{label}</p>
                <time className="text-muted-foreground text-xs">
                  {new Date(event.timestamp).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              {event.actor && <p className="text-muted-foreground mt-0.5 text-sm">{event.actor}</p>}
              {event.details && (
                <div className="text-muted-foreground bg-muted/50 mt-2 rounded-md p-2 text-xs">
                  {Object.entries(event.details).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

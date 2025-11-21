"use client";

import { useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X, Loader2, TriangleAlert, Info, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AuditTimeline, type TimelineEvent } from "@/components/ui/audit-timeline";
import type { PendingApprovalItem } from "@/server/actions/approvals";
import { resolveAlert, dismissAlert } from "@/server/actions/alert-resolution";

interface AlertResolutionDialogProps {
  item: PendingApprovalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function buildAlertTimeline(item: PendingApprovalItem): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Generación de Alerta
  events.push({
    id: "created",
    type: "CREATED",
    actorName: "Sistema", // Las alertas las genera el sistema
    actorImage: null,
    date: item.createdAt,
    comment: `Alerta generada automáticamente`,
  });

  // 2. Resolución (si no está activa)
  if (item.status !== "ACTIVE") {
     // Usamos audit dates si existen, o updatedAt como fallback
     const date = item.details?.audit?.resolvedAt || item.details?.audit?.decidedAt || new Date(); 
     
     let type: TimelineEvent["type"] = "RESOLVED";
     if (item.status === "DISMISSED") type = "DISMISSED";

     events.push({
        id: "resolution",
        type,
        actorName: item.details?.audit?.approverName ?? "Usuario",
        actorImage: item.details?.audit?.approverImage,
        date: date,
        comment: item.details?.approverComments // o resolutionComment si viniera mapeado así
     });
  }

  return events;
}

export function AlertResolutionDialog({ item, open, onOpenChange, onSuccess }: AlertResolutionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState("");

  if (!item) return null;

  const handleAction = async (action: "RESOLVE" | "DISMISS") => {
    setIsSubmitting(true);
    try {
      let result;
      if (action === "RESOLVE") {
        result = await resolveAlert(item.id, comments);
      } else {
        result = await dismissAlert(item.id, comments);
      }

      if (result.success) {
        toast.success(action === "RESOLVE" ? "Alerta resuelta" : "Alerta descartada");
        onSuccess();
        onOpenChange(false);
        setComments("");
      } else {
        toast.error("Error al procesar la alerta");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const incidents = (item.details?.incidents as any[]) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div>
            <DialogTitle className="text-xl">{item.employeeName}</DialogTitle>
            <DialogDescription className="mt-1 flex items-center gap-2">
              {item.details?.position && <span>{item.details.position}</span>}
              <span className="text-muted-foreground">•</span>
              <span className="capitalize font-medium text-foreground">
                Incidencias del {format(new Date(item.date), "PPPP", { locale: es })}
              </span>
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="bg-muted/30 my-2 rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
             <TriangleAlert className="h-5 w-5 text-destructive" />
             <h3 className="font-semibold text-destructive">Incidencias Detectadas</h3>
          </div>
          
          {incidents.length > 0 ? (
            <ul className="space-y-2">
              {incidents.map((incident, idx) => (
                <li key={idx} className="flex flex-col gap-1 text-sm bg-white p-2 rounded border shadow-sm">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">
                      {typeof incident === 'string' ? formatIncidentLabel(incident) : formatIncidentLabel(incident.type)}
                    </span>
                  </div>
                  {typeof incident !== 'string' && incident.description && (
                    <p className="text-muted-foreground text-xs ml-6">{incident.description}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No hay detalles específicos de incidencias.</p>
          )}
        </div>

        {item.status === "ACTIVE" && (
          <div className="grid gap-2">
            <label className="text-sm font-medium">Notas de resolución (Opcional)</label>
            <Textarea
              placeholder="Explica cómo se resolvió esta incidencia..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {/* Timeline de Auditoría para Alertas */}
        <div className="mt-6 mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Historial de Actividad</h4>
          <div className="rounded-lg border bg-muted/10 p-4">
            <AuditTimeline events={buildAlertTimeline(item)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <div className="flex-1 flex justify-start">
             <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
              <Link href={`/dashboard/time-tracking/${item.employeeId}?date=${item.date.split('T')[0]}`} target="_blank">
                <Clock className="mr-2 h-4 w-4" />
                Ver Fichajes
              </Link>
            </Button>
          </div>
          
          {item.status === "ACTIVE" ? (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={() => handleAction("DISMISS")}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground flex-1 sm:flex-none"
              >
                Descartar
              </Button>
              <Button
                onClick={() => handleAction("RESOLVE")}
                disabled={isSubmitting}
                className="bg-primary flex-1 sm:flex-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Resolver
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatIncidentLabel(incident: string): string {
  switch (incident) {
    case "MISSING_CLOCK_IN": return "Falta fichaje de entrada";
    case "MISSING_CLOCK_OUT": return "Falta fichaje de salida (Incompleto)";
    case "LATE_ARRIVAL": return "Llegada tardía";
    case "CRITICAL_LATE_ARRIVAL": return "Llegada tardía crítica";
    case "EARLY_DEPARTURE": return "Salida anticipada";
    case "CRITICAL_EARLY_DEPARTURE": return "Salida anticipada crítica";
    case "ABSENCE": return "Ausencia injustificada";
    case "NON_WORKDAY_CLOCK_IN": return "Fichaje en día no laborable";
    default: return incident.replace(/_/g, " ");
  }
}

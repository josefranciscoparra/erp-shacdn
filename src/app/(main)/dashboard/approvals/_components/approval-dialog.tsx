"use client";

import { useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X, Loader2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AuditTimeline, type TimelineEvent } from "@/components/ui/audit-timeline";
import { approveRequest, rejectRequest, type PendingApprovalItem } from "@/server/actions/approvals";

const expenseCategories: Record<string, string> = {
  FUEL: "Combustible",
  MILEAGE: "Kilometraje",
  MEAL: "Comida",
  TOLL: "Peaje",
  PARKING: "Parking",
  LODGING: "Alojamiento",
  OTHER: "Otro",
};

function buildTimelineEvents(item: PendingApprovalItem): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Creación
  events.push({
    id: "created",
    type: "CREATED",
    actorName: item.employeeName,
    actorImage: item.employeeImage,
    date: item.createdAt,
    comment: item.type === "PTO" ? (item.details?.reason as string) : (item.details?.notes as string),
  });

  // 2. Decisión (si existe en audit)
  const audit = item.details?.audit;
  if (audit?.decidedAt || audit?.approvedAt || audit?.rejectedAt || (item.type === "ALERT" && item.status !== "ACTIVE")) {
    // Para alertas, usamos resolvedAt si está disponible, o updatedAt del item como fallback
    const date = audit?.decidedAt || audit?.approvedAt || audit?.rejectedAt || item.createdAt; // TODO: Backend should send resolvedAt in audit for alerts

    let type: TimelineEvent["type"] = "COMMENT";
    switch (item.status) {
        case "APPROVED": type = "APPROVED"; break;
        case "REJECTED": type = "REJECTED"; break;
        case "RESOLVED": type = "RESOLVED"; break;
        case "DISMISSED": type = "DISMISSED"; break;
    }

    events.push({
      id: "decision",
      type,
      actorName: audit?.approverName ?? "Sistema/Usuario",
      actorImage: audit?.approverImage,
      date,
      comment: (item.details?.approverComments as string) || (item.details?.rejectionReason as string),
    });
  }

  return events;
}

interface ApprovalDialogProps {
  item: PendingApprovalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Callback para refrescar la lista
}

export function ApprovalDialog({ item, open, onOpenChange, onSuccess }: ApprovalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState("");
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [showConfirm, setShowConfirm] = useState(false);

  if (!item) return null;

  const isReadOnly = item.status !== "PENDING";

  const handleActionClick = (type: "approve" | "reject") => {
    setAction(type);
    setComments("");
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    if (action === "reject" && !comments.trim()) {
      toast.error("Debes indicar un motivo para rechazar");
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      if (action === "approve") {
        result = await approveRequest(item.id, item.type, comments);
      } else {
        result = await rejectRequest(item.id, item.type, comments);
      }

      if (result.success) {
        toast.success(`Solicitud ${action === "approve" ? "aprobada" : "rechazada"} correctamente`);
        onSuccess();
        onOpenChange(false);
        setShowConfirm(false);
      } else {
        toast.error(result.error ?? "Error al procesar la solicitud");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDetails = () => {
    if (item.type === "PTO") {
      return (
        <div className="bg-muted/20 grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
          <div>
            <span className="text-muted-foreground">Tipo:</span>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.details?.color ?? "#3b82f6" }} />
              <span className="font-medium">{item.details?.absenceType}</span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Duración:</span>
            <p className="mt-1 font-medium">{item.details?.days?.toFixed(1)} días</p>
          </div>
          <div>
            <span className="text-muted-foreground">Desde:</span>
            <p className="mt-1 font-medium">
              {item.details?.startDate ? format(new Date(item.details.startDate), "PPP", { locale: es }) : "-"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Hasta:</span>
            <p className="mt-1 font-medium">
              {item.details?.endDate ? format(new Date(item.details.endDate), "PPP", { locale: es }) : "-"}
            </p>
          </div>
          {item.details?.reason && (
            <div className="col-span-2 mt-2 border-t pt-2">
              <span className="text-muted-foreground">Motivo:</span>
              <p className="text-muted-foreground mt-1 italic">{item.details.reason}</p>
            </div>
          )}
        </div>
      );
    }

    if (item.type === "MANUAL_TIME_ENTRY") {
      return (
        <div className="bg-muted/20 grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
          <div className="col-span-2">
            <span className="text-muted-foreground">Motivo corrección:</span>
            <p className="mt-1 font-medium">{item.details?.reason ?? "Sin motivo"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Entrada:</span>
            <p className="mt-1 font-medium">
              {item.details?.clockIn ? format(new Date(item.details.clockIn), "HH:mm", { locale: es }) : "-"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Salida:</span>
            <p className="mt-1 font-medium">
              {item.details?.clockOut ? format(new Date(item.details.clockOut), "HH:mm", { locale: es }) : "-"}
            </p>
          </div>
        </div>
      );
    }

    if (item.type === "EXPENSE") {
      const downloadUrl = item.details?.attachmentId
        ? `/api/expenses/${item.id}/attachments/${item.details.attachmentId}/download`
        : null;

      return (
        <div className="bg-muted/20 grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
          <div>
            <span className="text-muted-foreground">Importe Total:</span>
            <p className="mt-1 text-lg font-bold text-green-700 dark:text-green-400">
              {item.details?.amount ? `${Number(item.details.amount).toFixed(2)}€` : "-"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Categoría:</span>
            <div className="mt-1">
              <Badge variant="secondary" className="font-medium">
                {expenseCategories[item.details?.category as string] ?? item.details?.category}
              </Badge>
            </div>
          </div>
          {item.details?.merchant && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Comercio:</span>
              <p className="mt-1 font-medium">{item.details.merchant}</p>
            </div>
          )}
          {item.details?.notes && (
            <div className="col-span-2 mt-2 border-t pt-2">
              <span className="text-muted-foreground">Notas:</span>
              <p className="text-muted-foreground mt-1 italic">{item.details.notes}</p>
            </div>
          )}
          {downloadUrl && (
            <div className="col-span-2 mt-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  link.target = "_blank";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <FileText className="h-4 w-4" />
                Ver Comprobante Original
                <ExternalLink className="text-muted-foreground ml-auto h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    return <p className="text-muted-foreground text-sm">Detalles no disponibles para este tipo de solicitud.</p>;
  };

  // Vista de Confirmación (Acción)
  if (showConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{action === "approve" ? "Aprobar Solicitud" : "Rechazar Solicitud"}</DialogTitle>
            <DialogDescription>
              Vas a {action === "approve" ? "aprobar" : "rechazar"} la solicitud de <strong>{item.employeeName}</strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="comments">
                {action === "approve" ? "Comentarios (Opcional)" : "Motivo del rechazo (Obligatorio)"}
              </Label>
              <Textarea
                id="comments"
                placeholder={action === "approve" ? "Añadir nota..." : "Explica por qué rechazas..."}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
              Volver
            </Button>
            <Button
              variant={action === "approve" ? "default" : "destructive"}
              onClick={handleSubmit}
              disabled={isSubmitting || (action === "reject" && !comments.trim())}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === "approve" ? "Confirmar Aprobación" : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Vista de Detalle (Inicial)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={item.employeeImage ?? ""} />
              <AvatarFallback>{item.employeeName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{item.employeeName}</DialogTitle>
              <DialogDescription>{item.details?.position ?? "Empleado"}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="px-3 py-1 text-sm">
              {item.summary}
            </Badge>
            <span className="text-muted-foreground text-xs">
              Solicitado el {format(new Date(item.createdAt), "PPPP", { locale: es })}
            </span>
          </div>

          {renderDetails()}

          {/* Timeline de Auditoría */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Historial de Actividad</h4>
            <div className="rounded-lg border bg-muted/10 p-4">
              <AuditTimeline events={buildTimelineEvents(item)} />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          {isReadOnly ? (
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleActionClick("reject")}
              >
                <X className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
              <Button
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={() => handleActionClick("approve")}
              >
                <Check className="mr-2 h-4 w-4" />
                Aprobar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

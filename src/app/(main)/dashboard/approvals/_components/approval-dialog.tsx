"use client";

import { useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approveRequest, rejectRequest, type PendingApprovalItem } from "@/server/actions/approvals";

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
              Solicitado el {format(new Date(item.createdAt), "PPP", { locale: es })}
            </span>
          </div>

          {renderDetails()}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => handleActionClick("reject")}
          >
            <X className="mr-2 h-4 w-4" />
            Rechazar
          </Button>
          <Button className="bg-green-600 text-white hover:bg-green-700" onClick={() => handleActionClick("approve")}>
            <Check className="mr-2 h-4 w-4" />
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

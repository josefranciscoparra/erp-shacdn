"use client";

import { useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check,
  X,
  Loader2,
  FileText,
  ImageIcon,
  AlertTriangle,
  Paperclip,
  Eye,
  Download,
  Calendar,
  Clock,
  Building2,
  User,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { AuditTimeline, type TimelineEvent } from "@/components/ui/audit-timeline";
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
import { downloadFileFromApi, openFilePreviewFromApi } from "@/lib/client/file-download";
import { approveRequest, rejectRequest, type PendingApprovalItem } from "@/server/actions/approvals";
import { formatWorkingDays } from "@/services/pto/pto-helpers-client";

const expenseCategories: Record<string, string> = {
  FUEL: "Combustible",
  MILEAGE: "Kilometraje",
  MEAL: "Comida",
  TOLL: "Peaje",
  PARKING: "Parking",
  LODGING: "Alojamiento",
  OTHER: "Otro",
};

// Helper to safely get string properties from details
const getDetailString = (item: PendingApprovalItem, key: string): string | undefined => {
  return item.details?.[key] as string | undefined;
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
    comment: item.type === "PTO" ? getDetailString(item, "reason") : getDetailString(item, "notes"),
  });

  // 2. Decisión (si existe en audit)
  const audit = item.details?.audit;
  if (audit && (audit.decidedAt ?? audit.approvedAt ?? audit.rejectedAt)) {
    const date = audit.decidedAt ?? audit.approvedAt ?? audit.rejectedAt ?? item.createdAt;

    let type: TimelineEvent["type"] = "COMMENT";
    switch (item.status) {
      case "APPROVED":
        type = "APPROVED";
        break;
      case "REJECTED":
        type = "REJECTED";
        break;
    }

    events.push({
      id: "decision",
      type,
      actorName: audit.approverName ?? "Sistema/Usuario",
      actorImage: audit.approverImage,
      date,
      comment: getDetailString(item, "approverComments") ?? getDetailString(item, "rejectionReason"),
    });
  }

  return events;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const handleViewDocument = async (itemId: string, docId: string, fileName: string) => {
  try {
    const response = await fetch(`/api/pto-requests/${itemId}/documents/${docId}`);
    if (!response.ok) throw new Error("Error al obtener documento");
    const data = await response.json();
    if (data.url) {
      window.open(data.url, "_blank");
    }
  } catch {
    toast.error(`Error al abrir ${fileName}`);
  }
};

const handleDownloadDocument = async (itemId: string, docId: string, fileName: string) => {
  try {
    const response = await fetch(`/api/pto-requests/${itemId}/documents/${docId}`);
    if (!response.ok) throw new Error("Error al obtener documento");
    const data = await response.json();
    if (data.url) {
      // Create a temporary link to trigger download
      const link = document.createElement("a");
      link.href = data.url;
      link.download = fileName; // This might be ignored by some browsers for cross-origin
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch {
    toast.error(`Error al descargar ${fileName}`);
  }
};

// --- Sub-components for Details ---

function PtoDocuments({ item }: { item: PendingApprovalItem }) {
  const documents = item.details?.documents as
    | Array<{
        id: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        uploadedAt: string;
      }>
    | undefined;
  const requiresDocument = item.details?.requiresDocument as boolean;
  const documentsCount = (item.details?.documentsCount as number) ?? 0;

  if (!documents?.length && !requiresDocument) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
          Documentación Adjunta
          {requiresDocument && <span className="text-destructive text-xs">*Requerido</span>}
        </span>
      </div>

      {requiresDocument && documentsCount === 0 && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>Esta ausencia requiere justificante, pero no se ha adjuntado ninguno.</span>
        </div>
      )}

      {documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          {documents.map((doc) => {
            const isImage = doc.mimeType.startsWith("image/");
            const isPdf = doc.mimeType === "application/pdf";

            return (
              <div
                key={doc.id}
                className="group bg-card hover:bg-accent/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                    {isImage ? (
                      <ImageIcon className="h-5 w-5 text-blue-600" />
                    ) : isPdf ? (
                      <FileText className="h-5 w-5 text-red-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.fileName}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatFileSize(doc.fileSize)} • {format(new Date(doc.uploadedAt), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDocument(item.id, doc.id, doc.fileName)}
                    className="h-8 w-8 p-0 opacity-70 group-hover:opacity-100"
                    title="Ver documento"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadDocument(item.id, doc.id, doc.fileName)}
                    className="h-8 w-8 p-0 opacity-70 group-hover:opacity-100"
                    title="Descargar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !requiresDocument && <p className="text-muted-foreground text-sm italic">Sin documentos adjuntos.</p>
      )}
    </div>
  );
}

function PtoDetails({ item }: { item: PendingApprovalItem }) {
  const startDate = item.details?.startDate ? new Date(item.details.startDate as string) : null;
  const endDate = item.details?.endDate ? new Date(item.details.endDate as string) : null;
  const days = item.details?.days as number | undefined;
  const absenceType = item.details?.absenceType as string | undefined;
  const color = item.details?.color as string | undefined;
  const reason = item.details?.reason as string | undefined;
  const hasDaysValue = typeof days === "number" && Number.isFinite(days);
  const roundedDays = hasDaysValue ? Number(days.toFixed(1)) : null;
  const dayLabel = hasDaysValue && roundedDays !== null ? formatWorkingDays(roundedDays) : "-";
  const unit = roundedDays === 1 ? "día" : "días";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Desde
          </span>
          <p className="font-medium">{startDate ? format(startDate, "dd MMM yyyy", { locale: es }) : "-"}</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <ArrowRight className="h-3.5 w-3.5" /> Hasta
          </span>
          <p className="font-medium">{endDate ? format(endDate, "dd MMM yyyy", { locale: es }) : "-"}</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" /> Duración
          </span>
          <p className="font-medium">{hasDaysValue ? `${dayLabel} ${unit}` : "-"}</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <FileText className="h-3.5 w-3.5" /> Tipo
          </span>
          <Badge
            variant="secondary"
            className="font-normal"
            style={{
              backgroundColor: color ? `${color}20` : undefined,
              color: color,
              borderColor: color ? `${color}40` : undefined,
            }}
          >
            {absenceType}
          </Badge>
        </div>
      </div>

      {reason && (
        <div className="bg-muted/30 rounded-md p-3 text-sm">
          <span className="text-muted-foreground mb-1 block text-xs font-medium">Motivo de la solicitud</span>
          <p className="text-foreground/90 italic">&quot;{reason}&quot;</p>
        </div>
      )}

      <PtoDocuments item={item} />
    </div>
  );
}

function ManualEntryDetails({ item }: { item: PendingApprovalItem }) {
  const clockIn = item.details?.clockIn ? new Date(item.details.clockIn as string) : null;
  const clockOut = item.details?.clockOut ? new Date(item.details.clockOut as string) : null;
  const reason = item.details?.reason as string | undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" /> Entrada
          </span>
          <p className="text-lg font-medium">{clockIn ? format(clockIn, "HH:mm", { locale: es }) : "-"}</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" /> Salida
          </span>
          <p className="text-lg font-medium">{clockOut ? format(clockOut, "HH:mm", { locale: es }) : "-"}</p>
        </div>
      </div>

      <div className="bg-muted/30 rounded-md p-3 text-sm">
        <span className="text-muted-foreground mb-1 block text-xs font-medium">Motivo de la corrección</span>
        <p className="text-foreground/90 italic">{reason ?? "Sin motivo especificado"}</p>
      </div>
    </div>
  );
}

function ExpenseDetails({ item }: { item: PendingApprovalItem }) {
  const downloadUrl = item.details?.attachmentId
    ? `/api/expenses/${item.id}/attachments/${item.details.attachmentId}/download`
    : null;
  const amount = item.details?.amount ? Number(item.details.amount) : null;
  const category = item.details?.category as string | undefined;
  const merchant = item.details?.merchant as string | undefined;
  const notes = item.details?.notes as string | undefined;

  const handlePreview = async () => {
    if (!downloadUrl) return;
    try {
      await openFilePreviewFromApi(downloadUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo abrir el comprobante";
      toast.error(message);
    }
  };

  const handleDownload = async () => {
    if (!downloadUrl) return;
    try {
      await downloadFileFromApi(downloadUrl, item.details?.attachmentName as string | undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo descargar el comprobante";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Importe Total</span>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {amount ? `${amount.toFixed(2)}€` : "-"}
          </p>
        </div>
        <Badge variant="outline" className="py-1 text-sm">
          {category ? (expenseCategories[category] ?? category) : "-"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Building2 className="h-3.5 w-3.5" /> Comercio / Proveedor
          </span>
          <p className="font-medium">{merchant ?? "-"}</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Fecha del Gasto
          </span>
          <p className="font-medium">{item.date ? format(new Date(item.date), "dd MMM yyyy", { locale: es }) : "-"}</p>
        </div>
      </div>

      {notes && (
        <div className="bg-muted/30 rounded-md p-3 text-sm">
          <span className="text-muted-foreground mb-1 block text-xs font-medium">Notas del empleado</span>
          <p className="text-foreground/90 italic">&quot;{notes}&quot;</p>
        </div>
      )}

      {downloadUrl ? (
        <div className="border-t pt-4">
          <span className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4" /> Comprobante Adjunto
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-auto flex-1 justify-center py-2"
              onClick={() => {
                void handlePreview();
              }}
            >
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Ver documento
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-1 justify-center py-2"
              onClick={() => {
                void handleDownload();
              }}
            >
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Descargar
              </span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t pt-4 text-center">
          <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm italic">
            <AlertTriangle className="h-4 w-4" />
            Este gasto no tiene comprobante adjunto
          </p>
        </div>
      )}
    </div>
  );
}

interface ApprovalDialogProps {
  item: PendingApprovalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

  if (showConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{action === "approve" ? "Aprobar Solicitud" : "Rechazar Solicitud"}</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas {action === "approve" ? "aprobar" : "rechazar"} esta solicitud?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="comments">
                {action === "approve" ? "Comentarios (Opcional)" : "Motivo del rechazo (Obligatorio)"}
              </Label>
              <Textarea
                id="comments"
                placeholder={
                  action === "approve" ? "Añadir nota para el empleado..." : "Explica el motivo del rechazo..."
                }
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant={action === "approve" ? "default" : "destructive"}
              onClick={handleSubmit}
              disabled={isSubmitting || (action === "reject" && !comments.trim())}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === "approve" ? "Confirmar Aprobación" : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-6">
          <div className="flex items-start gap-4">
            <Avatar className="border-muted h-12 w-12 border-2">
              <AvatarImage src={item.employeeImage ?? ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {item.employeeName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-xl">{item.employeeName}</DialogTitle>
              <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5" />
                <span>{item.details?.position ?? "Empleado"}</span>
                <span>•</span>
                <span>Solicitado el {format(new Date(item.createdAt), "PPP", { locale: es })}</span>
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 px-3 py-1 text-sm">
              {item.summary}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          {/* Detalles de la solicitud */}
          <section>
            <h4 className="text-foreground/80 mb-4 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" />
              Detalles de la Solicitud
            </h4>
            {item.type === "PTO" && <PtoDetails item={item} />}
            {item.type === "MANUAL_TIME_ENTRY" && <ManualEntryDetails item={item} />}
            {item.type === "EXPENSE" && <ExpenseDetails item={item} />}
            {/* Fallback for unknown types or Alerts */}
            {!["PTO", "MANUAL_TIME_ENTRY", "EXPENSE"].includes(item.type) && (
              <p className="text-muted-foreground text-sm">Detalles no disponibles para este tipo de solicitud.</p>
            )}
          </section>

          <Separator />

          {/* Timeline */}
          <section>
            <h4 className="text-foreground/80 mb-4 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4" />
              Historial de Actividad
            </h4>
            <div className="pl-2">
              <AuditTimeline events={buildTimelineEvents(item)} />
            </div>
          </section>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 border-t p-6 sm:flex-row sm:justify-end">
          {isReadOnly ? (
            <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cerrar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 w-full sm:w-auto"
                onClick={() => handleActionClick("reject")}
              >
                <X className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
              <Button
                className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
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

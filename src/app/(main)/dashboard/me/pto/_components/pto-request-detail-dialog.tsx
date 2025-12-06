"use client";

import { useCallback, useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, Calendar, CheckCircle2, Clock, FileText, Loader2, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";

import { minutesToTime } from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
import { DocumentUploadZone, DocumentViewer, type PendingFile, type PtoDocument } from "@/components/pto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { type PtoRequest } from "@/stores/pto-store";

const statusConfig = {
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-yellow-500/20 text-yellow-800 dark:bg-yellow-500/30 dark:text-yellow-300 font-semibold",
  },
  APPROVED: {
    label: "Aprobada",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  REJECTED: {
    label: "Rechazada",
    icon: XCircle,
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  CANCELLED: {
    label: "Cancelada",
    icon: Ban,
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  },
  DRAFT: {
    label: "Borrador",
    icon: Clock,
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  },
};

interface PtoRequestDetailDialogProps {
  request: PtoRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentsChange?: () => void;
}

export function PtoRequestDetailDialog({
  request,
  open,
  onOpenChange,
  onDocumentsChange,
}: PtoRequestDetailDialogProps) {
  const [documents, setDocuments] = useState<PtoDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Estados que permiten añadir documentos
  const canAddDocuments = request?.status === "PENDING" || request?.status === "APPROVED";

  // Cargar documentos cuando se abre el diálogo
  const loadDocuments = useCallback(async () => {
    if (!request?.id) return;

    setIsLoadingDocuments(true);
    try {
      const response = await fetch(`/api/pto-requests/${request.id}/documents`);
      if (!response.ok) {
        throw new Error("Error al cargar documentos");
      }
      const data = await response.json();
      setDocuments(data.documents ?? []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Error al cargar los documentos");
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [request?.id]);

  useEffect(() => {
    if (open && request?.id) {
      loadDocuments();
    } else {
      // Limpiar estado al cerrar
      setDocuments([]);
      setShowUploadZone(false);
      setPendingFiles([]);
    }
  }, [open, request?.id, loadDocuments]);

  // Subir archivos pendientes
  const handleUploadFiles = async () => {
    if (!request?.id || pendingFiles.length === 0) return;

    setIsUploading(true);

    let successCount = 0;
    let errorCount = 0;

    for (const pendingFile of pendingFiles) {
      try {
        const formData = new FormData();
        formData.append("file", pendingFile.file);

        const response = await fetch(`/api/pto-requests/${request.id}/documents`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error ?? "Error al subir archivo");
        }

        successCount++;
      } catch (error) {
        console.error(`Error uploading ${pendingFile.file.name}:`, error);
        errorCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} archivo(s) subido(s) correctamente`);
      setPendingFiles([]);
      setShowUploadZone(false);
      await loadDocuments();
      onDocumentsChange?.();
    }

    if (errorCount > 0) {
      toast.error(`Error al subir ${errorCount} archivo(s)`);
    }
  };

  // Eliminar documento
  const handleDeleteDocument = async (documentId: string) => {
    if (!request?.id) return;

    try {
      const response = await fetch(`/api/pto-requests/${request.id}/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Error al eliminar documento");
      }

      toast.success("Documento eliminado");
      await loadDocuments();
      onDocumentsChange?.();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(error instanceof Error ? error.message : "Error al eliminar documento");
    }
  };

  if (!request) return null;

  const config = statusConfig[request.status];
  const StatusIcon = config.icon;

  // Formatear duración
  const formatDuration = () => {
    if (request.durationMinutes !== null && request.durationMinutes !== undefined) {
      const hours = Math.floor(request.durationMinutes / 60);
      const minutes = request.durationMinutes % 60;

      const timeRange =
        request.startTime !== null &&
        request.startTime !== undefined &&
        request.endTime !== null &&
        request.endTime !== undefined
          ? `${minutesToTime(request.startTime)} - ${minutesToTime(request.endTime)}`
          : null;

      return (
        <div className="flex flex-col">
          {timeRange && <span className="font-semibold">{timeRange}</span>}
          <span className="text-muted-foreground text-sm">
            {hours > 0 && `${hours}h`}
            {minutes > 0 && ` ${minutes}m`}
          </span>
        </div>
      );
    }

    return <span className="font-semibold">{request.workingDays.toFixed(1)} días laborables</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: request.absenceType.color }} />
            {request.absenceType.name}
          </DialogTitle>
          <DialogDescription>Detalle de la solicitud de ausencia</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Estado</span>
            <Badge variant="outline" className={config.className}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
          </div>

          <Separator />

          {/* Fechas */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Fecha inicio
              </span>
              <p className="font-medium">{format(new Date(request.startDate), "PPP", { locale: es })}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Fecha fin
              </span>
              <p className="font-medium">{format(new Date(request.endDate), "PPP", { locale: es })}</p>
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-1">
            <span className="text-muted-foreground text-sm">Duración</span>
            {formatDuration()}
          </div>

          {/* Motivo */}
          {request.reason && (
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm">Motivo</span>
              <p className="text-sm">{request.reason}</p>
            </div>
          )}

          {/* Comentarios del aprobador */}
          {request.approverComments && (
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm">Comentarios del aprobador</span>
              <p className="text-sm">{request.approverComments}</p>
            </div>
          )}

          {/* Razón de rechazo */}
          {request.rejectionReason && (
            <div className="space-y-1">
              <span className="text-destructive text-sm">Motivo de rechazo</span>
              <p className="text-sm">{request.rejectionReason}</p>
            </div>
          )}

          <Separator />

          {/* Sección de documentos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4" />
                Justificantes ({documents.length})
              </span>
              {canAddDocuments && !showUploadZone && (
                <Button variant="outline" size="sm" onClick={() => setShowUploadZone(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Añadir
                </Button>
              )}
            </div>

            {/* Loading de documentos */}
            {isLoadingDocuments && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            )}

            {/* Lista de documentos */}
            {!isLoadingDocuments && documents.length > 0 && (
              <DocumentViewer documents={documents} onDelete={canAddDocuments ? handleDeleteDocument : undefined} />
            )}

            {/* Mensaje si no hay documentos */}
            {!isLoadingDocuments && documents.length === 0 && !showUploadZone && (
              <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                No hay justificantes adjuntos
              </div>
            )}

            {/* Zona de subida */}
            {showUploadZone && (
              <div className="space-y-4">
                <DocumentUploadZone
                  pendingFiles={pendingFiles}
                  onPendingFilesChange={setPendingFiles}
                  existingDocumentsCount={documents.length}
                  maxFiles={5}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowUploadZone(false);
                      setPendingFiles([]);
                    }}
                    disabled={isUploading}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleUploadFiles} disabled={pendingFiles.length === 0 || isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>Subir {pendingFiles.length > 0 && `(${pendingFiles.length})`}</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Información adicional */}
          <Separator />

          <div className="text-muted-foreground space-y-1 text-xs">
            <p>Solicitado el {format(new Date(request.submittedAt), "PPP 'a las' HH:mm", { locale: es })}</p>
            {request.approvedAt && (
              <p>
                Aprobado el {format(new Date(request.approvedAt), "PPP 'a las' HH:mm", { locale: es })}
                {request.approver && ` por ${request.approver.name}`}
              </p>
            )}
            {request.rejectedAt && (
              <p>
                Rechazado el {format(new Date(request.rejectedAt), "PPP 'a las' HH:mm", { locale: es })}
                {request.approver && ` por ${request.approver.name}`}
              </p>
            )}
            {request.cancelledAt && (
              <p>Cancelado el {format(new Date(request.cancelledAt), "PPP 'a las' HH:mm", { locale: es })}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

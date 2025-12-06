"use client";

import { useState } from "react";

import { Download, ExternalLink, Eye, FileText, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface PtoDocument {
  id: string;
  ptoRequestId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  description?: string | null;
  uploadedAt: Date | string;
  uploadedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface DocumentViewerProps {
  /** Lista de documentos a mostrar */
  documents: PtoDocument[];
  /** Callback para eliminar un documento */
  onDelete?: (documentId: string) => Promise<void>;
  /** Si el usuario puede eliminar documentos */
  canDelete?: boolean;
  /** Si mostrar información de quién subió el documento */
  showUploader?: boolean;
  /** Clase CSS adicional */
  className?: string;
  /** Modo de visualización */
  variant?: "list" | "grid";
}

/**
 * Componente para visualizar documentos adjuntos de solicitudes PTO
 * - Imágenes: Preview inline con opción de ver en grande
 * - PDFs: Icono + nombre + botón descargar
 */
export function DocumentViewer({
  documents,
  onDelete,
  canDelete = false,
  showUploader = false,
  className,
  variant = "list",
}: DocumentViewerProps) {
  const [previewDocument, setPreviewDocument] = useState<PtoDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PtoDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchDocumentUrl = async (documentId: string, ptoRequestId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/pto-requests/${ptoRequestId}/documents/${documentId}`);
      if (!response.ok) {
        throw new Error("Error al obtener URL del documento");
      }
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error fetching document URL:", error);
      toast.error("Error al cargar el documento");
      return null;
    }
  };

  const handlePreview = async (doc: PtoDocument) => {
    setPreviewDocument(doc);
    setLoadingPreview(true);

    const url = await fetchDocumentUrl(doc.id, doc.ptoRequestId);
    if (url) {
      setPreviewUrl(url);
    }
    setLoadingPreview(false);
  };

  const handleDownload = async (doc: PtoDocument) => {
    setDownloadingId(doc.id);
    try {
      const url = await fetchDocumentUrl(doc.id, doc.ptoRequestId);
      if (url) {
        // Abrir en nueva pestaña para descargar
        window.open(url, "_blank");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(deleteConfirm.id);
      toast.success("Documento eliminado correctamente");
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Error al eliminar el documento");
    } finally {
      setDeleting(false);
    }
  };

  const closePreview = () => {
    setPreviewDocument(null);
    setPreviewUrl(null);
  };

  if (documents.length === 0) {
    return (
      <div className={cn("text-muted-foreground py-6 text-center", className)}>
        <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">No hay documentos adjuntos</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn(variant === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "space-y-2", className)}>
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={cn(
              "bg-card hover:bg-muted/30 rounded-lg border transition-colors",
              variant === "grid" ? "p-3" : "flex items-center gap-3 p-3",
            )}
          >
            {/* Preview/Icono */}
            {variant === "grid" ? (
              <div className="bg-muted mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-md">
                {isImage(doc.mimeType) ? (
                  <button
                    type="button"
                    onClick={() => handlePreview(doc)}
                    className="h-full w-full transition-opacity hover:opacity-80"
                  >
                    <div className="bg-muted flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-blue-500" />
                    </div>
                  </button>
                ) : (
                  <FileText className="h-10 w-10 text-red-500" />
                )}
              </div>
            ) : (
              <div className="flex-shrink-0">
                {isImage(doc.mimeType) ? (
                  <button
                    type="button"
                    onClick={() => handlePreview(doc)}
                    className="bg-muted ring-primary/50 flex h-12 w-12 items-center justify-center rounded transition-all hover:ring-2"
                  >
                    <ImageIcon className="h-6 w-6 text-blue-500" />
                  </button>
                ) : (
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className={cn("min-w-0", variant === "list" && "flex-1")}>
              <p className="truncate text-sm font-medium" title={doc.fileName}>
                {doc.fileName}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatFileSize(doc.fileSize)}
                {showUploader && doc.uploadedBy && <> • {doc.uploadedBy.name ?? doc.uploadedBy.email}</>}
              </p>
              {showUploader && <p className="text-muted-foreground text-xs">{formatDate(doc.uploadedAt)}</p>}
              {doc.description && <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{doc.description}</p>}
            </div>

            {/* Acciones */}
            <div className={cn("flex gap-1", variant === "grid" ? "mt-2 justify-end" : "flex-shrink-0")}>
              {isImage(doc.mimeType) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePreview(doc)}
                  title="Ver imagen"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(doc)}
                disabled={downloadingId === doc.id}
                title="Descargar"
              >
                {downloadingId === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>

              {canDelete && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive h-8 w-8"
                  onClick={() => setDeleteConfirm(doc)}
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de preview para imágenes */}
      <Dialog open={!!previewDocument} onOpenChange={() => closePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewDocument?.fileName}</DialogTitle>
          </DialogHeader>

          <div className="relative flex min-h-[200px] items-center justify-center">
            {loadingPreview ? (
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            ) : previewUrl ? (
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={previewDocument?.fileName}
                  className="mx-auto max-h-[70vh] w-auto rounded-lg"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => window.open(previewUrl, "_blank")}
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Abrir original
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No se pudo cargar la imagen</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar &quot;{deleteConfirm?.fileName}&quot;? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, FileText, Loader2, Plus, ShieldAlert, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface WhistleblowingDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  description: string | null;
  uploadedAt: string;
  uploadedBy?: { id: string; name: string | null; email: string | null } | null;
}

interface DocumentsSectionProps {
  reportId: string;
  allowUpload?: boolean;
  allowDelete?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
}

const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function getFriendlyErrorMessage(status: number, fallback: string): string {
  switch (status) {
    case 401:
      return "Tu sesión ha caducado. Vuelve a iniciar sesión.";
    case 403:
      return "No tienes permisos para gestionar estos documentos.";
    case 404:
      return "El recurso indicado no existe o ya no está disponible.";
    case 409:
      return "La acción no puede completarse por una obligación legal.";
    default:
      return fallback;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}

export function WhistleblowingDocumentsSection({
  reportId,
  allowUpload = true,
  allowDelete = false,
  title = "Documentos adjuntos",
  description = "Gestiona las evidencias asociadas a este expediente. El sistema aplica retención legal automática.",
  emptyMessage = "Aún no hay documentos adjuntos en este expediente.",
}: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<WhistleblowingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadDocuments();
  }, [reportId]);

  async function loadDocuments() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/whistleblowing/${reportId}/documents`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        documents?: WhistleblowingDocument[];
        error?: string;
      } | null;

      if (!response.ok) {
        const message = getFriendlyErrorMessage(
          response.status,
          payload?.error ?? "No se pudieron obtener los documentos",
        );
        toast.error(message);
        setDocuments([]);
        return;
      }

      setDocuments(payload?.documents ?? []);
    } catch (error) {
      console.error("Error loading whistleblowing documents:", error);
      toast.error("No se pudieron cargar los documentos");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpload(file: File) {
    if (!allowUpload) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/whistleblowing/${reportId}/documents`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = getFriendlyErrorMessage(response.status, payload?.error ?? "No se pudo adjuntar el documento");
        throw new Error(message);
      }

      toast.success("Documento adjuntado correctamente");
      await loadDocuments();
    } catch (error) {
      console.error("Error uploading whistleblowing document:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo adjuntar el documento");
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDownload(documentId: string) {
    setDownloadingId(documentId);
    try {
      const response = await fetch(`/api/whistleblowing/${reportId}/documents/${documentId}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = getFriendlyErrorMessage(
          response.status,
          payload?.error ?? "No se pudo obtener la URL de descarga",
        );
        throw new Error(message);
      }

      if (payload?.downloadUrl) {
        window.open(payload.downloadUrl, "_blank", "noopener");
      }
    } catch (error) {
      console.error("Error downloading whistleblowing document:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo descargar el documento");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(documentId: string) {
    if (!allowDelete) return;
    setDeletingId(documentId);
    try {
      const response = await fetch(`/api/whistleblowing/${reportId}/documents/${documentId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = getFriendlyErrorMessage(response.status, payload?.error ?? "No se pudo eliminar el documento");
        throw new Error(message);
      }

      toast.success("Documento eliminado");
      await loadDocuments();
    } catch (error) {
      console.error("Error deleting whistleblowing document:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el documento");
    } finally {
      setDeletingId(null);
    }
  }

  const uploadDisabled = useMemo(() => isUploading || !allowUpload, [isUploading, allowUpload]);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {allowUpload && (
            <Button variant="outline" size="sm" disabled={uploadDisabled} onClick={() => fileInputRef.current?.click()}>
              {isUploading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-2 h-3.5 w-3.5" />
              )}
              Adjuntar
            </Button>
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed p-3 text-xs">
          <ShieldAlert className="h-4 w-4" />
          Los adjuntos quedan sujetos a retención legal automática. No se podrán eliminar hasta que la normativa lo
          permita.
        </div>
        {allowUpload && (
          <div className="text-muted-foreground space-y-1 text-xs">
            <p className="font-medium tracking-wide uppercase">Requisitos</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>Formatos permitidos: PDF, JPG, PNG, WebP</li>
              <li>Tamaño máximo: 20MB por archivo</li>
            </ul>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={allowedMimeTypes.join(",")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setPendingFile(file);
            void handleUpload(file);
          }}
        />

        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando documentos...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="bg-card rounded-md border p-3">
                <div className="flex flex-col gap-2 @lg/main:flex-row @lg/main:items-center @lg/main:justify-between">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-md">
                      <FileText className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{document.fileName}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatBytes(document.fileSize)} · {document.mimeType.toUpperCase()}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Subido el {format(new Date(document.uploadedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </p>
                      {document.uploadedBy?.name && (
                        <p className="text-muted-foreground text-xs">Por: {document.uploadedBy.name}</p>
                      )}
                      {document.description && (
                        <Badge variant="secondary" className="mt-2 text-[10px]">
                          {document.description}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDownload(document.id)}
                      disabled={downloadingId === document.id}
                    >
                      {downloadingId === document.id ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-3.5 w-3.5" />
                      )}
                      Descargar
                    </Button>
                    {allowDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(document.id)}
                        disabled={deletingId === document.id}
                      >
                        {deletingId === document.id ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                        )}
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingFile && (
          <>
            <Separator />
            <div className="text-muted-foreground text-xs">Subiendo {pendingFile.name}...</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

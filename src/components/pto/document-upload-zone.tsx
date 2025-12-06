"use client";

import { useCallback, useRef, useState } from "react";

import { FileText, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Constantes de validación
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export interface PendingFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface DocumentUploadZoneProps {
  /** Archivos pendientes (antes de subir) */
  pendingFiles: PendingFile[];
  /** Callback cuando cambian los archivos pendientes */
  onPendingFilesChange: (files: PendingFile[]) => void;
  /** Número de documentos ya subidos */
  existingDocumentsCount?: number;
  /** Si es obligatorio subir al menos un archivo */
  required?: boolean;
  /** Desactivar la zona de subida */
  disabled?: boolean;
  /** Máximo de archivos permitidos */
  maxFiles?: number;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Zona de subida de documentos con drag & drop
 * Soporta PDF, JPG, PNG con un máximo de 10MB por archivo
 */
export function DocumentUploadZone({
  pendingFiles,
  onPendingFilesChange,
  existingDocumentsCount = 0,
  required = false,
  disabled = false,
  maxFiles = MAX_FILES,
  className,
}: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = maxFiles - existingDocumentsCount - pendingFiles.length;
  const canAddMore = remainingSlots > 0 && !disabled;

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo no permitido. Solo PDF, JPG o PNG.`,
      };
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `Archivo demasiado grande (${sizeMB}MB). Máximo 10MB.`,
      };
    }

    return { valid: true };
  }, []);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const filesToAdd = Array.from(newFiles);

      // Verificar límite
      if (filesToAdd.length > remainingSlots) {
        toast.error(`Solo puedes añadir ${remainingSlots} archivo(s) más`);
        return;
      }

      const validFiles: PendingFile[] = [];

      for (const file of filesToAdd) {
        const validation = validateFile(file);

        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        // Crear preview para imágenes
        let preview: string | undefined;
        if (file.type.startsWith("image/")) {
          preview = URL.createObjectURL(file);
        }

        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          progress: 0,
          status: "pending",
        });
      }

      if (validFiles.length > 0) {
        onPendingFilesChange([...pendingFiles, ...validFiles]);
      }
    },
    [pendingFiles, onPendingFilesChange, remainingSlots, validateFile],
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const fileToRemove = pendingFiles.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      onPendingFilesChange(pendingFiles.filter((f) => f.id !== fileId));
    },
    [pendingFiles, onPendingFilesChange],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (canAddMore) {
        setIsDragOver(true);
      }
    },
    [canAddMore],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (!canAddMore) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [canAddMore, addFiles],
  );

  const handleClick = useCallback(() => {
    if (canAddMore) {
      fileInputRef.current?.click();
    }
  }, [canAddMore]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        addFiles(files);
      }
      // Reset input para permitir seleccionar el mismo archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [addFiles],
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <ImageIcon className="h-8 w-8 text-blue-500" />;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Zona de drop */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          canAddMore ? "hover:border-primary/50 hover:bg-muted/30 cursor-pointer" : "cursor-not-allowed opacity-50",
          isDragOver && "border-primary bg-primary/5",
          !isDragOver && "border-muted-foreground/25",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={!canAddMore}
        />

        <Upload className={cn("mb-3 h-10 w-10", isDragOver ? "text-primary" : "text-muted-foreground/50")} />

        <p className="text-center text-sm font-medium">
          {canAddMore ? (
            <>
              Arrastra archivos aquí o{" "}
              <span className="text-primary underline-offset-2 hover:underline">haz clic para seleccionar</span>
            </>
          ) : (
            "Límite de archivos alcanzado"
          )}
        </p>

        <p className="text-muted-foreground mt-1 text-xs">
          PDF, JPG, PNG • Máx. 10MB por archivo • {remainingSlots} de {maxFiles - existingDocumentsCount} disponibles
        </p>

        {required && pendingFiles.length === 0 && existingDocumentsCount === 0 && (
          <p className="text-destructive mt-2 text-xs">* Debes adjuntar al menos un justificante</p>
        )}
      </div>

      {/* Lista de archivos pendientes */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3",
                file.status === "error" && "border-destructive/50 bg-destructive/5",
                file.status === "success" && "border-green-500/50 bg-green-500/5",
              )}
            >
              {/* Preview o icono */}
              <div className="flex-shrink-0">
                {file.preview ? (
                  <div className="bg-muted relative h-12 w-12 overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={file.preview} alt={file.file.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded">
                    {getFileIcon(file.file.type)}
                  </div>
                )}
              </div>

              {/* Info del archivo */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.file.name}</p>
                <p className="text-muted-foreground text-xs">{formatFileSize(file.file.size)}</p>

                {/* Barra de progreso */}
                {file.status === "uploading" && <Progress value={file.progress} className="mt-1 h-1" />}

                {/* Error */}
                {file.status === "error" && file.error && <p className="text-destructive mt-1 text-xs">{file.error}</p>}
              </div>

              {/* Acciones */}
              <div className="flex-shrink-0">
                {file.status === "uploading" ? (
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                ) : file.status === "pending" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Exportar constantes para uso externo
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MAX_FILES };

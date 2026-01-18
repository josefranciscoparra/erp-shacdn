"use client";

import { useState } from "react";

import { Upload, X, FileImage } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface AttachmentUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function AttachmentUploader({ files, onFilesChange, maxFiles = 10, maxSizeMB = 10 }: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      // Validar tamaño
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} es demasiado grande (máx ${maxSizeMB}MB)`);
        return false;
      }

      // Validar tipo
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        toast.error(`${file.name} no es un formato válido (solo imágenes y PDF)`);
        return false;
      }

      return true;
    });

    const allFiles = [...files, ...validFiles];

    if (allFiles.length > maxFiles) {
      toast.error(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    onFilesChange(allFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      addFiles(newFiles);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/20"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="text-muted-foreground mx-auto size-12" />
        <h3 className="mt-4 text-sm font-semibold">Arrastra archivos aquí</h3>
        <p className="text-muted-foreground mt-1 text-xs">o</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          Seleccionar archivos
        </Button>
        <p className="text-muted-foreground mt-4 text-xs">Imágenes o PDF, máx {maxSizeMB}MB por archivo</p>
      </div>

      {/* Preview de archivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Archivos adjuntos ({files.length})</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {files.map((file, index) => (
              <div key={index} className="group relative overflow-hidden rounded-lg border">
                {file.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="bg-muted flex aspect-square items-center justify-center">
                    <FileImage className="text-muted-foreground size-12" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="size-8"
                    onClick={() => removeFile(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="absolute right-0 bottom-0 left-0 bg-black/70 p-1">
                  <p className="truncate text-xs text-white">{file.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

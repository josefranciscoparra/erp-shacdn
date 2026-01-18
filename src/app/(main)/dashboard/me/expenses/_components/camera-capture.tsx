"use client";

import { useState } from "react";

import { Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  capturedFile: File | null;
  onRemove: () => void;
}

export function CameraCapture({ onCapture, capturedFile, onRemove }: CameraCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen es demasiado grande (máx 10MB)");
      return;
    }

    // Crear preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Notificar al padre
    onCapture(file);
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onRemove();
  };

  // Si ya hay una foto capturada, mostrar preview
  if (capturedFile ?? previewUrl) {
    const displayUrl = previewUrl ?? (capturedFile ? URL.createObjectURL(capturedFile) : null);

    return (
      <div className="relative overflow-hidden rounded-lg border">
        {displayUrl && (
          <img
            src={displayUrl}
            alt="Ticket capturado"
            className="w-full object-contain"
            style={{ maxHeight: "500px" }}
          />
        )}

        {/* Botón para eliminar */}
        <div className="absolute top-2 right-2">
          <Button type="button" variant="destructive" size="icon" onClick={handleRemove}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Info del archivo */}
        <div className="absolute right-0 bottom-0 left-0 bg-black/70 p-2">
          <p className="truncate text-xs text-white">{capturedFile?.name}</p>
        </div>
      </div>
    );
  }

  // Si no hay foto, mostrar botones de captura
  return (
    <div className="space-y-4">
      {/* Input oculto con capture="environment" para abrir cámara en móvil */}
      <input
        type="file"
        id="camera-capture"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Input oculto para galería */}
      <input type="file" id="gallery-upload" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* Botón principal: Hacer foto (cámara) */}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="default"
          size="lg"
          className="w-full"
          onClick={() => document.getElementById("camera-capture")?.click()}
        >
          <Camera className="mr-2 size-5" />
          Hacer foto del ticket
        </Button>

        {/* Botón secundario: Subir desde galería */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => document.getElementById("gallery-upload")?.click()}
        >
          <Upload className="mr-2 size-5" />
          Seleccionar de galería
        </Button>
      </div>

      {/* Info */}
      <p className="text-muted-foreground text-center text-xs">
        La foto del ticket ayuda a extraer los datos automáticamente
      </p>
    </div>
  );
}

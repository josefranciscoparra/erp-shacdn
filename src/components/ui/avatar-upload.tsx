"use client";

import { useRef, useState } from "react";

import { Camera, Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";

interface AvatarUploadProps {
  currentPhotoUrl?: string | null;
  fallback: string;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function AvatarUpload({
  currentPhotoUrl,
  fallback,
  onUpload,
  disabled = false,
  size = "lg",
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona una imagen válida");
      return;
    }

    // Validar tamaño (2MB máx)
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen no puede superar los 2MB");
      return;
    }

    // Crear preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    setIsUploading(true);
    try {
      await onUpload(file);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error subiendo avatar:", error);
      setPreviewUrl(null);
      alert("Error al subir la imagen. Por favor intenta de nuevo.");
    } finally {
      setIsUploading(false);
      // Limpiar el input para permitir seleccionar el mismo archivo otra vez
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const displayUrl = previewUrl ?? currentPhotoUrl ?? undefined;

  return (
    <div className="relative inline-block">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className="group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full disabled:cursor-not-allowed"
      >
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={displayUrl} alt="Avatar" />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>

        {/* Overlay con icono de cámara */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          {isUploading ? (
            <Loader2 className={`${iconSizeClasses[size]} text-white animate-spin`} />
          ) : (
            <Camera className={`${iconSizeClasses[size]} text-white`} />
          )}
        </div>
      </button>

      {isUploading && (
        <div className="absolute -bottom-1 -right-1">
          <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full pointer-events-none">
            <Loader2 className="h-3 w-3 animate-spin" />
          </Button>
        </div>
      )}
    </div>
  );
}

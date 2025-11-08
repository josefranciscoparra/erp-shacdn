"use client";

import { useState, useCallback } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { documentKindLabels, formatFileSize, type DocumentKind } from "@/lib/validations/document";

// Solo tipos de documentos que los empleados pueden subir
const EMPLOYEE_ALLOWED_TYPES: Record<string, string> = {
  MEDICAL: documentKindLabels.MEDICAL,
  CERTIFICATE: documentKindLabels.CERTIFICATE,
  OTHER: documentKindLabels.OTHER,
};

const uploadFormSchema = z.object({
  documentKind: z.enum(["MEDICAL", "CERTIFICATE", "OTHER"]),
  description: z.string().optional(),
  file: z.any().refine((file) => file instanceof File, "Debe seleccionar un archivo"),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

export function UploadDocumentDialog({ open, onOpenChange, onUploadSuccess }: UploadDocumentDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      documentKind: undefined,
      description: "",
      file: undefined,
    },
  });

  // Limpiar formulario al cerrar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setSelectedFile(null);
      setDragActive(false);
    }
    onOpenChange(newOpen);
  };

  // Validar archivo
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (file.size > maxSize) {
      return "El archivo es demasiado grande (máximo 10MB)";
    }

    if (!allowedTypes.includes(file.type)) {
      return "Tipo de archivo no permitido. Solo se permiten PDF, DOC, DOCX, JPG, PNG, WEBP";
    }

    return null;
  };

  // Manejar selección de archivo
  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setSelectedFile(file);
      form.setValue("file", file);
      form.clearErrors("file");
    },
    [form],
  );

  // Manejar drag & drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect],
  );

  // Manejar input de archivo
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Remover archivo seleccionado
  const handleRemoveFile = () => {
    setSelectedFile(null);
    form.setValue("file", undefined);
    form.setError("file", { message: "Debe seleccionar un archivo" });
  };

  // Enviar formulario
  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile) {
      toast.error("Debe seleccionar un archivo");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentKind", data.documentKind);
      if (data.description) {
        formData.append("description", data.description);
      }

      const response = await fetch("/api/me/documents", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Error al subir documento");
      }

      toast.success("Documento subido exitosamente");
      handleOpenChange(false);
      onUploadSuccess();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(error instanceof Error ? error.message : "Error al subir documento");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto bg-gray-100 p-4 sm:max-w-[600px] sm:p-6 dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>
            Puedes subir justificantes médicos, certificados u otros documentos personales
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Zona de drag & drop */}
            <div className="space-y-4">
              <div
                className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                } ${selectedFile ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""} `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileInput}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                      <FileText className="h-8 w-8 flex-shrink-0 text-green-600" />
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="truncate font-medium text-green-700 dark:text-green-400">{selectedFile.name}</p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0 text-green-600 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      Archivo seleccionado. Haz clic para cambiar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="text-muted-foreground mx-auto h-12 w-12" />
                    <div>
                      <p className="text-base font-medium sm:text-lg">
                        <span className="sm:hidden">Haz clic para seleccionar</span>
                        <span className="hidden sm:inline">Arrastra archivos aquí o haz clic para seleccionar</span>
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">PDF, DOC, DOCX, JPG, PNG, WEBP (máx. 10MB)</p>
                    </div>
                  </div>
                )}
              </div>

              {form.formState.errors.file && (
                <p className="text-destructive text-sm">{form.formState.errors.file.message}</p>
              )}
            </div>

            {/* Tipo de documento */}
            <FormField
              control={form.control}
              name="documentKind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de documento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de documento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(EMPLOYEE_ALLOWED_TYPES).map(([kind, label]) => (
                        <SelectItem key={kind} value={kind}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Añade una descripción del documento..."
                      className="placeholder:text-muted-foreground/50 resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isUploading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading || !selectedFile} className="w-full sm:w-auto">
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir documento
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

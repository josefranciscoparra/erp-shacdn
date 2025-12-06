"use client";

import { useCallback, useState } from "react";

import Link from "next/link";

import { ArrowLeft, FileArchive, FileText, Loader2, Upload } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: year.toString(), label: year.toString() };
});

interface UploadResult {
  success: boolean;
  batchId?: string;
  totalFiles?: number;
  assignedCount?: number;
  pendingCount?: number;
  errorCount?: number;
  status?: string;
  error?: string;
}

export default function PayslipsUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
      setResult(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = ["application/zip", "application/x-zip-compressed", "application/pdf"];
    return validTypes.includes(file.type);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (month) formData.append("month", month);
      if (year) formData.append("year", year);

      // Simular progreso mientras sube
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch("/api/payslips/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          ...data,
        });
      } else {
        setResult({
          success: false,
          error: data.error ?? "Error desconocido",
        });
      }
    } catch {
      setResult({
        success: false,
        error: "Error de conexión al subir el archivo",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setUploadProgress(0);
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Subir Nóminas"
        subtitle="Sube un archivo ZIP con PDFs o un PDF multipágina"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/payslips">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 @3xl/main:grid-cols-2">
        {/* Zona de subida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Seleccionar archivo
            </CardTitle>
            <CardDescription>Arrastra un archivo ZIP con PDFs o un PDF multipágina</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              className={cn(
                "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                file && "border-green-500 bg-green-50 dark:bg-green-950/20",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input id="file-input" type="file" accept=".zip,.pdf" className="hidden" onChange={handleFileChange} />

              {file ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    {file.type.includes("zip") ? (
                      <FileArchive className="h-12 w-12 text-green-600" />
                    ) : (
                      <FileText className="h-12 w-12 text-green-600" />
                    )}
                  </div>
                  <p className="font-medium text-green-700 dark:text-green-400">{file.name}</p>
                  <p className="text-muted-foreground text-sm">{formatFileSize(file.size)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-4">
                    <FileArchive className="text-muted-foreground h-8 w-8" />
                    <span className="text-muted-foreground">o</span>
                    <FileText className="text-muted-foreground h-8 w-8" />
                  </div>
                  <p className="text-muted-foreground">
                    <span className="text-primary font-medium">Haz clic para seleccionar</span> o arrastra aquí
                  </p>
                  <p className="text-muted-foreground text-xs">ZIP con PDFs o PDF multipágina</p>
                  <p className="text-muted-foreground text-xs">Máximo 100 MB</p>
                </div>
              )}
            </div>

            {/* Selector de periodo */}
            <div className="grid gap-4 @lg/main:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="month">Mes (opcional)</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Año</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona año" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y.value} value={y.value}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Subiendo y procesando...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Botón de subida */}
            <Button className="w-full" size="lg" onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir y procesar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card>
          <CardHeader>
            <CardTitle>Resultado del procesamiento</CardTitle>
            <CardDescription>
              {result
                ? result.success
                  ? "Archivo procesado correctamente"
                  : "Error en el procesamiento"
                : "Sube un archivo para ver los resultados"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              result.success ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
                    <p className="font-medium text-green-700 dark:text-green-400">Lote creado exitosamente</p>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Total de archivos</span>
                      <span className="font-medium">{result.totalFiles}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Asignados automáticamente</span>
                      <span className="font-medium text-green-600">{result.assignedCount}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Pendientes de revisión</span>
                      <span className="font-medium text-amber-600">{result.pendingCount}</span>
                    </div>
                    {(result.errorCount ?? 0) > 0 && (
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Errores</span>
                        <span className="font-medium text-red-600">{result.errorCount}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/dashboard/payslips/${result.batchId}`}>Ver detalles</Link>
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      Subir otro
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/20">
                    <p className="font-medium text-red-700 dark:text-red-400">{result.error}</p>
                  </div>
                  <Button variant="outline" onClick={handleReset}>
                    Intentar de nuevo
                  </Button>
                </div>
              )
            ) : (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-4 h-16 w-16 opacity-20" />
                <p>Los resultados aparecerán aquí</p>
                <p className="mt-2 text-sm">El sistema detectará automáticamente los DNIs en los nombres de archivo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 @3xl/main:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium">Formato de archivo ZIP</h4>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                <li>
                  Nombra los PDFs con el DNI del empleado: <code>12345678A_nomina.pdf</code>
                </li>
                <li>El sistema detectará automáticamente el DNI en el nombre</li>
                <li>Los archivos sin DNI reconocido quedarán pendientes de asignación manual</li>
                <li>Máximo 500 documentos por lote</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium">Formato PDF multipágina</h4>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                <li>Cada página se tratará como una nómina individual</li>
                <li>El sistema usará OCR para detectar el DNI en cada página</li>
                <li>Requiere revisión manual de todas las asignaciones</li>
                <li>Recomendado solo si no tienes PDFs individuales</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

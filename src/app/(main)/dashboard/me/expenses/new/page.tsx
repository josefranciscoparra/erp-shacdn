"use client";

import { useState, useEffect, useMemo } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PulseLoader } from "@/components/ui/pulse-loader";
import { useReceiptOcr } from "@/hooks/use-receipt-ocr";
import { ParsedReceiptData } from "@/lib/ocr/receipt-parser";
import { useExpensesStore } from "@/stores/expenses-store";

import { CameraCapture } from "../_components/camera-capture";
import { ExpenseForm } from "../_components/expense-form";
import { OcrSuggestions } from "../_components/ocr-suggestions";

type WizardStep = "capture" | "ocr-processing" | "ocr-suggestions" | "form";

export default function NewExpensePage() {
  const router = useRouter();
  const { createExpense, uploadAttachment } = useExpensesStore();
  const { error, processReceipt, reset } = useReceiptOcr();

  const [currentStep, setCurrentStep] = useState<WizardStep>("capture");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [ocrData, setOcrData] = useState<ParsedReceiptData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Crear URL del archivo capturado y limpiar al desmontar
  const capturedFileUrl = useMemo(() => {
    if (!capturedFile) return null;
    return URL.createObjectURL(capturedFile);
  }, [capturedFile]);

  useEffect(() => {
    return () => {
      if (capturedFileUrl) {
        URL.revokeObjectURL(capturedFileUrl);
      }
    };
  }, [capturedFileUrl]);

  // Paso 1: Captura de foto
  const handleCapture = async (file: File) => {
    setCapturedFile(file);

    // Iniciar OCR automáticamente
    setCurrentStep("ocr-processing");

    try {
      const parsedData = await processReceipt(file);
      setOcrData(parsedData);
      setCurrentStep("ocr-suggestions");
    } catch (err) {
      console.error("Error en OCR:", err);
      // Si falla el OCR, ir directo al formulario vacío
      setCurrentStep("form");
    }
  };

  const handleRemoveCapture = () => {
    setCapturedFile(null);
    setOcrData(null);
    reset();
    setCurrentStep("capture");
  };

  // Paso 2: Usuario decide si usar sugerencias OCR o rellenar manualmente
  const handleApplyOcrData = (data: ParsedReceiptData) => {
    setOcrData(data);
    setCurrentStep("form");
  };

  const handleSkipOcrData = () => {
    setOcrData(null);
    setCurrentStep("form");
  };

  // Paso 3: Enviar formulario
  const handleSubmit = async (data: any, submitType: "draft" | "submit") => {
    setIsSubmitting(true);
    try {
      // 1. Crear el gasto
      const expense = await createExpense(data);

      // Verificar error del store
      const storeError = useExpensesStore.getState().error;

      if (!expense) {
        const errorMessage = storeError ?? "No se pudo crear el gasto";
        console.error("Error al crear gasto:", errorMessage);
        throw new Error(errorMessage);
      }

      // 2. Subir foto del ticket (si existe)
      if (capturedFile) {
        try {
          await uploadAttachment(expense.id, capturedFile);
        } catch (uploadError) {
          console.error("Error al subir adjunto:", uploadError);
          // Continuar aunque falle la subida del archivo
          alert("Gasto creado, pero hubo un error al subir el adjunto. Puedes añadirlo después.");
        }
      }

      // 3. Si se eligió "Enviar", enviar a aprobación
      if (submitType === "submit") {
        try {
          await useExpensesStore.getState().submitExpense(expense.id);
          alert("Gasto enviado a aprobación correctamente");
        } catch (submitError) {
          console.error("Error al enviar a aprobación:", submitError);
          alert("Gasto creado como borrador. Hubo un error al enviarlo a aprobación.");
        }
      } else {
        alert("Gasto guardado como borrador");
      }

      // 4. Redirigir al listado
      router.push("/dashboard/me/expenses");
    } catch (error) {
      console.error("Error completo al crear gasto:", error);
      alert(error instanceof Error ? error.message : "Error al crear el gasto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/me/expenses");
  };

  // Calcular initial data del formulario basado en OCR
  const getInitialFormData = () => {
    if (!ocrData) return undefined;

    return {
      date: ocrData.date ? new Date(ocrData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      category: "OTHER" as const,
      amount: ocrData.totalAmount?.toString() ?? "",
      vatPercent: ocrData.vatPercent?.toString() ?? "21",
      merchantName: ocrData.merchantName ?? "",
      merchantVat: ocrData.merchantVat ?? "",
      notes: "",
      mileageKm: "",
    };
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Nuevo Gasto</h1>
          <p className="text-muted-foreground text-sm">
            {currentStep === "capture" && "Captura el ticket para empezar"}
            {currentStep === "ocr-processing" && "Analizando el ticket..."}
            {currentStep === "ocr-suggestions" && "Revisa los datos extraídos"}
            {currentStep === "form" && "Completa los detalles del gasto"}
          </p>
        </div>
      </div>

      {/* Contenido del wizard */}
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* PASO 1: Captura de foto */}
        {currentStep === "capture" && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Captura el ticket</h2>
            <CameraCapture onCapture={handleCapture} capturedFile={capturedFile} onRemove={handleRemoveCapture} />
          </div>
        )}

        {/* PASO 2: Procesando OCR */}
        {currentStep === "ocr-processing" && (
          <div className="bg-card rounded-lg border p-6">
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-lg font-semibold">Analizando el ticket...</h2>
                <PulseLoader />
              </div>

              <p className="text-muted-foreground text-center text-sm">Esto puede tardar unos segundos</p>

              {error && (
                <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
                  <p className="text-destructive text-sm">{error}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={handleSkipOcrData}>
                    Continuar de todos modos
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 3: Sugerencias OCR */}
        {currentStep === "ocr-suggestions" && ocrData && (
          <>
            {/* Preview de la foto */}
            {capturedFileUrl && (
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={capturedFileUrl}
                  alt="Ticket"
                  className="w-full object-contain"
                  style={{ maxHeight: "300px" }}
                />
              </div>
            )}

            {/* Sugerencias */}
            <OcrSuggestions data={ocrData} onApply={handleApplyOcrData} onSkip={handleSkipOcrData} />
          </>
        )}

        {/* PASO 4: Formulario */}
        {currentStep === "form" && (
          <>
            {/* Preview de la foto (más pequeño) */}
            {capturedFileUrl && (
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={capturedFileUrl}
                  alt="Ticket"
                  className="w-full object-contain"
                  style={{ maxHeight: "200px" }}
                />
              </div>
            )}

            {/* Formulario */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Detalles del Gasto</h2>
              <ExpenseForm
                initialData={getInitialFormData() as any}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

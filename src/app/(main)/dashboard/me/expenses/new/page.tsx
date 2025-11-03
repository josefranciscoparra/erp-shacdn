"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  const { isProcessing, progress, error, result, processReceipt, reset } = useReceiptOcr();

  const [currentStep, setCurrentStep] = useState<WizardStep>("capture");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [ocrData, setOcrData] = useState<ParsedReceiptData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // 1. Crear el gasto
      const expense = await createExpense(data);

      if (!expense) {
        throw new Error("No se pudo crear el gasto");
      }

      // 2. Subir foto del ticket
      if (capturedFile) {
        await uploadAttachment(expense.id, capturedFile);
      }

      // 3. Redirigir al listado
      alert("Gasto creado correctamente");
      router.push("/dashboard/me/expenses");
    } catch (error) {
      console.error("Error al crear gasto:", error);
      alert(error instanceof Error ? error.message : "Error al crear el gasto");
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
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Captura el ticket</h2>
            <CameraCapture onCapture={handleCapture} capturedFile={capturedFile} onRemove={handleRemoveCapture} />
          </div>
        )}

        {/* PASO 2: Procesando OCR */}
        {currentStep === "ocr-processing" && (
          <div className="rounded-lg border bg-card p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin text-primary" />
                <h2 className="text-lg font-semibold">Analizando el ticket...</h2>
              </div>

              <Progress value={progress} className="h-2" />

              <p className="text-muted-foreground text-sm">Esto puede tardar unos segundos</p>

              {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
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
            {capturedFile && (
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={URL.createObjectURL(capturedFile)}
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
            {capturedFile && (
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={URL.createObjectURL(capturedFile)}
                  alt="Ticket"
                  className="w-full object-contain"
                  style={{ maxHeight: "200px" }}
                />
              </div>
            )}

            {/* Formulario */}
            <div className="rounded-lg border bg-card p-6">
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

"use client";

import { useState } from "react";

import { createWorker } from "tesseract.js";

import { preprocessImageForOcr } from "@/lib/ocr/image-preprocessor";
import { parseReceiptText, ParsedReceiptData } from "@/lib/ocr/receipt-parser";

export interface OcrState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  result: ParsedReceiptData | null;
}

export function useReceiptOcr() {
  const [state, setState] = useState<OcrState>({
    isProcessing: false,
    progress: 0,
    error: null,
    result: null,
  });

  const processReceipt = async (file: File) => {
    setState({
      isProcessing: true,
      progress: 0,
      error: null,
      result: null,
    });

    try {
      // 1. Preprocesar imagen (10% del progreso)
      setState((prev) => ({ ...prev, progress: 10 }));
      const preprocessedFile = await preprocessImageForOcr(file);

      // 2. Inicializar Tesseract worker (20% del progreso)
      setState((prev) => ({ ...prev, progress: 20 }));
      const worker = await createWorker("spa", 1, {
        logger: (m) => {
          // Actualizar progreso del OCR (20% a 80%)
          if (m.status === "recognizing text") {
            const ocrProgress = Math.round(20 + m.progress * 60);
            setState((prev) => ({ ...prev, progress: ocrProgress }));
          }
        },
      });

      // 3. Ejecutar OCR
      const { data } = await worker.recognize(preprocessedFile);
      await worker.terminate();

      // 4. Parsear resultados (90% del progreso)
      setState((prev) => ({ ...prev, progress: 90 }));
      const parsedData = parseReceiptText(data.text);

      // 5. Completado (100%)
      setState({
        isProcessing: false,
        progress: 100,
        error: null,
        result: parsedData,
      });

      return parsedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al procesar el ticket";

      setState({
        isProcessing: false,
        progress: 0,
        error: errorMessage,
        result: null,
      });

      throw error;
    }
  };

  const reset = () => {
    setState({
      isProcessing: false,
      progress: 0,
      error: null,
      result: null,
    });
  };

  return {
    ...state,
    processReceipt,
    reset,
  };
}

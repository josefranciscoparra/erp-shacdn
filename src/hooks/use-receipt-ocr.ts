"use client";

import { useState } from "react";

import { createWorker, type Worker } from "tesseract.js";

import { invertColors } from "@/lib/ocr/advanced-filters";
import { fileToCanvas, preprocessImageForOcr } from "@/lib/ocr/image-preprocessor";
import { parseReceiptText, type ParsedReceiptData } from "@/lib/ocr/receipt-parser";
import { extractAllROIsToCanvases, roiCanvasToFile } from "@/lib/ocr/roi-extractor";

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

    let worker: Worker | null = null;

    try {
      // 1. Preprocesar imagen completa (5% del progreso)
      setState((prev) => ({ ...prev, progress: 5 }));
      const preprocessedFile = await preprocessImageForOcr(file);

      // 2. Convertir a canvas para extracción de ROIs (10%)
      setState((prev) => ({ ...prev, progress: 10 }));
      const canvas = await fileToCanvas(preprocessedFile);

      // 3. Extraer ROIs (15%)
      setState((prev) => ({ ...prev, progress: 15 }));
      const rois = extractAllROIsToCanvases(canvas);

      // 4. Inicializar Tesseract worker (20%)
      setState((prev) => ({ ...prev, progress: 20 }));
      worker = await createWorker("spa", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            // Progreso del OCR: 20% a 80%
            const ocrProgress = Math.round(20 + m.progress * 60);
            setState((prev) => ({ ...prev, progress: ocrProgress }));
          }
        },
      });

      // 5. Procesar ROI Header (comercio + CIF) con configuración específica
      setState((prev) => ({ ...prev, progress: 25 }));
      const headerFile = await roiCanvasToFile(rois.header, "header.png");

      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-",
        tessedit_pageseg_mode: "6", // Assume a single uniform block of text
      });

      const headerResult = await worker.recognize(headerFile);
      const headerText = headerResult.data.text;

      // 6. Procesar ROI Totals (total + IVA) con configuración específica
      setState((prev) => ({ ...prev, progress: 55 }));
      const totalsFile = await roiCanvasToFile(rois.totals, "totals.png");

      await worker.setParameters({
        tessedit_char_whitelist: "0123456789,.-€%TOTALIVAIMPORTESUMA ",
        tessedit_pageseg_mode: "6", // Block of text
      });

      const totalsResult = await worker.recognize(totalsFile);
      const totalsText = totalsResult.data.text;

      // 7. Procesar imagen completa como fallback
      setState((prev) => ({ ...prev, progress: 70 }));
      await worker.setParameters({
        tessedit_char_whitelist: "", // Sin restricciones
        tessedit_pageseg_mode: "3", // Fully automatic page segmentation
      });

      const fullResult = await worker.recognize(preprocessedFile);
      const fullText = fullResult.data.text;

      // 8. Terminar worker
      await worker.terminate();
      worker = null;

      // 9. Combinar textos priorizando ROIs específicas
      setState((prev) => ({ ...prev, progress: 85 }));
      const combinedText = `${headerText}\n\n${fullText}\n\n${totalsText}`;

      // 10. Parsear resultados con el parser mejorado
      setState((prev) => ({ ...prev, progress: 90 }));
      let parsedData = parseReceiptText(combinedText);

      // 11. Si la confidence es muy baja, intentar con imagen invertida
      if (parsedData.confidence.totalAmount < 0.4 || parsedData.confidence.merchantName < 0.4) {
        setState((prev) => ({ ...prev, progress: 92 }));

        // Re-inicializar worker
        worker = await createWorker("spa", 1);

        // Invertir imagen
        const ctx = canvas.getContext("2d");
        if (ctx) {
          let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          imageData = invertColors(imageData);
          ctx.putImageData(imageData, 0, 0);

          // Convertir canvas invertido a file
          const invertedBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error("No se pudo crear blob"));
            }, "image/png");
          });

          const invertedFile = new File([invertedBlob], "inverted.png", { type: "image/png" });

          // Re-procesar con imagen invertida
          const retryResult = await worker.recognize(invertedFile);
          const retryParsed = parseReceiptText(retryResult.data.text);

          // Si el retry tiene mejor confidence, usarlo
          const avgConfidenceOriginal =
            (parsedData.confidence.totalAmount +
              parsedData.confidence.merchantName +
              parsedData.confidence.vatPercent) /
            3;

          const avgConfidenceRetry =
            (retryParsed.confidence.totalAmount +
              retryParsed.confidence.merchantName +
              retryParsed.confidence.vatPercent) /
            3;

          if (avgConfidenceRetry > avgConfidenceOriginal) {
            parsedData = retryParsed;
          }
        }

        await worker.terminate();
        worker = null;
      }

      // 12. Completado (100%)
      setState({
        isProcessing: false,
        progress: 100,
        error: null,
        result: parsedData,
      });

      return parsedData;
    } catch (error) {
      console.error("Error en OCR:", error);

      // Limpiar worker si quedó abierto
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Ignorar errores al terminar
        }
      }

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

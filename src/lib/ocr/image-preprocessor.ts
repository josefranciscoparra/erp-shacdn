import imageCompression from "browser-image-compression";

import { applyOcrFilters } from "./advanced-filters";
import { applyOtsuBinarization } from "./otsu-threshold";

/**
 * Preprocesa una imagen para mejorar la calidad del OCR
 * VERSIÓN AVANZADA con:
 * - Upscaling a ~300 DPI
 * - Umbral adaptativo de Otsu
 * - Sharpen + median filter
 * - Inversión automática si fondo oscuro
 */
export async function preprocessImageForOcr(file: File): Promise<File> {
  try {
    // 1. Comprimir imagen manteniendo calidad razonable
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 2, // Aumentado para permitir mayor calidad
      maxWidthOrHeight: 2400, // Aumentado para mejor OCR
      useWebWorker: true,
    });

    // 2. Convertir a canvas
    const canvas = await fileToCanvas(compressedFile);

    // 3. Aplicar filtros avanzados
    const processedCanvas = applyOcrFilters(canvas);

    // 4. Aplicar binarización de Otsu
    const ctx = processedCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo obtener contexto del canvas");
    }

    let imageData = ctx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
    imageData = applyOtsuBinarization(imageData);
    ctx.putImageData(imageData, 0, 0);

    // 5. Convertir de vuelta a File
    const processedFile = await canvasToFile(processedCanvas, compressedFile.name);

    return processedFile;
  } catch (error) {
    console.error("Error al preprocesar imagen:", error);
    // Si falla el preprocesamiento, devolver archivo original
    return file;
  }
}

/**
 * Preprocesamiento básico (más rápido, menor calidad)
 * Útil para preview o cuando el avanzado es muy lento
 */
export async function preprocessImageBasic(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    });

    const canvas = await fileToCanvas(compressedFile);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No se pudo obtener contexto del canvas");
    }

    // Solo grayscale + threshold fijo
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const binary = gray > 128 ? 255 : 0;

      data[i] = binary;
      data[i + 1] = binary;
      data[i + 2] = binary;
    }

    ctx.putImageData(imageData, 0, 0);

    return canvasToFile(canvas, compressedFile.name);
  } catch (error) {
    console.error("Error en preprocesamiento básico:", error);
    return file;
  }
}

/**
 * Preprocesa una ROI específica (para procesamiento por zonas)
 */
export async function preprocessROI(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo obtener contexto del canvas");
  }

  // Aplicar filtros
  const processedCanvas = applyOcrFilters(canvas);

  const processedCtx = processedCanvas.getContext("2d");
  if (!processedCtx) {
    throw new Error("No se pudo obtener contexto del canvas procesado");
  }

  // Aplicar Otsu
  let imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
  imageData = applyOtsuBinarization(imageData);
  processedCtx.putImageData(imageData, 0, 0);

  return processedCanvas;
}

/**
 * Convierte un File a Canvas
 */
function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo crear contexto del canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar la imagen"));
    };

    img.src = url;
  });
}

/**
 * Convierte un Canvas a File
 */
function canvasToFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo convertir canvas a blob"));
          return;
        }

        const file = new File([blob], fileName, { type: "image/png" });
        resolve(file);
      },
      "image/png",
      0.95, // Calidad alta
    );
  });
}

/**
 * Exporta canvas también para uso en ROI extraction
 */
export { fileToCanvas };

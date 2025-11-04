/**
 * Extrae Regions of Interest (ROI) de un ticket para mejorar el OCR
 *
 * Zonas típicas:
 * - Header (0-25%): Nombre comercio, dirección, CIF
 * - Body (25-60%): Artículos/productos
 * - Totals (60-95%): Subtotal, IVA, Total
 * - Footer (95-100%): Pie de ticket
 */

export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReceiptROIs {
  header: ROI;
  body: ROI;
  totals: ROI;
  footer: ROI;
}

/**
 * Extrae las ROIs de un canvas de ticket
 */
export function extractROIs(canvas: HTMLCanvasElement): ReceiptROIs {
  const { width, height } = canvas;

  return {
    // Header: 0-25% superior (comercio, CIF)
    header: {
      x: 0,
      y: 0,
      width: width,
      height: Math.floor(height * 0.25),
    },

    // Body: 25-60% (productos/artículos)
    body: {
      x: 0,
      y: Math.floor(height * 0.25),
      width: width,
      height: Math.floor(height * 0.35),
    },

    // Totals: 60-95% (subtotal, IVA, total)
    totals: {
      x: 0,
      y: Math.floor(height * 0.6),
      width: width,
      height: Math.floor(height * 0.35),
    },

    // Footer: 95-100% (pie)
    footer: {
      x: 0,
      y: Math.floor(height * 0.95),
      width: width,
      height: Math.floor(height * 0.05),
    },
  };
}

/**
 * Extrae una ROI específica de un canvas a un nuevo canvas
 */
export function extractROIToCanvas(canvas: HTMLCanvasElement, roi: ROI): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo obtener contexto del canvas");
  }

  // Crear nuevo canvas con el tamaño de la ROI
  const roiCanvas = document.createElement("canvas");
  roiCanvas.width = roi.width;
  roiCanvas.height = roi.height;

  const roiCtx = roiCanvas.getContext("2d");
  if (!roiCtx) {
    throw new Error("No se pudo crear contexto del canvas ROI");
  }

  // Copiar la región de interés
  roiCtx.drawImage(canvas, roi.x, roi.y, roi.width, roi.height, 0, 0, roi.width, roi.height);

  return roiCanvas;
}

/**
 * Extrae todas las ROIs como canvases separados
 */
export function extractAllROIsToCanvases(canvas: HTMLCanvasElement): {
  header: HTMLCanvasElement;
  body: HTMLCanvasElement;
  totals: HTMLCanvasElement;
  footer: HTMLCanvasElement;
} {
  const rois = extractROIs(canvas);

  return {
    header: extractROIToCanvas(canvas, rois.header),
    body: extractROIToCanvas(canvas, rois.body),
    totals: extractROIToCanvas(canvas, rois.totals),
    footer: extractROIToCanvas(canvas, rois.footer),
  };
}

/**
 * Convierte un canvas ROI a File para OCR
 */
export async function roiCanvasToFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo convertir ROI canvas a blob"));
        return;
      }

      const file = new File([blob], fileName, { type: "image/png" });
      resolve(file);
    }, "image/png");
  });
}

/**
 * Detecta automáticamente la zona de totales buscando palabras clave
 * (más preciso que porcentajes fijos)
 */
export function detectTotalsROI(canvas: HTMLCanvasElement, ocrText: string): ROI {
  const { width, height } = canvas;
  const lines = ocrText.split("\n");

  // Buscar línea con palabra clave de total
  const totalLineIndex = lines.findIndex((line) => /\b(TOTAL|IMPORTE\s*TOTAL|A\s*PAGAR|SUMA)\b/i.test(line));

  if (totalLineIndex !== -1) {
    // Calcular posición Y basada en el índice de línea
    // Asumimos que cada línea ocupa ~5% de la altura
    const estimatedY = Math.max(0, Math.floor((totalLineIndex / lines.length) * height) - Math.floor(height * 0.1));

    return {
      x: 0,
      y: estimatedY,
      width: width,
      height: height - estimatedY,
    };
  }

  // Fallback: usar zona fija 60-95%
  return {
    x: 0,
    y: Math.floor(height * 0.6),
    width: width,
    height: Math.floor(height * 0.35),
  };
}

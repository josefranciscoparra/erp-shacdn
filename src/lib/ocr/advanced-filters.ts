/**
 * Filtros avanzados para preprocesamiento de imágenes OCR
 */

/**
 * Escala un canvas (upscale) para mejorar resolución
 * Útil para tickets de baja resolución
 */
export function upscaleCanvas(canvas: HTMLCanvasElement, scaleFactor: number = 2): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo obtener contexto del canvas");
  }

  // Crear nuevo canvas escalado
  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = canvas.width * scaleFactor;
  scaledCanvas.height = canvas.height * scaleFactor;

  const scaledCtx = scaledCanvas.getContext("2d");
  if (!scaledCtx) {
    throw new Error("No se pudo crear contexto del canvas escalado");
  }

  // Usar imageSmoothingEnabled para mejor calidad
  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = "high";

  // Dibujar imagen escalada
  scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

  return scaledCanvas;
}

/**
 * Aplica filtro de nitidez (sharpen) usando unsharp mask
 */
export function sharpenImageData(imageData: ImageData, amount: number = 0.5): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);

  // Kernel de nitidez (3x3)
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const kernelSize = 3;
  const half = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0;

      // Aplicar kernel
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx - half));
          const py = Math.min(height - 1, Math.max(0, y + ky - half));
          const idx = (py * width + px) * 4;
          const weight = kernel[ky * kernelSize + kx];

          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
        }
      }

      const outIdx = (y * width + x) * 4;
      output.data[outIdx] = Math.min(255, Math.max(0, r * amount + data[outIdx] * (1 - amount)));
      output.data[outIdx + 1] = Math.min(255, Math.max(0, g * amount + data[outIdx + 1] * (1 - amount)));
      output.data[outIdx + 2] = Math.min(255, Math.max(0, b * amount + data[outIdx + 2] * (1 - amount)));
      output.data[outIdx + 3] = 255;
    }
  }

  return output;
}

/**
 * Aplica filtro mediano para eliminar ruido
 */
export function medianFilter(imageData: ImageData, windowSize: number = 3): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  const half = Math.floor(windowSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rValues: number[] = [];
      const gValues: number[] = [];
      const bValues: number[] = [];

      // Recoger valores de la ventana
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;

          rValues.push(data[idx]);
          gValues.push(data[idx + 1]);
          bValues.push(data[idx + 2]);
        }
      }

      // Calcular mediana
      rValues.sort((a, b) => a - b);
      gValues.sort((a, b) => a - b);
      bValues.sort((a, b) => a - b);

      const mid = Math.floor(rValues.length / 2);
      const outIdx = (y * width + x) * 4;

      output.data[outIdx] = rValues[mid];
      output.data[outIdx + 1] = gValues[mid];
      output.data[outIdx + 2] = bValues[mid];
      output.data[outIdx + 3] = 255;
    }
  }

  return output;
}

/**
 * Convierte a escala de grises
 */
export function toGrayscale(imageData: ImageData): ImageData {
  const { data } = imageData;
  const output = new ImageData(imageData.width, imageData.height);

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);

    output.data[i] = gray;
    output.data[i + 1] = gray;
    output.data[i + 2] = gray;
    output.data[i + 3] = 255;
  }

  return output;
}

/**
 * Invierte los colores (negro <-> blanco)
 * Útil si el ticket tiene fondo oscuro
 */
export function invertColors(imageData: ImageData): ImageData {
  const { data } = imageData;
  const output = new ImageData(imageData.width, imageData.height);

  for (let i = 0; i < data.length; i += 4) {
    output.data[i] = 255 - data[i];
    output.data[i + 1] = 255 - data[i + 1];
    output.data[i + 2] = 255 - data[i + 2];
    output.data[i + 3] = 255;
  }

  return output;
}

/**
 * Detecta si la imagen tiene fondo oscuro
 */
export function hasDarkBackground(imageData: ImageData): boolean {
  const { data } = imageData;
  let totalBrightness = 0;
  const sampleSize = Math.min(10000, data.length / 4);

  // Muestrear píxeles aleatorios
  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(Math.random() * (data.length / 4)) * 4;
    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    totalBrightness += brightness;
  }

  const avgBrightness = totalBrightness / sampleSize;

  // Si el promedio es <128, es fondo oscuro
  return avgBrightness < 128;
}

/**
 * Invierte colores solo si es necesario (fondo oscuro)
 */
export function invertIfDark(imageData: ImageData): ImageData {
  if (hasDarkBackground(imageData)) {
    return invertColors(imageData);
  }
  return imageData;
}

/**
 * Deskew simple (enderezar) detectando líneas de texto
 * Versión simplificada sin librerías externas
 */
export function deskewCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  // Para MVP, retornamos el canvas sin cambios
  // Una implementación completa requeriría:
  // 1. Detectar ángulo de inclinación (Hough transform)
  // 2. Rotar canvas con el ángulo corregido
  // Por ahora, asumimos que las fotos móviles vienen razonablemente rectas

  return canvas;
}

/**
 * Aplica una tubería de filtros completa para OCR
 */
export function applyOcrFilters(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo obtener contexto del canvas");
  }

  // 1. Upscale para mejorar resolución
  const upscaled = upscaleCanvas(canvas, 2);

  const upscaledCtx = upscaled.getContext("2d");
  if (!upscaledCtx) {
    throw new Error("No se pudo obtener contexto del canvas escalado");
  }

  // 2. Obtener imageData
  let imageData = upscaledCtx.getImageData(0, 0, upscaled.width, upscaled.height);

  // 3. Convertir a escala de grises
  imageData = toGrayscale(imageData);

  // 4. Aplicar median filter para eliminar ruido
  imageData = medianFilter(imageData, 3);

  // 5. Invertir si tiene fondo oscuro
  imageData = invertIfDark(imageData);

  // 6. Aplicar sharpen
  imageData = sharpenImageData(imageData, 0.3);

  // 7. Escribir de vuelta al canvas
  upscaledCtx.putImageData(imageData, 0, 0);

  return upscaled;
}

/**
 * Algoritmo de Otsu para calcular el umbral óptimo de binarización
 * Maximiza la varianza entre clases (fondo vs texto)
 */
export function calculateOtsuThreshold(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const pixelCount = width * height;

  // 1. Crear histograma de niveles de gris (0-255)
  const histogram = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    // Convertir a escala de grises si no lo está
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    histogram[gray]++;
  }

  // 2. Calcular probabilidades
  const probabilities = histogram.map((count) => count / pixelCount);

  // 3. Calcular media global
  let globalMean = 0;
  for (let i = 0; i < 256; i++) {
    globalMean += i * probabilities[i];
  }

  // 4. Encontrar el threshold que maximiza la varianza entre clases
  let maxVariance = 0;
  let optimalThreshold = 0;

  let weight0 = 0; // Peso acumulado clase 0 (fondo)
  let sum0 = 0; // Suma acumulada clase 0

  for (let t = 0; t < 256; t++) {
    // Actualizar peso y suma de clase 0 (fondo)
    weight0 += probabilities[t];
    sum0 += t * probabilities[t];

    // Peso de clase 1 (texto)
    const weight1 = 1 - weight0;

    // Si alguna clase está vacía, saltar
    if (weight0 === 0 || weight1 === 0) continue;

    // Medias de cada clase
    const mean0 = sum0 / weight0;
    const mean1 = (globalMean - sum0) / weight1;

    // Varianza entre clases
    const betweenVariance = weight0 * weight1 * Math.pow(mean0 - mean1, 2);

    // Si es mayor que la máxima, actualizar
    if (betweenVariance > maxVariance) {
      maxVariance = betweenVariance;
      optimalThreshold = t;
    }
  }

  return optimalThreshold;
}

/**
 * Aplica binarización usando el umbral de Otsu
 */
export function applyOtsuBinarization(imageData: ImageData): ImageData {
  // Calcular umbral óptimo
  const threshold = calculateOtsuThreshold(imageData);

  // Aplicar binarización
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    // Convertir a escala de grises
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);

    // Binarizar según threshold
    const binary = gray > threshold ? 255 : 0;

    data[i] = binary; // R
    data[i + 1] = binary; // G
    data[i + 2] = binary; // B
    // data[i + 3] es alpha, no se modifica
  }

  return imageData;
}

/**
 * Aplica binarización adaptativa (Otsu por bloques)
 * Útil para imágenes con iluminación no uniforme
 */
export function applyAdaptiveOtsuBinarization(canvas: HTMLCanvasElement, blockSize: number = 32): ImageData {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo obtener contexto del canvas");
  }

  const { width, height } = canvas;
  const result = ctx.createImageData(width, height);

  // Procesar por bloques
  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      const blockWidth = Math.min(blockSize, width - x);
      const blockHeight = Math.min(blockSize, height - y);

      // Extraer bloque
      const blockData = ctx.getImageData(x, y, blockWidth, blockHeight);

      // Aplicar Otsu al bloque
      const binarizedBlock = applyOtsuBinarization(blockData);

      // Copiar bloque binarizado al resultado
      for (let by = 0; by < blockHeight; by++) {
        for (let bx = 0; bx < blockWidth; bx++) {
          const srcIdx = (by * blockWidth + bx) * 4;
          const destIdx = ((y + by) * width + (x + bx)) * 4;

          result.data[destIdx] = binarizedBlock.data[srcIdx];
          result.data[destIdx + 1] = binarizedBlock.data[srcIdx + 1];
          result.data[destIdx + 2] = binarizedBlock.data[srcIdx + 2];
          result.data[destIdx + 3] = 255; // Alpha
        }
      }
    }
  }

  return result;
}

import imageCompression from "browser-image-compression";

/**
 * Preprocesa una imagen para mejorar la calidad del OCR
 * - Compresión para reducir tamaño
 * - Conversión a escala de grises
 * - Binarización (blanco y negro) para mejor contraste
 */
export async function preprocessImageForOcr(file: File): Promise<File> {
  try {
    // 1. Comprimir imagen manteniendo calidad razonable
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    });

    // 2. Convertir a canvas para aplicar filtros
    const canvas = await fileToCanvas(compressedFile);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No se pudo obtener contexto del canvas");
    }

    // 3. Obtener datos de píxeles
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 4. Convertir a escala de grises y aplicar binarización
    for (let i = 0; i < data.length; i += 4) {
      // Convertir RGB a escala de grises (promedio ponderado)
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

      // Binarización: threshold en 128 (blanco o negro)
      const binary = gray > 128 ? 255 : 0;

      data[i] = binary; // R
      data[i + 1] = binary; // G
      data[i + 2] = binary; // B
      // data[i + 3] es alpha, no se modifica
    }

    // 5. Escribir datos procesados de vuelta al canvas
    ctx.putImageData(imageData, 0, 0);

    // 6. Convertir canvas de vuelta a File
    const processedFile = await canvasToFile(canvas, compressedFile.name);

    return processedFile;
  } catch (error) {
    console.error("Error al preprocesar imagen:", error);
    // Si falla el preprocesamiento, devolver archivo original
    return file;
  }
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
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo convertir canvas a blob"));
        return;
      }

      const file = new File([blob], fileName, { type: "image/png" });
      resolve(file);
    }, "image/png");
  });
}

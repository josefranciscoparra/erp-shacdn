/**
 * Procesador de archivos ZIP para extracción de nóminas
 * Mejora 3 - Sistema de Nóminas Masivas
 */

import JSZip from "jszip";

import { MAX_DOCUMENTS_PER_BATCH, MAX_INDIVIDUAL_PDF_SIZE } from "./config";

export interface ExtractedFile {
  /** Nombre original del archivo */
  fileName: string;
  /** Contenido del archivo como Buffer */
  content: Buffer;
  /** Tamaño en bytes */
  size: number;
  /** Si es un PDF válido */
  isPdf: boolean;
}

export interface ZipProcessingResult {
  /** Archivos extraídos exitosamente */
  files: ExtractedFile[];
  /** Archivos ignorados (no PDF o demasiado grandes) */
  skippedFiles: {
    fileName: string;
    reason: "not_pdf" | "too_large" | "empty" | "error";
    size?: number;
  }[];
  /** Número total de archivos encontrados en el ZIP */
  totalFound: number;
  /** Si se alcanzó el límite máximo */
  limitReached: boolean;
  /** Errores durante el procesamiento */
  errors: string[];
}

/**
 * Extrae archivos PDF de un archivo ZIP
 * @param zipBuffer Buffer del archivo ZIP
 * @returns Resultado del procesamiento con archivos extraídos
 */
export async function extractPdfsFromZip(zipBuffer: Buffer): Promise<ZipProcessingResult> {
  const result: ZipProcessingResult = {
    files: [],
    skippedFiles: [],
    totalFound: 0,
    limitReached: false,
    errors: [],
  };

  try {
    const zip = await JSZip.loadAsync(zipBuffer);
    const fileNames = Object.keys(zip.files);

    result.totalFound = fileNames.length;

    for (const fileName of fileNames) {
      // Verificar límite
      if (result.files.length >= MAX_DOCUMENTS_PER_BATCH) {
        result.limitReached = true;
        break;
      }

      const file = zip.files[fileName];

      // Ignorar directorios
      if (file.dir) {
        continue;
      }

      // Ignorar archivos ocultos (comienzan con . o __MACOSX)
      if (isHiddenFile(fileName)) {
        continue;
      }

      // Verificar que sea un PDF
      const baseName = getBaseName(fileName);
      if (!isPdfFile(baseName)) {
        result.skippedFiles.push({
          fileName: baseName,
          reason: "not_pdf",
        });
        continue;
      }

      try {
        const content = await file.async("nodebuffer");

        // Verificar que no esté vacío
        if (content.length === 0) {
          result.skippedFiles.push({
            fileName: baseName,
            reason: "empty",
            size: 0,
          });
          continue;
        }

        // Verificar tamaño máximo
        if (content.length > MAX_INDIVIDUAL_PDF_SIZE) {
          result.skippedFiles.push({
            fileName: baseName,
            reason: "too_large",
            size: content.length,
          });
          continue;
        }

        // Verificar que sea un PDF válido (magic bytes)
        if (!isValidPdf(content)) {
          result.skippedFiles.push({
            fileName: baseName,
            reason: "not_pdf",
          });
          continue;
        }

        result.files.push({
          fileName: baseName,
          content,
          size: content.length,
          isPdf: true,
        });
      } catch {
        result.skippedFiles.push({
          fileName: baseName,
          reason: "error",
        });
        result.errors.push(`Error al extraer ${baseName}`);
      }
    }
  } catch (error) {
    result.errors.push(`Error al procesar el archivo ZIP: ${error instanceof Error ? error.message : "Desconocido"}`);
  }

  return result;
}

/**
 * Verifica si un archivo es un archivo oculto o de sistema
 */
function isHiddenFile(filePath: string): boolean {
  const parts = filePath.split("/");
  return parts.some(
    (part) => part.startsWith(".") || part.startsWith("__MACOSX") || part === "Thumbs.db" || part === ".DS_Store",
  );
}

/**
 * Obtiene el nombre base del archivo (sin ruta)
 */
function getBaseName(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1];
}

/**
 * Verifica si un archivo tiene extensión PDF
 */
function isPdfFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}

/**
 * Verifica si el contenido es un PDF válido usando magic bytes
 * Los PDFs comienzan con "%PDF-"
 */
function isValidPdf(content: Buffer): boolean {
  if (content.length < 5) return false;

  // Verificar magic bytes: %PDF-
  return (
    content[0] === 0x25 && // %
    content[1] === 0x50 && // P
    content[2] === 0x44 && // D
    content[3] === 0x46 && // F
    content[4] === 0x2d // -
  );
}

/**
 * Estima el número de PDFs en un ZIP sin extraerlos completamente
 * Útil para validación previa
 */
export async function countPdfsInZip(zipBuffer: Buffer): Promise<{ pdfCount: number; totalFiles: number }> {
  try {
    const zip = await JSZip.loadAsync(zipBuffer);
    const fileNames = Object.keys(zip.files);

    let pdfCount = 0;
    let totalFiles = 0;

    for (const fileName of fileNames) {
      const file = zip.files[fileName];

      if (file.dir) continue;
      if (isHiddenFile(fileName)) continue;

      totalFiles++;

      if (isPdfFile(getBaseName(fileName))) {
        pdfCount++;
      }
    }

    return { pdfCount, totalFiles };
  } catch {
    return { pdfCount: 0, totalFiles: 0 };
  }
}

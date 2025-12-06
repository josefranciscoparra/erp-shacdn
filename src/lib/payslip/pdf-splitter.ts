/**
 * Procesador de PDFs multipágina para dividir en páginas individuales
 * Mejora 3 - Sistema de Nóminas Masivas
 */

import { PDFDocument } from "pdf-lib";

import { MAX_DOCUMENTS_PER_BATCH } from "./config";

export interface SplitPage {
  /** Número de página (1-indexed) */
  pageNumber: number;
  /** Contenido del PDF de una sola página */
  content: Uint8Array;
  /** Tamaño en bytes */
  size: number;
}

export interface PdfSplitResult {
  /** Páginas extraídas exitosamente */
  pages: SplitPage[];
  /** Número total de páginas en el PDF original */
  totalPages: number;
  /** Si se alcanzó el límite máximo */
  limitReached: boolean;
  /** Errores durante el procesamiento */
  errors: string[];
  /** Nombre base del archivo original */
  originalFileName: string;
}

/**
 * Divide un PDF multipágina en PDFs individuales de una página cada uno
 * @param pdfBuffer Buffer del PDF multipágina
 * @param originalFileName Nombre del archivo original
 * @returns Resultado con las páginas individuales
 */
export async function splitPdfIntoPages(pdfBuffer: Buffer, originalFileName: string): Promise<PdfSplitResult> {
  const result: PdfSplitResult = {
    pages: [],
    totalPages: 0,
    limitReached: false,
    errors: [],
    originalFileName,
  };

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    result.totalPages = pageCount;

    // Si solo tiene una página, devolver el PDF original
    if (pageCount === 1) {
      result.pages.push({
        pageNumber: 1,
        content: new Uint8Array(pdfBuffer),
        size: pdfBuffer.length,
      });
      return result;
    }

    // Dividir en páginas individuales
    for (let i = 0; i < pageCount; i++) {
      // Verificar límite
      if (result.pages.length >= MAX_DOCUMENTS_PER_BATCH) {
        result.limitReached = true;
        break;
      }

      try {
        // Crear un nuevo documento con solo esta página
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);

        const pdfBytes = await newPdf.save();

        result.pages.push({
          pageNumber: i + 1,
          content: pdfBytes,
          size: pdfBytes.length,
        });
      } catch (pageError) {
        result.errors.push(
          `Error al extraer página ${i + 1}: ${pageError instanceof Error ? pageError.message : "Desconocido"}`,
        );
      }
    }
  } catch (error) {
    result.errors.push(`Error al procesar el PDF: ${error instanceof Error ? error.message : "Desconocido"}`);
  }

  return result;
}

/**
 * Obtiene información básica de un PDF sin procesarlo completamente
 * @param pdfBuffer Buffer del PDF
 * @returns Información del PDF
 */
export async function getPdfInfo(pdfBuffer: Buffer): Promise<{
  pageCount: number;
  isValid: boolean;
  error?: string;
}> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    return {
      pageCount: pdfDoc.getPageCount(),
      isValid: true,
    };
  } catch (error) {
    return {
      pageCount: 0,
      isValid: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Verifica si un PDF necesita ser dividido (tiene más de una página)
 * @param pdfBuffer Buffer del PDF
 * @returns true si el PDF tiene más de una página
 */
export async function needsSplitting(pdfBuffer: Buffer): Promise<boolean> {
  const info = await getPdfInfo(pdfBuffer);
  return info.isValid && info.pageCount > 1;
}

/**
 * Genera un nombre de archivo para una página individual
 * @param originalFileName Nombre del archivo original
 * @param pageNumber Número de página
 * @returns Nombre del archivo para esta página
 */
export function generatePageFileName(originalFileName: string, pageNumber: number): string {
  // Remover extensión .pdf
  const baseName = originalFileName.replace(/\.pdf$/i, "");
  // Añadir número de página
  return `${baseName}_pagina_${pageNumber.toString().padStart(3, "0")}.pdf`;
}

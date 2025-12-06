/**
 * Motor OCR para extracción de texto de nóminas
 * Arquitectura desacoplada para poder sustituir Tesseract por Azure/Google en el futuro
 *
 * Mejora 3 - Sistema de Nóminas Masivas
 */

import Tesseract from "tesseract.js";

import { DNI_NIE_REGEX, EMPLOYEE_CODE_REGEX, OCR_TIMEOUT_MS } from "./config";

// ============================================
// INTERFAZ ABSTRACTA DEL MOTOR OCR
// ============================================

export interface OcrResult {
  /** Texto completo extraído */
  text: string;
  /** Nivel de confianza del OCR (0-1) */
  confidence: number;
  /** DNI/NIE detectado en el texto */
  detectedDni: string | null;
  /** Código de empleado detectado */
  detectedCode: string | null;
  /** Posible nombre detectado (menos fiable) */
  detectedName: string | null;
  /** Error si lo hubo */
  error?: string;
  /** Tiempo de procesamiento en ms */
  processingTimeMs: number;
}

export interface OcrEngine {
  /** Nombre del motor para logging */
  name: string;
  /** Procesa una imagen y extrae texto */
  processImage(imageBuffer: Buffer): Promise<OcrResult>;
  /** Verifica si el motor está disponible */
  isAvailable(): Promise<boolean>;
}

// ============================================
// IMPLEMENTACIÓN TESSERACT.JS
// ============================================

class TesseractEngine implements OcrEngine {
  name = "Tesseract.js";
  private worker: Tesseract.Worker | null = null;

  async processImage(imageBuffer: Buffer): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      // Crear worker con timeout
      const result = await Promise.race([this.performOcr(imageBuffer), this.timeout(OCR_TIMEOUT_MS)]);

      if (result === "timeout") {
        return {
          text: "",
          confidence: 0,
          detectedDni: null,
          detectedCode: null,
          detectedName: null,
          error: "OCR timeout exceeded",
          processingTimeMs: Date.now() - startTime,
        };
      }

      const ocrResult = result;
      const text = ocrResult.data.text;
      const confidence = ocrResult.data.confidence / 100; // Normalizar a 0-1

      // Extraer datos del texto
      const detectedDni = this.extractDni(text);
      const detectedCode = this.extractEmployeeCode(text);
      const detectedName = this.extractPossibleName(text);

      return {
        text,
        confidence,
        detectedDni,
        detectedCode,
        detectedName,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        text: "",
        confidence: 0,
        detectedDni: null,
        detectedCode: null,
        detectedName: null,
        error: error instanceof Error ? error.message : "Error desconocido",
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private async performOcr(imageBuffer: Buffer): Promise<Tesseract.RecognizeResult> {
    const worker = await Tesseract.createWorker("spa", 1, {
      // Configuración silenciosa
      logger: () => {},
    });

    try {
      const result = await worker.recognize(imageBuffer);
      return result;
    } finally {
      await worker.terminate();
    }
  }

  private timeout(ms: number): Promise<"timeout"> {
    return new Promise((resolve) => setTimeout(() => resolve("timeout"), ms));
  }

  private extractDni(text: string): string | null {
    const match = text.match(DNI_NIE_REGEX);
    return match ? match[1].toUpperCase() : null;
  }

  private extractEmployeeCode(text: string): string | null {
    const match = text.match(EMPLOYEE_CODE_REGEX);
    return match ? match[1] : null;
  }

  private extractPossibleName(text: string): string | null {
    // Buscar patrones típicos de nombre en nóminas españolas
    // Por ejemplo: "Nombre: Juan García López" o "Trabajador: GARCÍA LÓPEZ, JUAN"
    const patterns = [
      /(?:Nombre|Trabajador|Empleado)[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i,
      /(?:Nombre|Trabajador|Empleado)[:\s]+([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,3})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Verificar que podemos crear un worker
      const worker = await Tesseract.createWorker("spa", 1, { logger: () => {} });
      await worker.terminate();
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// FÁBRICA DE MOTORES OCR
// ============================================

type OcrEngineType = "tesseract" | "azure" | "google";

/**
 * Obtiene el motor OCR configurado
 * Actualmente solo soporta Tesseract, pero la arquitectura permite añadir más
 */
export function getOcrEngine(type: OcrEngineType = "tesseract"): OcrEngine {
  switch (type) {
    case "tesseract":
      return new TesseractEngine();
    case "azure":
    case "google":
      // Placeholder para futuras implementaciones
      console.warn(`Motor OCR "${type}" no implementado, usando Tesseract`);
      return new TesseractEngine();
    default:
      return new TesseractEngine();
  }
}

// ============================================
// FUNCIONES HELPER PARA EXTRACCIÓN DE DNI
// ============================================

/**
 * Extrae el DNI del nombre de un archivo
 * Prioridad máxima: el usuario indica que los archivos tienen el DNI en el nombre
 * Ejemplo: "12345678A_enero_2025.pdf" → "12345678A"
 */
export function extractDniFromFileName(fileName: string): string | null {
  const match = fileName.match(DNI_NIE_REGEX);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Valida si un DNI español es correcto (letra de control)
 */
export function isValidSpanishDni(dni: string): boolean {
  if (!dni || dni.length !== 9) return false;

  const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
  const number = parseInt(dni.substring(0, 8), 10);
  const letter = dni.charAt(8).toUpperCase();

  if (isNaN(number)) return false;

  const expectedLetter = letters[number % 23];
  return letter === expectedLetter;
}

/**
 * Valida si un NIE español es correcto
 */
export function isValidSpanishNie(nie: string): boolean {
  if (!nie || nie.length !== 9) return false;

  const firstLetter = nie.charAt(0).toUpperCase();
  let prefix: number;

  switch (firstLetter) {
    case "X":
      prefix = 0;
      break;
    case "Y":
      prefix = 1;
      break;
    case "Z":
      prefix = 2;
      break;
    default:
      return false;
  }

  const nieDni = prefix + nie.substring(1, 8);
  return isValidSpanishDni(nieDni + nie.charAt(8));
}

/**
 * Valida si un DNI o NIE español es correcto
 */
export function isValidDniOrNie(identifier: string): boolean {
  if (!identifier || identifier.length !== 9) return false;

  const firstChar = identifier.charAt(0).toUpperCase();

  if (["X", "Y", "Z"].includes(firstChar)) {
    return isValidSpanishNie(identifier);
  }

  return isValidSpanishDni(identifier);
}

// ============================================
// SINGLETON PARA REUTILIZAR ENGINE
// ============================================

let defaultEngine: OcrEngine | null = null;

export function getDefaultOcrEngine(): OcrEngine {
  defaultEngine ??= getOcrEngine("tesseract");
  return defaultEngine;
}

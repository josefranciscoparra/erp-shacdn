import { normalizeBrand } from "./brand-dictionary";

export interface ParsedReceiptData {
  totalAmount: number | null;
  date: Date | null;
  merchantName: string | null;
  merchantVat: string | null;
  vatPercent: number | null;
  confidence: {
    totalAmount: number;
    date: number;
    merchantName: number;
    merchantVat: number;
    vatPercent: number;
  };
}

/**
 * Parsea el texto extraído por OCR de un ticket/factura
 * VERSIÓN MEJORADA con:
 * - Normalización de marcas con diccionario
 * - Regex mejoradas para IVA incluido
 * - Priorización por palabra clave
 * - Scoring inteligente
 */
export function parseReceiptText(text: string): ParsedReceiptData {
  const result: ParsedReceiptData = {
    totalAmount: null,
    date: null,
    merchantName: null,
    merchantVat: null,
    vatPercent: null,
    confidence: {
      totalAmount: 0,
      date: 0,
      merchantName: 0,
      merchantVat: 0,
      vatPercent: 0,
    },
  };

  // Limpiar texto
  const cleanedText = cleanText(text);

  // Separar en líneas para análisis por proximidad
  const lines = cleanedText.split("\n").filter((l) => l.trim().length > 0);

  // Normalizar para búsqueda (mayúsculas, sin símbolos raros)
  const normalizedText = cleanedText.toUpperCase().replace(/[^\w\s\d.,/:%-€]/g, " ");

  // 1. Extraer total (CON PRIORIDAD por palabra clave)
  const totalResult = extractTotalAmountImproved(normalizedText, lines);
  result.totalAmount = totalResult.value;
  result.confidence.totalAmount = totalResult.confidence;

  // 2. Extraer fecha
  const dateResult = extractDate(normalizedText);
  result.date = dateResult.value;
  result.confidence.date = dateResult.confidence;

  // 3. Extraer comercio (CON NORMALIZACIÓN de marcas)
  const merchantResult = extractMerchantNameImproved(text);
  result.merchantName = merchantResult.value;
  result.confidence.merchantName = merchantResult.confidence;

  // 4. Extraer CIF/NIF
  const vatNumberResult = extractVatNumber(normalizedText);
  result.merchantVat = vatNumberResult.value;
  result.confidence.merchantVat = vatNumberResult.confidence;

  // 5. Extraer % de IVA (CON REGEX MEJORADAS)
  const vatPercentResult = extractVatPercentImproved(normalizedText);
  result.vatPercent = vatPercentResult.value;
  result.confidence.vatPercent = vatPercentResult.confidence;

  return result;
}

/**
 * Limpia el texto eliminando caracteres problemáticos
 */
function cleanText(text: string): string {
  return text
    .replace(/[^\S\r\n]+/g, " ") // Normalizar espacios
    .replace(/\*{3,}/g, "") // Quitar líneas de asteriscos
    .trim();
}

/**
 * Extrae el total con scoring mejorado
 */
function extractTotalAmountImproved(text: string, lines: string[]): { value: number | null; confidence: number } {
  // PASO 1: Buscar con palabra clave (alta confidence)
  const keywordPatterns = [
    /\b(TOTAL|IMPORTE\s*TOTAL|A\s*PAGAR)[:\s]*([0-9]+[.,][0-9]{2})/i,
    /\b(SUMA|TOTAL\s*A\s*PAGAR)[:\s]*([0-9]+[.,][0-9]{2})/i,
    /(TOTAL)[^\d]*([0-9]+[.,][0-9]{2})/i,
  ];

  for (const pattern of keywordPatterns) {
    const match = text.match(pattern);
    if (match?.[2]) {
      const amount = parseFloat(match[2].replace(",", "."));
      if (!isNaN(amount) && amount > 0 && amount < 10000) {
        return { value: amount, confidence: 0.9 }; // Alta confidence
      }
    }
  }

  // PASO 2: Buscar en zona de totales (últimas líneas)
  const totalsZone = lines.slice(-Math.min(10, Math.floor(lines.length * 0.4)));
  const totalsText = totalsZone.join("\n");

  const allAmounts = totalsText.match(/\b([0-9]+[.,][0-9]{2})\b/g);
  if (allAmounts && allAmounts.length > 0) {
    const amounts = allAmounts
      .map((a) => parseFloat(a.replace(",", ".")))
      .filter((a) => !isNaN(a) && a > 0 && a < 10000);

    if (amounts.length > 0) {
      // El total suele ser el mayor número
      const maxAmount = Math.max(...amounts);
      return { value: maxAmount, confidence: 0.6 }; // Media confidence
    }
  }

  // PASO 3: Fallback global
  const globalAmounts = text.match(/\b([0-9]+[.,][0-9]{2})\b/g);
  if (globalAmounts && globalAmounts.length > 0) {
    const amounts = globalAmounts
      .map((a) => parseFloat(a.replace(",", ".")))
      .filter((a) => !isNaN(a) && a > 0 && a < 10000);

    if (amounts.length > 0) {
      return { value: Math.max(...amounts), confidence: 0.4 }; // Baja confidence
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * Extrae fecha con mejor validación
 */
function extractDate(text: string): { value: Date | null; confidence: number } {
  const patterns = [
    /(\d{2})[/-](\d{2})[/-](\d{4})/, // DD/MM/YYYY
    /(\d{2})[/-](\d{2})[/-](\d{2})/, // DD/MM/YY
    /(\d{4})[/-](\d{2})[/-](\d{2})/, // YYYY-MM-DD
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let day: number, month: number, year: number;

      if (match[0].startsWith("20")) {
        // Formato YYYY-MM-DD
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        // Formatos DD/MM/YYYY o DD/MM/YY
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);

        if (year < 100) {
          year += year > 50 ? 1900 : 2000;
        }
      }

      // Validar fecha
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()) && date <= new Date()) {
          return { value: date, confidence: 0.9 };
        }
      }
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * Extrae nombre del comercio CON NORMALIZACIÓN
 */
function extractMerchantNameImproved(text: string): { value: string | null; confidence: number } {
  // Tomar primeras líneas
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 2 && line.length < 100);

  if (lines.length === 0) {
    return { value: null, confidence: 0 };
  }

  // Buscar en las primeras 3 líneas
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];

    // Filtrar líneas que parezcan fechas o números
    if (/^[\d\s.,/-]+$/.test(line)) continue;

    // Normalizar con diccionario de marcas
    const normalized = normalizeBrand(line);

    // Si hay match en el diccionario, devolver con buena confidence
    if (normalized.confidence >= 0.7) {
      return { value: normalized.name, confidence: normalized.confidence };
    }

    // Si no hay match pero la línea parece válida, devolver con baja confidence
    if (i === 0 && line.length > 3) {
      return { value: line.substring(0, 50), confidence: 0.5 };
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * Extrae CIF/NIF
 */
function extractVatNumber(text: string): { value: string | null; confidence: number } {
  const patterns = [
    /\b([A-Z]\d{8})\b/, // CIF: letra + 8 dígitos
    /\b(\d{8}[A-Z])\b/, // NIF: 8 dígitos + letra
    /CIF[:\s]*([A-Z0-9]{9})/i, // CIF: con etiqueta
    /NIF[:\s]*([A-Z0-9]{9})/i, // NIF: con etiqueta
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { value: match[1], confidence: 0.9 };
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * Extrae % de IVA CON REGEX MEJORADAS
 */
function extractVatPercentImproved(text: string): { value: number | null; confidence: number } {
  // PASO 1: Patrones específicos con alta confidence
  const specificPatterns = [
    /I\.?\s*V\.?\s*A\.?\s*INCLUIDO[^0-9%]*(\d{1,2})[.,]?(\d{0,2})\s*%/i, // I.V.A. INCLUIDO 21,00%
    /IVA\s+INCLUIDO[^0-9%]*(\d{1,2})[.,]?(\d{0,2})\s*%/i, // IVA INCLUIDO 21%
    /TASA\s*IVA[^\d]*(\d{1,2})[.,]?(\d{0,2})\s*%/i, // TASA IVA 21%
    /(?:^|\s)IVA[:\s]*(\d{1,2})[.,]?(\d{0,2})\s*%/im, // IVA: 21%
  ];

  for (const pattern of specificPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      let percent = parseInt(match[1]);

      // Si hay decimales, considerarlos
      if (match[2]) {
        const decimal = parseInt(match[2]) / Math.pow(10, match[2].length);
        percent += decimal;
      }

      // Validar IVA español común
      const validRates = [0, 4, 10, 21];
      if (validRates.includes(Math.round(percent))) {
        return { value: Math.round(percent), confidence: 0.85 };
      }
    }
  }

  // PASO 2: Patrones genéricos
  const genericPatterns = [/(\d{1,2})[.,]?(\d{0,2})\s*%\s*IVA/i, /IVA[:\s]*(\d{1,2})[.,]?(\d{0,2})\s*%/i];

  for (const pattern of genericPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const percent = parseInt(match[1]);

      if ([0, 4, 10, 21].includes(percent)) {
        return { value: percent, confidence: 0.7 };
      }
    }
  }

  // PASO 3: Fallback - buscar cualquier % válido
  const fallbackMatch = text.match(/(\d{1,2})%/);
  if (fallbackMatch) {
    const percent = parseInt(fallbackMatch[1]);
    if ([0, 4, 10, 21].includes(percent)) {
      return { value: percent, confidence: 0.5 };
    }
  }

  // Si no se encuentra IVA, asumir 21% por defecto con baja confidence
  return { value: 21, confidence: 0.3 };
}

/**
 * Extrae datos por proximidad de líneas (avanzado)
 * Busca patrones como SUBTOTAL → IVA → TOTAL
 */
export function extractByProximity(lines: string[]): {
  subtotal: number | null;
  vat: number | null;
  total: number | null;
} {
  const result = {
    subtotal: null as number | null,
    vat: null as number | null,
    total: null as number | null,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();

    // Buscar línea con SUBTOTAL
    if (/SUBTOTAL|SUB\s*TOTAL/i.test(line)) {
      const amount = line.match(/(\d+[.,]\d{2})/);
      if (amount) {
        result.subtotal = parseFloat(amount[1].replace(",", "."));
      }
    }

    // Buscar línea con IVA (valor, no %)
    if (/IVA[:\s]*\d+[.,]\d{2}/.test(line) && !/\d+%/.test(line)) {
      const amount = line.match(/(\d+[.,]\d{2})/);
      if (amount) {
        result.vat = parseFloat(amount[1].replace(",", "."));
      }
    }

    // Buscar línea con TOTAL
    if (/\bTOTAL\b/i.test(line)) {
      const amount = line.match(/(\d+[.,]\d{2})/);
      if (amount) {
        result.total = parseFloat(amount[1].replace(",", "."));
      }
    }
  }

  return result;
}

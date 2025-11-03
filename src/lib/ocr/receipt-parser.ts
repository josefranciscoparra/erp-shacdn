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
 * y extrae datos estructurados
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

  // Normalizar texto: mayúsculas, quitar caracteres extraños
  const normalizedText = text.toUpperCase().replace(/[^\w\s\d.,/:%-]/g, " ");

  // 1. Extraer total (buscar "TOTAL", "IMPORTE", "A PAGAR", etc.)
  result.totalAmount = extractTotalAmount(normalizedText);
  result.confidence.totalAmount = result.totalAmount ? 0.8 : 0;

  // 2. Extraer fecha (formatos DD/MM/YYYY, DD-MM-YYYY, etc.)
  result.date = extractDate(normalizedText);
  result.confidence.date = result.date ? 0.9 : 0;

  // 3. Extraer nombre del comercio (primeras líneas del ticket)
  result.merchantName = extractMerchantName(text);
  result.confidence.merchantName = result.merchantName ? 0.6 : 0;

  // 4. Extraer CIF/NIF
  result.merchantVat = extractVatNumber(normalizedText);
  result.confidence.merchantVat = result.merchantVat ? 0.9 : 0;

  // 5. Extraer % de IVA
  result.vatPercent = extractVatPercent(normalizedText);
  result.confidence.vatPercent = result.vatPercent ? 0.7 : 0;

  return result;
}

/**
 * Extrae el importe total del ticket
 */
function extractTotalAmount(text: string): number | null {
  // Patrones comunes para el total
  const patterns = [
    /TOTAL[:\s]*([0-9]+[.,][0-9]{2})/,
    /IMPORTE[:\s]*([0-9]+[.,][0-9]{2})/,
    /A\s*PAGAR[:\s]*([0-9]+[.,][0-9]{2})/,
    /SUMA[:\s]*([0-9]+[.,][0-9]{2})/,
    /EUR[:\s]*([0-9]+[.,][0-9]{2})/,
    /€[:\s]*([0-9]+[.,][0-9]{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parseFloat(match[1].replace(",", "."));
      if (!isNaN(amount) && amount > 0 && amount < 10000) {
        return amount;
      }
    }
  }

  // Fallback: buscar cualquier cantidad que parezca un total
  const allAmounts = text.match(/([0-9]+[.,][0-9]{2})/g);
  if (allAmounts && allAmounts.length > 0) {
    // Asumir que el total es la cantidad más grande encontrada
    const amounts = allAmounts.map((a) => parseFloat(a.replace(",", "."))).filter((a) => !isNaN(a) && a > 0 && a < 10000);

    if (amounts.length > 0) {
      return Math.max(...amounts);
    }
  }

  return null;
}

/**
 * Extrae la fecha del ticket
 */
function extractDate(text: string): Date | null {
  // Patrones de fecha comunes en España
  const patterns = [
    /(\d{2})[/-](\d{2})[/-](\d{4})/, // DD/MM/YYYY o DD-MM-YYYY
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

        // Convertir año de 2 dígitos a 4
        if (year < 100) {
          year += year > 50 ? 1900 : 2000;
        }
      }

      // Validar fecha
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()) && date <= new Date()) {
          return date;
        }
      }
    }
  }

  return null;
}

/**
 * Extrae el nombre del comercio (primeras líneas del texto)
 */
function extractMerchantName(text: string): string | null {
  // Tomar las primeras líneas no vacías (máximo 3)
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 2 && line.length < 100);

  if (lines.length > 0) {
    // Tomar la primera línea que parezca un nombre de comercio
    const firstLine = lines[0];

    // Filtrar líneas que no parezcan fechas, números o códigos
    if (!/^[\d\s.,/-]+$/.test(firstLine)) {
      return firstLine.substring(0, 50);
    }

    // Intentar con la segunda línea
    if (lines.length > 1 && !/^[\d\s.,/-]+$/.test(lines[1])) {
      return lines[1].substring(0, 50);
    }
  }

  return null;
}

/**
 * Extrae el CIF/NIF del comercio
 */
function extractVatNumber(text: string): string | null {
  // Patrones para CIF/NIF español
  const patterns = [
    /\b([A-Z]\d{8})\b/, // CIF: letra + 8 dígitos
    /\b(\d{8}[A-Z])\b/, // NIF: 8 dígitos + letra
    /CIF[:\s]*([A-Z0-9]{9})/, // CIF: con etiqueta
    /NIF[:\s]*([A-Z0-9]{9})/, // NIF: con etiqueta
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extrae el porcentaje de IVA
 */
function extractVatPercent(text: string): number | null {
  // Patrones para IVA
  const patterns = [
    /IVA[:\s]*(\d+)%/, // IVA 21%
    /IVA[:\s]*(\d+)[:\s]*%/, // IVA: 21 %
    /(\d+)%\s*IVA/, // 21% IVA
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const percent = parseInt(match[1]);
      // Validar que sea un % de IVA español común (0, 10, 21)
      if ([0, 4, 10, 21].includes(percent)) {
        return percent;
      }
    }
  }

  // Fallback: si encuentra algún número seguido de % que sea común en IVA
  const percentMatch = text.match(/(\d+)%/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    if ([0, 4, 10, 21].includes(percent)) {
      return percent;
    }
  }

  return null;
}

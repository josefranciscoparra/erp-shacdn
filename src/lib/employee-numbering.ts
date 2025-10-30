/**
 * Utilidades para numeración automática de empleados
 *
 * Generación de prefijos organizacionales y números de empleado únicos
 */

/**
 * Genera un prefijo organizacional desde el nombre de la organización
 *
 * Ejemplos:
 * - "TimeNow" → "TMNW"
 * - "ACME Corporation" → "ACME"
 * - "Banco Santander" → "BSAN"
 * - "IBM" → "IBM"
 * - "Coca-Cola" → "COCA"
 *
 * @param orgName - Nombre de la organización
 * @returns Prefijo de 2-4 caracteres en mayúsculas
 */
export function generateOrganizationPrefix(orgName: string): string {
  // Limpiar y normalizar el nombre
  const cleaned = orgName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ""); // Eliminar números y símbolos

  // Si es una sola palabra
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    const word = words[0];
    // Si tiene 4 o menos letras, usar completo
    if (word.length <= 4) {
      return word;
    }
    // Si es más largo, tomar consonantes principales
    return extractConsonants(word).substring(0, 4);
  }

  // Si son múltiples palabras, intentar tomar iniciales
  if (words.length >= 2) {
    // Tomar primeras letras de cada palabra
    const initials = words.map((w) => w[0]).join("");

    // Si tenemos entre 2-4 letras, perfecto
    if (initials.length >= 2 && initials.length <= 4) {
      return initials;
    }

    // Si son muchas palabras, tomar solo las 4 primeras
    if (initials.length > 4) {
      return initials.substring(0, 4);
    }

    // Si son pocas letras, tomar primeras letras de primera palabra
    const firstWord = words[0];
    if (firstWord.length >= 3) {
      return firstWord.substring(0, Math.min(4, firstWord.length));
    }
  }

  // Fallback: primeras 4 letras del nombre limpio
  return cleaned.replace(/\s+/g, "").substring(0, 4) || "ORG";
}

/**
 * Extrae consonantes principales de una palabra
 * @param word - Palabra en mayúsculas
 * @returns String con consonantes
 */
function extractConsonants(word: string): string {
  const consonants = word.replace(/[AEIOU]/g, "");

  // Si tenemos suficientes consonantes, usarlas
  if (consonants.length >= 3) {
    return consonants;
  }

  // Si no, mezclar consonantes y vocales
  return word;
}

/**
 * Genera el número de empleado completo con prefijo y padding
 *
 * @param prefix - Prefijo organizacional (ej: "TMNW")
 * @param counter - Número secuencial del contador
 * @param padding - Cantidad de dígitos para el padding (default: 5)
 * @returns Número de empleado formateado (ej: "TMNW00001")
 */
export function formatEmployeeNumber(prefix: string, counter: number, padding: number = 5): string {
  const paddedNumber = String(counter).padStart(padding, "0");
  return `${prefix}${paddedNumber}`;
}

/**
 * Valida que un prefijo de organización sea válido
 *
 * @param prefix - Prefijo a validar
 * @returns true si es válido
 */
export function isValidOrganizationPrefix(prefix: string): boolean {
  // Debe tener entre 2 y 4 caracteres
  if (prefix.length < 2 || prefix.length > 4) {
    return false;
  }

  // Solo letras mayúsculas
  if (!/^[A-Z]+$/.test(prefix)) {
    return false;
  }

  return true;
}

/**
 * Sanitiza un prefijo ingresado manualmente por el usuario
 *
 * @param prefix - Prefijo a sanitizar
 * @returns Prefijo limpio y validado
 */
export function sanitizeOrganizationPrefix(prefix: string): string {
  return prefix
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .substring(0, 4);
}

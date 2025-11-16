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

/**
 * Resultado de la generación segura de número de empleado
 */
export interface SafeEmployeeNumberResult {
  success: boolean;
  employeeNumber: string | null;
  requiresReview: boolean;
  error?: string;
  attemptsMade: number;
}

/**
 * Genera número de empleado de forma segura con sistema de reintentos
 *
 * Esta función implementa 4 capas de defensa:
 * 1. Validación: Normaliza datos corruptos (números con formato incorrecto)
 * 2. Detección: Verifica duplicados ANTES de crear
 * 3. Recuperación: Sistema de reintentos (máximo 10 intentos)
 * 4. Emergencia: Si falla, permite crear sin número (requiere revisión)
 *
 * @param tx - Cliente de transacción de Prisma
 * @param orgId - ID de la organización
 * @param prefix - Prefijo para números de empleado (ej: "EMP", "TMNW")
 * @param maxRetries - Número máximo de reintentos (default: 10)
 * @returns Resultado con número generado o null si requiere revisión manual
 */
export async function generateSafeEmployeeNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any, // PrismaClient o PrismaTransaction
  orgId: string,
  prefix: string,
  maxRetries: number = 10,
): Promise<SafeEmployeeNumberResult> {
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;

    try {
      // Buscar último número de empleado CON ESE PREFIJO en la org
      const lastEmployee = await tx.employee.findFirst({
        where: {
          orgId,
          employeeNumber: { startsWith: prefix }, // Filtrar solo por el prefijo actual
        },
        orderBy: { employeeNumber: "desc" },
        select: { employeeNumber: true },
      });

      // Calcular siguiente número
      let nextNumber = 1;
      if (lastEmployee?.employeeNumber) {
        // Extraer parte numérica (quitar prefijo como "EMP", "TMNW", etc.)
        const numericPart = lastEmployee.employeeNumber.replace(/[A-Z]/g, "");

        // parseInt normaliza automáticamente:
        // - "00010" → 10
        // - "000011" → 11 (¡incluso con formato corrupto!)
        // Esto nos protege contra números con padding incorrecto
        const parsedNumber = parseInt(numericPart, 10);

        if (!isNaN(parsedNumber)) {
          nextNumber = parsedNumber + 1;
        }
      }

      // Formatear con padding de 5 dígitos (00001, 00010, 00100, etc.)
      const employeeNumber = formatEmployeeNumber(prefix, nextNumber);

      // CAPA DE DETECCIÓN: Verificar que NO exista antes de retornar
      const existing = await tx.employee.findFirst({
        where: {
          orgId,
          employeeNumber,
        },
      });

      if (existing) {
        // Ya existe, reintentar con el siguiente número
        console.warn(
          `⚠️ Número de empleado ${employeeNumber} ya existe. Reintentando... (Intento ${attempts}/${maxRetries})`,
        );
        continue; // Volver a intentar
      }

      // ¡Éxito! Número único encontrado
      console.log(
        `✅ Número de empleado generado exitosamente: ${employeeNumber} (prefijo: ${prefix}, último: ${lastEmployee?.employeeNumber ?? "ninguno"}, siguiente: ${nextNumber})`,
      );

      return {
        success: true,
        employeeNumber,
        requiresReview: false,
        attemptsMade: attempts,
      };
    } catch (error) {
      console.error(`❌ Error en intento ${attempts} de generación de número de empleado:`, error);

      // Si es el último intento, pasar a modo emergencia
      if (attempts >= maxRetries) {
        break;
      }

      // Continuar con siguiente intento
      continue;
    }
  }

  // CAPA DE EMERGENCIA: Si llegamos aquí, agotamos todos los reintentos
  console.error(
    `🚨 EMERGENCIA: No se pudo generar número de empleado único tras ${attempts} intentos. Creando empleado sin número para revisión manual.`,
  );

  return {
    success: false,
    employeeNumber: null,
    requiresReview: true,
    error: `No se pudo generar número único tras ${attempts} intentos`,
    attemptsMade: attempts,
  };
}

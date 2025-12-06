/**
 * Configuración del sistema de subida masiva de nóminas
 * Mejora 3 - Sistema de Nóminas Masivas
 */

// ============================================
// LÍMITES DE PROCESAMIENTO
// ============================================

/** Máximo número de documentos por lote */
export const MAX_DOCUMENTS_PER_BATCH = 500;

/** Tamaño máximo del archivo subido (100MB) */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/** Tamaño máximo de un PDF individual (10MB) */
export const MAX_INDIVIDUAL_PDF_SIZE = 10 * 1024 * 1024;

/** Número de items a procesar en paralelo */
export const PROCESSING_BATCH_SIZE = 10;

/** Timeout máximo para OCR por página (30 segundos) */
export const OCR_TIMEOUT_MS = 30000;

// ============================================
// DETECCIÓN DE DNI
// ============================================

/**
 * Regex para detectar DNI español en nombre de archivo o contenido
 * Formato: 8 dígitos + 1 letra (mayúscula o minúscula)
 * Ejemplos: 12345678A, 87654321z, 45811993H_nomina.pdf
 */
export const DNI_REGEX = /(\d{8}[A-Za-z])/;

/**
 * Regex alternativo para NIE español
 * Formato: X/Y/Z + 7 dígitos + 1 letra
 * Ejemplos: X1234567A, Y7654321Z
 */
export const NIE_REGEX = /([XYZ]\d{7}[A-Za-z])/i;

/**
 * Regex combinado para DNI o NIE
 */
export const DNI_NIE_REGEX = /(\d{8}[A-Za-z]|[XYZ]\d{7}[A-Za-z])/i;

// ============================================
// CÓDIGOS DE EMPLEADO
// ============================================

/**
 * Regex para detectar código de empleado interno
 * Formato típico: 4 letras mayúsculas + 5 dígitos
 * Ejemplo: TMNW00001, ACME00042
 */
export const EMPLOYEE_CODE_REGEX = /\b([A-Z]{3,4}\d{5})\b/;

// ============================================
// MATCHING Y CONFIANZA
// ============================================

/** Umbral mínimo de confianza para auto-asignación */
export const AUTO_ASSIGN_CONFIDENCE_THRESHOLD = 0.8;

/** Peso para match por DNI en nombre de archivo (alta confianza) */
export const DNI_FILENAME_CONFIDENCE = 0.95;

/** Peso para match por DNI via OCR */
export const DNI_OCR_CONFIDENCE = 0.85;

/** Peso para match por código de empleado */
export const EMPLOYEE_CODE_CONFIDENCE = 0.9;

/** Peso para match por nombre (fuzzy matching) */
export const NAME_FUZZY_CONFIDENCE = 0.7;

// ============================================
// TIPOS DE ARCHIVO
// ============================================

/** Tipos MIME permitidos para subida */
export const ALLOWED_MIME_TYPES = ["application/zip", "application/x-zip-compressed", "application/pdf"] as const;

/** Extensiones permitidas */
export const ALLOWED_EXTENSIONS = [".zip", ".pdf"] as const;

/** Tipo de archivo original */
export type OriginalFileType = "ZIP" | "PDF_MULTIPAGE";

// ============================================
// NOMBRES DE MESES (para notificaciones)
// ============================================

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/**
 * Obtiene el nombre del mes dado su número (1-12)
 */
export function getMonthName(month: number): string {
  if (month < 1 || month > 12) return "Desconocido";
  return MONTH_NAMES[month - 1];
}

// ============================================
// ROLES CON ACCESO A GESTIÓN DE NÓMINAS
// ============================================

/** Roles que pueden subir y gestionar lotes de nóminas */
export const PAYSLIP_ADMIN_ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "HR_MANAGER"] as const;

/** Roles que solo pueden ver sus propias nóminas */
export const PAYSLIP_EMPLOYEE_ROLES = ["EMPLOYEE", "MANAGER"] as const;

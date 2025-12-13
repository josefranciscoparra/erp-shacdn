/**
 * Sistema de matching de empleados para asignación automática de nóminas
 *
 * Prioridad de matching:
 * 1. DNI en nombre de archivo (95% confianza)
 * 2. DNI via OCR (85% confianza)
 * 3. Código de empleado (90% confianza)
 * 4. Fuzzy matching por nombre (70% confianza)
 *
 * Mejora 3 - Sistema de Nóminas Masivas
 */

import {
  AUTO_READY_CONFIDENCE_THRESHOLD,
  DNI_FILENAME_CONFIDENCE,
  DNI_OCR_CONFIDENCE,
  EMPLOYEE_CODE_CONFIDENCE,
  NAME_FUZZY_CONFIDENCE,
} from "./config";
import { extractDniFromFileName, isValidDniOrNie, OcrResult } from "./ocr-engine";

// ============================================
// TIPOS
// ============================================

export interface EmployeeMatchCandidate {
  id: string;
  firstName: string;
  lastName: string;
  nifNie: string | null;
  employeeNumber: string | null;
  /** Si el empleado está activo en la organización */
  active: boolean;
}

export interface MatchResult {
  /** Empleado encontrado (null si no hay match) */
  employee: EmployeeMatchCandidate | null;
  /** Score de confianza (0-1) */
  confidenceScore: number;
  /** Método que produjo el match */
  matchMethod: "dni_filename" | "dni_ocr" | "employee_code" | "name_fuzzy" | "none";
  /** DNI detectado (si aplica) */
  detectedDni: string | null;
  /** Código detectado (si aplica) */
  detectedCode: string | null;
  /** Nombre detectado (si aplica) */
  detectedName: string | null;
  /**
   * Si el match es suficientemente confiable para marcar como READY
   * Filosofía: "Ante la mínima duda, NO se asigna"
   * Requiere: confianza >= 0.9, empleado activo, sin múltiples candidatos
   */
  canAutoAssign: boolean;
  /** Si hay múltiples candidatos (nunca auto-asignar) */
  multipleMatches: boolean;
  /** Candidatos alternativos si hay múltiples */
  alternativeCandidates: EmployeeMatchCandidate[];
  /**
   * Si el match fue con un empleado INACTIVO
   * Usado para marcar el item como BLOCKED_INACTIVE
   */
  matchedInactiveEmployee: boolean;
}

// ============================================
// MOTOR DE MATCHING
// ============================================

export class EmployeeMatcher {
  private employees: EmployeeMatchCandidate[];

  constructor(employees: EmployeeMatchCandidate[]) {
    this.employees = employees;
  }

  /**
   * Busca el mejor match para un archivo de nómina
   * @param fileName Nombre del archivo (puede contener DNI)
   * @param ocrResult Resultado del OCR (opcional)
   */
  findMatch(fileName: string, ocrResult?: OcrResult): MatchResult {
    const result: MatchResult = {
      employee: null,
      confidenceScore: 0,
      matchMethod: "none",
      detectedDni: null,
      detectedCode: null,
      detectedName: null,
      canAutoAssign: false,
      multipleMatches: false,
      alternativeCandidates: [],
      matchedInactiveEmployee: false,
    };

    // 1. Intentar match por DNI en nombre de archivo (PRIORIDAD MÁXIMA)
    const filenameDni = extractDniFromFileName(fileName);
    if (filenameDni) {
      result.detectedDni = filenameDni;

      if (isValidDniOrNie(filenameDni)) {
        const matchesByDni = this.findByDni(filenameDni);

        if (matchesByDni.length === 1) {
          result.employee = matchesByDni[0];
          result.confidenceScore = DNI_FILENAME_CONFIDENCE;
          result.matchMethod = "dni_filename";
          // Filosofía: "Ante la mínima duda, NO se asigna"
          // Solo auto-asignar si: confianza >= 0.9 Y empleado activo
          result.matchedInactiveEmployee = !matchesByDni[0].active;
          result.canAutoAssign = result.confidenceScore >= AUTO_READY_CONFIDENCE_THRESHOLD && matchesByDni[0].active;
          return result;
        }

        if (matchesByDni.length > 1) {
          result.multipleMatches = true;
          result.alternativeCandidates = matchesByDni;
          result.confidenceScore = DNI_FILENAME_CONFIDENCE;
          result.matchMethod = "dni_filename";
          // Múltiples matches: NUNCA auto-asignar
          result.canAutoAssign = false;
          return result;
        }
      }
    }

    // 2. Intentar match por DNI via OCR
    if (ocrResult?.detectedDni) {
      result.detectedDni = ocrResult.detectedDni;

      if (isValidDniOrNie(ocrResult.detectedDni)) {
        const matchesByDni = this.findByDni(ocrResult.detectedDni);

        if (matchesByDni.length === 1) {
          result.employee = matchesByDni[0];
          result.confidenceScore = DNI_OCR_CONFIDENCE * (ocrResult.confidence ?? 1);
          result.matchMethod = "dni_ocr";
          result.matchedInactiveEmployee = !matchesByDni[0].active;
          result.canAutoAssign = result.confidenceScore >= AUTO_READY_CONFIDENCE_THRESHOLD && matchesByDni[0].active;
          return result;
        }

        if (matchesByDni.length > 1) {
          result.multipleMatches = true;
          result.alternativeCandidates = matchesByDni;
          result.matchMethod = "dni_ocr";
          result.confidenceScore = DNI_OCR_CONFIDENCE * (ocrResult.confidence || 1);
          result.canAutoAssign = false;
          return result;
        }
      }
    }

    // 3. Intentar match por código de empleado
    if (ocrResult?.detectedCode) {
      result.detectedCode = ocrResult.detectedCode;
      const matchesByCode = this.findByEmployeeNumber(ocrResult.detectedCode);

      if (matchesByCode.length === 1) {
        result.employee = matchesByCode[0];
        result.confidenceScore = EMPLOYEE_CODE_CONFIDENCE * (ocrResult.confidence || 1);
        result.matchMethod = "employee_code";
        // Filosofía: "Ante la mínima duda, NO se asigna"
        // Solo auto-asignar si: confianza >= 0.9 Y empleado activo
        result.matchedInactiveEmployee = !matchesByCode[0].active;
        result.canAutoAssign = result.confidenceScore >= AUTO_READY_CONFIDENCE_THRESHOLD && matchesByCode[0].active;
        return result;
      }

      if (matchesByCode.length > 1) {
        result.multipleMatches = true;
        result.alternativeCandidates = matchesByCode;
        result.matchMethod = "employee_code";
        result.confidenceScore = EMPLOYEE_CODE_CONFIDENCE * (ocrResult.confidence || 1);
        result.canAutoAssign = false;
        return result;
      }
    }

    // 4. Último recurso: fuzzy matching por nombre
    if (ocrResult?.detectedName) {
      result.detectedName = ocrResult.detectedName;
      const matchesByName = this.findByFuzzyName(ocrResult.detectedName);

      if (matchesByName.length > 0) {
        const bestMatch = matchesByName[0];
        result.employee = bestMatch.employee;
        result.confidenceScore = NAME_FUZZY_CONFIDENCE * bestMatch.score * (ocrResult.confidence || 1);
        result.matchMethod = "name_fuzzy";
        // Detectar si el empleado está inactivo
        result.matchedInactiveEmployee = !bestMatch.employee.active;

        if (matchesByName.length > 1) {
          result.multipleMatches = true;
          result.alternativeCandidates = matchesByName.slice(1).map((m) => m.employee);
        }

        // El matching por nombre NUNCA auto-asigna (muy propenso a errores)
        result.canAutoAssign = false;
        return result;
      }
    }

    return result;
  }

  /**
   * Normaliza un DNI/NIE eliminando guiones, espacios y caracteres no alfanuméricos
   */
  private normalizeDni(dni: string): string {
    return dni.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  /**
   * Busca empleados por DNI/NIE exacto (normalizado)
   */
  private findByDni(dni: string): EmployeeMatchCandidate[] {
    const normalizedInput = this.normalizeDni(dni);
    return this.employees.filter((e) => e.nifNie && this.normalizeDni(e.nifNie) === normalizedInput);
  }

  /**
   * Busca empleados por número de empleado
   */
  private findByEmployeeNumber(code: string): EmployeeMatchCandidate[] {
    const normalizedCode = code.toUpperCase().trim();
    return this.employees.filter((e) => e.employeeNumber?.toUpperCase().trim() === normalizedCode);
  }

  /**
   * Busca empleados por nombre usando fuzzy matching
   * Retorna lista ordenada por score de similitud
   */
  private findByFuzzyName(name: string): { employee: EmployeeMatchCandidate; score: number }[] {
    const normalizedSearchName = this.normalizeName(name);
    const results: { employee: EmployeeMatchCandidate; score: number }[] = [];

    for (const employee of this.employees) {
      const fullName = `${employee.firstName} ${employee.lastName}`;
      const normalizedFullName = this.normalizeName(fullName);

      // Probar en ambas direcciones (nombre puede venir como "Apellido, Nombre")
      const score1 = this.calculateSimilarity(normalizedSearchName, normalizedFullName);

      // Probar formato invertido
      const invertedName = `${employee.lastName} ${employee.firstName}`;
      const normalizedInvertedName = this.normalizeName(invertedName);
      const score2 = this.calculateSimilarity(normalizedSearchName, normalizedInvertedName);

      const bestScore = Math.max(score1, score2);

      // Solo incluir si hay un mínimo de similitud
      if (bestScore >= 0.6) {
        results.push({ employee, score: bestScore });
      }
    }

    // Ordenar por score descendente
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Normaliza un nombre para comparación
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[^a-z\s]/g, "") // Solo letras y espacios
      .replace(/\s+/g, " ") // Normalizar espacios
      .trim();
  }

  /**
   * Calcula similitud entre dos strings (Jaro-Winkler simplificado)
   */
  private calculateSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Usar algoritmo Levenshtein normalizado
    const maxLen = Math.max(s1.length, s2.length);
    const distance = this.levenshteinDistance(s1, s2);

    return 1 - distance / maxLen;
  }

  /**
   * Calcula la distancia de Levenshtein entre dos strings
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    // Crear matriz
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Inicializar primera columna y fila
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Llenar matriz
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Crea un matcher con la lista de empleados proporcionada
 */
export function createEmployeeMatcher(employees: EmployeeMatchCandidate[]): EmployeeMatcher {
  return new EmployeeMatcher(employees);
}

/**
 * Procesa un archivo y encuentra el mejor match
 * Función de conveniencia que combina extracción de DNI del nombre + OCR
 */
export function matchPayslipToEmployee(
  fileName: string,
  employees: EmployeeMatchCandidate[],
  ocrResult?: OcrResult,
): MatchResult {
  const matcher = new EmployeeMatcher(employees);
  return matcher.findMatch(fileName, ocrResult);
}

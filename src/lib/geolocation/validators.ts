/**
 * Validadores para datos de geolocalización
 * Verifica la integridad y calidad de los datos GPS
 */

import { calculateDistance } from "./haversine";

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida que los datos de geolocalización sean correctos
 *
 * @param latitude - Latitud (-90 a +90)
 * @param longitude - Longitud (-180 a +180)
 * @param accuracy - Precisión en metros (debe ser positiva)
 * @returns Resultado de validación con posible error
 */
export function validateGeolocationData(latitude: number, longitude: number, accuracy: number): ValidationResult {
  // Validar latitud
  if (typeof latitude !== "number" || isNaN(latitude)) {
    return { isValid: false, error: "Latitud inválida" };
  }

  if (latitude < -90 || latitude > 90) {
    return { isValid: false, error: "Latitud fuera de rango (-90 a +90)" };
  }

  // Validar longitud
  if (typeof longitude !== "number" || isNaN(longitude)) {
    return { isValid: false, error: "Longitud inválida" };
  }

  if (longitude < -180 || longitude > 180) {
    return { isValid: false, error: "Longitud fuera de rango (-180 a +180)" };
  }

  // Validar precisión
  if (typeof accuracy !== "number" || isNaN(accuracy)) {
    return { isValid: false, error: "Precisión inválida" };
  }

  if (accuracy < 0) {
    return { isValid: false, error: "Precisión debe ser positiva" };
  }

  return { isValid: true };
}

/**
 * Verifica si la precisión GPS es aceptable según un umbral
 *
 * @param accuracy - Precisión actual en metros
 * @param threshold - Umbral máximo permitido en metros
 * @returns true si la precisión es aceptable (menor o igual al umbral)
 */
export function checkAccuracyThreshold(accuracy: number, threshold: number): boolean {
  return accuracy <= threshold;
}

/**
 * Determina el nivel de calidad de la precisión GPS
 *
 * @param accuracy - Precisión en metros
 * @returns Nivel de calidad: "excellent", "good", "fair", "poor"
 */
export function getAccuracyQuality(accuracy: number): "excellent" | "good" | "fair" | "poor" | "very_poor" {
  if (accuracy <= 10) return "excellent"; // <10m: Excelente
  if (accuracy <= 20) return "good"; // 10-20m: Buena
  if (accuracy <= 50) return "fair"; // 20-50m: Aceptable
  if (accuracy <= 100) return "poor"; // 50-100m: Pobre
  return "very_poor"; // >100m: Muy pobre
}

/**
 * Determina si es necesario mostrar un warning al usuario sobre la precisión
 *
 * @param accuracy - Precisión en metros
 * @param minAccuracy - Precisión mínima requerida por la organización
 * @returns true si se debe mostrar warning
 */
export function shouldShowAccuracyWarning(accuracy: number, minAccuracy: number): boolean {
  return accuracy > minAccuracy;
}

/**
 * Encuentra el centro de trabajo más cercano a unas coordenadas
 *
 * @param latitude - Latitud del punto
 * @param longitude - Longitud del punto
 * @param costCenters - Array de centros de trabajo con ubicación
 * @returns El centro más cercano con distancia, o null si no hay centros con ubicación
 */
export function findNearestCostCenter<
  T extends { id: string; latitude: number | null; longitude: number | null; allowedRadiusMeters?: number | null },
>(latitude: number, longitude: number, costCenters: T[]): { center: T; distance: number } | null {
  // Filtrar centros que tengan ubicación configurada
  const centersWithLocation = costCenters.filter((c) => c.latitude !== null && c.longitude !== null);

  if (centersWithLocation.length === 0) {
    return null;
  }

  let nearestCenter = centersWithLocation[0];
  let minDistance = calculateDistance(
    { latitude, longitude },
    { latitude: nearestCenter.latitude!, longitude: nearestCenter.longitude! },
  );

  for (let i = 1; i < centersWithLocation.length; i++) {
    const center = centersWithLocation[i];
    const distance = calculateDistance(
      { latitude, longitude },
      { latitude: center.latitude!, longitude: center.longitude! },
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestCenter = center;
    }
  }

  return {
    center: nearestCenter,
    distance: minDistance,
  };
}

/**
 * Genera un mensaje descriptivo sobre el estado de la precisión GPS
 *
 * @param accuracy - Precisión en metros
 * @returns Mensaje descriptivo
 */
export function getAccuracyMessage(accuracy: number): string {
  const quality = getAccuracyQuality(accuracy);

  switch (quality) {
    case "excellent":
      return `Precisión excelente (${Math.round(accuracy)}m)`;
    case "good":
      return `Buena precisión (${Math.round(accuracy)}m)`;
    case "fair":
      return `Precisión aceptable (${Math.round(accuracy)}m)`;
    case "poor":
      return `Precisión baja (${Math.round(accuracy)}m). Considera reintentar en un lugar con mejor señal GPS`;
    case "very_poor":
      return `Precisión muy baja (${Math.round(accuracy)}m). Intenta salir al exterior o acércate a una ventana`;
    default:
      return `Precisión: ${Math.round(accuracy)}m`;
  }
}

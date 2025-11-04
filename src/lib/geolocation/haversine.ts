/**
 * Cálculo de distancias geográficas usando la fórmula de Haversine
 * Útil para determinar si un fichaje está dentro del área permitida de un centro de trabajo
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Radio de la Tierra en metros
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Convierte grados a radianes
 */
function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 *
 * @param point1 - Primer punto (latitud, longitud)
 * @param point2 - Segundo punto (latitud, longitud)
 * @returns Distancia en metros
 *
 * @example
 * const distance = calculateDistance(
 *   { latitude: 40.4168, longitude: -3.7038 },  // Madrid
 *   { latitude: 41.3851, longitude: 2.1734 }    // Barcelona
 * );
 * console.log(distance); // ~504,000 metros (504 km)
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const lat1Rad = degreesToRadians(point1.latitude);
  const lat2Rad = degreesToRadians(point2.latitude);
  const deltaLatRad = degreesToRadians(point2.latitude - point1.latitude);
  const deltaLonRad = degreesToRadians(point2.longitude - point1.longitude);

  // Fórmula de Haversine
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_METERS * c;

  return distance;
}

/**
 * Verifica si un punto está dentro de un radio determinado desde un centro
 *
 * @param point - Punto a verificar (latitud, longitud)
 * @param center - Centro de referencia (latitud, longitud)
 * @param radiusMeters - Radio permitido en metros
 * @returns true si el punto está dentro del radio, false si está fuera
 *
 * @example
 * const isValid = isWithinRadius(
 *   { latitude: 40.4168, longitude: -3.7038 },  // Punto a verificar
 *   { latitude: 40.4169, longitude: -3.7039 },  // Centro de trabajo
 *   100  // Radio de 100 metros
 * );
 * console.log(isValid); // true
 */
export function isWithinRadius(point: GeoPoint, center: GeoPoint, radiusMeters: number): boolean {
  const distance = calculateDistance(point, center);
  return distance <= radiusMeters;
}

/**
 * Encuentra el centro más cercano a un punto dado
 *
 * @param point - Punto desde el que calcular (latitud, longitud)
 * @param centers - Array de centros con sus coordenadas
 * @returns El centro más cercano con la distancia, o null si no hay centros
 *
 * @example
 * const nearest = findNearestCenter(
 *   { latitude: 40.4168, longitude: -3.7038 },
 *   [
 *     { id: "1", latitude: 40.4169, longitude: -3.7039, radius: 100 },
 *     { id: "2", latitude: 41.3851, longitude: 2.1734, radius: 200 }
 *   ]
 * );
 * console.log(nearest); // { center: {...}, distance: 14.5 }
 */
export function findNearestCenter<T extends { latitude: number; longitude: number }>(
  point: GeoPoint,
  centers: T[],
): { center: T; distance: number } | null {
  if (centers.length === 0) {
    return null;
  }

  let nearestCenter = centers[0];
  let minDistance = calculateDistance(point, {
    latitude: nearestCenter.latitude,
    longitude: nearestCenter.longitude,
  });

  for (let i = 1; i < centers.length; i++) {
    const center = centers[i];
    const distance = calculateDistance(point, {
      latitude: center.latitude,
      longitude: center.longitude,
    });

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
 * Formatea una distancia en metros a un formato legible
 *
 * @param meters - Distancia en metros
 * @returns String formateado (ej: "150 m", "1.2 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const kilometers = meters / 1000;
  return `${kilometers.toFixed(1)} km`;
}

/**
 * Calcula la distancia de Levenshtein entre dos strings
 * (número mínimo de ediciones para transformar una en otra)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Crear matriz de distancias
  const matrix: number[][] = [];

  // Inicializar primera fila y columna
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Llenar matriz con distancias
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        // Sin costo si los caracteres son iguales
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // Eliminación
          matrix[i][j - 1] + 1, // Inserción
          matrix[i - 1][j - 1] + 1, // Sustitución
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Encuentra el string más cercano de una lista de candidatos
 * usando distancia de Levenshtein
 */
export function closestMatch(input: string, candidates: string[], maxDistance: number = 2): string | null {
  let bestMatch: string | null = null;
  let bestDistance = maxDistance + 1;

  // Normalizar input (uppercase, sin espacios)
  const normalizedInput = input.toUpperCase().replace(/\s+/g, "");

  for (const candidate of candidates) {
    // Normalizar candidato
    const normalizedCandidate = candidate.toUpperCase().replace(/\s+/g, "");

    // Calcular distancia
    const distance = levenshteinDistance(normalizedInput, normalizedCandidate);

    // Si está dentro del máximo permitido y es mejor que el anterior
    if (distance <= maxDistance && distance < bestDistance) {
      bestMatch = candidate;
      bestDistance = distance;

      // Si es match exacto, no hace falta seguir buscando
      if (distance === 0) break;
    }
  }

  return bestMatch;
}

/**
 * Encuentra todos los matches dentro de una distancia máxima
 */
export function allMatches(
  input: string,
  candidates: string[],
  maxDistance: number = 2,
): Array<{ match: string; distance: number }> {
  const matches: Array<{ match: string; distance: number }> = [];

  // Normalizar input
  const normalizedInput = input.toUpperCase().replace(/\s+/g, "");

  for (const candidate of candidates) {
    // Normalizar candidato
    const normalizedCandidate = candidate.toUpperCase().replace(/\s+/g, "");

    // Calcular distancia
    const distance = levenshteinDistance(normalizedInput, normalizedCandidate);

    // Si está dentro del máximo, añadir a matches
    if (distance <= maxDistance) {
      matches.push({ match: candidate, distance });
    }
  }

  // Ordenar por distancia (mejor match primero)
  return matches.sort((a, b) => a.distance - b.distance);
}

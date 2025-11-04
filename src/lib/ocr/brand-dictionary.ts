import { closestMatch } from "./levenshtein";

/**
 * Diccionario de marcas y comercios españoles comunes
 * Organizados por categoría para mejor performance
 */

// Supermercados y alimentación
const SUPERMARKETS = [
  "MERCADONA",
  "CARREFOUR",
  "LIDL",
  "ALCAMPO",
  "ALDI",
  "DIA",
  "EROSKI",
  "CONSUM",
  "AHORRAMAS",
  "HIPERCOR",
  "EL CORTE INGLES",
  "SUPERCOR",
  "SIMPLY",
  "COVIRÁN",
  "GADIS",
  "BONPREU",
  "ESCLAT",
];

// Moda y ropa
const FASHION = [
  "ZARA",
  "ZARAHOME",
  "MASSIMO DUTTI",
  "BERSHKA",
  "PULL AND BEAR",
  "STRADIVARIUS",
  "OYSHO",
  "UTERQUE",
  "INDITEX",
  "MANGO",
  "HM",
  "H&M",
  "PRIMARK",
  "DECATHLON",
  "SPRINTER",
  "LEFTIES",
  "WOMEN SECRET",
  "CORTEFIEL",
  "SPRINGFIELD",
];

// Gasolineras
const GAS_STATIONS = [
  "REPSOL",
  "CEPSA",
  "BP",
  "SHELL",
  "GALP",
  "PETRONOR",
  "BALLENOIL",
  "DISA",
  "CAMPSA",
  "PLENOIL",
  "TAMOIL",
];

// Restauración
const RESTAURANTS = [
  "MCDONALDS",
  "BURGER KING",
  "KFC",
  "TELEPIZZA",
  "DOMINOS",
  "PIZZA HUT",
  "SUBWAY",
  "STARBUCKS",
  "TACO BELL",
  "RODILLA",
  "VIPS",
  "GINOS",
  "FOSTERS HOLLYWOOD",
  "CERVECERÍA 100 MONTADITOS",
  "LIZARRAN",
];

// Farmacias
const PHARMACIES = ["FARMACIA", "FARMACIAS", "FARMACITY"];

// Tecnología y electrónica
const TECH = ["MEDIAMARKT", "MEDIA MARKT", "WORTEN", "FNAC", "PCCOMPONENTES", "AMAZON", "APPLE", "SAMSUNG"];

// Hogar y bricolaje
const HOME = ["IKEA", "LEROY MERLIN", "BRICOMART", "BRICODEPOT", "AKI", "BAUHAUS", "MAISONS DU MONDE"];

// Todos los comercios juntos
export const ALL_BRANDS = [
  ...SUPERMARKETS,
  ...FASHION,
  ...GAS_STATIONS,
  ...RESTAURANTS,
  ...PHARMACIES,
  ...TECH,
  ...HOME,
].sort(); // Ordenar alfabéticamente

/**
 * Normaliza un nombre de comercio detectado por OCR
 * usando el diccionario de marcas
 */
export function normalizeBrand(rawName: string, maxDistance: number = 1): { name: string; confidence: number } {
  // Limpiar input
  const cleaned = rawName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "") // Quitar símbolos
    .replace(/\s+/g, ""); // Quitar espacios (ZAR O → ZARO)

  // Si está vacío, devolver original
  if (!cleaned) {
    return { name: rawName, confidence: 0.3 };
  }

  // Buscar match exacto primero
  if (ALL_BRANDS.includes(cleaned)) {
    return { name: cleaned, confidence: 1.0 };
  }

  // Buscar con Levenshtein
  const match = closestMatch(cleaned, ALL_BRANDS, maxDistance);

  if (match) {
    // Calcular confidence según distancia
    // Distancia 0 = 100%, distancia 1 = 90%, distancia 2 = 80%
    const confidence = 1.0 - maxDistance * 0.1;
    return { name: match, confidence };
  }

  // Si no hay match, intentar con distancia mayor pero menor confidence
  const looseMatch = closestMatch(cleaned, ALL_BRANDS, 2);
  if (looseMatch) {
    return { name: looseMatch, confidence: 0.7 };
  }

  // No hay match, devolver original con baja confidence
  return { name: rawName, confidence: 0.4 };
}

/**
 * Detecta si un texto contiene nombres de marcas conocidas
 */
export function containsBrand(text: string): string | null {
  const upper = text.toUpperCase();

  for (const brand of ALL_BRANDS) {
    if (upper.includes(brand)) {
      return brand;
    }
  }

  return null;
}

/**
 * Extrae todas las posibles marcas de un texto
 */
export function extractBrands(text: string): string[] {
  const brands: string[] = [];
  const upper = text.toUpperCase();

  for (const brand of ALL_BRANDS) {
    if (upper.includes(brand)) {
      brands.push(brand);
    }
  }

  return brands;
}

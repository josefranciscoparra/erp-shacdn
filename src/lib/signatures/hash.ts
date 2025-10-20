import { createHash } from "crypto";

/**
 * Calcula el hash SHA-256 de un buffer
 */
export function calculateHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Calcula el hash SHA-256 de un archivo File (browser)
 */
export async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return calculateHash(buffer);
}

/**
 * Calcula el hash SHA-256 de una cadena de texto
 */
export function calculateStringHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Verifica si dos hashes son iguales
 */
export function verifyHash(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase();
}

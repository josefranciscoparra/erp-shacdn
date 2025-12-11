/**
 * Módulo de cifrado para campos sensibles
 * Utiliza AES-256-GCM para cifrado simétrico
 *
 * IMPORTANTE: Los campos cifrados NO se pueden indexar ni filtrar en la base de datos
 * Usar solo para: involvedParties, reporterMetadata
 * NO usar para: title, status, priority, trackingCode (necesitan filtrado)
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // GCM estándar

/**
 * Obtiene la clave de cifrado del entorno
 * Debe ser una clave de 32 bytes (256 bits) en formato hex
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    // En desarrollo, usar una clave por defecto (NO usar en producción)
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ ENCRYPTION_KEY no configurada. Usando clave de desarrollo.");
      return crypto.scryptSync("dev-key-not-for-production", "salt", 32);
    }
    throw new Error("ENCRYPTION_KEY no está configurada en el entorno");
  }

  // Si la clave está en formato hex (64 caracteres = 32 bytes)
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }

  // Si no, derivar una clave de 32 bytes usando scrypt
  return crypto.scryptSync(key, "whistleblowing-salt", 32);
}

/**
 * Cifra un texto plano
 * @returns Texto cifrado en formato: iv:authTag:ciphertext (todo en hex)
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Formato: iv:authTag:ciphertext
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Error cifrando campo:", error);
    throw new Error("Error al cifrar datos sensibles");
  }
}

/**
 * Descifra un texto cifrado
 * @param ciphertext Texto en formato iv:authTag:ciphertext
 */
export function decryptField(ciphertext: string | null | undefined): string | null {
  if (ciphertext === null || ciphertext === undefined || ciphertext === "") {
    return null;
  }

  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
      console.error("Formato de texto cifrado inválido");
      return null;
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Error descifrando campo:", error);
    return null;
  }
}

/**
 * Cifra un objeto JSON
 */
export function encryptJson(data: Record<string, unknown> | null | undefined): string | null {
  if (data === null || data === undefined) {
    return null;
  }
  return encryptField(JSON.stringify(data));
}

/**
 * Descifra y parsea un objeto JSON
 */
export function decryptJson<T = Record<string, unknown>>(ciphertext: string | null | undefined): T | null {
  const decrypted = decryptField(ciphertext);
  if (!decrypted) {
    return null;
  }
  try {
    return JSON.parse(decrypted) as T;
  } catch {
    console.error("Error parseando JSON descifrado");
    return null;
  }
}

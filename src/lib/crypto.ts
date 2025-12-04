import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Clave de encriptación - debe estar en variables de entorno en producción (32 bytes para AES-256)
const RAW_KEY = process.env.ENCRYPTION_KEY ?? "defaultkey32characterslong!!!";
const KEY = Buffer.from(RAW_KEY);

if (KEY.length !== 32) {
  // En producción conviene lanzar error; en dev, avisamos por consola.
  console.warn("[crypto] ENCRYPTION_KEY debe ser de 32 bytes para AES-256. Longitud actual:", KEY.length);
}

// Formato: ivHex:cipherHex
export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const [ivHex, cipherHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(cipherHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

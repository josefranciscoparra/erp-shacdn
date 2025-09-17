import { createCipher, createDecipher } from 'crypto';

// Clave de encriptación - debe estar en variables de entorno en producción
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'defaultkey32characterslong!!!';

/**
 * Encripta un texto usando AES-256
 */
export function encrypt(text: string): string {
  try {
    const cipher = createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('Error encrypting:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Desencripta un texto usando AES-256
 */
export function decrypt(encryptedText: string): string {
  try {
    const decipher = createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting:', error);
    throw new Error('Decryption failed');
  }
}
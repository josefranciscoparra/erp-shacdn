import sharp from "sharp";

import type { StorageProvider } from "./types";

import { getStorageProvider } from "./index";

const AVATAR_SIZE = 512; // Tamaño final del avatar (512x512)
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export class AvatarUploadService {
  private storageProvider: StorageProvider;

  constructor(provider?: StorageProvider) {
    this.storageProvider = provider ?? getStorageProvider();
  }

  /**
   * Sube un avatar de usuario, redimensionándolo y optimizándolo
   */
  async uploadAvatar(orgId: string, userId: string, file: File | Buffer, mimeType?: string): Promise<string> {
    let buffer: Buffer;
    let type = mimeType;

    // Convertir File a Buffer si es necesario
    if (file instanceof File) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_MIME_TYPES.join(", ")}`);
      }
      if (file.size > MAX_AVATAR_SIZE) {
        throw new Error("El archivo es demasiado grande. Máximo 2MB.");
      }
      buffer = Buffer.from(await file.arrayBuffer());
      type = file.type;
    } else {
      buffer = file;
    }

    // Optimizar y redimensionar imagen
    const optimizedBuffer = await this.optimizeAvatar(buffer);

    // Generar path para el avatar (siempre webp para consistencia)
    const extension = "webp";
    const path = `org-${orgId}/avatars/${userId}.${extension}`;

    // Subir usando el storage provider configurado (R2/Azure/Local)
    const result = await this.storageProvider.upload(optimizedBuffer, path, {
      mimeType: "image/webp",
      overwrite: true,
      metadata: {
        orgId,
        userId,
        type: "avatar",
      },
    });

    return result.url;
  }

  /**
   * Genera una URL firmada para acceder a un avatar almacenado
   */
  async getSignedAvatarUrl(path: string, expiresInSeconds: number = 60 * 60): Promise<string> {
    return await this.storageProvider.getSignedUrl(path, { expiresIn: expiresInSeconds });
  }

  /**
   * Optimiza y redimensiona una imagen para usar como avatar
   */
  private async optimizeAvatar(buffer: Buffer): Promise<Buffer> {
    return await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 85 })
      .toBuffer();
  }

  /**
   * Obtiene la extensión de archivo a partir del MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    return map[mimeType] ?? "webp";
  }

  /**
   * Elimina un avatar existente
   */
  async deleteAvatar(orgId: string, userId: string): Promise<void> {
    const extensions = ["jpg", "png", "webp"];

    for (const ext of extensions) {
      const path = `org-${orgId}/avatars/${userId}.${ext}`;
      const exists = await this.storageProvider.exists(path);

      if (exists) {
        await this.storageProvider.delete(path);
      }
    }
  }
}

// Export de la instancia singleton del service
export const avatarUploadService = new AvatarUploadService();

import type { StorageProvider } from "./types";

import { getStorageProvider } from "./index";

const AVATAR_SIZE = 512; // Tamaño final del avatar (512x512)
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Importar sharp dinámicamente para evitar crashes en el import
let sharpInstance: typeof import("sharp") | null = null;
async function getSharp() {
  sharpInstance ??= (await import("sharp")).default;
  return sharpInstance;
}

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

    // Convertir File a Buffer si es necesario
    if (file instanceof File) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_MIME_TYPES.join(", ")}`);
      }
      if (file.size > MAX_AVATAR_SIZE) {
        throw new Error("El archivo es demasiado grande. Máximo 2MB.");
      }
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      buffer = file;
      if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new Error(`Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_MIME_TYPES.join(", ")}`);
      }
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
   * Descarga el avatar original desde el storage y lo retorna como Buffer
   */
  async getAvatarBuffer(path: string): Promise<Buffer> {
    const blob = await this.storageProvider.download(path, { responseType: "buffer" });
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Convierte un avatar WebP a PNG para navegadores sin soporte WebP (Safari viejos, etc.)
   */
  async convertAvatarToPng(buffer: Buffer): Promise<Buffer> {
    const sharp = await getSharp();
    return await sharp(buffer)
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toBuffer();
  }

  /**
   * Optimiza y redimensiona una imagen para usar como avatar
   */
  private async optimizeAvatar(buffer: Buffer): Promise<Buffer> {
    const sharp = await getSharp();
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
    switch (mimeType) {
      case "image/jpeg":
        return "jpg";
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      default:
        return "webp";
    }
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

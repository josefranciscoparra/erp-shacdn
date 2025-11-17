import fs from "fs/promises";
import path from "path";

import {
  StorageProvider,
  type UploadResult,
  type StorageItem,
  type UploadOptions,
  type DownloadOptions,
  type SignedUrlOptions,
} from "../types";

export class LocalStorageProvider extends StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath: string = "./uploads", baseUrl: string = "/uploads") {
    super();
    this.basePath = path.resolve(basePath);
    this.baseUrl = baseUrl;
  }

  async upload(file: File | Buffer, filePath: string, options?: UploadOptions): Promise<UploadResult> {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);

    // Crear directorio si no existe
    await fs.mkdir(dir, { recursive: true });

    let buffer: Buffer;
    let size: number;
    let mimeType: string;

    if (file instanceof File) {
      // Si el MIME type está vacío (común en Mac), inferirlo de la extensión
      const fileMimeType = file.type || this.getMimeTypeFromExtension(file.name);

      this.validateFile(file, [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/webp",
      ]);

      buffer = Buffer.from(await file.arrayBuffer());
      size = file.size;
      mimeType = fileMimeType;
    } else {
      buffer = file;
      size = buffer.length;
      mimeType = options?.mimeType ?? "application/octet-stream";
    }

    // Escribir archivo
    await fs.writeFile(fullPath, buffer);

    return {
      url: `${this.baseUrl}/${filePath}`,
      path: filePath,
      size,
      mimeType,
    };
  }

  async download(filePath: string, options?: DownloadOptions): Promise<Blob> {
    const fullPath = path.join(this.basePath, filePath);

    try {
      const buffer = await fs.readFile(fullPath);
      return new Blob([buffer]);
    } catch (error) {
      throw new Error(`No se pudo descargar el archivo: ${(error as Error).message}`);
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`No se pudo eliminar el archivo: ${(error as Error).message}`);
      }
    }
  }

  async getSignedUrl(filePath: string, options?: SignedUrlOptions): Promise<string> {
    // Para almacenamiento local, simplemente devolvemos la URL pública
    // En un entorno real, podrías implementar tokens JWT temporales
    return `${this.baseUrl}/${filePath}`;
  }

  async list(prefix: string): Promise<StorageItem[]> {
    const fullPrefix = path.join(this.basePath, prefix);
    const items: StorageItem[] = [];

    try {
      const entries = await fs.readdir(fullPrefix, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(prefix, entry.name);
          const fullPath = path.join(this.basePath, filePath);
          const stats = await fs.stat(fullPath);

          items.push({
            name: entry.name,
            path: filePath,
            size: stats.size,
            lastModified: stats.mtime,
            mimeType: this.getMimeTypeFromExtension(entry.name),
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`No se pudo listar archivos: ${(error as Error).message}`);
      }
    }

    return items;
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

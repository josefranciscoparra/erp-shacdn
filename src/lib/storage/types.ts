export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface StorageItem {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  mimeType: string;
}

export interface UploadOptions {
  mimeType?: string;
  overwrite?: boolean;
  metadata?: Record<string, string>;
}

export interface DownloadOptions {
  responseType?: "blob" | "stream" | "buffer";
}

export interface SignedUrlOptions {
  expiresIn?: number; // En segundos, por defecto 3600 (1 hora)
  operation?: "read" | "write" | "delete";
  responseContentDisposition?: string;
}

export abstract class StorageProvider {
  abstract upload(file: File | Buffer, path: string, options?: UploadOptions): Promise<UploadResult>;

  abstract download(path: string, options?: DownloadOptions): Promise<Blob>;

  abstract delete(path: string): Promise<void>;

  abstract getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string>;

  abstract list(prefix: string): Promise<StorageItem[]>;

  abstract exists(path: string): Promise<boolean>;

  // Método helper para generar rutas organizadas
  protected generatePath(orgId: string, employeeId: string, fileName: string, documentKind: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `org-${orgId}/employees/${employeeId}/${documentKind}/${timestamp}-${sanitizedFileName}`;
  }

  // Método helper para validar archivos
  protected validateFile(file: File | Buffer, allowedTypes: string[]): void {
    if (file instanceof File) {
      // Validar por tamaño primero
      if (file.size > 10 * 1024 * 1024) {
        // 10MB límite
        throw new Error("El archivo es demasiado grande (máximo 10MB)");
      }

      // Si el MIME type está vacío o no es confiable, validar por extensión
      if (!file.type || file.type === "application/octet-stream") {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"];

        if (!ext || !allowedExtensions.includes(ext)) {
          throw new Error(`Extensión de archivo no permitida: ${ext ?? "sin extensión"}`);
        }
      } else if (!allowedTypes.includes(file.type)) {
        throw new Error(`Tipo de archivo no permitido: ${file.type}`);
      }
    }
  }

  // Método helper para obtener MIME type desde extensión
  protected getMimeTypeFromExtension(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };

    return mimeTypes[ext ?? ""] ?? "application/octet-stream";
  }

  // Método helper para sanitizar metadata (remover caracteres no-ASCII)
  protected sanitizeMetadata(metadata: Record<string, string> | undefined): Record<string, string> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      // Remover caracteres no-ASCII y reemplazar con versiones ASCII
      const sanitizedValue = value
        .normalize("NFD") // Descomponer caracteres con tildes
        .replace(/[\u0300-\u036f]/g, "") // Remover marcas diacríticas
        .replace(/[^\u0020-\u007E]/g, "") // Remover caracteres no-ASCII (solo imprimibles ASCII)
        .trim();

      if (sanitizedValue) {
        sanitized[key] = sanitizedValue;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }
}

export type StorageProviderType = "azure" | "aws" | "local" | "r2";

export interface StorageConfig {
  provider: StorageProviderType;
  azure?: {
    connectionString: string;
    containerPrefix?: string;
  };
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  r2?: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint?: string;
    publicUrl?: string;
  };
  local?: {
    basePath: string;
    baseUrl: string;
  };
}

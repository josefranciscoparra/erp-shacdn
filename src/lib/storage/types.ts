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
  responseType?: 'blob' | 'stream' | 'buffer';
}

export interface SignedUrlOptions {
  expiresIn?: number; // En segundos, por defecto 3600 (1 hora)
  operation?: 'read' | 'write' | 'delete';
}

export abstract class StorageProvider {
  abstract upload(
    file: File | Buffer, 
    path: string, 
    options?: UploadOptions
  ): Promise<UploadResult>;

  abstract download(
    path: string, 
    options?: DownloadOptions
  ): Promise<Blob>;

  abstract delete(path: string): Promise<void>;

  abstract getSignedUrl(
    path: string, 
    options?: SignedUrlOptions
  ): Promise<string>;

  abstract list(prefix: string): Promise<StorageItem[]>;

  abstract exists(path: string): Promise<boolean>;

  // Método helper para generar rutas organizadas
  protected generatePath(
    orgId: string, 
    employeeId: string, 
    fileName: string, 
    documentKind: string
  ): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `org-${orgId}/employees/${employeeId}/${documentKind}/${timestamp}-${sanitizedFileName}`;
  }

  // Método helper para validar archivos
  protected validateFile(file: File | Buffer, allowedTypes: string[]): void {
    if (file instanceof File) {
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Tipo de archivo no permitido: ${file.type}`);
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB límite
        throw new Error('El archivo es demasiado grande (máximo 10MB)');
      }
    }
  }
}

export type StorageProviderType = 'azure' | 'aws' | 'local';

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
  local?: {
    basePath: string;
    baseUrl: string;
  };
}
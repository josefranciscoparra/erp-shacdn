import { AzureStorageProvider } from "./providers/azure";
import { LocalStorageProvider } from "./providers/local";
import { R2StorageProvider } from "./providers/r2";
import type { StorageConfig, StorageProvider, StorageProviderType } from "./types";

// Re-exportar tipos para uso externo
export type { StorageProvider, StorageConfig, StorageProviderType };

// Configuración por defecto
const defaultConfig: StorageConfig = {
  provider: (process.env.STORAGE_PROVIDER as StorageProviderType) || "local",
  azure: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING ?? "",
    containerPrefix: process.env.AZURE_CONTAINER_PREFIX ?? "documents",
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "",
    endpoint: process.env.R2_ENDPOINT ?? undefined,
    publicUrl: process.env.R2_PUBLIC_URL ?? undefined,
  },
  local: {
    basePath: process.env.LOCAL_STORAGE_PATH ?? "./uploads",
    baseUrl: process.env.LOCAL_STORAGE_URL ?? "/uploads",
  },
};

// Factory function para crear el provider correcto
export function createStorageProvider(config?: Partial<StorageConfig>): StorageProvider {
  const finalConfig = { ...defaultConfig, ...config };

  switch (finalConfig.provider) {
    case "azure":
      if (!finalConfig.azure?.connectionString) {
        throw new Error("AZURE_STORAGE_CONNECTION_STRING es requerido para el proveedor Azure");
      }
      return new AzureStorageProvider(finalConfig.azure.connectionString, finalConfig.azure.containerPrefix);

    case "aws":
      // TODO: Implementar S3StorageProvider cuando sea necesario
      throw new Error("AWS S3 provider no implementado aún");

    case "r2":
      if (
        !finalConfig.r2?.accountId ||
        !finalConfig.r2.accessKeyId ||
        !finalConfig.r2.secretAccessKey ||
        !finalConfig.r2.bucket
      ) {
        throw new Error("R2 requiere R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET configurados");
      }

      return new R2StorageProvider({
        accountId: finalConfig.r2.accountId,
        accessKeyId: finalConfig.r2.accessKeyId,
        secretAccessKey: finalConfig.r2.secretAccessKey,
        bucket: finalConfig.r2.bucket,
        endpoint: finalConfig.r2.endpoint,
        publicUrl: finalConfig.r2.publicUrl,
      });

    case "local":
    default:
      return new LocalStorageProvider(finalConfig.local?.basePath, finalConfig.local?.baseUrl);
  }
}

// Instancia singleton del storage provider
let storageProviderSingleton: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  storageProviderSingleton ??= createStorageProvider();
  return storageProviderSingleton;
}

// Función para limpiar la instancia (útil para testing)
export function resetStorageProvider(): void {
  storageProviderSingleton = null;
}

// Helpers para trabajar con documentos
export class DocumentStorageService {
  private storageProvider: StorageProvider;

  constructor(provider?: StorageProvider) {
    this.storageProvider = provider ?? getStorageProvider();
  }

  private isRemoteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private extractKeyFromUrl(urlStr: string): string | null {
    try {
      const url = new URL(urlStr);
      const path = url.pathname.replace(/^\/+/, "");
      if (!path) {
        return null;
      }

      const provider = (process.env.STORAGE_PROVIDER as StorageProviderType) || "local";
      if (provider === "r2") {
        const bucket = process.env.R2_BUCKET;
        if (bucket && path.startsWith(`${bucket}/`)) {
          return path.slice(bucket.length + 1);
        }
      } else if (provider === "azure") {
        const container = process.env.AZURE_CONTAINER_PREFIX;
        if (container && path.startsWith(`${container}/`)) {
          return path.slice(container.length + 1);
        }
      } else if (provider === "local") {
        const extracted = this.extractLocalKey(url, path);
        if (extracted) return extracted;
      }

      return path;
    } catch {
      return null;
    }
  }

  private extractLocalKey(url: URL, fallbackPath: string): string | null {
    const baseUrl = (process.env.LOCAL_STORAGE_URL ?? "/uploads").replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!baseUrl) return null;

    const hostAndPath = `${url.host}${url.pathname}`.replace(/^\/+/, "");
    if (!hostAndPath.includes(baseUrl)) return null;

    const extracted = hostAndPath.split(baseUrl).pop()?.replace(/^\/+/, "");
    return extracted ?? fallbackPath;
  }

  private resolveFileTarget(filePath: string): { key?: string; remoteUrl?: string } {
    if (!filePath) {
      throw new Error("Ruta de archivo no válida");
    }

    if (this.isRemoteUrl(filePath)) {
      const key = this.extractKeyFromUrl(filePath);
      if (key) {
        return { key };
      }
      return { remoteUrl: filePath };
    }

    return { key: filePath };
  }

  private async fetchRemoteUrl(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("No se pudo acceder al archivo remoto legacy");
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], { type: response.headers.get("content-type") ?? "application/octet-stream" });
  }

  private async downloadToBuffer(filePath: string): Promise<Buffer> {
    const target = this.resolveFileTarget(filePath);
    const blob = target.remoteUrl
      ? await this.fetchRemoteUrl(target.remoteUrl)
      : await this.storageProvider.download(target.key!);
    return Buffer.from(await blob.arrayBuffer());
  }

  // Subir documento de empleado
  async uploadEmployeeDocument(
    orgId: string,
    employeeId: string,
    file: File,
    documentKind: string,
    metadata?: Record<string, string>,
  ) {
    const fileName = file.name;
    const path = this.generateDocumentPath(orgId, employeeId, fileName, documentKind);

    return await this.storageProvider.upload(file, path, {
      mimeType: file.type,
      metadata: {
        orgId,
        employeeId,
        documentKind,
        originalName: fileName,
        ...metadata,
      },
    });
  }

  // Descargar documento
  async downloadDocument(filePath: string) {
    const target = this.resolveFileTarget(filePath);
    if (target.remoteUrl) {
      return await this.fetchRemoteUrl(target.remoteUrl);
    }

    return await this.storageProvider.download(target.key!);
  }

  // Obtener URL firmada para acceso temporal
  async getDocumentUrl(filePath: string, expiresIn: number = 3600) {
    const target = this.resolveFileTarget(filePath);
    if (target.remoteUrl) {
      return target.remoteUrl;
    }
    return await this.storageProvider.getSignedUrl(target.key!, { expiresIn });
  }

  // Eliminar documento
  async deleteDocument(filePath: string) {
    const target = this.resolveFileTarget(filePath);
    if (!target.key) {
      throw new Error("No es posible eliminar archivos legacy con URL absoluta");
    }
    return await this.storageProvider.delete(target.key);
  }

  // Listar documentos de un empleado
  async listEmployeeDocuments(orgId: string, employeeId: string) {
    const prefix = `org-${orgId}/employees/${employeeId}`;
    return await this.storageProvider.list(prefix);
  }

  // ========================================
  // PAYSLIPS - Archivos temporales de nóminas
  // ========================================

  /**
   * Sube un archivo temporal de nómina (PDF extraído de ZIP o página de PDF multipágina)
   * @param orgId ID de la organización
   * @param batchId ID del lote de subida
   * @param fileName Nombre del archivo
   * @param content Contenido del archivo (Buffer o Uint8Array)
   */
  async uploadPayslipTempFile(orgId: string, batchId: string, fileName: string, content: Buffer | Uint8Array) {
    const path = this.generatePayslipTempPath(orgId, batchId, fileName);
    const buffer = content instanceof Buffer ? content : Buffer.from(content);

    return await this.storageProvider.upload(buffer, path, {
      mimeType: "application/pdf",
    });
  }

  /**
   * Mueve un archivo temporal de nómina a su ubicación final (empleado)
   * @param tempPath Path temporal actual
   * @param orgId ID de la organización
   * @param employeeId ID del empleado
   * @param fileName Nombre final del archivo
   */
  async movePayslipToEmployee(tempPath: string, orgId: string, employeeId: string, fileName: string) {
    // Descargar el archivo temporal
    const buffer = await this.downloadToBuffer(tempPath);

    // Subir a la ubicación final del empleado
    const finalPath = this.generateDocumentPath(orgId, employeeId, fileName, "payslips");
    const result = await this.storageProvider.upload(buffer, finalPath, {
      mimeType: "application/pdf",
    });

    // Eliminar el archivo temporal
    const target = this.resolveFileTarget(tempPath);
    if (target.key) {
      await this.storageProvider.delete(target.key);
    }

    return result;
  }

  /**
   * Mueve un archivo temporal de nómina a su ubicación final (empleado)
   * Alias de movePayslipToEmployee con parámetros reordenados para uso en server actions
   * @param orgId ID de la organización
   * @param employeeId ID del empleado
   * @param tempPath Path temporal actual
   * @param fileName Nombre final del archivo
   * @returns Información del archivo movido incluyendo path, fileName y size
   */
  async movePayslipToFinal(
    orgId: string,
    employeeId: string,
    tempPath: string,
    fileName: string,
  ): Promise<{ path: string; fileName: string; size?: number }> {
    // Descargar el archivo temporal
    const buffer = await this.downloadToBuffer(tempPath);

    // Subir a la ubicación final del empleado
    const finalPath = this.generateDocumentPath(orgId, employeeId, fileName, "payslips");
    const result = await this.storageProvider.upload(buffer, finalPath, {
      mimeType: "application/pdf",
    });

    // Eliminar el archivo temporal
    const target = this.resolveFileTarget(tempPath);
    if (target.key) {
      await this.storageProvider.delete(target.key);
    }

    // Extraer el nombre del archivo del path final
    const finalFileName = finalPath.split("/").pop() ?? fileName;

    return {
      path: result.path,
      fileName: finalFileName,
      size: buffer.length,
    };
  }

  /**
   * Sube un archivo de nómina directamente a la ubicación final del empleado
   * (sin pasar por temporal - usado para subida individual de nóminas)
   * @param orgId ID de la organización
   * @param employeeId ID del empleado
   * @param fileName Nombre del archivo
   * @param content Contenido del archivo (Buffer o Uint8Array)
   * @returns Información del archivo subido incluyendo path, fileName y size
   */
  async uploadPayslipFinalFile(
    orgId: string,
    employeeId: string,
    fileName: string,
    content: Buffer | Uint8Array,
  ): Promise<{ path: string; fileName: string; size?: number }> {
    const buffer = content instanceof Buffer ? content : Buffer.from(content);
    const finalPath = this.generateDocumentPath(orgId, employeeId, fileName, "payslips");

    const result = await this.storageProvider.upload(buffer, finalPath, {
      mimeType: "application/pdf",
    });

    // Extraer el nombre del archivo del path final
    const finalFileName = finalPath.split("/").pop() ?? fileName;

    return {
      path: result.path,
      fileName: finalFileName,
      size: buffer.length,
    };
  }

  /**
   * Elimina todos los archivos temporales de un lote
   * @param orgId ID de la organización
   * @param batchId ID del lote
   */
  async deletePayslipBatchTempFiles(orgId: string, batchId: string) {
    const prefix = `org-${orgId}/payslips/temp/${batchId}`;
    const files = await this.storageProvider.list(prefix);

    for (const file of files) {
      await this.storageProvider.delete(file.path);
    }

    return files.length;
  }

  // ========================================
  // HELPERS PRIVADOS
  // ========================================

  // Generar path para documento de empleado
  private generateDocumentPath(orgId: string, employeeId: string, fileName: string, documentKind: string): string {
    const timestamp = Date.now();
    const extension = fileName.split(".").pop();
    const sanitizedName = fileName
      .replace(`.${extension}`, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .toLowerCase();

    const finalFileName = `${timestamp}-${sanitizedName}.${extension}`;

    return `org-${orgId}/employees/${employeeId}/${documentKind}/${finalFileName}`;
  }

  // Generar path para archivo temporal de nómina
  private generatePayslipTempPath(orgId: string, batchId: string, fileName: string): string {
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();

    return `org-${orgId}/payslips/temp/${batchId}/${sanitizedName}`;
  }
}

// Export de la instancia singleton del service
export const documentStorageService = new DocumentStorageService();

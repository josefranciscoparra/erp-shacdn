import { AzureStorageProvider } from "./providers/azure";
import { LocalStorageProvider } from "./providers/local";
import { R2StorageProvider } from "./providers/r2";
import type { StorageConfig, StorageProvider, StorageProviderType } from "./types";

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
    return await this.storageProvider.download(filePath);
  }

  // Obtener URL firmada para acceso temporal
  async getDocumentUrl(filePath: string, expiresIn: number = 3600) {
    return await this.storageProvider.getSignedUrl(filePath, { expiresIn });
  }

  // Eliminar documento
  async deleteDocument(filePath: string) {
    return await this.storageProvider.delete(filePath);
  }

  // Listar documentos de un empleado
  async listEmployeeDocuments(orgId: string, employeeId: string) {
    const prefix = `org-${orgId}/employees/${employeeId}`;
    return await this.storageProvider.list(prefix);
  }

  // Generar path para documento
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
}

// Export de la instancia singleton del service
export const documentStorageService = new DocumentStorageService();

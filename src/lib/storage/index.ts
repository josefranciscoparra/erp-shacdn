import { StorageProvider, type StorageConfig, type StorageProviderType } from './types';
import { AzureStorageProvider } from './providers/azure';
import { LocalStorageProvider } from './providers/local';

// Configuración por defecto
const defaultConfig: StorageConfig = {
  provider: (process.env.STORAGE_PROVIDER as StorageProviderType) || 'local',
  azure: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    containerPrefix: process.env.AZURE_CONTAINER_PREFIX || 'documents'
  },
  local: {
    basePath: process.env.LOCAL_STORAGE_PATH || './uploads',
    baseUrl: process.env.LOCAL_STORAGE_URL || '/uploads'
  }
};

// Factory function para crear el provider correcto
export function createStorageProvider(config?: Partial<StorageConfig>): StorageProvider {
  const finalConfig = { ...defaultConfig, ...config };

  switch (finalConfig.provider) {
    case 'azure':
      if (!finalConfig.azure?.connectionString) {
        throw new Error('AZURE_STORAGE_CONNECTION_STRING es requerido para el proveedor Azure');
      }
      return new AzureStorageProvider(
        finalConfig.azure.connectionString,
        finalConfig.azure.containerPrefix
      );

    case 'aws':
      // TODO: Implementar S3StorageProvider cuando sea necesario
      throw new Error('AWS S3 provider no implementado aún');

    case 'local':
    default:
      return new LocalStorageProvider(
        finalConfig.local?.basePath,
        finalConfig.local?.baseUrl
      );
  }
}

// Instancia singleton del storage provider
let _storageProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!_storageProvider) {
    _storageProvider = createStorageProvider();
  }
  return _storageProvider;
}

// Función para limpiar la instancia (útil para testing)
export function resetStorageProvider(): void {
  _storageProvider = null;
}

// Re-export de tipos útiles
export type { StorageProvider, UploadResult, StorageItem, UploadOptions, DownloadOptions, SignedUrlOptions } from './types';

// Helpers para trabajar con documentos
export class DocumentStorageService {
  private storageProvider: StorageProvider;

  constructor(provider?: StorageProvider) {
    this.storageProvider = provider || getStorageProvider();
  }

  // Subir documento de empleado
  async uploadEmployeeDocument(
    orgId: string,
    employeeId: string,
    file: File,
    documentKind: string,
    metadata?: Record<string, string>
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
        ...metadata
      }
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
  private generateDocumentPath(
    orgId: string,
    employeeId: string,
    fileName: string,
    documentKind: string
  ): string {
    const timestamp = Date.now();
    const extension = fileName.split('.').pop();
    const sanitizedName = fileName
      .replace(`.${extension}`, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    
    const finalFileName = `${timestamp}-${sanitizedName}.${extension}`;
    
    return `org-${orgId}/employees/${employeeId}/${documentKind}/${finalFileName}`;
  }
}

// Export de la instancia singleton del service
export const documentStorageService = new DocumentStorageService();
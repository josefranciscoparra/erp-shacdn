import { getStorageProvider } from "@/lib/storage";
import type { StorageProvider } from "@/lib/storage/types";

/**
 * Servicio de almacenamiento para documentos firmables
 *
 * Gestiona el versionado de documentos:
 * - Original (sin firmar)
 * - Firmado (con todas las firmas)
 * - Evidencias (JSON de auditoría)
 */
export class SignatureStorageService {
  private storageProvider: StorageProvider;

  constructor(provider?: StorageProvider) {
    this.storageProvider = provider ?? getStorageProvider();
  }

  /**
   * Sube un documento original (sin firmar)
   */
  async uploadOriginalDocument(orgId: string, documentId: string, file: File, metadata?: Record<string, string>) {
    const fileName = file.name;
    const path = this.generateOriginalDocumentPath(orgId, documentId, fileName);

    return await this.storageProvider.upload(file, path, {
      mimeType: file.type,
      metadata: {
        orgId,
        documentId,
        version: "original",
        originalName: fileName,
        ...metadata,
      },
    });
  }

  /**
   * Sube un documento firmado
   */
  async uploadSignedDocument(
    orgId: string,
    documentId: string,
    signerId: string,
    fileBuffer: Buffer,
    fileName: string,
    metadata?: Record<string, string>,
  ) {
    const path = this.generateSignedDocumentPath(orgId, documentId, signerId, fileName);

    // Convertir Buffer a File para el upload
    const file = new File([fileBuffer], fileName, { type: "application/pdf" });

    return await this.storageProvider.upload(file, path, {
      mimeType: "application/pdf",
      metadata: {
        orgId,
        documentId,
        signerId,
        version: "signed",
        originalName: fileName,
        ...metadata,
      },
    });
  }

  /**
   * Sube las evidencias de firma (JSON)
   */
  async uploadEvidence(orgId: string, documentId: string, signerId: string, evidenceData: object) {
    const fileName = `evidence-${signerId}.json`;
    const path = this.generateEvidencePath(orgId, documentId, signerId);

    const evidenceJson = JSON.stringify(evidenceData, null, 2);
    const file = new File([evidenceJson], fileName, { type: "application/json" });

    return await this.storageProvider.upload(file, path, {
      mimeType: "application/json",
      metadata: {
        orgId,
        documentId,
        signerId,
        type: "evidence",
      },
    });
  }

  /**
   * Descarga un documento (original o firmado)
   */
  async downloadDocument(filePath: string) {
    return await this.storageProvider.download(filePath);
  }

  /**
   * Obtiene URL firmada para acceso temporal a un documento
   */
  async getDocumentUrl(filePath: string, expiresIn: number = 3600, responseContentDisposition?: string) {
    return await this.storageProvider.getSignedUrl(filePath, { expiresIn, responseContentDisposition });
  }

  /**
   * Descarga las evidencias de firma
   */
  async downloadEvidence(orgId: string, documentId: string, signerId: string) {
    const path = this.generateEvidencePath(orgId, documentId, signerId);
    return await this.downloadDocument(path);
  }

  /**
   * Elimina un documento y sus evidencias (usar con precaución)
   */
  async deleteDocumentAndEvidence(orgId: string, documentId: string) {
    const prefix = `org-${orgId}/signatures/documents/${documentId}`;
    const files = await this.storageProvider.list(prefix);

    // Eliminar todos los archivos relacionados
    for (const file of files) {
      await this.storageProvider.delete(file.path);
    }
  }

  /**
   * Genera path para documento original
   */
  private generateOriginalDocumentPath(orgId: string, documentId: string, fileName: string): string {
    const extension = fileName.split(".").pop();
    const sanitizedName = fileName
      .replace(`.${extension}`, "")
      .replace(/[^\dA-Za-z.-]/g, "_")
      .toLowerCase();

    return `org-${orgId}/signatures/documents/${documentId}/original/${sanitizedName}.${extension}`;
  }

  /**
   * Genera path para documento firmado
   */
  private generateSignedDocumentPath(orgId: string, documentId: string, signerId: string, fileName: string): string {
    const timestamp = Date.now();
    const extension = fileName.split(".").pop();
    const sanitizedName = fileName
      .replace(`.${extension}`, "")
      .replace(/[^\dA-Za-z.-]/g, "_")
      .toLowerCase();

    return `org-${orgId}/signatures/documents/${documentId}/signed/${timestamp}-${signerId}-${sanitizedName}.${extension}`;
  }

  /**
   * Genera path para evidencias
   */
  private generateEvidencePath(orgId: string, documentId: string, signerId: string): string {
    return `org-${orgId}/signatures/documents/${documentId}/evidence/${signerId}-evidence.json`;
  }
}

// Exportar instancia singleton
export const signatureStorageService = new SignatureStorageService();

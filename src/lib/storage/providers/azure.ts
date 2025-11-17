import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

import {
  StorageProvider,
  type UploadResult,
  type StorageItem,
  type UploadOptions,
  type DownloadOptions,
  type SignedUrlOptions,
} from "../types";

export class AzureStorageProvider extends StorageProvider {
  private blobServiceClient: BlobServiceClient;
  private accountName: string;
  private accountKey: string;
  private containerPrefix: string;

  constructor(connectionString: string, containerPrefix: string = "documents") {
    super();

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerPrefix = containerPrefix;

    // Extraer account name y key del connection string para SAS tokens
    const connectionParams = this.parseConnectionString(connectionString);
    this.accountName = connectionParams.accountName;
    this.accountKey = connectionParams.accountKey;
  }

  async upload(file: File | Buffer, filePath: string, options?: UploadOptions): Promise<UploadResult> {
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

    // Obtener o crear contenedor basado en el path
    const containerName = this.getContainerName(filePath);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);

    // Crear contenedor si no existe
    await containerClient.createIfNotExists({
      access: "private", // Solo acceso autenticado
    });

    // Obtener blob client
    const blobName = this.getBlobName(filePath);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Subir archivo con metadatos sanitizados
    const originalName = file instanceof File ? file.name : "uploaded-file";
    const sanitizedOriginalName = originalName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\u0020-\u007E]/g, "");

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        blobContentLength: size,
      },
      metadata: this.sanitizeMetadata({
        originalName: sanitizedOriginalName,
        uploadedAt: new Date().toISOString(),
        ...options?.metadata,
      }),
    });

    return {
      url: blockBlobClient.url,
      path: filePath,
      size,
      mimeType,
    };
  }

  async download(filePath: string, options?: DownloadOptions): Promise<Blob> {
    const containerName = this.getContainerName(filePath);
    const blobName = this.getBlobName(filePath);

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      const downloadResponse = await blockBlobClient.download();

      if (!downloadResponse.readableStreamBody) {
        throw new Error("No se pudo obtener el contenido del archivo");
      }

      // Convertir stream a buffer y luego a Blob
      const chunks: Uint8Array[] = [];
      const reader = downloadResponse.readableStreamBody.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      return new Blob([buffer], {
        type: downloadResponse.contentType ?? "application/octet-stream",
      });
    } catch (error) {
      throw new Error(`No se pudo descargar el archivo: ${(error as Error).message}`);
    }
  }

  async delete(filePath: string): Promise<void> {
    const containerName = this.getContainerName(filePath);
    const blobName = this.getBlobName(filePath);

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.deleteIfExists();
    } catch (error) {
      throw new Error(`No se pudo eliminar el archivo: ${(error as Error).message}`);
    }
  }

  async getSignedUrl(filePath: string, options?: SignedUrlOptions): Promise<string> {
    const containerName = this.getContainerName(filePath);
    const blobName = this.getBlobName(filePath);

    const expiresIn = options?.expiresIn ?? 3600; // 1 hora por defecto
    const permissions = options?.operation === "write" ? "w" : "r";

    try {
      const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);

      const sasOptions = {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn: new Date(),
        expiresOn: new Date(Date.now() + expiresIn * 1000),
      };

      const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();

      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      return `${blockBlobClient.url}?${sasToken}`;
    } catch (error) {
      throw new Error(`No se pudo generar URL firmada: ${(error as Error).message}`);
    }
  }

  async list(prefix: string): Promise<StorageItem[]> {
    const containerName = this.getContainerName(prefix);
    const blobPrefix = this.getBlobName(prefix);

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const items: StorageItem[] = [];

    try {
      for await (const blob of containerClient.listBlobsFlat({ prefix: blobPrefix })) {
        items.push({
          name: blob.name.split("/").pop() ?? blob.name,
          path: `${containerName}/${blob.name}`,
          size: blob.properties.contentLength ?? 0,
          lastModified: blob.properties.lastModified || new Date(),
          mimeType: blob.properties.contentType ?? "application/octet-stream",
        });
      }
    } catch (error) {
      throw new Error(`No se pudo listar archivos: ${(error as Error).message}`);
    }

    return items;
  }

  async exists(filePath: string): Promise<boolean> {
    const containerName = this.getContainerName(filePath);
    const blobName = this.getBlobName(filePath);

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.getProperties();
      return true;
    } catch {
      return false;
    }
  }

  private parseConnectionString(connectionString: string): { accountName: string; accountKey: string } {
    const params = new URLSearchParams(connectionString.replace(/;/g, "&"));
    const accountName = params.get("AccountName");
    const accountKey = params.get("AccountKey");

    if (!accountName || !accountKey) {
      throw new Error("Connection string inválido: falta AccountName o AccountKey");
    }

    return { accountName, accountKey };
  }

  private getContainerName(filePath: string): string {
    // El primer segmento del path será el nombre del contenedor
    // Ejemplo: "org-123/employees/456/contracts/file.pdf" -> "documents-org-123"
    const segments = filePath.split("/");
    const orgSegment = segments[0]; // "org-123"
    return `${this.containerPrefix}-${orgSegment}`.toLowerCase();
  }

  private getBlobName(filePath: string): string {
    // El resto del path después del primer segmento
    // Ejemplo: "org-123/employees/456/contracts/file.pdf" -> "employees/456/contracts/file.pdf"
    const segments = filePath.split("/");
    return segments.slice(1).join("/");
  }
}

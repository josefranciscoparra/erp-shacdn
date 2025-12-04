import { Readable } from "stream";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";

import {
  StorageProvider,
  type UploadResult,
  type StorageItem,
  type UploadOptions,
  type SignedUrlOptions,
  type DownloadOptions,
} from "../types";

interface R2ProviderConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  publicUrl?: string;
}

// Timeout de 15 segundos para conexión y 30 segundos para request
const REQUEST_TIMEOUT_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 15_000;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/json", // Para evidencias de firma
  "image/jpeg",
  "image/png",
  "image/webp",
];

type StreamBody = GetObjectCommandOutput["Body"];

export class R2StorageProvider extends StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly accountId: string;
  private readonly publicUrl?: string;

  constructor(config: R2ProviderConfig) {
    super();

    const endpoint = config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`;

    // Configurar handler con timeouts para evitar que el servidor se cuelgue
    const requestHandler = new NodeHttpHandler({
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      requestTimeout: REQUEST_TIMEOUT_MS,
    });

    this.client = new S3Client({
      region: "auto",
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      requestHandler,
      // Reintentos máximos y tiempo de espera entre reintentos
      maxAttempts: 2,
    });

    this.bucket = config.bucket;
    this.accountId = config.accountId;
    this.publicUrl = config.publicUrl?.replace(/\/$/, "");
  }

  async upload(file: File | Buffer, path: string, options?: UploadOptions): Promise<UploadResult> {
    let body: Buffer;
    let mimeType = options?.mimeType ?? "application/octet-stream";
    let size: number;

    if (file instanceof File) {
      // Si el MIME type está vacío (común en Mac), inferirlo de la extensión
      const fileMimeType = file.type || this.getMimeTypeFromExtension(file.name);

      this.validateFile(file, ALLOWED_MIME_TYPES);
      body = Buffer.from(await file.arrayBuffer());
      size = file.size;
      mimeType = fileMimeType;
    } else {
      body = file;
      size = body.length;
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: body,
          ContentType: mimeType,
          Metadata: this.sanitizeMetadata(options?.metadata),
        }),
      );

      return {
        url: this.buildObjectUrl(path),
        path,
        size,
        mimeType,
      };
    } catch (error: any) {
      const errorMessage = error?.message ?? "Error desconocido";
      const errorCode = error?.Code ?? error?.name ?? "UNKNOWN";

      // Detectar errores de timeout
      if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT") || errorCode === "TimeoutError") {
        throw new Error(
          `Error de conexión con R2: Timeout después de ${REQUEST_TIMEOUT_MS / 1000}s. Verifica tu conexión a internet y las credenciales de R2.`,
        );
      }

      // Detectar errores de credenciales
      if (errorCode === "InvalidAccessKeyId" || errorCode === "SignatureDoesNotMatch" || errorCode === "AccessDenied") {
        throw new Error(`Error de credenciales R2: ${errorCode}. Verifica R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY.`);
      }

      // Detectar errores de bucket
      if (errorCode === "NoSuchBucket") {
        throw new Error(`Bucket R2 no encontrado: ${this.bucket}. Verifica R2_BUCKET en tu .env.`);
      }

      throw new Error(`Error al subir a R2: ${errorMessage}`);
    }
  }

  async download(path: string, _options?: DownloadOptions): Promise<Blob> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      }),
    );

    const buffer = await this.streamToBuffer(response.Body);
    const mimeType = response.ContentType ?? "application/octet-stream";

    return new Blob([buffer], { type: mimeType });
  }

  async delete(path: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: path,
      }),
    );
  }

  async getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string> {
    if (options?.operation && options.operation !== "read") {
      throw new Error("Solo se soportan URLs firmadas de lectura para R2");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: options?.expiresIn ?? 3600,
    });
  }

  async list(prefix: string): Promise<StorageItem[]> {
    const items: StorageItem[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      if (response.Contents) {
        for (const entry of response.Contents) {
          if (!entry.Key) continue;
          items.push({
            name: entry.Key.split("/").pop() ?? entry.Key,
            path: entry.Key,
            size: entry.Size ?? 0,
            lastModified: entry.LastModified ?? new Date(),
            mimeType: this.getMimeTypeFromExtension(entry.Key),
          });
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return items;
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
      );
      return true;
    } catch (error: any) {
      const status = error?.$metadata?.httpStatusCode;
      if (status === 404 || status === 403 || error?.name === "NotFound" || error?.Code === "NoSuchKey") {
        return false;
      }
      throw error;
    }
  }

  private buildObjectUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }

    return `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucket}/${key}`;
  }

  private async streamToBuffer(body: StreamBody): Promise<Buffer> {
    if (!body) {
      return Buffer.alloc(0);
    }

    if (body instanceof Readable) {
      return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        body.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        body.on("end", () => resolve(Buffer.concat(chunks)));
        body.on("error", reject);
      });
    }

    if (body instanceof Uint8Array) {
      return Buffer.from(body);
    }

    if (body instanceof Blob) {
      return Buffer.from(await body.arrayBuffer());
    }

    return Buffer.alloc(0);
  }

  private getMimeTypeFromExtension(fileName: string): string {
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

    return (ext && mimeTypes[ext]) ?? "application/octet-stream";
  }
}

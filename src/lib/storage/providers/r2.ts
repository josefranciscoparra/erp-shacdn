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

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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

    this.client = new S3Client({
      region: "auto",
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
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
      this.validateFile(file, ALLOWED_MIME_TYPES);
      body = Buffer.from(await file.arrayBuffer());
      size = file.size;
      mimeType = file.type || mimeType;
    } else {
      body = file;
      size = body.length;
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: body,
        ContentType: mimeType,
        Metadata: options?.metadata,
      }),
    );

    return {
      url: this.buildObjectUrl(path),
      path,
      size,
      mimeType,
    };
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

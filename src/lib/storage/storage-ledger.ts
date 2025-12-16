import { FileCategory, RetentionPolicy, type Prisma, type StoredFile } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { calculateRetention, getDefaultRetentionPolicy } from "./retention-policies";

type TransactionClient = Prisma.TransactionClient;

interface RegisterStoredFileInput {
  orgId: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
  category: FileCategory;
  employeeId?: string;
  retentionPolicy?: RetentionPolicy;
  retainUntil?: Date | null;
  legalHold?: boolean;
  legalHoldReason?: string | null;
  createdAt?: Date;
  tx?: TransactionClient;
}

interface MarkDeletionOptions {
  tx?: TransactionClient;
  reason?: string;
}

interface LegalHoldOptions {
  tx?: TransactionClient;
  reason?: string | null;
}

async function withTransaction<T>(tx: TransactionClient | undefined, fn: (client: TransactionClient) => Promise<T>) {
  if (tx) {
    return fn(tx);
  }

  return prisma.$transaction(async (transaction) => fn(transaction));
}

async function adjustStorageUsage(
  client: TransactionClient,
  orgId: string,
  bytes: number,
  direction: "increment" | "decrement",
) {
  if (bytes <= 0) return;

  await client.organization.update({
    where: { id: orgId },
    data:
      direction === "increment"
        ? { storageUsedBytes: { increment: bytes } }
        : { storageUsedBytes: { decrement: bytes } },
  });
}

export async function registerStoredFile(input: RegisterStoredFileInput): Promise<StoredFile> {
  const createdAt = input.createdAt ?? new Date();
  const policy = input.retentionPolicy ?? getDefaultRetentionPolicy(input.category);
  const retainUntil = input.retainUntil ?? calculateRetention(policy, createdAt);

  return withTransaction(input.tx, async (client) => {
    const storedFile = await client.storedFile.create({
      data: {
        orgId: input.orgId,
        employeeId: input.employeeId,
        path: input.path,
        sizeBytes: input.sizeBytes,
        mimeType: input.mimeType,
        category: input.category,
        retentionPolicy: policy,
        retainUntil,
        legalHold: input.legalHold ?? false,
        legalHoldReason: input.legalHoldReason ?? null,
      },
    });

    await adjustStorageUsage(client, input.orgId, input.sizeBytes, "increment");

    return storedFile;
  });
}

export async function markStoredFileAsDeleted(
  storedFileId: string,
  userId: string,
  options?: MarkDeletionOptions,
): Promise<StoredFile> {
  return withTransaction(options?.tx, async (client) => {
    const storedFile = await client.storedFile.findUnique({
      where: { id: storedFileId },
    });

    if (!storedFile) {
      throw new Error("Archivo no encontrado");
    }

    if (storedFile.deletedAt) {
      return storedFile;
    }

    enforceDeletionAllowed(storedFile);

    return client.storedFile.update({
      where: { id: storedFile.id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
        legalHoldReason: storedFile.legalHoldReason ?? options?.reason ?? null,
      },
    });
  });
}

export async function finalizeStoredFileDeletion(
  file: StoredFile,
  options?: { tx?: TransactionClient },
): Promise<void> {
  if (!file.deletedAt) {
    throw new Error("El archivo no ha sido marcado para eliminación");
  }

  enforceDeletionAllowed(file);

  if (!hasRetentionExpired(file)) {
    throw new Error("La retención legal aún está activa");
  }

  await withTransaction(options?.tx, async (client) => {
    await adjustStorageUsage(client, file.orgId, file.sizeBytes, "decrement");
    await client.storedFile.delete({ where: { id: file.id } });
  });
}

export async function updateLegalHold(
  storedFileId: string,
  legalHold: boolean,
  options?: LegalHoldOptions,
): Promise<StoredFile> {
  return withTransaction(options?.tx, async (client) => {
    return client.storedFile.update({
      where: { id: storedFileId },
      data: {
        legalHold,
        legalHoldReason: legalHold ? (options?.reason ?? "Legal hold aplicado") : null,
      },
    });
  });
}

export function hasRetentionExpired(file: Pick<StoredFile, "retainUntil">, referenceDate: Date = new Date()): boolean {
  if (!file.retainUntil) return true;
  return referenceDate >= file.retainUntil;
}

export function enforceDeletionAllowed(file: Pick<StoredFile, "retainUntil" | "legalHold">) {
  if (file.legalHold) {
    throw new Error("Documento protegido por obligación legal (legal hold activo)");
  }

  if (file.retainUntil && file.retainUntil > new Date()) {
    throw new Error("Documento protegido por obligación legal (retención vigente)");
  }
}

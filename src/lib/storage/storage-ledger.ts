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
  /**
   * Si true, NO incrementa storageUsedBytes en la organización.
   * Usar cuando ya se reservó espacio previamente con reserveStorage().
   * @default false
   */
  skipStorageIncrement?: boolean;
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

    // Solo incrementar storage si NO se reservó previamente
    // Cuando skipStorageIncrement=true, el espacio ya fue reservado con reserveStorage()
    // y se moverá de reserved a used con commitReservation()
    if (!input.skipStorageIncrement) {
      await adjustStorageUsage(client, input.orgId, input.sizeBytes, "increment");
    }

    return storedFile;
  });
}

/**
 * Marca un archivo como eliminado (soft delete).
 * SIEMPRE permite soft delete, incluso con retención vigente.
 * El archivo se mueve a la "Papelera Legal" y sigue existiendo para cumplimiento.
 * Solo bloquea si hay legalHold activo (caso de inspección/juicio).
 */
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

    // Solo bloquear soft delete si hay legalHold activo
    // La retención NO bloquea el soft delete, solo la purga física
    if (storedFile.legalHold) {
      throw new Error("Documento protegido por obligación legal (legal hold activo)");
    }

    return client.storedFile.update({
      where: { id: storedFile.id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  });
}

/**
 * Restaura un archivo eliminado (quita de la papelera).
 */
export async function restoreStoredFile(
  storedFileId: string,
  options?: { tx?: TransactionClient },
): Promise<StoredFile> {
  return withTransaction(options?.tx, async (client) => {
    const storedFile = await client.storedFile.findUnique({
      where: { id: storedFileId },
    });

    if (!storedFile) {
      throw new Error("Archivo no encontrado");
    }

    if (!storedFile.deletedAt) {
      return storedFile; // Ya está restaurado
    }

    return client.storedFile.update({
      where: { id: storedFile.id },
      data: {
        deletedAt: null,
        deletedById: null,
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

/**
 * Valida si un archivo puede ser purgado físicamente.
 * Solo lanza error si NO se puede purgar.
 */
export function enforceDeletionAllowed(file: Pick<StoredFile, "retainUntil" | "legalHold">) {
  if (file.legalHold) {
    throw new Error("Documento protegido por obligación legal (legal hold activo)");
  }

  if (file.retainUntil && file.retainUntil > new Date()) {
    throw new Error("Documento protegido por obligación legal (retención vigente)");
  }
}

export interface PurgeStatus {
  canPurge: boolean;
  reason: string | null;
  retainUntil: Date | null;
  legalHold: boolean;
}

/**
 * Verifica si un archivo puede ser purgado físicamente.
 * Retorna información útil para la UI (tooltips, botones deshabilitados).
 */
export function canPurgeFile(file: Pick<StoredFile, "deletedAt" | "retainUntil" | "legalHold">): PurgeStatus {
  // Debe estar marcado como eliminado primero
  if (!file.deletedAt) {
    return {
      canPurge: false,
      reason: "El archivo no está en la papelera",
      retainUntil: file.retainUntil,
      legalHold: file.legalHold,
    };
  }

  // Legal hold bloquea purga
  if (file.legalHold) {
    return {
      canPurge: false,
      reason: "Legal hold activo",
      retainUntil: file.retainUntil,
      legalHold: true,
    };
  }

  // Retención vigente bloquea purga
  if (file.retainUntil && file.retainUntil > new Date()) {
    return {
      canPurge: false,
      reason: `Retención hasta ${file.retainUntil.toLocaleDateString("es-ES")}`,
      retainUntil: file.retainUntil,
      legalHold: false,
    };
  }

  return {
    canPurge: true,
    reason: null,
    retainUntil: file.retainUntil,
    legalHold: false,
  };
}

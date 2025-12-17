"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import {
  canPurgeFile,
  finalizeStoredFileDeletion,
  restoreStoredFile,
  type PurgeStatus,
} from "@/lib/storage/storage-ledger";

// Roles que pueden ver y gestionar la papelera
const TRASH_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "HR_ADMIN"] as const;

export interface TrashDocument {
  id: string;
  fileName: string;
  kind: string;
  fileSize: number;
  mimeType: string;
  deletedAt: Date;
  deletedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string | null;
  };
  storedFile: {
    id: string;
    retainUntil: Date | null;
    legalHold: boolean;
    category: string;
    sizeBytes: number;
  } | null;
  purgeStatus: PurgeStatus;
}

export interface TrashStats {
  totalCount: number;
  totalSize: number;
  canPurgeCount: number;
  canPurgeSize: number;
  retainedCount: number;
  legalHoldCount: number;
}

export interface GetTrashResult {
  success: boolean;
  error?: string;
  documents?: TrashDocument[];
  stats?: TrashStats;
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * Obtiene los documentos en la papelera (soft deleted)
 */
export async function getTrashDocuments(options?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<GetTrashResult> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return { success: false, error: "No autorizado" };
    }

    const role = session.user.role;
    if (!TRASH_ADMIN_ROLES.includes(role as (typeof TRASH_ADMIN_ROLES)[number])) {
      return { success: false, error: "No tienes permisos para ver la papelera" };
    }

    const orgId = session.user.orgId;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const search = options?.search;

    // Construir where clause
    const whereClause: any = {
      orgId,
      deletedAt: { not: null }, // Solo documentos eliminados
    };

    if (search) {
      whereClause.OR = [
        { fileName: { contains: search, mode: "insensitive" } },
        {
          employee: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { employeeNumber: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // Obtener documentos y conteo
    const [documents, totalCount] = await Promise.all([
      prisma.employeeDocument.findMany({
        where: whereClause,
        include: {
          deletedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
            },
          },
          storedFile: {
            select: {
              id: true,
              retainUntil: true,
              legalHold: true,
              category: true,
              sizeBytes: true,
              deletedAt: true,
            },
          },
        },
        orderBy: { deletedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.employeeDocument.count({ where: whereClause }),
    ]);

    // Obtener todos para estadísticas
    const allTrashDocs = await prisma.employeeDocument.findMany({
      where: { orgId, deletedAt: { not: null } },
      select: {
        fileSize: true,
        storedFile: {
          select: {
            retainUntil: true,
            legalHold: true,
            deletedAt: true,
          },
        },
      },
    });

    // Calcular estadísticas
    let canPurgeCount = 0;
    let canPurgeSize = 0;
    let retainedCount = 0;
    let legalHoldCount = 0;
    let totalSize = 0;

    for (const doc of allTrashDocs) {
      totalSize += doc.fileSize;
      if (doc.storedFile) {
        const status = canPurgeFile(doc.storedFile);
        if (status.canPurge) {
          canPurgeCount++;
          canPurgeSize += doc.fileSize;
        } else if (status.legalHold) {
          legalHoldCount++;
        } else {
          retainedCount++;
        }
      }
    }

    // Transformar documentos
    const transformedDocs: TrashDocument[] = documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      kind: doc.kind,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      deletedAt: doc.deletedAt!,
      deletedBy: doc.deletedBy,
      employee: doc.employee,
      storedFile: doc.storedFile
        ? {
            id: doc.storedFile.id,
            retainUntil: doc.storedFile.retainUntil,
            legalHold: doc.storedFile.legalHold,
            category: doc.storedFile.category,
            sizeBytes: doc.storedFile.sizeBytes,
          }
        : null,
      purgeStatus: doc.storedFile
        ? canPurgeFile(doc.storedFile)
        : { canPurge: true, reason: null, retainUntil: null, legalHold: false },
    }));

    return {
      success: true,
      documents: transformedDocs,
      stats: {
        totalCount: allTrashDocs.length,
        totalSize,
        canPurgeCount,
        canPurgeSize,
        retainedCount,
        legalHoldCount,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error) {
    console.error("Error al obtener papelera:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Restaura un documento de la papelera
 */
export async function restoreDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return { success: false, error: "No autorizado" };
    }

    const role = session.user.role;
    if (!TRASH_ADMIN_ROLES.includes(role as (typeof TRASH_ADMIN_ROLES)[number])) {
      return { success: false, error: "No tienes permisos para restaurar documentos" };
    }

    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: documentId,
        orgId: session.user.orgId,
        deletedAt: { not: null },
      },
      include: {
        storedFile: true,
      },
    });

    if (!document) {
      return { success: false, error: "Documento no encontrado en la papelera" };
    }

    // Restaurar StoredFile si existe
    if (document.storedFileId) {
      await restoreStoredFile(document.storedFileId);
    }

    // Restaurar EmployeeDocument
    await prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        deletedAt: null,
        deletedById: null,
      },
    });

    revalidatePath("/dashboard/admin/documents/trash");
    revalidatePath("/dashboard/documents");

    return { success: true };
  } catch (error) {
    console.error("Error al restaurar documento:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Purga (elimina permanentemente) un documento
 * Solo funciona si la retención ha expirado y no hay legalHold
 */
export async function purgeDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return { success: false, error: "No autorizado" };
    }

    const role = session.user.role;
    if (!TRASH_ADMIN_ROLES.includes(role as (typeof TRASH_ADMIN_ROLES)[number])) {
      return { success: false, error: "No tienes permisos para purgar documentos" };
    }

    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: documentId,
        orgId: session.user.orgId,
        deletedAt: { not: null },
      },
      include: {
        storedFile: true,
      },
    });

    if (!document) {
      return { success: false, error: "Documento no encontrado en la papelera" };
    }

    // Verificar si se puede purgar
    if (document.storedFile) {
      const status = canPurgeFile(document.storedFile);
      if (!status.canPurge) {
        return { success: false, error: status.reason ?? "No se puede purgar el documento" };
      }

      // Eliminar del storage físico
      try {
        await documentStorageService.deleteDocument(document.storageUrl);
      } catch {
        console.warn("⚠️ Error al eliminar del storage físico, continuando con purge de BD");
      }

      // Finalizar eliminación del ledger
      await finalizeStoredFileDeletion(document.storedFile);
    }

    // Eliminar EmployeeDocument
    await prisma.employeeDocument.delete({
      where: { id: documentId },
    });

    revalidatePath("/dashboard/admin/documents/trash");
    revalidatePath("/dashboard/documents");

    return { success: true };
  } catch (error) {
    console.error("Error al purgar documento:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Purga todos los documentos que pueden ser purgados
 */
export async function purgeAllExpired(): Promise<{ success: boolean; purgedCount: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return { success: false, purgedCount: 0, error: "No autorizado" };
    }

    const role = session.user.role;
    if (!TRASH_ADMIN_ROLES.includes(role as (typeof TRASH_ADMIN_ROLES)[number])) {
      return { success: false, purgedCount: 0, error: "No tienes permisos para purgar documentos" };
    }

    const orgId = session.user.orgId;

    // Obtener todos los documentos en papelera
    const trashDocs = await prisma.employeeDocument.findMany({
      where: {
        orgId,
        deletedAt: { not: null },
      },
      include: {
        storedFile: true,
      },
    });

    let purgedCount = 0;

    for (const doc of trashDocs) {
      // Verificar si se puede purgar
      if (doc.storedFile) {
        const status = canPurgeFile(doc.storedFile);
        if (!status.canPurge) continue;

        try {
          await documentStorageService.deleteDocument(doc.storageUrl);
        } catch {
          // Continuar aunque falle el storage
        }

        await finalizeStoredFileDeletion(doc.storedFile);
      }

      await prisma.employeeDocument.delete({
        where: { id: doc.id },
      });

      purgedCount++;
    }

    revalidatePath("/dashboard/admin/documents/trash");
    revalidatePath("/dashboard/documents");

    return { success: true, purgedCount };
  } catch (error) {
    console.error("Error al purgar documentos expirados:", error);
    return { success: false, purgedCount: 0, error: "Error interno del servidor" };
  }
}

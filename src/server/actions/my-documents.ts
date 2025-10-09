"use server";

import { prisma } from "@/lib/prisma";
import type { DocumentKind } from "@/lib/validations/document";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";
import { features } from "@/config/features";

export interface MyDocument {
  id: string;
  kind: DocumentKind;
  fileName: string;
  storageUrl: string;
  fileSize: number;
  mimeType: string;
  version: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  canDelete: boolean;
}

export interface MyDocumentsFilters {
  documentKind?: DocumentKind;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MyDocumentsResponse {
  documents: MyDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    byKind: Record<string, number>;
  };
}

// Tipos de documentos que los empleados pueden eliminar
const EMPLOYEE_ALLOWED_DOCUMENT_TYPES = ["MEDICAL", "CERTIFICATE", "OTHER"] as const;

/**
 * Obtiene los documentos del empleado autenticado
 */
export async function getMyDocuments(
  filters: MyDocumentsFilters = {}
): Promise<MyDocumentsResponse> {
  const { userId, employeeId, orgId } = await getAuthenticatedEmployee();

  const { documentKind, search, page = 1, limit = 50 } = filters;

  if (!features.documents) {
    return {
      documents: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
      stats: {
        total: 0,
        byKind: {},
      },
    };
  }

  // Construir filtros para Prisma
  const whereClause: any = {
    employeeId,
    orgId,
  };

  if (documentKind) {
    whereClause.kind = documentKind;
  }

  if (search) {
    whereClause.OR = [
      { fileName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Obtener documentos con paginación
  const [documents, totalCount, allDocuments] = await Promise.all([
    prisma.employeeDocument.findMany({
      where: whereClause,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employeeDocument.count({ where: whereClause }),
    // Obtener todos los documentos para estadísticas
    prisma.employeeDocument.findMany({
      where: {
        employeeId,
        orgId,
      },
      select: {
        kind: true,
      },
    }),
  ]);

  // Calcular estadísticas
  const statsByKind = allDocuments.reduce(
    (acc, doc) => {
      acc[doc.kind] = (acc[doc.kind] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Transformar documentos
  const transformedDocuments: MyDocument[] = documents.map((doc) => ({
    id: doc.id,
    kind: doc.kind as DocumentKind,
    fileName: doc.fileName,
    storageUrl: doc.storageUrl,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    version: doc.version,
    description: doc.description,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    uploadedBy: doc.uploadedBy,
    canDelete:
      doc.uploadedById === userId &&
      EMPLOYEE_ALLOWED_DOCUMENT_TYPES.includes(doc.kind as any),
  }));

  return {
    documents: transformedDocuments,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
    stats: {
      total: allDocuments.length,
      byKind: statsByKind,
    },
  };
}

/**
 * Obtiene estadísticas de documentos del empleado
 */
export async function getMyDocumentsStats() {
  const { employeeId, orgId } = await getAuthenticatedEmployee();

  if (!features.documents) {
    return {
      total: 0,
      byKind: {},
      totalSize: 0,
      lastUploaded: null,
    };
  }

  const documents = await prisma.employeeDocument.findMany({
    where: {
      employeeId,
      orgId,
    },
    select: {
      kind: true,
      fileSize: true,
      createdAt: true,
    },
  });

  const stats = {
    total: documents.length,
    byKind: documents.reduce(
      (acc, doc) => {
        acc[doc.kind] = (acc[doc.kind] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    totalSize: documents.reduce((acc, doc) => acc + doc.fileSize, 0),
    lastUploaded: documents.length > 0
      ? documents.reduce((latest, doc) =>
          new Date(doc.createdAt) > new Date(latest.createdAt) ? doc : latest
        ).createdAt.toISOString()
      : null,
  };

  return stats;
}

"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, ALLOWED_UPLOAD_STATUSES, MAX_DOCUMENTS_PER_REQUEST } from "@/lib/pto-documents-config";
import { getStorageProvider } from "@/lib/storage";

/**
 * Verifica si el usuario tiene permisos para gestionar documentos de una solicitud PTO
 */
async function canManagePtoDocuments(
  userId: string,
  userRole: string,
  ptoRequest: {
    employeeId: string;
    status: string;
    employee: { userId: string | null };
  },
): Promise<{ allowed: boolean; reason?: string }> {
  // Verificar estado de la solicitud
  if (!ALLOWED_UPLOAD_STATUSES.includes(ptoRequest.status)) {
    return {
      allowed: false,
      reason: `No se pueden gestionar documentos en solicitudes con estado ${ptoRequest.status}`,
    };
  }

  // Admin/RRHH siempre puede
  if (ADMIN_ROLES.includes(userRole)) {
    return { allowed: true };
  }

  // El empleado dueño de la solicitud puede
  if (ptoRequest.employee.userId === userId) {
    return { allowed: true };
  }

  // TODO: Añadir verificación de manager cuando se implemente

  return {
    allowed: false,
    reason: "No tienes permisos para gestionar documentos de esta solicitud",
  };
}

/**
 * Obtiene los documentos de una solicitud PTO
 */
export async function getPtoDocuments(ptoRequestId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;

    // Verificar que la solicitud existe y pertenece a la organización
    const ptoRequest = await prisma.ptoRequest.findFirst({
      where: { id: ptoRequestId, orgId },
      select: { id: true },
    });

    if (!ptoRequest) {
      return { success: false, error: "Solicitud no encontrada" };
    }

    // Obtener documentos
    const documents = await prisma.ptoRequestDocument.findMany({
      where: { ptoRequestId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    return { success: true, documents };
  } catch (error) {
    console.error("Error al obtener documentos PTO:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Obtiene una URL firmada para descargar un documento
 */
export async function getDocumentDownloadUrl(documentId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;

    // Obtener el documento y verificar que pertenece a la organización
    const document = await prisma.ptoRequestDocument.findFirst({
      where: { id: documentId },
      include: {
        ptoRequest: {
          select: { orgId: true },
        },
      },
    });

    if (!document || document.ptoRequest.orgId !== orgId) {
      return { success: false, error: "Documento no encontrado" };
    }

    // Generar URL firmada
    const storageProvider = getStorageProvider();
    const url = await storageProvider.getSignedUrl(document.filePath, {
      expiresIn: 3600, // 1 hora
      operation: "read",
    });

    return { success: true, url, fileName: document.fileName, mimeType: document.mimeType };
  } catch (error) {
    console.error("Error al obtener URL de descarga:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Elimina un documento de una solicitud PTO
 */
export async function deletePtoDocument(documentId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const orgId = session.user.orgId;

    // Obtener el documento con información de la solicitud
    const document = await prisma.ptoRequestDocument.findFirst({
      where: { id: documentId },
      include: {
        ptoRequest: {
          select: {
            id: true,
            orgId: true,
            employeeId: true,
            status: true,
            employee: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!document || document.ptoRequest.orgId !== orgId) {
      return { success: false, error: "Documento no encontrado" };
    }

    // Verificar permisos
    const permission = await canManagePtoDocuments(userId, userRole, document.ptoRequest);
    if (!permission.allowed) {
      return { success: false, error: permission.reason };
    }

    // Eliminar del storage
    const storageProvider = getStorageProvider();
    try {
      await storageProvider.delete(document.filePath);
    } catch (storageError) {
      console.warn("Error al eliminar archivo del storage:", storageError);
      // Continuamos aunque falle la eliminación del storage
    }

    // Eliminar de la base de datos
    await prisma.ptoRequestDocument.delete({
      where: { id: documentId },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        action: "PTO_DOCUMENT_DELETED",
        category: "PTO",
        entityId: documentId,
        entityType: "PtoRequestDocument",
        entityData: {
          ptoRequestId: document.ptoRequestId,
          fileName: document.fileName,
        },
        description: `Documento "${document.fileName}" eliminado de solicitud PTO`,
        performedById: userId,
        performedByEmail: session.user.email ?? "",
        performedByName: session.user.name ?? "",
        performedByRole: userRole,
        orgId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar documento PTO:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Valida si se puede subir un documento a una solicitud PTO
 * (útil para validar antes de subir desde el cliente)
 */
export async function canUploadToPtoRequest(ptoRequestId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { allowed: false, reason: "No autorizado" };
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const orgId = session.user.orgId;

    // Obtener la solicitud
    const ptoRequest = await prisma.ptoRequest.findFirst({
      where: { id: ptoRequestId, orgId },
      select: {
        id: true,
        status: true,
        employeeId: true,
        employee: {
          select: { userId: true },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!ptoRequest) {
      return { allowed: false, reason: "Solicitud no encontrada" };
    }

    // Verificar permisos
    const permission = await canManagePtoDocuments(userId, userRole, ptoRequest);
    if (!permission.allowed) {
      return { allowed: false, reason: permission.reason };
    }

    // Verificar límite de documentos
    if (ptoRequest._count.documents >= MAX_DOCUMENTS_PER_REQUEST) {
      return {
        allowed: false,
        reason: `Se ha alcanzado el límite de ${MAX_DOCUMENTS_PER_REQUEST} documentos por solicitud`,
      };
    }

    return {
      allowed: true,
      currentDocuments: ptoRequest._count.documents,
      maxDocuments: MAX_DOCUMENTS_PER_REQUEST,
    };
  } catch (error) {
    console.error("Error al verificar permisos de upload:", error);
    return { allowed: false, reason: "Error interno del servidor" };
  }
}

/**
 * Crea un registro de documento PTO (llamado después de subir el archivo)
 * Esta función se usa desde la API route que maneja el upload
 */
export async function createPtoDocumentRecord(
  ptoRequestId: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  mimeType: string,
  description?: string,
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const orgId = session.user.orgId;

    // Obtener la solicitud
    const ptoRequest = await prisma.ptoRequest.findFirst({
      where: { id: ptoRequestId, orgId },
      select: {
        id: true,
        status: true,
        employeeId: true,
        employee: {
          select: { userId: true, id: true },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!ptoRequest) {
      return { success: false, error: "Solicitud no encontrada" };
    }

    // Verificar permisos
    const permission = await canManagePtoDocuments(userId, userRole, ptoRequest);
    if (!permission.allowed) {
      return { success: false, error: permission.reason };
    }

    // Verificar límite
    if (ptoRequest._count.documents >= MAX_DOCUMENTS_PER_REQUEST) {
      return {
        success: false,
        error: `Se ha alcanzado el límite de ${MAX_DOCUMENTS_PER_REQUEST} documentos`,
      };
    }

    // Crear registro
    const document = await prisma.ptoRequestDocument.create({
      data: {
        ptoRequestId,
        fileName,
        filePath,
        fileSize,
        mimeType,
        description,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        action: "PTO_DOCUMENT_UPLOADED",
        category: "PTO",
        entityId: document.id,
        entityType: "PtoRequestDocument",
        entityData: {
          ptoRequestId,
          fileName,
          fileSize,
          mimeType,
          employeeId: ptoRequest.employee.id,
        },
        description: `Documento "${fileName}" adjuntado a solicitud PTO`,
        performedById: userId,
        performedByEmail: session.user.email ?? "",
        performedByName: session.user.name ?? "",
        performedByRole: userRole,
        orgId,
      },
    });

    return { success: true, document };
  } catch (error) {
    console.error("Error al crear registro de documento PTO:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

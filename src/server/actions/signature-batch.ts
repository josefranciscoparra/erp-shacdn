"use server";

import { randomBytes } from "crypto";

import type { SignatureBatch, SignatureBatchStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecipientEmployees, resolveSecondSigner } from "@/lib/signatures/double-signature";
import { createSignaturePendingNotification } from "@/lib/signatures/notifications";
import {
  activateBatchSchema,
  cancelBatchSchema,
  createSignatureBatchSchema,
  type CreateSignatureBatchInput,
  getBatchDetailSchema,
  listBatchesSchema,
  type ListBatchesInput,
  resendRemindersSchema,
  validateDoubleSignature,
} from "@/lib/validations/signature-batch";

/**
 * Obtiene el usuario actual autenticado con su información completa
 */
async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      orgId: true,
      name: true,
    },
  });

  return user;
}

/**
 * Roles permitidos para gestionar lotes de firma
 */
const BATCH_ALLOWED_ROLES = ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"];

/**
 * Resultado de una operación de lote
 */
interface BatchResult<T = SignatureBatch> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Estadísticas de un lote
 */
export interface BatchStats {
  batchId: string;
  name: string;
  status: SignatureBatchStatus;
  totalRecipients: number;
  signedCount: number;
  pendingCount: number;
  rejectedCount: number;
  progressPercentage: number;
  expiresAt: Date;
  daysUntilExpiration: number;
}

/**
 * Detalle completo de un lote con solicitudes
 */
export interface BatchDetail extends BatchStats {
  description: string | null;
  documentTitle: string;
  documentId: string;
  requireDoubleSignature: boolean;
  secondSignerRole: string | null;
  createdAt: Date;
  createdByName: string;
  requests: Array<{
    id: string;
    status: string;
    employeeName: string;
    employeeId: string;
    secondSignerMissing: boolean;
    signers: Array<{
      id: string;
      order: number;
      status: string;
      signerName: string;
      signedAt: Date | null;
    }>;
  }>;
}

/**
 * Crea un nuevo lote de firmas en estado DRAFT.
 * Solo HR/Admin pueden crear lotes.
 */
export async function createSignatureBatch(input: CreateSignatureBatchInput): Promise<BatchResult> {
  try {
    // 1. Obtener usuario actual y validar permisos
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (!BATCH_ALLOWED_ROLES.includes(user.role)) {
      return { success: false, error: "Solo HR/Admin pueden crear lotes de firma" };
    }

    // 2. Validar input
    const validation = createSignatureBatchSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message ?? "Datos inválidos" };
    }

    const data = validation.data;
    const additionalSignerIds = Array.from(new Set(data.additionalSignerEmployeeIds ?? []));

    // 3. Validar configuración de doble firma
    const doubleSignatureValidation = validateDoubleSignature(
      data.requireDoubleSignature,
      data.secondSignerRole,
      data.secondSignerUserId,
    );

    if (!doubleSignatureValidation.valid) {
      return { success: false, error: doubleSignatureValidation.error };
    }

    // 4. Validar que el documento existe y pertenece a la organización
    const document = await prisma.signableDocument.findFirst({
      where: {
        id: data.documentId,
        orgId: user.orgId,
      },
    });

    if (!document) {
      return { success: false, error: "Documento no encontrado" };
    }

    // 5. Validar que los empleados existen y pertenecen a la organización
    const recipients = await getRecipientEmployees(user.orgId, data.recipientEmployeeIds);

    if (recipients.length === 0) {
      return { success: false, error: "No se encontraron empleados válidos con usuario asociado" };
    }

    if (recipients.length < data.recipientEmployeeIds.length) {
      // Algunos empleados no tienen usuario o no existen
      console.warn(
        `Se solicitaron ${data.recipientEmployeeIds.length} destinatarios pero solo ${recipients.length} son válidos`,
      );
    }

    if (additionalSignerIds.length > 0) {
      const additionalSigners = await getRecipientEmployees(user.orgId, additionalSignerIds);

      if (additionalSigners.length !== additionalSignerIds.length) {
        return { success: false, error: "Uno o más firmantes adicionales no son válidos" };
      }
    }

    // 6. Crear el lote en estado DRAFT
    const batch = await prisma.signatureBatch.create({
      data: {
        name: data.name,
        description: data.description,
        status: "DRAFT",
        documentId: data.documentId,
        requireDoubleSignature: data.requireDoubleSignature,
        secondSignerRole: data.secondSignerRole ?? null,
        secondSignerUserId: data.secondSignerUserId ?? null,
        expiresAt: data.expiresAt,
        reminderDays: data.reminderDays,
        totalRecipients: recipients.length,
        pendingCount: recipients.length,
        signedCount: 0,
        rejectedCount: 0,
        createdById: user.id,
        orgId: user.orgId,
      },
    });

    return { success: true, data: batch };
  } catch (error) {
    console.error("Error creando lote de firma:", error);
    return { success: false, error: "Error interno al crear el lote" };
  }
}

/**
 * Activa un lote: crea todas las SignatureRequests y envía notificaciones.
 * Cambia el estado de DRAFT a ACTIVE.
 */
export async function activateBatch(batchId: string): Promise<BatchResult> {
  try {
    // 1. Obtener usuario actual y validar permisos
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (!BATCH_ALLOWED_ROLES.includes(user.role)) {
      return { success: false, error: "Solo HR/Admin pueden activar lotes" };
    }

    // 2. Validar input
    const validation = activateBatchSchema.safeParse({ batchId });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message ?? "Datos inválidos" };
    }

    // 3. Obtener el lote y validar estado
    const batch = await prisma.signatureBatch.findFirst({
      where: {
        id: batchId,
        orgId: user.orgId,
      },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    if (batch.status !== "DRAFT") {
      return { success: false, error: "Solo se pueden activar lotes en estado DRAFT" };
    }

    // 4. Obtener el documento
    const document = await prisma.signableDocument.findUnique({
      where: { id: batch.documentId },
    });

    if (!document) {
      return { success: false, error: "Documento del lote no encontrado" };
    }

    // 5. Obtener los IDs de empleados que estaban pendientes (guardados al crear)
    // Como no guardamos los IDs originalmente, necesitamos obtenerlos de alguna forma
    // Por ahora, esto debería recibirse como parámetro o almacenarse
    // NOTA: En una implementación completa, deberíamos guardar los recipientEmployeeIds
    // en una tabla intermedia. Por ahora, recalculamos desde la UI.

    return { success: false, error: "Función pendiente: necesita recipientEmployeeIds" };
  } catch (error) {
    console.error("Error activando lote:", error);
    return { success: false, error: "Error interno al activar el lote" };
  }
}

/**
 * Activa un lote con los IDs de empleados especificados.
 * Esta versión es más robusta ya que recibe explícitamente los destinatarios.
 */
export async function activateBatchWithRecipients(
  batchId: string,
  recipientEmployeeIds: string[],
  additionalSignerEmployeeIds: string[] = [],
): Promise<BatchResult> {
  try {
    // 1. Obtener usuario actual y validar permisos
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (!BATCH_ALLOWED_ROLES.includes(user.role)) {
      return { success: false, error: "Solo HR/Admin pueden activar lotes" };
    }

    // 2. Obtener el lote y validar estado
    const batch = await prisma.signatureBatch.findFirst({
      where: {
        id: batchId,
        orgId: user.orgId,
      },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    if (batch.status !== "DRAFT") {
      return { success: false, error: "Solo se pueden activar lotes en estado DRAFT" };
    }

    // 3. Obtener el documento
    const document = await prisma.signableDocument.findUnique({
      where: { id: batch.documentId },
    });

    if (!document) {
      return { success: false, error: "Documento del lote no encontrado" };
    }

    // 4. Obtener empleados válidos
    const recipients = await getRecipientEmployees(user.orgId, recipientEmployeeIds);

    if (recipients.length === 0) {
      return { success: false, error: "No hay empleados válidos para el lote" };
    }

    const uniqueAdditionalSignerIds = Array.from(new Set(additionalSignerEmployeeIds ?? []));
    const additionalSigners = uniqueAdditionalSignerIds.length
      ? await getRecipientEmployees(user.orgId, uniqueAdditionalSignerIds)
      : [];

    if (additionalSigners.length < uniqueAdditionalSignerIds.length) {
      return { success: false, error: "Uno o más firmantes adicionales no son válidos" };
    }

    const additionalSignerMap = new Map(additionalSigners.map((signer) => [signer.id, signer]));

    // 5. Crear SignatureRequests para cada empleado (en una transacción)
    const updatedBatch = await prisma.$transaction(async (tx) => {
      let pendingCount = 0;

      for (const recipient of recipients) {
        const signersData: Array<{
          employeeId: string;
          order: number;
        }> = [];
        const addedSignerIds = new Set<string>();

        const pushSigner = (employeeId: string) => {
          if (addedSignerIds.has(employeeId)) {
            return;
          }
          addedSignerIds.add(employeeId);
          signersData.push({
            employeeId,
            order: signersData.length + 1,
          });
        };

        pushSigner(recipient.id);

        let secondSignerMissing = false;

        if (batch.requireDoubleSignature && batch.secondSignerRole) {
          const secondSigner = await resolveSecondSigner(
            recipient.id,
            batch.secondSignerRole,
            batch.secondSignerUserId ?? undefined,
            user.orgId,
          );

          if (secondSigner.missing || !secondSigner.userId || !secondSigner.employeeId) {
            secondSignerMissing = true;
          } else {
            pushSigner(secondSigner.employeeId);
          }
        }

        for (const signerId of uniqueAdditionalSignerIds) {
          const signer = additionalSignerMap.get(signerId);
          if (!signer) {
            continue;
          }
          pushSigner(signer.id);
        }

        const request = await tx.signatureRequest.create({
          data: {
            status: "PENDING",
            policy: "SES",
            expiresAt: batch.expiresAt,
            orgId: user.orgId,
            documentId: batch.documentId,
            batchId: batch.id,
            secondSignerMissing,
            signers: {
              create: signersData.map((signer) => ({
                order: signer.order,
                status: "PENDING",
                employeeId: signer.employeeId,
                signToken: randomBytes(32).toString("hex"),
              })),
            },
          },
        });

        pendingCount++;

        await createSignaturePendingNotification({
          orgId: user.orgId,
          userId: recipient.userId,
          documentTitle: document.title,
          requestId: request.id,
          expiresAt: batch.expiresAt,
        });
      }

      return await tx.signatureBatch.update({
        where: { id: batch.id },
        data: {
          status: "ACTIVE",
          totalRecipients: recipients.length,
          pendingCount,
          signedCount: 0,
          rejectedCount: 0,
        },
      });
    });

    return { success: true, data: updatedBatch };
  } catch (error) {
    console.error("Error activando lote:", error);
    return { success: false, error: "Error interno al activar el lote" };
  }
}

/**
 * Obtiene las estadísticas de un lote.
 */
export async function getBatchStats(batchId: string): Promise<BatchResult<BatchStats>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const batch = await prisma.signatureBatch.findFirst({
      where: {
        id: batchId,
        orgId: user.orgId,
      },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    const now = new Date();
    const daysUntilExpiration = Math.ceil((batch.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const progressPercentage =
      batch.totalRecipients > 0 ? Math.round((batch.signedCount / batch.totalRecipients) * 100) : 0;

    return {
      success: true,
      data: {
        batchId: batch.id,
        name: batch.name,
        status: batch.status,
        totalRecipients: batch.totalRecipients,
        signedCount: batch.signedCount,
        pendingCount: batch.pendingCount,
        rejectedCount: batch.rejectedCount,
        progressPercentage,
        expiresAt: batch.expiresAt,
        daysUntilExpiration,
      },
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas del lote:", error);
    return { success: false, error: "Error interno" };
  }
}

/**
 * Lista los lotes de firma de la organización.
 */
export async function listBatches(input?: ListBatchesInput): Promise<BatchResult<BatchStats[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (!BATCH_ALLOWED_ROLES.includes(user.role)) {
      return { success: false, error: "Solo HR/Admin pueden ver lotes" };
    }

    const validation = listBatchesSchema.safeParse(input ?? {});
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message ?? "Datos inválidos" };
    }

    const { status, page, pageSize } = validation.data;

    const where = {
      orgId: user.orgId,
      ...(status ? { status } : {}),
    };

    const batches = await prisma.signatureBatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const now = new Date();

    const stats: BatchStats[] = batches.map((batch) => {
      const daysUntilExpiration = Math.ceil((batch.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const progressPercentage =
        batch.totalRecipients > 0 ? Math.round((batch.signedCount / batch.totalRecipients) * 100) : 0;

      return {
        batchId: batch.id,
        name: batch.name,
        status: batch.status,
        totalRecipients: batch.totalRecipients,
        signedCount: batch.signedCount,
        pendingCount: batch.pendingCount,
        rejectedCount: batch.rejectedCount,
        progressPercentage,
        expiresAt: batch.expiresAt,
        daysUntilExpiration,
      };
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error listando lotes:", error);
    return { success: false, error: "Error interno" };
  }
}

/**
 * Obtiene el detalle completo de un lote con todas sus solicitudes.
 */
export async function getBatchDetail(batchId: string): Promise<BatchResult<BatchDetail>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const validation = getBatchDetailSchema.safeParse({ batchId });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message ?? "Datos inválidos" };
    }

    const batch = await prisma.signatureBatch.findFirst({
      where: {
        id: batchId,
        orgId: user.orgId,
      },
      include: {
        document: true,
        createdBy: true,
        requests: {
          include: {
            signers: {
              orderBy: { order: "asc" },
              include: {
                employee: true,
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    const now = new Date();
    const daysUntilExpiration = Math.ceil((batch.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const progressPercentage =
      batch.totalRecipients > 0 ? Math.round((batch.signedCount / batch.totalRecipients) * 100) : 0;

    const detail: BatchDetail = {
      batchId: batch.id,
      name: batch.name,
      description: batch.description,
      status: batch.status,
      documentTitle: batch.document.title,
      documentId: batch.documentId,
      requireDoubleSignature: batch.requireDoubleSignature,
      secondSignerRole: batch.secondSignerRole,
      totalRecipients: batch.totalRecipients,
      signedCount: batch.signedCount,
      pendingCount: batch.pendingCount,
      rejectedCount: batch.rejectedCount,
      progressPercentage,
      expiresAt: batch.expiresAt,
      daysUntilExpiration,
      createdAt: batch.createdAt,
      createdByName: batch.createdBy.name ?? batch.createdBy.email,
      requests: batch.requests.map((req) => ({
        id: req.id,
        status: req.status,
        employeeName: req.signers[0]?.employee
          ? `${req.signers[0].employee.firstName} ${req.signers[0].employee.lastName}`
          : "Desconocido",
        employeeId: req.signers[0]?.employeeId ?? "",
        secondSignerMissing: req.secondSignerMissing,
        signers: req.signers.map((s) => ({
          id: s.id,
          order: s.order,
          status: s.status,
          signerName: s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : "Firmante desconocido",
          signedAt: s.signedAt,
        })),
      })),
    };

    return { success: true, data: detail };
  } catch (error) {
    console.error("Error obteniendo detalle del lote:", error);
    return { success: false, error: "Error interno" };
  }
}

/**
 * Cancela un lote activo.
 * Marca todas las SignatureRequests pendientes como EXPIRED.
 */
export async function cancelBatch(batchId: string, reason?: string): Promise<BatchResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (!BATCH_ALLOWED_ROLES.includes(user.role)) {
      return { success: false, error: "Solo HR/Admin pueden cancelar lotes" };
    }

    const validation = cancelBatchSchema.safeParse({ batchId, reason });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message ?? "Datos inválidos" };
    }

    const batch = await prisma.signatureBatch.findFirst({
      where: {
        id: batchId,
        orgId: user.orgId,
      },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    if (batch.status !== "ACTIVE" && batch.status !== "DRAFT") {
      return { success: false, error: "Solo se pueden cancelar lotes en estado DRAFT o ACTIVE" };
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      // Marcar todas las requests pendientes como EXPIRED
      await tx.signatureRequest.updateMany({
        where: {
          batchId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        data: {
          status: "EXPIRED",
        },
      });

      // Marcar todos los firmantes pendientes como EXPIRED
      await tx.signer.updateMany({
        where: {
          request: {
            batchId,
          },
          status: "PENDING",
        },
        data: {
          status: "EXPIRED",
        },
      });

      const counts = await tx.signatureRequest.groupBy({
        by: ["status"],
        where: { batchId },
        _count: { status: true },
      });

      let signedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      for (const count of counts) {
        if (count.status === "COMPLETED") {
          signedCount = count._count.status;
        } else if (count.status === "PENDING" || count.status === "IN_PROGRESS") {
          pendingCount += count._count.status;
        } else if (count.status === "REJECTED" || count.status === "EXPIRED") {
          rejectedCount += count._count.status;
        }
      }

      const totalRecipients = signedCount + pendingCount + rejectedCount;

      return await tx.signatureBatch.update({
        where: { id: batchId },
        data: {
          status: "CANCELLED",
          signedCount,
          pendingCount,
          rejectedCount,
          totalRecipients,
        },
      });
    });

    return { success: true, data: updatedBatch };
  } catch (error) {
    console.error("Error cancelando lote:", error);
    return { success: false, error: "Error interno al cancelar el lote" };
  }
}

/**
 * Reenvía recordatorios a todos los firmantes pendientes del lote.
 */
export async function resendBatchReminders(batchId: string): Promise<BatchResult<{ sent: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (!BATCH_ALLOWED_ROLES.includes(user.role)) {
      return { success: false, error: "Solo HR/Admin pueden reenviar recordatorios" };
    }

    const validation = resendRemindersSchema.safeParse({ batchId });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message ?? "Datos inválidos" };
    }

    const batch = await prisma.signatureBatch.findFirst({
      where: {
        id: batchId,
        orgId: user.orgId,
      },
      include: {
        document: true,
        requests: {
          where: {
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          include: {
            signers: {
              where: {
                status: "PENDING",
              },
              include: {
                employee: {
                  select: {
                    user: {
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    if (batch.status !== "ACTIVE") {
      return { success: false, error: "Solo se pueden enviar recordatorios a lotes activos" };
    }

    // Enviar notificaciones a todos los firmantes pendientes
    let sent = 0;

    for (const request of batch.requests) {
      for (const signer of request.signers) {
        const userId = signer.employee?.user?.id;
        if (!userId) {
          continue;
        }

        await createSignaturePendingNotification({
          orgId: user.orgId,
          userId,
          documentTitle: batch.document.title,
          requestId: request.id,
          expiresAt: batch.expiresAt,
        });
        sent++;
      }
    }

    // Actualizar lastReminderAt
    await prisma.signatureBatch.update({
      where: { id: batchId },
      data: {
        lastReminderAt: new Date(),
      },
    });

    return { success: true, data: { sent } };
  } catch (error) {
    console.error("Error reenviando recordatorios:", error);
    return { success: false, error: "Error interno al enviar recordatorios" };
  }
}

/**
 * Actualiza las estadísticas de un lote recalculando desde las SignatureRequests.
 * Útil cuando se firma/rechaza una solicitud individual.
 */
export async function updateBatchStats(batchId: string): Promise<void> {
  const counts = await prisma.signatureRequest.groupBy({
    by: ["status"],
    where: { batchId },
    _count: { status: true },
  });

  let signedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const count of counts) {
    if (count.status === "COMPLETED") {
      signedCount = count._count.status;
    } else if (count.status === "PENDING" || count.status === "IN_PROGRESS") {
      pendingCount += count._count.status;
    } else if (count.status === "REJECTED" || count.status === "EXPIRED") {
      rejectedCount += count._count.status;
    }
  }

  const total = signedCount + pendingCount + rejectedCount;

  // Determinar si el lote debe completarse
  let newStatus: SignatureBatchStatus | undefined;

  if (pendingCount === 0 && total > 0) {
    // Todos completaron o rechazaron
    newStatus = "COMPLETED";
  }

  await prisma.signatureBatch.update({
    where: { id: batchId },
    data: {
      signedCount,
      pendingCount,
      rejectedCount,
      totalRecipients: total,
      ...(newStatus ? { status: newStatus } : {}),
    },
  });
}

/**
 * Obtiene documentos disponibles para crear lotes de firma.
 */
export async function getAvailableDocumentsForBatch(): Promise<
  BatchResult<Array<{ id: string; title: string; description: string | null }>>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const documents = await prisma.signableDocument.findMany({
      where: {
        orgId: user.orgId,
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: documents };
  } catch (error) {
    console.error("Error obteniendo documentos:", error);
    return { success: false, error: "Error interno" };
  }
}

/**
 * Obtiene empleados disponibles para seleccionar como destinatarios.
 */
export async function getAvailableEmployeesForBatch(filters?: { departmentId?: string; search?: string }): Promise<
  BatchResult<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      departmentName: string | null;
      departmentId: string | null;
      hasUser: boolean;
      userId: string | null;
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const where: {
      orgId: string;
      departmentId?: string;
      OR?: Array<{
        firstName?: { contains: string; mode: "insensitive" };
        lastName?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      orgId: user.orgId,
    };

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        department: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return {
      success: true,
      data: employees.map((emp) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        departmentName: emp.department?.name ?? null,
        departmentId: emp.department?.id ?? null,
        hasUser: emp.user !== null,
        userId: emp.user?.id ?? null,
      })),
    };
  } catch (error) {
    console.error("Error obteniendo empleados:", error);
    return { success: false, error: "Error interno" };
  }
}

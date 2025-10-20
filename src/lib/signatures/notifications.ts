import type { PtoNotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Crea una notificación de firma pendiente para un empleado
 */
export async function createSignaturePendingNotification(data: {
  orgId: string;
  userId: string;
  documentTitle: string;
  requestId: string;
  expiresAt: Date;
}) {
  const daysUntilExpiration = Math.ceil((data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return await prisma.ptoNotification.create({
    data: {
      type: "SIGNATURE_PENDING" as PtoNotificationType,
      title: "Nuevo documento para firmar",
      message: `Tienes un nuevo documento para firmar: "${data.documentTitle}". Vence en ${daysUntilExpiration} días.`,
      isRead: false,
      orgId: data.orgId,
      userId: data.userId,
      // No vinculamos con ptoRequestId ya que es una solicitud de firma
    },
  });
}

/**
 * Crea una notificación de firma completada
 */
export async function createSignatureCompletedNotification(data: {
  orgId: string;
  userId: string;
  documentTitle: string;
  requestId: string;
}) {
  return await prisma.ptoNotification.create({
    data: {
      type: "SIGNATURE_COMPLETED" as PtoNotificationType,
      title: "Documento firmado exitosamente",
      message: `Has firmado el documento "${data.documentTitle}" exitosamente.`,
      isRead: false,
      orgId: data.orgId,
      userId: data.userId,
    },
  });
}

/**
 * Crea una notificación de firma rechazada
 */
export async function createSignatureRejectedNotification(data: {
  orgId: string;
  userId: string;
  documentTitle: string;
  requestId: string;
  reason?: string;
}) {
  const reasonText = data.reason ? ` Motivo: ${data.reason}` : "";

  return await prisma.ptoNotification.create({
    data: {
      type: "SIGNATURE_REJECTED" as PtoNotificationType,
      title: "Documento rechazado",
      message: `Has rechazado el documento "${data.documentTitle}".${reasonText}`,
      isRead: false,
      orgId: data.orgId,
      userId: data.userId,
    },
  });
}

/**
 * Crea una notificación de firma expirada
 */
export async function createSignatureExpiredNotification(data: {
  orgId: string;
  userId: string;
  documentTitle: string;
  requestId: string;
}) {
  return await prisma.ptoNotification.create({
    data: {
      type: "SIGNATURE_EXPIRED" as PtoNotificationType,
      title: "Documento expirado sin firmar",
      message: `El documento "${data.documentTitle}" ha expirado sin ser firmado.`,
      isRead: false,
      orgId: data.orgId,
      userId: data.userId,
    },
  });
}

/**
 * Notifica a HR/Admins cuando un documento ha sido firmado por todos
 */
export async function notifyDocumentCompleted(data: {
  orgId: string;
  adminUserIds: string[];
  documentTitle: string;
  requestId: string;
}) {
  const notifications = data.adminUserIds.map((userId) =>
    prisma.ptoNotification.create({
      data: {
        type: "SIGNATURE_COMPLETED" as PtoNotificationType,
        title: "Documento completamente firmado",
        message: `El documento "${data.documentTitle}" ha sido firmado por todos los firmantes.`,
        isRead: false,
        orgId: data.orgId,
        userId,
      },
    }),
  );

  return await Promise.all(notifications);
}

/**
 * Notifica a HR/Admins cuando un documento ha sido rechazado
 */
export async function notifyDocumentRejected(data: {
  orgId: string;
  adminUserIds: string[];
  documentTitle: string;
  requestId: string;
  signerName: string;
  reason?: string;
}) {
  const reasonText = data.reason ? ` Motivo: ${data.reason}` : "";

  const notifications = data.adminUserIds.map((userId) =>
    prisma.ptoNotification.create({
      data: {
        type: "SIGNATURE_REJECTED" as PtoNotificationType,
        title: "Documento rechazado por firmante",
        message: `${data.signerName} ha rechazado el documento "${data.documentTitle}".${reasonText}`,
        isRead: false,
        orgId: data.orgId,
        userId,
      },
    }),
  );

  return await Promise.all(notifications);
}

/**
 * Marca las notificaciones de firma pendiente como leídas
 */
export async function markSignatureNotificationsAsRead(userId: string, requestId: string) {
  return await prisma.ptoNotification.updateMany({
    where: {
      userId,
      type: "SIGNATURE_PENDING",
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

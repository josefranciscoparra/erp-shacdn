"use server";

import type { PtoNotificationType } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Crea una notificación en el sistema
 */
export async function createNotification(
  userId: string,
  orgId: string,
  type: PtoNotificationType,
  title: string,
  message: string,
  ptoRequestId?: string,
  manualTimeEntryRequestId?: string,
) {
  try {
    const notification = await prisma.ptoNotification.create({
      data: {
        userId,
        orgId,
        type,
        title,
        message,
        ptoRequestId,
        manualTimeEntryRequestId,
        isRead: false,
      },
    });

    return notification;
  } catch (error) {
    console.error("Error al crear notificación:", error);
    throw error;
  }
}

/**
 * Obtiene las notificaciones del usuario autenticado
 */
export async function getMyNotifications(limit: number = 10) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    const notifications = await prisma.ptoNotification.findMany({
      where: {
        userId: session.user.id,
        orgId: user.orgId,
      },
      include: {
        ptoRequest: {
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            absenceType: {
              select: {
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt,
      ptoRequestId: n.ptoRequestId,
      manualTimeEntryRequestId: n.manualTimeEntryRequestId,
      ptoRequest: n.ptoRequest
        ? {
            id: n.ptoRequest.id,
            startDate: n.ptoRequest.startDate,
            endDate: n.ptoRequest.endDate,
            workingDays: Number(n.ptoRequest.workingDays),
            status: n.ptoRequest.status,
            employee: n.ptoRequest.employee,
            absenceType: n.ptoRequest.absenceType,
          }
        : null,
    }));
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    throw error;
  }
}

/**
 * Obtiene todas las notificaciones del usuario con paginación
 */
export async function getAllMyNotifications(page: number = 1, pageSize: number = 20, unreadOnly: boolean = false) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Usar orgId directamente de la sesión
    const orgId = session.user.orgId;

    if (!orgId) {
      throw new Error("Usuario sin organización asociada");
    }

    const baseWhere = {
      userId: session.user.id,
      orgId,
    } as const;

    // Calcular totales globales (todas y no leídas)
    const [allTotal, unreadTotal] = await Promise.all([
      prisma.ptoNotification.count({ where: baseWhere }),
      prisma.ptoNotification.count({ where: { ...baseWhere, isRead: false } }),
    ]);

    const where = unreadOnly ? { ...baseWhere, isRead: false } : baseWhere;

    // Obtener total para la vista solicitada
    const total = unreadOnly ? unreadTotal : allTotal;

    // Obtener notificaciones paginadas
    const notifications = await prisma.ptoNotification.findMany({
      where,
      include: {
        ptoRequest: {
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            absenceType: {
              select: {
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
        ptoRequestId: n.ptoRequestId,
        manualTimeEntryRequestId: n.manualTimeEntryRequestId,
        ptoRequest: n.ptoRequest
          ? {
              id: n.ptoRequest.id,
              startDate: n.ptoRequest.startDate,
              endDate: n.ptoRequest.endDate,
              workingDays: Number(n.ptoRequest.workingDays),
              status: n.ptoRequest.status,
              employee: n.ptoRequest.employee,
              absenceType: n.ptoRequest.absenceType,
            }
          : null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      totals: {
        all: allTotal,
        unread: unreadTotal,
      },
    };
  } catch (error) {
    console.error("Error al obtener todas las notificaciones:", error);
    throw error;
  }
}

/**
 * Obtiene el número de notificaciones no leídas
 */
export async function getUnreadNotificationsCount() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return 0;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true },
    });

    if (!user) {
      return 0;
    }

    const count = await prisma.ptoNotification.count({
      where: {
        userId: session.user.id,
        orgId: user.orgId,
        isRead: false,
      },
    });

    return count;
  } catch (error) {
    console.error("Error al contar notificaciones no leídas:", error);
    return 0;
  }
}

/**
 * Marca una notificación como leída
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    await prisma.ptoNotification.update({
      where: {
        id: notificationId,
        userId: session.user.id, // Seguridad: solo puede marcar sus propias notificaciones
      },
      data: {
        isRead: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error);
    throw error;
  }
}

/**
 * Marca todas las notificaciones del usuario como leídas
 */
export async function markAllNotificationsAsRead() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    await prisma.ptoNotification.updateMany({
      where: {
        userId: session.user.id,
        orgId: user.orgId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al marcar todas las notificaciones como leídas:", error);
    throw error;
  }
}

/**
 * Elimina una notificación
 */
export async function deleteNotification(notificationId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    await prisma.ptoNotification.delete({
      where: {
        id: notificationId,
        userId: session.user.id, // Seguridad: solo puede eliminar sus propias notificaciones
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar notificación:", error);
    throw error;
  }
}

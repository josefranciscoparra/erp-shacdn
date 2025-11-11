"use server";

import { auth } from "@/lib/auth";
import { sseManager } from "@/lib/chat/sse-manager";
import type { ConversationWithParticipants, MessageWithSender, PaginatedResponse } from "@/lib/chat/types";
import { isChatEnabled, normalizeUserIds, sanitizeMessageBody, validateMessageSize } from "@/lib/chat/utils";
import { prisma } from "@/lib/prisma";

/**
 * Verifica que el chat esté habilitado para la organización
 */
async function checkChatEnabled(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { chatEnabled: true, features: true },
  });

  if (!org) {
    throw new Error("Organización no encontrada");
  }

  const features = org.features as Record<string, unknown>;
  return isChatEnabled(org.chatEnabled, features);
}

/**
 * Obtiene o crea una conversación 1:1 con otro usuario
 */
export async function getOrCreateConversation(peerUserId: string): Promise<ConversationWithParticipants | null> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { id: currentUserId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      throw new Error("El módulo de chat no está habilitado para esta organización");
    }

    // No permitir conversación consigo mismo
    if (currentUserId === peerUserId) {
      throw new Error("No puedes crear una conversación contigo mismo");
    }

    // Verificar que el otro usuario existe y pertenece a la misma organización
    const peerUser = await prisma.user.findFirst({
      where: {
        id: peerUserId,
        orgId,
        active: true,
      },
      select: { id: true },
    });

    if (!peerUser) {
      throw new Error("Usuario no encontrado o no pertenece a la misma organización");
    }

    // Normalizar IDs para evitar duplicados
    const [userAId, userBId] = normalizeUserIds(currentUserId, peerUserId);

    // Intentar obtener conversación existente
    let conversation = await prisma.conversation.findUnique({
      where: {
        orgId_userAId_userBId: {
          orgId,
          userAId,
          userBId,
        },
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            employee: {
              select: {
                phone: true,
                mobilePhone: true,
                employmentContracts: {
                  where: { active: true },
                  take: 1,
                  orderBy: { startDate: "desc" },
                  select: {
                    department: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            employee: {
              select: {
                phone: true,
                mobilePhone: true,
                employmentContracts: {
                  where: { active: true },
                  take: 1,
                  orderBy: { startDate: "desc" },
                  select: {
                    department: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    // Si no existe, crearla
    conversation ??= await prisma.conversation.create({
      data: {
        orgId,
        userAId,
        userBId,
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            employee: {
              select: {
                phone: true,
                mobilePhone: true,
                employmentContracts: {
                  where: { active: true },
                  take: 1,
                  orderBy: { startDate: "desc" },
                  select: {
                    department: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            employee: {
              select: {
                phone: true,
                mobilePhone: true,
                employmentContracts: {
                  where: { active: true },
                  take: 1,
                  orderBy: { startDate: "desc" },
                  select: {
                    department: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    // Transformar para incluir campos adicionales en el formato esperado
    return {
      ...conversation,
      userA: {
        id: conversation.userA.id,
        name: conversation.userA.name,
        email: conversation.userA.email,
        image: conversation.userA.image,
        phone: conversation.userA.employee?.phone ?? null,
        mobilePhone: conversation.userA.employee?.mobilePhone ?? null,
        department: conversation.userA.employee?.employmentContracts[0]?.department?.name ?? null,
      },
      userB: {
        id: conversation.userB.id,
        name: conversation.userB.name,
        email: conversation.userB.email,
        image: conversation.userB.image,
        phone: conversation.userB.employee?.phone ?? null,
        mobilePhone: conversation.userB.employee?.mobilePhone ?? null,
        department: conversation.userB.employee?.employmentContracts[0]?.department?.name ?? null,
      },
    } as unknown as ConversationWithParticipants;
  } catch (error) {
    console.error("Error al obtener/crear conversación:", error);
    throw error;
  }
}

/**
 * Obtiene las conversaciones del usuario autenticado
 */
export async function getMyConversations(limit: number = 20): Promise<ConversationWithParticipants[]> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { id: userId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      return [];
    }

    // Obtener conversaciones donde el usuario es participante y NO están ocultas
    const conversations = await prisma.conversation.findMany({
      where: {
        orgId,
        isBlocked: false,
        OR: [
          { userAId: userId, hiddenByUserA: false },
          { userBId: userId, hiddenByUserB: false },
        ],
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            employee: {
              select: {
                phone: true,
                mobilePhone: true,
                employmentContracts: {
                  where: { active: true },
                  take: 1,
                  orderBy: { startDate: "desc" },
                  select: {
                    department: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            employee: {
              select: {
                phone: true,
                mobilePhone: true,
                employmentContracts: {
                  where: { active: true },
                  take: 1,
                  orderBy: { startDate: "desc" },
                  select: {
                    department: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
        messages: {
          where: { deletedAt: null }, // Solo mensajes no eliminados
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            body: true,
            createdAt: true,
            senderId: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: { deletedAt: null }, // Solo contar mensajes no eliminados
            },
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    });

    // Transformar para incluir lastMessage, unreadCount y campos adicionales
    return conversations.map((conv) => ({
      ...conv,
      userA: {
        id: conv.userA.id,
        name: conv.userA.name,
        email: conv.userA.email,
        image: conv.userA.image,
        phone: conv.userA.employee?.phone ?? null,
        mobilePhone: conv.userA.employee?.mobilePhone ?? null,
        department: conv.userA.employee?.employmentContracts[0]?.department?.name ?? null,
      },
      userB: {
        id: conv.userB.id,
        name: conv.userB.name,
        email: conv.userB.email,
        image: conv.userB.image,
        phone: conv.userB.employee?.phone ?? null,
        mobilePhone: conv.userB.employee?.mobilePhone ?? null,
        department: conv.userB.employee?.employmentContracts[0]?.department?.name ?? null,
      },
      lastMessage: conv.messages[0] ?? null,
      messages: undefined, // Eliminar messages del resultado
      // Mapear unreadCount según el usuario actual
      unreadCount:
        userId === conv.userAId
          ? conv.unreadCountUserA // Soy userA → mi contador
          : conv.unreadCountUserB, // Soy userB → mi contador
    })) as unknown as ConversationWithParticipants[];
  } catch (error) {
    console.error("Error al obtener conversaciones:", error);
    throw error;
  }
}

/**
 * Obtiene el total de mensajes no leídos para el usuario autenticado
 * Suma los contadores unreadCountUserA o unreadCountUserB según corresponda
 */
export async function getTotalUnreadCount(): Promise<number> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      return 0;
    }

    const { id: userId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      return 0;
    }

    // Obtener conversaciones del usuario y sumar unreadCount
    const conversations = await prisma.conversation.findMany({
      where: {
        orgId,
        OR: [{ userAId: userId }, { userBId: userId }],
        isBlocked: false,
      },
      select: {
        userAId: true,
        userBId: true,
        unreadCountUserA: true,
        unreadCountUserB: true,
      },
    });

    // Sumar los contadores según si soy userA o userB
    const totalUnread = conversations.reduce((acc, conv) => {
      const unread = userId === conv.userAId ? conv.unreadCountUserA : conv.unreadCountUserB;
      return acc + unread;
    }, 0);

    return totalUnread;
  } catch (error) {
    console.error("Error al obtener total de mensajes no leídos:", error);
    return 0;
  }
}

/**
 * Obtiene los mensajes de una conversación con paginación
 */
export async function getConversationMessages(
  conversationId: string,
  cursor?: string,
  limit: number = 50,
): Promise<PaginatedResponse<MessageWithSender>> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { id: userId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      throw new Error("El módulo de chat no está habilitado para esta organización");
    }

    // Verificar que el usuario es participante de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        orgId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new Error("Conversación no encontrada o no tienes acceso");
    }

    // Obtener mensajes con paginación por cursor
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Tomar uno extra para saber si hay más
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? (data[data.length - 1]?.createdAt.toISOString() ?? null) : null;

    return {
      data: data as unknown as MessageWithSender[],
      nextCursor,
      hasMore,
    };
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    throw error;
  }
}

/**
 * Envía un mensaje en una conversación
 */
export async function sendMessage(conversationId: string, body: string): Promise<MessageWithSender | null> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { id: userId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      throw new Error("El módulo de chat no está habilitado para esta organización");
    }

    // Sanitizar y validar mensaje
    const sanitizedBody = sanitizeMessageBody(body);

    if (!sanitizedBody) {
      throw new Error("El mensaje no puede estar vacío");
    }

    if (!validateMessageSize(sanitizedBody)) {
      throw new Error("El mensaje excede el tamaño máximo permitido (2KB)");
    }

    // Verificar que el usuario es participante de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        orgId,
        OR: [{ userAId: userId }, { userBId: userId }],
        isBlocked: false,
      },
      select: { id: true, userAId: true, userBId: true },
    });

    if (!conversation) {
      throw new Error("Conversación no encontrada o no tienes acceso");
    }

    // Determinar qué contador incrementar (el del receptor)
    const incrementField =
      userId === conversation.userAId
        ? "unreadCountUserB" // userA envía → incrementar para userB
        : "unreadCountUserA"; // userB envía → incrementar para userA

    // Determinar qué campo hidden resetear (el del receptor)
    const hiddenFieldToReset = userId === conversation.userAId ? "hiddenByUserB" : "hiddenByUserA";

    // Crear mensaje y actualizar conversación en una transacción
    const message = await prisma.$transaction(async (tx) => {
      // Crear mensaje
      const newMessage = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          orgId,
          body: sanitizedBody,
          status: "SENT",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      // Actualizar lastMessageAt, incrementar contador de no leídos y reactivar conversación si estaba oculta
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: newMessage.createdAt,
          [incrementField]: { increment: 1 },
          [hiddenFieldToReset]: false, // Reactivar conversación para el receptor si estaba oculta
        },
      });

      return newMessage;
    });

    return message as unknown as MessageWithSender;
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    throw error;
  }
}

/**
 * Marca una conversación como leída (resetea el contador de no leídos)
 */
export async function markConversationAsRead(conversationId: string): Promise<void> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { id: userId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      throw new Error("El módulo de chat no está habilitado para esta organización");
    }

    // Verificar que el usuario es participante de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        orgId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true, userAId: true, userBId: true },
    });

    if (!conversation) {
      throw new Error("Conversación no encontrada o no tienes acceso");
    }

    // Determinar qué contador resetear
    const resetField =
      userId === conversation.userAId
        ? "unreadCountUserA" // userA lee → resetear su contador
        : "unreadCountUserB"; // userB lee → resetear su contador

    // Resetear contador
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { [resetField]: 0 },
    });

    // Notificar via SSE a otros dispositivos del mismo usuario
    sseManager.broadcastToUser(userId, orgId, conversationId);
  } catch (error) {
    console.error("Error al marcar conversación como leída:", error);
    throw error;
  }
}

/**
 * Marca los mensajes de una conversación como leídos hasta un mensaje específico
 */
export async function markMessagesAsRead(conversationId: string, upToMessageId: string): Promise<number> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { id: userId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      throw new Error("El módulo de chat no está habilitado para esta organización");
    }

    // Verificar que el usuario es participante de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        orgId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new Error("Conversación no encontrada o no tienes acceso");
    }

    // Obtener la fecha del mensaje límite
    const limitMessage = await prisma.message.findUnique({
      where: { id: upToMessageId },
      select: { createdAt: true },
    });

    if (!limitMessage) {
      throw new Error("Mensaje no encontrado");
    }

    // Marcar como leídos todos los mensajes hasta ese mensaje (que NO sean del usuario actual)
    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        createdAt: { lte: limitMessage.createdAt },
        status: "SENT",
      },
      data: {
        status: "READ",
      },
    });

    return result.count;
  } catch (error) {
    console.error("Error al marcar mensajes como leídos:", error);
    throw error;
  }
}

/**
 * Busca usuarios de la organización para iniciar conversación
 */
export async function searchUsersForChat(
  query: string,
  limit: number = 10,
): Promise<Array<{ id: string; name: string; email: string; image: string | null }>> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { id: currentUserId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        orgId,
        active: true,
        id: { not: currentUserId }, // Excluir usuario actual
        OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      take: limit,
      orderBy: { name: "asc" },
    });

    return users;
  } catch (error) {
    console.error("Error al buscar usuarios:", error);
    throw error;
  }
}

/**
 * Obtiene la configuración de chat de la organización
 */
export async function getOrganizationChatConfig(): Promise<{ chatEnabled: boolean }> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { chatEnabled: true },
    });

    if (!org) {
      throw new Error("Organización no encontrada");
    }

    return { chatEnabled: org.chatEnabled };
  } catch (error) {
    console.error("Error al obtener configuración de chat:", error);
    throw error;
  }
}

/**
 * Actualiza el estado del chat para la organización
 */
export async function updateOrganizationChatStatus(enabled: boolean): Promise<void> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("NO_AUTH");
    }

    // Verificar permisos de administrador (solo SUPER_ADMIN)
    if (session.user.role !== "SUPER_ADMIN") {
      throw new Error("NO_PERMISSION");
    }

    await prisma.organization.update({
      where: { id: session.user.orgId },
      data: { chatEnabled: enabled },
    });
  } catch (error) {
    console.error("[updateOrganizationChatStatus] Error:", error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de uso del chat
 */
export async function getChatStats(): Promise<{
  totalConversations: number;
  totalMessages: number;
  activeConversations: number;
  messagesPercentage: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { orgId } = session.user;

    // Total de conversaciones
    const totalConversations = await prisma.conversation.count({
      where: { orgId },
    });

    // Total de mensajes
    const totalMessages = await prisma.message.count({
      where: { orgId, deletedAt: null },
    });

    // Conversaciones activas (con mensajes en los últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeConversations = await prisma.conversation.count({
      where: {
        orgId,
        lastMessageAt: { gte: sevenDaysAgo },
      },
    });

    // Calcular porcentaje de usuarios activos
    const totalUsers = await prisma.user.count({
      where: { orgId, active: true },
    });

    const usersWithMessages = await prisma.message.groupBy({
      by: ["senderId"],
      where: { orgId, deletedAt: null },
    });

    const messagesPercentage = totalUsers > 0 ? ((usersWithMessages.length / totalUsers) * 100).toFixed(1) : "0";

    return {
      totalConversations,
      totalMessages,
      activeConversations,
      messagesPercentage,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de chat:", error);
    throw error;
  }
}

/**
 * Vacía todos los mensajes de una conversación (soft delete)
 */
export async function clearConversationMessages(conversationId: string): Promise<{ success: boolean }> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { id: userId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      throw new Error("El módulo de chat no está habilitado para esta organización");
    }

    // Verificar que el usuario es participante de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        orgId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true, userAId: true, userBId: true },
    });

    if (!conversation) {
      throw new Error("Conversación no encontrada o no tienes acceso");
    }

    // Soft delete de todos los mensajes y resetear contadores en una transacción
    await prisma.$transaction(async (tx) => {
      // Soft delete de los mensajes
      await tx.message.updateMany({
        where: {
          conversationId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // Resetear contadores de no leídos
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          unreadCountUserA: 0,
          unreadCountUserB: 0,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error al vaciar conversación:", error);
    throw error;
  }
}

/**
 * Oculta una conversación para el usuario actual
 */
export async function hideConversation(conversationId: string): Promise<{ success: boolean; unreadCount: number }> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("No autenticado");
    }

    const { id: userId, orgId } = session.user;

    // Verificar feature flag
    const chatEnabled = await checkChatEnabled(orgId);
    if (!chatEnabled) {
      throw new Error("El módulo de chat no está habilitado para esta organización");
    }

    // Verificar que el usuario es participante de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        orgId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true, userAId: true, userBId: true, unreadCountUserA: true, unreadCountUserB: true },
    });

    if (!conversation) {
      throw new Error("Conversación no encontrada o no tienes acceso");
    }

    // Determinar qué campo actualizar y cuántos no leídos había
    const isUserA = userId === conversation.userAId;
    const unreadCount = isUserA ? conversation.unreadCountUserA : conversation.unreadCountUserB;
    const hiddenField = isUserA ? "hiddenByUserA" : "hiddenByUserB";
    const unreadField = isUserA ? "unreadCountUserA" : "unreadCountUserB";

    // Ocultar conversación y resetear contador en una transacción
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        [hiddenField]: true,
        [unreadField]: 0, // Resetear contador al ocultar
      },
    });

    return { success: true, unreadCount };
  } catch (error) {
    console.error("Error al ocultar conversación:", error);
    throw error;
  }
}

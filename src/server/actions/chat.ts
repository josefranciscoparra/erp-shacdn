"use server";

import { auth } from "@/lib/auth";
import { isChatEnabled, normalizeUserIds, sanitizeMessageBody, validateMessageSize } from "@/lib/chat/utils";
import { prisma } from "@/lib/prisma";

import type {
  ConversationWithParticipants,
  MessageWithSender,
  PaginatedResponse,
} from "@/lib/chat/types";

/**
 * Verifica que el feature flag de chat esté habilitado
 */
async function checkChatEnabled(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { features: true },
  });

  if (!org) {
    throw new Error("Organización no encontrada");
  }

  const features = org.features as Record<string, unknown>;
  return isChatEnabled(features);
}

/**
 * Obtiene o crea una conversación 1:1 con otro usuario
 */
export async function getOrCreateConversation(
  peerUserId: string
): Promise<ConversationWithParticipants | null> {
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
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    // Si no existe, crearla
    if (!conversation) {
      conversation = await prisma.conversation.create({
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
            },
          },
          userB: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      });
    }

    return conversation as unknown as ConversationWithParticipants;
  } catch (error) {
    console.error("Error al obtener/crear conversación:", error);
    throw error;
  }
}

/**
 * Obtiene las conversaciones del usuario autenticado
 */
export async function getMyConversations(
  limit: number = 20
): Promise<ConversationWithParticipants[]> {
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

    // Obtener conversaciones donde el usuario es participante
    const conversations = await prisma.conversation.findMany({
      where: {
        orgId,
        OR: [{ userAId: userId }, { userBId: userId }],
        isBlocked: false,
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        messages: {
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
          select: { messages: true },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    });

    // Transformar para incluir lastMessage
    return conversations.map((conv) => ({
      ...conv,
      lastMessage: conv.messages[0] ?? null,
      messages: undefined, // Eliminar messages del resultado
    })) as unknown as ConversationWithParticipants[];
  } catch (error) {
    console.error("Error al obtener conversaciones:", error);
    throw error;
  }
}

/**
 * Obtiene los mensajes de una conversación con paginación
 */
export async function getConversationMessages(
  conversationId: string,
  cursor?: string,
  limit: number = 50
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
    const nextCursor = hasMore
      ? data[data.length - 1]?.createdAt.toISOString() ?? null
      : null;

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
export async function sendMessage(
  conversationId: string,
  body: string
): Promise<MessageWithSender | null> {
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

    // Crear mensaje y actualizar lastMessageAt en una transacción
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

      // Actualizar lastMessageAt de la conversación
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: newMessage.createdAt },
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
 * Marca los mensajes de una conversación como leídos hasta un mensaje específico
 */
export async function markMessagesAsRead(
  conversationId: string,
  upToMessageId: string
): Promise<number> {
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
  limit: number = 10
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
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
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

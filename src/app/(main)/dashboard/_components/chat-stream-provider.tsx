"use client";

import { useSession } from "next-auth/react";

import { useChatStream } from "@/hooks/use-chat-stream";
import type { MessageWithSender } from "@/lib/chat/types";
import { useChatUnreadStore } from "@/stores/chat-unread-store";

interface ChatStreamProviderProps {
  enabled: boolean; // Si el chat está habilitado para esta organización
}

/**
 * Componente que mantiene la conexión SSE global de chat
 * Montado en el layout del dashboard para estar siempre activo
 *
 * - Recibe eventos SSE de mensajes nuevos
 * - Actualiza el store global de contador no leídos
 * - NO renderiza nada (solo lógica)
 */
export function ChatStreamProvider({ enabled }: ChatStreamProviderProps) {
  const { data: session } = useSession();
  const { incrementUnreadCount, notifyNewMessage, notifyConversationRead } = useChatUnreadStore();

  // Conectar al stream SSE solo si el chat está habilitado
  useChatStream({
    enabled,
    onMessage: (message: MessageWithSender) => {
      const currentUserId = session?.user?.id;
      const isMyMessage = message.senderId === currentUserId;

      console.log("[ChatStreamProvider] Mensaje SSE:", {
        messageId: message.id,
        senderId: message.senderId,
        currentUserId,
        isMyMessage,
      });

      // SIEMPRE notificar al chat-container (para actualizar la lista)
      notifyNewMessage(message);

      // Solo incrementar contador si NO es mi mensaje
      if (!isMyMessage) {
        console.log("[ChatStreamProvider] Incrementando contador (mensaje de otro usuario)");
        incrementUnreadCount();
      } else {
        console.log("[ChatStreamProvider] NO incrementando contador (es mi mensaje)");
      }
    },
    onConversationRead: ({ conversationId }) => {
      console.log("[ChatStreamProvider] Conversación marcada como leída:", conversationId);

      // Notificar a otros componentes para que actualicen
      notifyConversationRead(conversationId);
    },
    onError: (error) => {
      console.error("[ChatStreamProvider] Error en SSE:", error);
    },
  });

  // Este componente no renderiza nada, solo mantiene la conexión SSE
  return null;
}

"use client";

import { useEffect } from "react";

import { useSession } from "next-auth/react";

import { useChatStream } from "@/hooks/use-chat-stream";
import { useChatUnreadStore } from "@/stores/chat-unread-store";

interface GlobalChatIndicatorProps {
  enabled: boolean;
}

/**
 * Componente ligero que SOLO actualiza el contador global del sidebar
 * El chat-container mantiene su propio SSE para actualizar conversaciones
 *
 * Este componente:
 * - Escucha mensajes nuevos via SSE
 * - Incrementa/decrementa el contador global
 * - NO renderiza nada en pantalla
 */
export function GlobalChatIndicator({ enabled }: GlobalChatIndicatorProps) {
  const { data: session } = useSession();
  const { incrementUnreadCount, setTotalUnreadCount } = useChatUnreadStore();

  useChatStream({
    enabled,
    onMessage: (message) => {
      // Solo incrementar si NO es mi propio mensaje
      const isMyMessage = message.senderId === session?.user?.id;
      if (!isMyMessage) {
        incrementUnreadCount();
      }
    },
    onConversationRead: () => {
      // Cuando se lee una conversación, recalcular el total
      // El chat-container sincronizará el valor correcto
      // Aquí solo decrementamos para dar feedback inmediato
      setTotalUnreadCount(0); // Reset temporal, el chat-container lo actualizará
    },
  });

  return null;
}

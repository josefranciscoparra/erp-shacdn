"use client";

import { useEffect, useRef } from "react";

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
 * Flujo de inicialización (anti race-conditions):
 * 1. Fetch /api/chat/unread-count para obtener el total inicial
 * 2. setInitialUnreadCount en el store (solo si !initialized)
 * 3. Conectar SSE para recibir actualizaciones en tiempo real
 *
 * - Recibe eventos SSE de mensajes nuevos
 * - Actualiza el store global de contador no leídos
 * - NO renderiza nada (solo lógica)
 */
export function ChatStreamProvider({ enabled }: ChatStreamProviderProps) {
  const { data: session } = useSession();
  const { setInitialUnreadCount, incrementUnreadCount, notifyNewMessage, notifyConversationRead } =
    useChatUnreadStore();
  const initializedRef = useRef(false);

  // 1. Inicializar contador al montar (fetch primero, SSE después)
  useEffect(() => {
    if (!enabled || initializedRef.current) return;

    const initializeUnreadCount = async () => {
      try {
        console.log("[ChatStreamProvider] Inicializando contador global...");

        const res = await fetch("/api/chat/unread-count", { cache: "no-store" });
        const data = await res.json();

        if (data.totalUnread !== undefined) {
          console.log("[ChatStreamProvider] Contador inicial:", data.totalUnread);
          setInitialUnreadCount(data.totalUnread);
          initializedRef.current = true;
        }
      } catch (error) {
        console.error("[ChatStreamProvider] Error al inicializar contador:", error);
        // Fallback: inicializar en 0
        setInitialUnreadCount(0);
        initializedRef.current = true;
      }
    };

    initializeUnreadCount();
  }, [enabled, setInitialUnreadCount]);

  // 2. Conectar SSE (solo si está habilitado)
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
        incrementUnreadCount(1);
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

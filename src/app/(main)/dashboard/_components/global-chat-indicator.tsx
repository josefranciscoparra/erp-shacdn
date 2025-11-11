"use client";

import { useEffect } from "react";

import { useChatUnreadStore } from "@/stores/chat-unread-store";

interface GlobalChatIndicatorProps {
  enabled: boolean;
}

/**
 * Mantiene sincronizado el contador global cuando el módulo de chat está deshabilitado.
 * La lógica SSE vive en ChatStreamProvider, por lo que este componente sólo se encarga
 * de limpiar el estado cuando corresponde.
 */
export function GlobalChatIndicator({ enabled }: GlobalChatIndicatorProps) {
  const resetUnreadCount = useChatUnreadStore((state) => state.resetUnreadCount);

  useEffect(() => {
    if (!enabled) {
      resetUnreadCount();
    }
  }, [enabled, resetUnreadCount]);

  return null;
}

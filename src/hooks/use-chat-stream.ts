"use client";

import { useEffect, useRef, useState } from "react";

import type { MessageWithSender, SSEEvent } from "@/lib/chat/types";

interface UseChatStreamOptions {
  enabled?: boolean;
  onMessage?: (message: MessageWithSender) => void;
  onRead?: (data: { conversationId: string; messageId: string; readBy: string }) => void;
  onConversationRead?: (data: { conversationId: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook para conectarse al stream SSE de chat con fallback a polling
 */
export function useChatStream(options: UseChatStreamOptions = {}) {
  const { enabled = true, onMessage, onRead, onConversationRead, onError } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [transport, setTransport] = useState<"sse" | "polling">("sse");

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const maxReconnectAttempts = 5;

  // Limpiar recursos
  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsConnected(false);
  };

  // Conectar via SSE
  const connectSSE = () => {
    cleanup();

    try {
      const eventSource = new EventSource("/api/chat/stream", {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setReconnectAttempts(0);
        setTransport("sse");
      };

      eventSource.addEventListener("message", (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);

          // Guardar last event ID para reconexión
          if (event.lastEventId) {
            lastEventIdRef.current = event.lastEventId;
          }

          // Procesar eventos
          switch (data.type) {
            case "message":
              onMessage?.(data.data as MessageWithSender);
              break;
            case "read":
              onRead?.(data.data as { conversationId: string; messageId: string; readBy: string });
              break;
            case "conversation_read":
              onConversationRead?.(data.data as { conversationId: string });
              break;
            case "system":
              break;
            default:
              break;
          }
        } catch {
          // Error procesando mensaje
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);

        eventSource.close();

        // Intentar reconectar con backoff exponencial
        const attempts = reconnectAttempts + 1;
        setReconnectAttempts(attempts);

        if (attempts >= maxReconnectAttempts) {
          setTransport("polling");
          startPolling();
          return;
        }

        const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30s

        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, delay);
      };
    } catch (error) {
      onError?.(error as Error);

      // Fallback a polling
      setTransport("polling");
      startPolling();
    }
  };

  // Fallback: polling cada 10 segundos
  const startPolling = () => {
    cleanup();

    setTransport("polling");
    setIsConnected(true);

    let lastCheck = new Date().toISOString();

    const poll = async () => {
      try {
        // Aquí podrías hacer una petición GET para obtener mensajes nuevos desde lastCheck
        // Por simplicidad, este es un placeholder

        // TODO: Implementar endpoint de polling si es necesario
        // const response = await fetch(`/api/chat/messages/since?timestamp=${lastCheck}`);
        // const { messages } = await response.json();
        // messages.forEach(onMessage);

        lastCheck = new Date().toISOString();
      } catch {
        // Error en polling
      }
    };

    // Poll inicial
    poll();

    // Configurar intervalo
    pollingIntervalRef.current = setInterval(poll, 10000);
  };

  // Conectar cuando se monta el componente
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Intentar SSE primero
    connectSSE();

    // Cleanup al desmontar
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    isConnected,
    transport,
    reconnectAttempts,
  };
}

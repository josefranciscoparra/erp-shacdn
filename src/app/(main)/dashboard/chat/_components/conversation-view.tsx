"use client";

import { memo, useEffect, useRef, useState } from "react";

import { AlertCircle, ArrowDown, ArrowLeft, Check, CheckCheck, Loader2, RefreshCw, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatStream } from "@/hooks/use-chat-stream";
import { getUserAvatarUrl, hasAvatar } from "@/lib/chat/avatar-utils";
import type { ConversationWithParticipants, MessageWithSender } from "@/lib/chat/types";
import { getOtherParticipant } from "@/lib/chat/utils";
import { cn } from "@/lib/utils";

// Tipo extendido con estado local para optimistic UI
type LocalMessageStatus = "sending" | "sent" | "failed";
type MessageWithLocalState = MessageWithSender & {
  localStatus?: LocalMessageStatus;
  localId?: string; // ID temporal para mensajes que aún no tienen ID del servidor
};

interface ConversationViewProps {
  conversation: ConversationWithParticipants;
  onBack?: () => void;
  onMessageSent?: (message: MessageWithSender) => void;
}

function ConversationViewComponent({ conversation, onBack, onMessageSent }: ConversationViewProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<MessageWithLocalState[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = getOtherParticipant(conversation, session?.user?.id ?? "");

  // Escuchar mensajes en tiempo real por SSE
  useChatStream({
    enabled: true,
    onMessage: (message: MessageWithSender) => {
      // Solo añadir mensajes de esta conversación
      if (message.conversationId === conversation.id) {
        setMessages((prev) => {
          // Evitar duplicados (por ID real del servidor)
          const exists = prev.some((m) => m.id === message.id);
          if (exists) {
            return prev;
          }
          // Añadir mensaje con estado "sent"
          return [...prev, { ...message, localStatus: "sent" as LocalMessageStatus }];
        });
      }
    },
  });

  // Función para hacer scroll al fondo
  const scrollToBottom = (smooth = false) => {
    // Usar scrollIntoView en el marcador del final (mejor para Safari)
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
    setIsAtBottom(true);
    setShowScrollButton(false);
  };

  // Detectar posición de scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        const { scrollTop, scrollHeight, clientHeight } = viewport;
        const threshold = 100; // píxeles de margen
        const atBottom = scrollHeight - scrollTop - clientHeight < threshold;

        // Solo mostrar botón si hay overflow Y no estamos al fondo
        const hasOverflow = scrollHeight > clientHeight;

        setIsAtBottom(atBottom);
        setShowScrollButton(hasOverflow && !atBottom);
      }
    }
  };

  // Cargar mensajes de la conversación
  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      setMessages([]);
      setCursor(null);
      setHasMore(false);

      try {
        const response = await fetch(`/api/chat/conversations/${conversation.id}/messages?limit=50`);
        const data = await response.json();

        if (data.data) {
          // Invertir orden: más antiguos primero y añadir estado "sent"
          const messagesWithStatus = data.data.reverse().map((m: MessageWithSender) => ({
            ...m,
            localStatus: "sent" as LocalMessageStatus,
          }));
          setMessages(messagesWithStatus);
          setHasMore(data.hasMore ?? false);
          setCursor(data.nextCursor);

          // Safari necesita múltiples intentos para hacer scroll correctamente
          requestAnimationFrame(() => scrollToBottom());
          setTimeout(() => scrollToBottom(), 50);
          setTimeout(() => scrollToBottom(), 150);
        }
      } catch (error) {
        console.error("Error cargando mensajes:", error);
        toast.error("Error al cargar mensajes");
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [conversation.id]);

  // Auto-scroll al último mensaje solo si estamos en el fondo
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  // Agregar listener de scroll
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.addEventListener("scroll", handleScroll);
        return () => {
          viewport.removeEventListener("scroll", handleScroll);
        };
      }
    }
  }, []);

  // Enviar mensaje con optimistic UI
  const handleSend = async (retryMessage?: { body: string; localId: string }) => {
    const body = retryMessage ? retryMessage.body : newMessage.trim();
    const localId = retryMessage ? retryMessage.localId : `temp-${Date.now()}`;

    if (!body || sending) {
      return;
    }

    // Limpiar input solo si es mensaje nuevo (no retry)
    if (!retryMessage) {
      setNewMessage("");
    }
    setSending(true);

    // Crear mensaje optimista
    const optimisticMessage: MessageWithLocalState = {
      id: localId,
      localId,
      localStatus: "sending",
      body,
      status: "SENT",
      createdAt: new Date(),
      editedAt: null,
      deletedAt: null,
      conversationId: conversation.id,
      senderId: session?.user?.id ?? "",
      sender: {
        id: session?.user?.id ?? "",
        name: session?.user?.name ?? "",
        email: session?.user?.email ?? "",
        image: session?.user?.image ?? null,
      },
    };

    // Si es retry, reemplazar mensaje fallido
    if (retryMessage) {
      setMessages((prev) => prev.map((m) => (m.localId === localId ? optimisticMessage : m)));
    } else {
      // Si es nuevo, añadir al final
      setMessages((prev) => [...prev, optimisticMessage]);
    }

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          body,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Error al enviar mensaje");
      }

      const { message } = await response.json();

      // Reemplazar mensaje optimista con el real del servidor
      setMessages((prev) =>
        prev.map((m) => (m.localId === localId ? { ...message, localStatus: "sent" as LocalMessageStatus } : m)),
      );

      // Notificar al padre para actualizar lista de conversaciones
      onMessageSent?.(message);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      toast.error(error instanceof Error ? error.message : "Error al enviar mensaje");

      // Marcar mensaje como fallido
      setMessages((prev) =>
        prev.map((m) => (m.localId === localId ? { ...m, localStatus: "failed" as LocalMessageStatus } : m)),
      );
    } finally {
      setSending(false);
    }
  };

  // Reintentar envío de mensaje fallido
  const handleRetry = (message: MessageWithLocalState) => {
    if (message.localId) {
      handleSend({ body: message.body, localId: message.localId });
    }
  };

  // Cargar más mensajes antiguos
  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !cursor) {
      return;
    }

    setLoadingMore(true);

    try {
      const response = await fetch(`/api/chat/conversations/${conversation.id}/messages?limit=50&cursor=${cursor}`);
      const data = await response.json();

      if (data.data) {
        // Guardar posición de scroll actual
        if (scrollRef.current) {
          const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
          if (viewport) {
            const oldScrollHeight = viewport.scrollHeight;

            // Invertir orden: más antiguos primero, añadir estado "sent" y prepend
            const messagesWithStatus = data.data.reverse().map((m: MessageWithSender) => ({
              ...m,
              localStatus: "sent" as LocalMessageStatus,
            }));
            setMessages((prev) => [...messagesWithStatus, ...prev]);
            setHasMore(data.hasMore ?? false);
            setCursor(data.nextCursor);

            // Mantener posición de scroll después de añadir mensajes
            setTimeout(() => {
              if (viewport) {
                const newScrollHeight = viewport.scrollHeight;
                viewport.scrollTop = newScrollHeight - oldScrollHeight;
              }
            }, 0);
          }
        }
      }
    } catch (error) {
      console.error("Error cargando más mensajes:", error);
      toast.error("Error al cargar mensajes anteriores");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4">
        {/* Botón Volver (solo móvil) */}
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="@3xl/main:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <Avatar key={otherUser.id}>
          {hasAvatar(otherUser.image) && <AvatarImage src={getUserAvatarUrl(otherUser.id)} alt={otherUser.name} />}
          <AvatarFallback>
            {otherUser.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{otherUser.name}</p>
          <p className="text-muted-foreground text-xs">{otherUser.email}</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          {messages.length === 0 && !loading ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-center">
              <p>No hay mensajes aún. ¡Envía el primero!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Botón cargar más mensajes */}
              {hasMore && (
                <div className="flex justify-center pb-4">
                  <Button variant="outline" size="sm" onClick={loadMoreMessages} disabled={loadingMore}>
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      "Cargar mensajes anteriores"
                    )}
                  </Button>
                </div>
              )}

              {messages.map((message) => {
                const isOwn = message.senderId === session?.user?.id;
                const status = message.localStatus ?? "sent";

                return (
                  <div
                    key={message.localId ?? message.id}
                    className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}
                  >
                    <Avatar className="h-8 w-8" key={message.sender.id}>
                      {hasAvatar(message.sender.image) && (
                        <AvatarImage src={getUserAvatarUrl(message.sender.id)} alt={message.sender.name} />
                      )}
                      <AvatarFallback>
                        {message.sender.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-4 py-2",
                        isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                        status === "failed" && "opacity-60",
                      )}
                    >
                      <p className="text-sm break-words">{message.body}</p>
                      <div
                        className={cn(
                          "mt-1 flex items-center justify-between gap-2 text-xs",
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          {new Date(message.createdAt).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}

                          {/* Iconos de estado (solo para mensajes propios) */}
                          {isOwn && (
                            <>
                              {status === "sending" && <Loader2 className="h-3 w-3 animate-spin" />}
                              {status === "sent" && <Check className="h-3 w-3" />}
                            </>
                          )}
                        </span>

                        {/* Botón reintentar inline (solo para mensajes fallidos propios) */}
                        {isOwn && status === "failed" && (
                          <button
                            onClick={() => handleRetry(message)}
                            className="hover:bg-primary-foreground/10 flex items-center gap-1 rounded px-2 py-0.5 transition-colors"
                          >
                            <AlertCircle className="h-3 w-3 text-red-500" />
                            <span className="text-xs">Reintentar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Marcador para scroll al fondo */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Botón flotante para ir abajo */}
        {showScrollButton && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-4 bottom-4 h-10 w-10 rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}

        {/* Overlay de carga */}
        {loading && (
          <div className="bg-background/80 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Cargando conversación...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input de nuevo mensaje */}
      <div className="flex gap-2 border-t p-4">
        <Input
          placeholder="Escribe un mensaje..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Memoizar el componente para evitar re-renders innecesarios
export const ConversationView = memo(ConversationViewComponent);

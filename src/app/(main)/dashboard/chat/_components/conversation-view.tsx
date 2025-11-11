"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { AlertCircle, ArrowDown, ArrowLeft, Check, Loader2, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserAvatarUrl, hasAvatar } from "@/lib/chat/avatar-utils";
import {
  getCachedConversationMessages,
  setCachedConversationMessages,
  withLocalState,
  type LocalMessageStatus,
  type MessageWithLocalState,
} from "@/lib/chat/conversation-cache";
import type { ConversationWithParticipants, MessageWithSender } from "@/lib/chat/types";
import { getOtherParticipant } from "@/lib/chat/utils";
import { cn } from "@/lib/utils";
import { markConversationAsRead } from "@/server/actions/chat";
import { useChatUnreadStore } from "@/stores/chat-unread-store";

import { UserInfoPopover } from "./user-info-popover";

interface ConversationViewProps {
  conversation: ConversationWithParticipants;
  onBack?: () => void;
  onMessageSent?: (message: MessageWithSender) => void;
  onConversationCleared?: () => void;
}

function ConversationViewComponent({
  conversation,
  onBack,
  onMessageSent,
  onConversationCleared,
}: ConversationViewProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<MessageWithLocalState[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const otherUser = getOtherParticipant(conversation, session?.user?.id ?? "");

  type MessagesUpdater = MessageWithLocalState[] | ((prev: MessageWithLocalState[]) => MessageWithLocalState[]);

  const syncMessages = useCallback(
    (updater: MessagesUpdater) => {
      setMessages((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (value: MessageWithLocalState[]) => MessageWithLocalState[])(prev)
            : updater;

        setCachedConversationMessages(conversation.id, next);
        return next;
      });
    },
    [conversation.id],
  );

  const lastMessage = useChatUnreadStore((state) => state.lastMessage);

  // Escuchar mensajes en tiempo real provenientes del store global
  useEffect(() => {
    if (!lastMessage || lastMessage.conversationId !== conversation.id) {
      return;
    }

    syncMessages((prev) => {
      const exists = prev.some((m) => m.id === lastMessage.id);
      if (exists) {
        return prev;
      }
      return [...prev, { ...lastMessage, localStatus: "sent" as LocalMessageStatus }];
    });
  }, [conversation.id, lastMessage, syncMessages]);

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
      const container = scrollRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const threshold = 100; // píxeles de margen
      const atBottom = scrollHeight - scrollTop - clientHeight < threshold;

      // Solo mostrar botón si hay overflow Y no estamos al fondo
      const hasOverflow = scrollHeight > clientHeight;

      setIsAtBottom(atBottom);
      setShowScrollButton(hasOverflow && !atBottom);
    }
  };

  // Detectar cuando la conversación cambia o se vacía
  const conversationChangeKey = useRef(`${conversation.id}-${conversation.lastMessage?.id ?? "empty"}`);

  useLayoutEffect(() => {
    const newKey = `${conversation.id}-${conversation.lastMessage?.id ?? "empty"}`;
    const conversationChanged = conversationChangeKey.current !== newKey;
    conversationChangeKey.current = newKey;

    // Si el lastMessage es null y había mensajes, significa que se vació el chat
    if (!conversation.lastMessage && messages.length > 0) {
      setMessages([]);
      setCachedConversationMessages(conversation.id, []);
      return;
    }

    // Si cambió la conversación, cargar desde caché si existe
    if (conversationChanged) {
      const cached = getCachedConversationMessages(conversation.id);
      setCursor(null);
      setHasMore(false);

      if (cached) {
        setMessages(cached);
        setLoading(false);
        setIsRefreshing(true);
        return;
      }

      setMessages([]);
      setLoading(true);
      setIsRefreshing(false);
    }
  }, [conversation.id, conversation.lastMessage, messages.length]);

  // Cargar mensajes de la conversación
  useEffect(() => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    async function loadMessages(signal: AbortSignal) {
      try {
        const response = await fetch(`/api/chat/conversations/${conversation.id}/messages?limit=50`, {
          signal,
        });
        const data = await response.json();

        if (!signal.aborted && data.data) {
          // Invertir orden: más antiguos primero y añadir estado "sent"
          const messagesWithStatus = withLocalState([...data.data].reverse());
          syncMessages(messagesWithStatus);
          setHasMore(data.hasMore ?? false);
          setCursor(data.nextCursor ?? null);

          // Safari necesita múltiples intentos para hacer scroll correctamente
          requestAnimationFrame(() => scrollToBottom());
          setTimeout(() => scrollToBottom(), 50);
          setTimeout(() => scrollToBottom(), 150);
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error("Error cargando mensajes:", error);
          toast.error("Error al cargar mensajes");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    loadMessages(controller.signal);

    return () => {
      controller.abort();
    };
  }, [conversation.id, syncMessages]);

  // Auto-scroll al último mensaje solo si estamos en el fondo
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  // Agregar listener de scroll
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      container.addEventListener("scroll", handleScroll);
      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    }
  }, []);

  // Marcar conversación como leída al abrir
  useEffect(() => {
    if (conversation?.id && (conversation.unreadCount ?? 0) > 0) {
      // Llamar a markConversationAsRead (envía SSE automáticamente)
      markConversationAsRead(conversation.id).catch((error) => {
        console.error("Error marcando conversación como leída:", error);
      });
    }
  }, [conversation?.id, conversation?.unreadCount]);

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
      syncMessages((prev) => prev.map((m) => (m.localId === localId ? optimisticMessage : m)));
    } else {
      // Si es nuevo, añadir al final
      syncMessages((prev) => [...prev, optimisticMessage]);
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
      syncMessages((prev) =>
        prev.map((m) => (m.localId === localId ? { ...message, localStatus: "sent" as LocalMessageStatus } : m)),
      );

      // Notificar al padre para actualizar lista de conversaciones
      onMessageSent?.(message);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      toast.error(error instanceof Error ? error.message : "Error al enviar mensaje");

      // Marcar mensaje como fallido
      syncMessages((prev) =>
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
          const container = scrollRef.current;
          const oldScrollHeight = container.scrollHeight;

          // Invertir orden: más antiguos primero, añadir estado "sent" y prepend
          const messagesWithStatus = withLocalState([...data.data].reverse());
          syncMessages((prev) => [...messagesWithStatus, ...prev]);
          setHasMore(data.hasMore ?? false);
          setCursor(data.nextCursor ?? null);

          // Mantener posición de scroll después de añadir mensajes
          setTimeout(() => {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight;
          }, 0);
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
    <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border md:rounded-lg">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b p-4 @3xl/main:px-4">
        <div className="flex items-center gap-3">
          {/* Botón Volver (solo móvil) */}
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="flex size-10 p-0 @3xl/main:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <UserInfoPopover
            userId={otherUser.id}
            name={otherUser.name}
            email={otherUser.email}
            image={otherUser.image}
            phone={otherUser.phone}
            mobilePhone={otherUser.mobilePhone}
            department={otherUser.department}
          >
            <button className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-1 transition-colors">
              <Avatar className="size-10" key={otherUser.id}>
                {hasAvatar(otherUser.image) && (
                  <AvatarImage src={getUserAvatarUrl(otherUser.id)} alt={otherUser.name} />
                )}
                <AvatarFallback>
                  {otherUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 text-left">
                <span className="text-sm font-semibold">{otherUser.name}</span>
                <span className="text-muted-foreground text-xs">{otherUser.email}</span>
              </div>
            </button>
          </UserInfoPopover>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          {isRefreshing && !loading && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Actualizando
            </span>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="relative flex-1 overflow-hidden" style={{ flex: "1 1 0", minHeight: 0 }}>
        <div className="h-full overflow-y-auto px-4" ref={scrollRef} style={{ WebkitOverflowScrolling: "touch" }}>
          {messages.length === 0 && !loading ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-center">
              <p>No hay mensajes aún. ¡Envía el primero!</p>
            </div>
          ) : (
            <div className="flex flex-col items-start space-y-10 py-8">
              {/* Botón cargar más mensajes */}
              {hasMore && (
                <div className="flex w-full justify-center pb-4">
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
                    className={cn("max-w-(--breakpoint-sm) space-y-1", {
                      "self-end": isOwn,
                    })}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn("inline-flex items-start gap-4 rounded-md p-4", {
                          "order-1": isOwn,
                          "bg-primary text-primary-foreground": isOwn,
                          "bg-muted border": !isOwn,
                        })}
                      >
                        <Avatar className="mt-0.5 h-8 w-8" key={message.sender.id}>
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

                        <div className={cn(status === "failed" && "opacity-60")}>
                          <p className="text-sm break-words">{message.body}</p>
                        </div>
                      </div>
                    </div>

                    <div className={cn("flex items-center gap-2", { "justify-end": isOwn })}>
                      <time className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                        {new Date(message.createdAt).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {/* Iconos de estado (solo para mensajes propios) */}
                        {isOwn && (
                          <>
                            {status === "sending" && <Loader2 className="h-3 w-3 animate-spin" />}
                            {status === "sent" && <Check className="h-3 w-3" />}
                            {status === "failed" && (
                              <button
                                onClick={() => handleRetry(message)}
                                className="hover:text-destructive flex items-center gap-1 transition-colors"
                                title="Reintentar envío"
                              >
                                <AlertCircle className="h-3 w-3 text-red-500" />
                                <span className="text-xs">Reintentar</span>
                              </button>
                            )}
                          </>
                        )}
                      </time>
                    </div>
                  </div>
                );
              })}
              {/* Marcador para scroll al fondo */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {loading && (
          <div className="bg-background/80 absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Cargando conversación...</p>
            </div>
          </div>
        )}
      </div>

      {/* Botón flotante para ir abajo */}
      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-8 bottom-24 z-10 h-10 w-10 rounded-full shadow-lg"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}

      {/* Input de nuevo mensaje */}
      <div className="shrink-0 border-t p-4 @3xl/main:px-4">
        <div className="bg-muted relative flex items-center rounded-md border">
          <Input
            type="text"
            className="dark:bg-background h-14 border-transparent bg-white pe-20 text-base shadow-transparent ring-transparent"
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <div className="absolute end-4 flex items-center">
            <Button onClick={handleSend} disabled={!newMessage.trim() || sending} variant="outline">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span className="hidden lg:inline">Enviar</span>
                  <Send className="h-4 w-4 lg:ms-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoizar el componente para evitar re-renders innecesarios
export const ConversationView = memo(ConversationViewComponent);

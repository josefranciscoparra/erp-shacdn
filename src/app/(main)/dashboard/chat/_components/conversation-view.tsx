"use client";

import { memo, useEffect, useRef, useState } from "react";

import { ArrowDown, ArrowLeft, Loader2, Send } from "lucide-react";
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

interface ConversationViewProps {
  conversation: ConversationWithParticipants;
  onBack?: () => void;
}

function ConversationViewComponent({ conversation, onBack }: ConversationViewProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const otherUser = getOtherParticipant(conversation, session?.user?.id ?? "");

  // Escuchar mensajes en tiempo real por SSE
  useChatStream({
    enabled: true,
    onMessage: (message: MessageWithSender) => {
      // Solo añadir mensajes de esta conversación
      if (message.conversationId === conversation.id) {
        setMessages((prev) => {
          // Evitar duplicados
          const exists = prev.some((m) => m.id === message.id);
          if (exists) {
            return prev;
          }
          return [...prev, message];
        });
      }
    },
  });

  // Función para hacer scroll al fondo
  const scrollToBottom = () => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
        setIsAtBottom(true);
        setShowScrollButton(false);
      }
    }
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
          // Invertir orden: más antiguos primero
          setMessages(data.data.reverse());
          setHasMore(data.hasMore ?? false);
          setCursor(data.nextCursor);
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

  // Enviar mensaje
  const handleSend = async () => {
    if (!newMessage.trim() || sending) {
      return;
    }

    const body = newMessage.trim();
    setNewMessage("");
    setSending(true);

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

      // Añadir mensaje a la lista
      setMessages((prev) => [...prev, message]);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      toast.error(error instanceof Error ? error.message : "Error al enviar mensaje");
      // Restaurar mensaje en input si falla
      setNewMessage(body);
    } finally {
      setSending(false);
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

            // Invertir orden: más antiguos primero y prepend
            setMessages((prev) => [...data.data.reverse(), ...prev]);
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
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4">
        {/* Botón Volver (solo móvil) */}
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="@3xl/main:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <Avatar>
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

                return (
                  <div key={message.id} className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}>
                    <Avatar className="h-8 w-8">
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
                      )}
                    >
                      <p className="text-sm break-words">{message.body}</p>
                      <p className={cn("mt-1 text-xs", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {new Date(message.createdAt).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
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

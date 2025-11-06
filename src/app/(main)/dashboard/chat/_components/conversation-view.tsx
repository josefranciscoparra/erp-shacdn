"use client";

import { useEffect, useRef, useState } from "react";

import { Send } from "lucide-react";
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
}

export function ConversationView({ conversation }: ConversationViewProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
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

  // Cargar mensajes de la conversación
  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      try {
        const response = await fetch(`/api/chat/conversations/${conversation.id}/messages?limit=50`);
        const data = await response.json();

        if (data.data) {
          // Invertir orden: más antiguos primero
          setMessages(data.data.reverse());
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

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <MessageSkeleton key={i} isOwn={i % 2 === 0} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-center">
            <p>No hay mensajes aún. ¡Envía el primero!</p>
          </div>
        ) : (
          <div className="space-y-4">
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

function MessageSkeleton({ isOwn }: { isOwn: boolean }) {
  return (
    <div className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}>
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-16 w-64" />
      </div>
    </div>
  );
}

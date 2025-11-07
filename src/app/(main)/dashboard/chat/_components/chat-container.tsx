"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { MessageSquarePlus } from "lucide-react";

import { useChatEnabled } from "@/hooks/use-chat-enabled";
import { useChatStream } from "@/hooks/use-chat-stream";
import type { ConversationWithParticipants, MessageWithSender } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

import { ConversationView } from "./conversation-view";
import { ConversationsList } from "./conversations-list";
import { NewChatDialog } from "./new-chat-dialog";

export function ChatContainer() {
  const router = useRouter();
  const { chatEnabled, isLoading: isLoadingConfig } = useChatEnabled();
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithParticipants | null>(null);
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [showMobileConversation, setShowMobileConversation] = useState(false);

  // Redirigir si el chat no está habilitado
  useEffect(() => {
    if (!isLoadingConfig && !chatEnabled) {
      router.push("/dashboard");
    }
  }, [chatEnabled, isLoadingConfig, router]);

  // Conectar al stream SSE
  useChatStream({
    enabled: true,
    onMessage: (message: MessageWithSender) => {
      // Actualizar conversación cuando llega un mensaje nuevo
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessageAt: message.createdAt,
              lastMessage: {
                id: message.id,
                body: message.body,
                createdAt: message.createdAt,
                senderId: message.senderId,
              },
            };
          }
          return conv;
        }),
      );
    },
    onRead: ({ conversationId, messageId }) => {
      console.log(`Mensajes leídos en conversación ${conversationId} hasta ${messageId}`);
    },
    onError: (error) => {
      console.error("Error en el stream:", error);
    },
  });

  const handleSelectConversation = useCallback((conversation: ConversationWithParticipants) => {
    setSelectedConversation(conversation);
    setShowMobileConversation(true);
  }, []);

  const handleBackToList = useCallback(() => {
    setShowMobileConversation(false);
  }, []);

  const handleNewConversation = useCallback((conversation: ConversationWithParticipants) => {
    // Añadir nueva conversación a la lista si no existe
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conversation.id);
      if (exists) {
        return prev;
      }
      return [conversation, ...prev];
    });

    // Seleccionar la nueva conversación
    setSelectedConversation(conversation);
    setNewChatOpen(false);
  }, []);

  // Actualización optimista cuando se envía un mensaje
  const handleMessageSent = useCallback((message: MessageWithSender) => {
    setConversations((prev) => {
      // Encontrar la conversación
      const conv = prev.find((c) => c.id === message.conversationId);
      if (!conv) return prev;

      // Actualizar con el nuevo mensaje
      const updatedConv = {
        ...conv,
        lastMessageAt: message.createdAt,
        lastMessage: {
          id: message.id,
          body: message.body,
          createdAt: message.createdAt,
          senderId: message.senderId,
        },
      };

      // Mover al principio (más reciente arriba)
      const filtered = prev.filter((c) => c.id !== message.conversationId);
      return [updatedConv, ...filtered];
    });
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Lista de conversaciones (sidebar izquierdo) */}
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-col @3xl/main:w-80",
          showMobileConversation && "hidden @3xl/main:flex",
        )}
      >
        <ConversationsList
          conversations={conversations}
          selectedConversationId={selectedConversation?.id ?? null}
          onSelectConversation={handleSelectConversation}
          onConversationsLoaded={setConversations}
          onNewChat={() => setNewChatOpen(true)}
        />
      </div>

      {/* Vista de conversación (área principal) */}
      <div
        className={cn("flex h-full min-h-0 flex-1 flex-col", showMobileConversation ? "flex" : "hidden @3xl/main:flex")}
      >
        {selectedConversation ? (
          <ConversationView
            conversation={selectedConversation}
            onBack={handleBackToList}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <div className="bg-background fixed inset-0 z-50 flex h-full items-center justify-center p-4 text-center @3xl/main:relative @3xl/main:z-10 @3xl/main:bg-transparent @3xl/main:p-0">
            <div className="text-muted-foreground flex flex-col items-center gap-4">
              <div className="bg-muted flex size-20 items-center justify-center rounded-full border">
                <MessageSquarePlus className="h-10 w-10" />
              </div>
              <div>
                <p className="text-lg font-semibold">Selecciona una conversación</p>
                <p className="text-muted-foreground mt-1 text-sm">o inicia un nuevo chat para comenzar</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog para nuevo chat */}
      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} onConversationCreated={handleNewConversation} />
    </div>
  );
}

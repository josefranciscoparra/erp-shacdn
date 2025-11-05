"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useChatStream } from "@/hooks/use-chat-stream";

import { ConversationsList } from "./conversations-list";
import { ConversationView } from "./conversation-view";
import { NewChatDialog } from "./new-chat-dialog";

import type { ConversationWithParticipants, MessageWithSender } from "@/lib/chat/types";

export function ChatContainer() {
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithParticipants | null>(null);
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);

  // Conectar al stream SSE
  const { isConnected, transport } = useChatStream({
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
        })
      );
    },
    onRead: ({ conversationId, messageId }) => {
      console.log(`Mensajes leídos en conversación ${conversationId} hasta ${messageId}`);
    },
    onError: (error) => {
      console.error("Error en el stream:", error);
    },
  });

  const handleSelectConversation = (conversation: ConversationWithParticipants) => {
    setSelectedConversation(conversation);
  };

  const handleNewConversation = (conversation: ConversationWithParticipants) => {
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
  };

  return (
    <div className="flex h-full gap-4 overflow-hidden rounded-lg border bg-card">
      {/* Lista de conversaciones (sidebar izquierdo) */}
      <div className="flex w-full flex-col border-r @3xl/main:w-80">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">Mensajes</h2>
            <p className="text-xs text-muted-foreground">
              {isConnected ? (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  Conectado ({transport === "sse" ? "Tiempo real" : "Polling"})
                </span>
              ) : (
                "Desconectado"
              )}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setNewChatOpen(true)}>
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>

        <ConversationsList
          conversations={conversations}
          selectedConversationId={selectedConversation?.id ?? null}
          onSelectConversation={handleSelectConversation}
          onConversationsLoaded={setConversations}
        />
      </div>

      {/* Vista de conversación (área principal) */}
      <div className="hidden flex-1 @3xl/main:flex">
        {selectedConversation ? (
          <ConversationView conversation={selectedConversation} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
            <MessageSquarePlus className="h-16 w-16" />
            <div className="text-center">
              <p className="text-lg font-medium">Selecciona una conversación</p>
              <p className="text-sm">o inicia un nuevo chat</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog para nuevo chat */}
      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onConversationCreated={handleNewConversation}
      />
    </div>
  );
}

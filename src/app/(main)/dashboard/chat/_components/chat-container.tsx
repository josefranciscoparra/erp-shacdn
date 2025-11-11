"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { MessageSquarePlus } from "lucide-react";
import { useSession } from "next-auth/react";

import { useChatEnabled } from "@/hooks/use-chat-enabled";
import type { ConversationWithParticipants, MessageWithSender } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { useChatUnreadStore } from "@/stores/chat-unread-store";

import { ConversationView } from "./conversation-view";
import { ConversationsList } from "./conversations-list";
import { NewChatDialog } from "./new-chat-dialog";

export function ChatContainer() {
  const router = useRouter();
  const { data: session } = useSession();
  const { chatEnabled, isLoading: isLoadingConfig } = useChatEnabled();
  const { applyServerTotalUnread, decrementUnreadCount } = useChatUnreadStore();
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

  // Sincronizar contador global con conversaciones locales
  useEffect(() => {
    // Calcular total de mensajes no leídos de todas las conversaciones
    const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount ?? 0), 0);

    // Actualizar store global (resync forzado desde el módulo de chat)
    applyServerTotalUnread(totalUnread);
  }, [conversations, applyServerTotalUnread]);

  // Escuchar eventos SSE del store global para actualizar conversaciones en tiempo real
  const lastMessage = useChatUnreadStore((state) => state.lastMessage);
  const lastConversationRead = useChatUnreadStore((state) => state.lastConversationRead);
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id ?? null;
  }, [selectedConversation?.id]);

  // Cuando llega un mensaje nuevo via SSE
  useEffect(() => {
    if (!lastMessage || !session?.user?.id) return;
    if (lastProcessedMessageIdRef.current === lastMessage.id) {
      return;
    }
    lastProcessedMessageIdRef.current = lastMessage.id;

    const currentUserId = session.user.id;
    const isMyMessage = lastMessage.senderId === currentUserId;
    const selectedId = selectedConversationIdRef.current;

    console.log("[ChatContainer] Mensaje SSE recibido:", {
      messageId: lastMessage.id,
      senderId: lastMessage.senderId,
      currentUserId,
      isMyMessage,
      selectedId,
    });

    if (isMyMessage) {
      console.log("[ChatContainer] Ignorando mi propio mensaje");
      return;
    }

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === lastMessage.conversationId) {
          const isCurrentConversation = selectedId === lastMessage.conversationId;

          console.log("[ChatContainer] Actualizando conversación:", {
            convId: conv.id,
            isCurrentConversation,
            currentUnreadCount: conv.unreadCount,
          });

          return {
            ...conv,
            lastMessageAt: lastMessage.createdAt,
            lastMessage: {
              id: lastMessage.id,
              body: lastMessage.body,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
            },
            unreadCount: isCurrentConversation ? conv.unreadCount : (conv.unreadCount ?? 0) + 1,
          };
        }
        return conv;
      }),
    );
  }, [lastMessage, session?.user?.id]);

  // Cuando se marca una conversación como leída via SSE (desde otro dispositivo)
  useEffect(() => {
    if (!lastConversationRead) return;

    console.log("[ChatContainer] Marcando conversación como leída:", lastConversationRead);

    setConversations((prev) =>
      prev.map((conv) => (conv.id === lastConversationRead ? { ...conv, unreadCount: 0 } : conv)),
    );
  }, [lastConversationRead]);

  const handleSelectConversation = useCallback(
    (conversation: ConversationWithParticipants) => {
      const prevUnread = conversation.unreadCount ?? 0;

      // Optimistic update: Decrementar contador global antes de actualizar local
      if (prevUnread > 0) {
        console.log("[ChatContainer] Optimistic update: decrementando contador global en", prevUnread);
        decrementUnreadCount(prevUnread);

        // Actualizar conversación local
        setConversations((prev) =>
          prev.map((conv) => (conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv)),
        );
      }

      setSelectedConversation(conversation);
      setShowMobileConversation(true);
    },
    [decrementUnreadCount],
  );

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

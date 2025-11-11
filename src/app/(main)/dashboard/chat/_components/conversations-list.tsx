"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

import { MessageSquarePlus, Search } from "lucide-react";
import { useSession } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserAvatarUrl, hasAvatar } from "@/lib/chat/avatar-utils";
import { prefetchConversationMessages } from "@/lib/chat/conversation-cache";
import type { ConversationWithParticipants } from "@/lib/chat/types";
import { formatLastMessageDate, getOtherParticipant } from "@/lib/chat/utils";
import { cn } from "@/lib/utils";

interface ConversationsListProps {
  conversations: ConversationWithParticipants[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: ConversationWithParticipants) => void;
  onConversationsLoaded: (conversations: ConversationWithParticipants[]) => void;
  onNewChat?: () => void;
}

function ConversationsListComponent({
  conversations: externalConversations,
  selectedConversationId,
  onSelectConversation,
  onConversationsLoaded,
  onNewChat,
}: ConversationsListProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  const handlePrefetchConversation = useCallback((conversationId: string) => {
    prefetchConversationMessages(conversationId).catch(() => undefined);
  }, []);

  // Actualizar la ref cuando cambia el callback
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
  }, [onConversationsLoaded]);

  // Cargar conversaciones solo una vez
  useEffect(() => {
    async function loadConversations() {
      try {
        const response = await fetch("/api/chat/conversations");
        const data = await response.json();

        if (data.conversations) {
          onConversationsLoadedRef.current(data.conversations);
        }
      } catch (error) {
        console.error("Error cargando conversaciones:", error);
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
  }, []); // Sin dependencias - solo carga una vez

  // Filtrar conversaciones por búsqueda
  const filteredConversations = externalConversations.filter((conversation) => {
    if (!searchTerm.trim()) return true;
    const otherUser = getOtherParticipant(conversation, session?.user?.id ?? "");
    return otherUser.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Card className="flex h-full min-h-0 flex-col pb-0">
      <CardHeader>
        <CardTitle className="font-display text-xl lg:text-2xl">Chats</CardTitle>
        <CardAction>
          <Button size="icon" variant="ghost" onClick={onNewChat}>
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </CardAction>
        <CardDescription className="relative col-span-2 mt-4 flex w-full items-center">
          <Search className="text-muted-foreground absolute start-4 size-4" />
          <Input
            type="text"
            className="ps-10"
            placeholder="Buscar chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardDescription>
      </CardHeader>

      {loading ? (
        <CardContent className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <ConversationSkeleton key={i} />
          ))}
        </CardContent>
      ) : filteredConversations.length === 0 ? (
        <CardContent className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm">{searchTerm ? "No se encontraron conversaciones" : "No tienes conversaciones"}</p>
          <p className="text-xs">
            {searchTerm ? "Intenta con otro término de búsqueda" : "Inicia un nuevo chat para comenzar"}
          </p>
        </CardContent>
      ) : (
        <CardContent className="flex-1 overflow-auto p-0">
          <div className="flex w-full flex-col divide-y">
            {filteredConversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation, session?.user?.id ?? "");
              const isSelected = conversation.id === selectedConversationId;
              const hasUnread = (conversation.unreadCount ?? 0) > 0;

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  onPointerEnter={() => handlePrefetchConversation(conversation.id)}
                  onTouchStart={() => handlePrefetchConversation(conversation.id)}
                  onFocus={() => handlePrefetchConversation(conversation.id)}
                  className={cn(
                    "hover:bg-muted group/item relative flex w-full cursor-pointer items-center gap-4 px-6 py-4 text-left transition-colors",
                    isSelected && "bg-muted dark:bg-muted",
                  )}
                >
                  <Avatar className="h-10 w-10 md:size-10" key={otherUser.id}>
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

                  <div className="min-w-0 grow">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", hasUnread && "font-bold")}>{otherUser.name}</span>
                      <div className="flex items-center gap-2">
                        {conversation.lastMessage && (
                          <span className="text-muted-foreground flex-none text-xs">
                            {formatLastMessageDate(new Date(conversation.lastMessage.createdAt))}
                          </span>
                        )}
                        {hasUnread && (
                          <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conversation.lastMessage ? (
                        <span
                          className={cn(
                            "truncate text-start text-sm",
                            hasUnread ? "text-foreground font-semibold" : "text-muted-foreground",
                          )}
                        >
                          {conversation.lastMessage.senderId === session?.user?.id && "Tú: "}
                          {conversation.lastMessage.body}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Sin mensajes</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ConversationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

// Memoizar el componente para evitar re-renders innecesarios
export const ConversationsList = memo(ConversationsListComponent);

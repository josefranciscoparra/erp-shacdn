"use client";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserAvatarUrl, hasAvatar } from "@/lib/chat/avatar-utils";
import type { ConversationWithParticipants } from "@/lib/chat/types";
import { formatLastMessageDate, getOtherParticipant } from "@/lib/chat/utils";
import { cn } from "@/lib/utils";

interface ConversationsListProps {
  conversations: ConversationWithParticipants[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: ConversationWithParticipants) => void;
  onConversationsLoaded: (conversations: ConversationWithParticipants[]) => void;
}

export function ConversationsList({
  conversations: externalConversations,
  selectedConversationId,
  onSelectConversation,
  onConversationsLoaded,
}: ConversationsListProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      try {
        const response = await fetch("/api/chat/conversations");
        const data = await response.json();

        if (data.conversations) {
          onConversationsLoaded(data.conversations);
        }
      } catch (error) {
        console.error("Error cargando conversaciones:", error);
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
  }, [onConversationsLoaded]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (externalConversations.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
        <p>No tienes conversaciones</p>
        <p className="text-xs">Inicia un nuevo chat para comenzar</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col">
        {externalConversations.map((conversation) => {
          const otherUser = getOtherParticipant(conversation, session?.user?.id ?? "");
          const isSelected = conversation.id === selectedConversationId;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={cn(
                "hover:bg-muted/50 flex items-start gap-3 border-b p-4 text-left transition-colors",
                isSelected && "bg-muted",
              )}
            >
              <Avatar className="h-10 w-10">
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

              <div className="flex-1 overflow-hidden">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-medium">{otherUser.name}</p>
                  {conversation.lastMessage && (
                    <span className="text-muted-foreground text-xs">
                      {formatLastMessageDate(new Date(conversation.lastMessage.createdAt))}
                    </span>
                  )}
                </div>

                {conversation.lastMessage ? (
                  <p className="text-muted-foreground truncate text-sm">
                    {conversation.lastMessage.senderId === session?.user?.id && "Tú: "}
                    {conversation.lastMessage.body}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Sin mensajes</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
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

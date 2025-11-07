"use client";

import React from "react";

import { Search } from "lucide-react";

import { ActionDropdown } from "@/app/(main)/dashboard/messages/components/action-dropdown";
import { ChatListItem } from "@/app/(main)/dashboard/messages/components/chat-list-item";
import { ChatItemProps } from "@/app/(main)/dashboard/messages/types";
import useChatStore from "@/app/(main)/dashboard/messages/use-chat-store";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ChatSidebar({ chats }: { chats: ChatItemProps[] }) {
  const { selectedChat } = useChatStore();
  const [filteredChats, setFilteredChats] = React.useState(chats);

  const changeHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value.trim();

    const filteredItems = chats.filter((chat) => chat.user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredChats(filteredItems);
  };

  return (
    <Card className="w-full pb-0 lg:w-96">
      <CardHeader>
        <CardTitle className="font-display text-xl lg:text-2xl">Chats</CardTitle>
        <CardAction>
          <ActionDropdown />
        </CardAction>
        <CardDescription className="relative col-span-2 mt-4 flex w-full items-center">
          <Search className="text-muted-foreground absolute start-4 size-4" />
          <Input type="text" className="ps-10" placeholder="Chats search..." onChange={changeHandle} />
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        <div className="block min-w-0 divide-y">
          {filteredChats.length ? (
            filteredChats.map((chat, key) => (
              <ChatListItem chat={chat} key={key} active={selectedChat && selectedChat.id === chat.id} />
            ))
          ) : (
            <div className="text-muted-foreground mt-4 text-center text-sm">No chat found</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

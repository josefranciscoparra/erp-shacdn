import { promises as fs } from "fs";
import path from "path";

import { ChatSidebar, ChatContent } from "@/app/(main)/dashboard/messages/components";

import { ChatItemProps, UserPropsTypes } from "./types";

async function getChats() {
  const data = await fs.readFile(path.join(process.cwd(), "src/app/(main)/dashboard/messages/data/chats.json"));
  return JSON.parse(data.toString());
}

async function getChatUser(id: number) {
  const data = await fs.readFile(path.join(process.cwd(), "src/app/(main)/dashboard/messages/data/contacts.json"));

  return JSON.parse(data.toString()).find((item: UserPropsTypes) => item.id === id);
}

export default async function Page() {
  const chats = await getChats();

  const chats_with_user = await Promise.all(
    chats.map(async (item: ChatItemProps) => {
      item.user = await getChatUser(item.user_id);
      return item;
    }),
  );

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-3rem)] w-full">
      <ChatSidebar chats={chats_with_user} />
      <div className="grow">
        <ChatContent />
      </div>
    </div>
  );
}

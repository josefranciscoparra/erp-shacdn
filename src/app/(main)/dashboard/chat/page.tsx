import { Suspense } from "react";

import { Metadata } from "next";

import { ChatContainer } from "./_components/chat-container";

export const metadata: Metadata = {
  title: "Mensajes | ERP",
  description: "Chat 1:1 para comunicación interna",
};

export default function ChatPage() {
  return (
    <div className="@container/main flex h-[calc(100vh-7rem)] flex-col">
      <Suspense fallback={<ChatSkeleton />}>
        <ChatContainer />
      </Suspense>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground text-sm">Cargando mensajes...</p>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { Metadata } from "next";

import { ChatContainer } from "./_components/chat-container";

export const metadata: Metadata = {
  title: "Mensajes | ERP",
  description: "Chat 1:1 para comunicación interna",
};

export default function ChatPage() {
  return (
    <div className="@container/main flex h-[calc(100vh-4rem)] flex-col">
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando mensajes...</p>
      </div>
    </div>
  );
}

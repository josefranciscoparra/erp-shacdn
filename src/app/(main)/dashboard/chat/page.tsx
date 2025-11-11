import { Suspense } from "react";

import { ChatContainer } from "./_components/chat-container";

export default function ChatPage() {
  return (
    <div
      className="@container/main flex min-h-0 flex-col md:h-[calc(100dvh-7rem)]"
      style={{
        // En móvil: altura completa menos header del dashboard (7rem)
        // svh = small viewport height (no incluye barras del navegador en iOS)
        height: "calc(100svh - 7rem)",
        // En desktop: altura dinámica normal
        maxHeight: "calc(100vh - 7rem)",
      }}
    >
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

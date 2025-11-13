import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { sseManager } from "@/lib/chat/sse-manager";
import { markMessagesAsRead } from "@/server/actions/chat";

/**
 * POST /api/chat/messages/read
 * Marca mensajes como leídos hasta un mensaje específico
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id: userId, orgId } = session.user;

    const body = await request.json();
    const { conversationId, messageId } = body;

    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json({ error: "conversationId es requerido y debe ser una cadena" }, { status: 400 });
    }

    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json({ error: "messageId es requerido y debe ser una cadena" }, { status: 400 });
    }

    const count = await markMessagesAsRead(conversationId, messageId);

    // Emitir evento SSE al otro participante para notificar lectura
    const { prisma } = await import("@/lib/prisma");
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });

    if (conversation) {
      const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
      sseManager.sendReadEvent(otherUserId, orgId, conversationId, messageId, userId);
    }

    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error("[API] Error en POST /api/chat/messages/read:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al marcar mensajes como leídos" },
      { status: 500 },
    );
  }
}

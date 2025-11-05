import { NextRequest, NextResponse } from "next/server";

import { chatRateLimiter } from "@/lib/chat/rate-limiter";
import { sseManager } from "@/lib/chat/sse-manager";
import { auth } from "@/lib/auth";
import { sendMessage } from "@/server/actions/chat";

/**
 * POST /api/chat/messages
 * Envía un mensaje en una conversación
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id: userId, orgId } = session.user;

    // Verificar rate limit
    const rateLimitResult = chatRateLimiter.check(userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Demasiados mensajes. Intenta de nuevo más tarde.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter ?? 10),
          },
        }
      );
    }

    const body = await request.json();
    const { conversationId, body: messageBody } = body;

    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json(
        { error: "conversationId es requerido y debe ser una cadena" },
        { status: 400 }
      );
    }

    if (!messageBody || typeof messageBody !== "string") {
      return NextResponse.json(
        { error: "body es requerido y debe ser una cadena" },
        { status: 400 }
      );
    }

    // Enviar mensaje
    const message = await sendMessage(conversationId, messageBody);

    if (!message) {
      return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
    }

    // Emitir evento SSE al receptor
    // Determinar quién es el receptor (el otro participante de la conversación)
    // Para esto necesitamos consultar la conversación
    const { prisma } = await import("@/lib/prisma");
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });

    if (conversation) {
      const receiverId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
      sseManager.sendMessageToUser(receiverId, orgId, message);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[API] Error en POST /api/chat/messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al enviar mensaje" },
      { status: 500 }
    );
  }
}

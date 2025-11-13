import { NextRequest, NextResponse } from "next/server";

import { getConversationMessages } from "@/server/actions/chat";

/**
 * GET /api/chat/conversations/[id]/messages
 * Obtiene los mensajes de una conversación con paginación
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? 50);

    const result = await getConversationMessages(conversationId, cursor, limit);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[API] Error en GET /api/chat/conversations/[id]/messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener mensajes" },
      { status: 500 },
    );
  }
}

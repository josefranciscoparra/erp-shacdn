import { NextRequest, NextResponse } from "next/server";

import { getMyConversations, getOrCreateConversation } from "@/server/actions/chat";

/**
 * GET /api/chat/conversations
 * Obtiene las conversaciones del usuario autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get("limit") ?? 20);

    const conversations = await getMyConversations(limit);

    return NextResponse.json({ conversations }, { status: 200 });
  } catch (error) {
    console.error("[API] Error en GET /api/chat/conversations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener conversaciones" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/conversations
 * Crea o obtiene una conversación con otro usuario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { peerUserId } = body;

    if (!peerUserId || typeof peerUserId !== "string") {
      return NextResponse.json(
        { error: "peerUserId es requerido y debe ser una cadena" },
        { status: 400 }
      );
    }

    const conversation = await getOrCreateConversation(peerUserId);

    return NextResponse.json({ conversation }, { status: 200 });
  } catch (error) {
    console.error("[API] Error en POST /api/chat/conversations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear conversación" },
      { status: 500 }
    );
  }
}

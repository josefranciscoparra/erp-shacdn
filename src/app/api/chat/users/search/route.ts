import { NextRequest, NextResponse } from "next/server";

import { searchUsersForChat } from "@/server/actions/chat";

/**
 * GET /api/chat/users/search
 * Busca usuarios de la organización para iniciar conversación
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") ?? "";
    const limit = Number(searchParams.get("limit") ?? 10);

    if (!query) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const users = await searchUsersForChat(query, limit);

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("[API] Error en GET /api/chat/users/search:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al buscar usuarios" },
      { status: 500 }
    );
  }
}

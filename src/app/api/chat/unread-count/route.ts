import { NextResponse } from "next/server";

import { getTotalUnreadCount } from "@/server/actions/chat";

/**
 * GET /api/chat/unread-count
 * Devuelve el total de mensajes no leídos para el usuario autenticado
 * Endpoint ligero optimizado para inicializar el contador global
 */
export async function GET() {
  try {
    const totalUnread = await getTotalUnreadCount();

    return NextResponse.json({ totalUnread }, { status: 200 });
  } catch (error) {
    console.error("[API] Error en GET /api/chat/unread-count:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener contador de mensajes no leídos" },
      { status: 500 },
    );
  }
}

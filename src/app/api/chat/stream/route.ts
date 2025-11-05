import { NextRequest } from "next/server";

import { sseManager } from "@/lib/chat/sse-manager";
import { isChatEnabled } from "@/lib/chat/utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/chat/stream
 * Stream SSE (Server-Sent Events) para mensajes en tiempo real
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      return new Response("No autenticado", { status: 401 });
    }

    const { id: userId, orgId } = session.user;

    // Verificar feature flag
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { features: true },
    });

    if (!org) {
      return new Response("Organización no encontrada", { status: 404 });
    }

    const features = org.features as Record<string, unknown>;
    if (!isChatEnabled(features)) {
      return new Response("Chat no habilitado para esta organización", { status: 403 });
    }

    // Obtener Last-Event-ID para reconexión
    const lastEventId = request.headers.get("Last-Event-ID") ?? undefined;

    console.log(`[SSE] Iniciando stream para usuario ${userId} en org ${orgId}`);

    // Crear stream SSE
    const stream = new ReadableStream({
      start(controller) {
        // Registrar conexión en el manager
        sseManager.addConnection(userId, orgId, controller, lastEventId);

        // Enviar mensaje inicial de conexión
        const encoder = new TextEncoder();
        const connectMessage = `event: system\ndata: ${JSON.stringify({
          type: "system",
          data: { message: "Conectado al chat" },
          timestamp: new Date().toISOString(),
        })}\n\n`;

        controller.enqueue(encoder.encode(connectMessage));

        // Handler para cuando se cierra la conexión
        request.signal.addEventListener("abort", () => {
          console.log(`[SSE] Cliente desconectado: ${userId}`);
          sseManager.removeConnection(userId, orgId);
          try {
            controller.close();
          } catch {
            // Ya cerrado
          }
        });
      },
      cancel() {
        console.log(`[SSE] Stream cancelado para usuario ${userId}`);
        sseManager.removeConnection(userId, orgId);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Para nginx
      },
    });
  } catch (error) {
    console.error("[API] Error en GET /api/chat/stream:", error);
    return new Response("Error al iniciar stream", { status: 500 });
  }
}

// Configuración de Next.js para permitir streaming
export const runtime = "nodejs"; // No usar Edge para SSE
export const dynamic = "force-dynamic";

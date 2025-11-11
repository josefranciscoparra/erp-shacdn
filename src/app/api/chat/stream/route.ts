import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { sseManager } from "@/lib/chat/sse-manager";
import { isChatEnabled } from "@/lib/chat/utils";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/chat/stream
 * Stream SSE (Server-Sent Events) para mensajes en tiempo real
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[SSE] Petición recibida");
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      console.log("[SSE] Error: No autenticado");
      return new Response("No autenticado", { status: 401 });
    }

    const { id: userId, orgId } = session.user;
    console.log(`[SSE] Usuario autenticado: ${userId} (org: ${orgId})`);

    // Verificar si el chat está habilitado
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { chatEnabled: true, features: true },
    });

    if (!org) {
      console.log("[SSE] Error: Organización no encontrada");
      return new Response("Organización no encontrada", { status: 404 });
    }

    const features = org.features as Record<string, unknown>;
    console.log("[SSE] Chat enabled:", org.chatEnabled, "| Features:", features);

    if (!isChatEnabled(org.chatEnabled, features)) {
      console.log("[SSE] Error: Chat no habilitado");
      return new Response("Chat no habilitado para esta organización", { status: 403 });
    }

    // Obtener Last-Event-ID para reconexión
    const lastEventId = request.headers.get("Last-Event-ID") ?? undefined;

    console.log(`[SSE] Iniciando stream para usuario ${userId} en org ${orgId}`);

    // Crear stream SSE
    let connectionId: string | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Registrar conexión en el manager
        connectionId = sseManager.addConnection(userId, orgId, controller, lastEventId);

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
          console.log(`[SSE] Cliente desconectado: ${userId} (${connectionId ?? "sin-id"})`);
          if (connectionId) {
            sseManager.removeConnection(userId, orgId, connectionId);
          }
          try {
            controller.close();
          } catch {
            // Ya cerrado
          }
        });
      },
      cancel() {
        console.log(`[SSE] Stream cancelado para usuario ${userId}`);
        if (connectionId) {
          sseManager.removeConnection(userId, orgId, connectionId);
        }
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

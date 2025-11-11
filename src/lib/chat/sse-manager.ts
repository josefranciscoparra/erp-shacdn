/**
 * Gestor de conexiones SSE (Server-Sent Events) para chat en tiempo real
 */

import type { MessageWithSender, SSEEvent } from "./types";

interface SSEConnection {
  userId: string;
  orgId: string;
  controller: ReadableStreamDefaultController;
  lastEventId?: string;
}

class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Iniciar heartbeat cada 30 segundos
    this.startHeartbeat();
  }

  /**
   * Registra una nueva conexión SSE
   */
  addConnection(
    userId: string,
    orgId: string,
    controller: ReadableStreamDefaultController,
    lastEventId?: string,
  ): void {
    const connectionId = `${orgId}:${userId}`;
    this.connections.set(connectionId, {
      userId,
      orgId,
      controller,
      lastEventId,
    });

    console.log(`[SSE] Nueva conexión: ${connectionId} (Total: ${this.connections.size})`);
  }

  /**
   * Elimina una conexión SSE
   */
  removeConnection(userId: string, orgId: string): void {
    const connectionId = `${orgId}:${userId}`;
    this.connections.delete(connectionId);

    console.log(`[SSE] Conexión cerrada: ${connectionId} (Total: ${this.connections.size})`);
  }

  /**
   * Envía un mensaje a un usuario específico
   */
  sendMessageToUser(userId: string, orgId: string, message: MessageWithSender): void {
    const connectionId = `${orgId}:${userId}`;
    const connection = this.connections.get(connectionId);

    if (!connection) {
      console.log(`[SSE] Usuario no conectado: ${connectionId}`);
      return;
    }

    const event: SSEEvent = {
      type: "message",
      data: message,
      timestamp: new Date().toISOString(),
    };

    this.sendEvent(connection, event, message.id);
  }

  /**
   * Envía un evento de lectura
   */
  sendReadEvent(userId: string, orgId: string, conversationId: string, messageId: string, readBy: string): void {
    const connectionId = `${orgId}:${userId}`;
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    const event: SSEEvent = {
      type: "read",
      data: { conversationId, messageId, readBy },
      timestamp: new Date().toISOString(),
    };

    this.sendEvent(connection, event);
  }

  /**
   * Envía un evento del sistema a un usuario
   */
  sendSystemEvent(userId: string, orgId: string, message: string): void {
    const connectionId = `${orgId}:${userId}`;
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    const event: SSEEvent = {
      type: "system",
      data: { message },
      timestamp: new Date().toISOString(),
    };

    this.sendEvent(connection, event);
  }

  /**
   * Envía un evento de conversación leída a todas las conexiones del usuario
   */
  broadcastToUser(userId: string, orgId: string, conversationId: string): void {
    const connectionId = `${orgId}:${userId}`;
    const connection = this.connections.get(connectionId);

    if (!connection) {
      console.log(`[SSE] Usuario no conectado para broadcast: ${connectionId}`);
      return;
    }

    const event: SSEEvent = {
      type: "conversation_read",
      data: { conversationId },
      timestamp: new Date().toISOString(),
    };

    this.sendEvent(connection, event);
  }

  /**
   * Envía un evento SSE a través del controller
   */
  private sendEvent(connection: SSEConnection, event: SSEEvent, eventId?: string): void {
    try {
      const encoder = new TextEncoder();
      let payload = "";

      // Event ID (opcional, para reconexión)
      if (eventId) {
        payload += `id: ${eventId}\n`;
      }

      // Event type
      payload += `event: ${event.type}\n`;

      // Event data (JSON)
      payload += `data: ${JSON.stringify(event)}\n\n`;

      connection.controller.enqueue(encoder.encode(payload));
    } catch (error) {
      console.error("[SSE] Error enviando evento:", error);
      this.removeConnection(connection.userId, connection.orgId);
    }
  }

  /**
   * Inicia el heartbeat periódico
   */
  private startHeartbeat(): void {
    // Enviar heartbeat cada 30 segundos
    this.heartbeatInterval = setInterval(() => {
      const encoder = new TextEncoder();
      const heartbeat = ": heartbeat\n\n";

      for (const [connectionId, connection] of this.connections.entries()) {
        try {
          connection.controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          console.error(`[SSE] Error en heartbeat para ${connectionId}:`, error);
          this.removeConnection(connection.userId, connection.orgId);
        }
      }
    }, 30000);
  }

  /**
   * Detiene el heartbeat (para testing)
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Obtiene estadísticas de conexiones activas
   */
  getStats() {
    const byOrg: Record<string, number> = {};

    for (const connection of this.connections.values()) {
      byOrg[connection.orgId] = (byOrg[connection.orgId] ?? 0) + 1;
    }

    return {
      totalConnections: this.connections.size,
      connectionsByOrg: byOrg,
    };
  }

  /**
   * Cierra todas las conexiones (para shutdown)
   */
  closeAll(): void {
    for (const connection of this.connections.values()) {
      try {
        connection.controller.close();
      } catch {
        // Ignorar errores de cierre
      }
    }
    this.connections.clear();
    this.stopHeartbeat();
  }
}

// Instancia singleton
export const sseManager = new SSEManager();

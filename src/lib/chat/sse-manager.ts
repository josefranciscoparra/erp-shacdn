/**
 * Gestor de conexiones SSE (Server-Sent Events) para chat en tiempo real
 */

import { randomUUID } from "crypto";

import type { MessageWithSender, SSEEvent } from "./types";

interface SSEConnection {
  id: string;
  userId: string;
  orgId: string;
  controller: ReadableStreamDefaultController;
  lastEventId?: string;
}

class SSEManager {
  private connections: Map<string, Map<string, SSEConnection>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Iniciar heartbeat cada 30 segundos
    this.startHeartbeat();
  }

  /**
   * Genera la llave única por usuario/organización
   */
  private getUserKey(orgId: string, userId: string): string {
    return `${orgId}:${userId}`;
  }

  private getTotalConnections(): number {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.size;
    }
    return total;
  }

  private getUserConnections(userId: string, orgId: string) {
    return this.connections.get(this.getUserKey(orgId, userId));
  }

  /**
   * Registra una nueva conexión SSE
   */
  addConnection(
    userId: string,
    orgId: string,
    controller: ReadableStreamDefaultController,
    lastEventId?: string,
  ): string {
    const connectionId = randomUUID();
    const userKey = this.getUserKey(orgId, userId);
    const connection: SSEConnection = {
      id: connectionId,
      userId,
      orgId,
      controller,
      lastEventId,
    };

    if (!this.connections.has(userKey)) {
      this.connections.set(userKey, new Map());
    }

    const userConnections = this.connections.get(userKey)!;
    userConnections.set(connectionId, connection);

    console.log(
      `[SSE] Nueva conexión: ${userKey}#${connectionId} (usuario: ${userConnections.size}, total: ${this.getTotalConnections()})`,
    );

    return connectionId;
  }

  /**
   * Elimina una conexión SSE
   */
  removeConnection(userId: string, orgId: string, connectionId: string): void {
    const userKey = this.getUserKey(orgId, userId);
    const userConnections = this.connections.get(userKey);

    if (!userConnections) {
      console.log(`[SSE] Conexión no encontrada para cerrar: ${userKey}#${connectionId}`);
      return;
    }

    userConnections.delete(connectionId);

    if (userConnections.size === 0) {
      this.connections.delete(userKey);
    }

    console.log(
      `[SSE] Conexión cerrada: ${userKey}#${connectionId} (usuario: ${userConnections.size}, total: ${this.getTotalConnections()})`,
    );
  }

  /**
   * Envía un mensaje a un usuario específico
   */
  sendMessageToUser(userId: string, orgId: string, message: MessageWithSender): void {
    const connections = this.getUserConnections(userId, orgId);

    if (!connections?.size) {
      console.log(`[SSE] Usuario no conectado: ${orgId}:${userId}`);
      return;
    }

    const event: SSEEvent = {
      type: "message",
      data: message,
      timestamp: new Date().toISOString(),
    };

    for (const connection of connections.values()) {
      this.sendEvent(connection, event, message.id);
    }
  }

  /**
   * Envía un evento de lectura
   */
  sendReadEvent(userId: string, orgId: string, conversationId: string, messageId: string, readBy: string): void {
    const connections = this.getUserConnections(userId, orgId);

    if (!connections?.size) {
      return;
    }

    const event: SSEEvent = {
      type: "read",
      data: { conversationId, messageId, readBy },
      timestamp: new Date().toISOString(),
    };

    for (const connection of connections.values()) {
      this.sendEvent(connection, event);
    }
  }

  /**
   * Envía un evento del sistema a un usuario
   */
  sendSystemEvent(userId: string, orgId: string, message: string): void {
    const connections = this.getUserConnections(userId, orgId);

    if (!connections?.size) {
      return;
    }

    const event: SSEEvent = {
      type: "system",
      data: { message },
      timestamp: new Date().toISOString(),
    };

    for (const connection of connections.values()) {
      this.sendEvent(connection, event);
    }
  }

  /**
   * Envía un evento de conversación leída a todas las conexiones del usuario
   */
  broadcastToUser(userId: string, orgId: string, conversationId: string): void {
    const connections = this.getUserConnections(userId, orgId);

    if (!connections?.size) {
      console.log(`[SSE] Usuario no conectado para broadcast: ${orgId}:${userId}`);
      return;
    }

    const event: SSEEvent = {
      type: "conversation_read",
      data: { conversationId },
      timestamp: new Date().toISOString(),
    };

    for (const connection of connections.values()) {
      this.sendEvent(connection, event);
    }
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
      this.removeConnection(connection.userId, connection.orgId, connection.id);
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

      for (const [userKey, userConnections] of this.connections.entries()) {
        for (const connection of userConnections.values()) {
          try {
            connection.controller.enqueue(encoder.encode(heartbeat));
          } catch (error) {
            console.error(`[SSE] Error en heartbeat para ${userKey}#${connection.id}:`, error);
            this.removeConnection(connection.userId, connection.orgId, connection.id);
          }
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
    let totalConnections = 0;

    for (const userConnections of this.connections.values()) {
      for (const connection of userConnections.values()) {
        totalConnections += 1;
        byOrg[connection.orgId] = (byOrg[connection.orgId] ?? 0) + 1;
      }
    }

    return {
      totalConnections,
      connectionsByOrg: byOrg,
    };
  }

  /**
   * Cierra todas las conexiones (para shutdown)
   */
  closeAll(): void {
    for (const userConnections of this.connections.values()) {
      for (const connection of userConnections.values()) {
        try {
          connection.controller.close();
        } catch {
          // Ignorar errores de cierre
        }
      }
    }
    this.connections.clear();
    this.stopHeartbeat();
  }
}

// Instancia singleton compartida entre todos los route handlers (Next divide el bundle)
const globalForSSE = globalThis as unknown as {
  sseManager?: SSEManager;
};

globalForSSE.sseManager ??= new SSEManager();

export const sseManager = globalForSSE.sseManager;

/**
 * Tipos para el módulo de chat 1:1
 */

export type MessageStatus = "SENT" | "READ";

export interface ConversationWithParticipants {
  id: string;
  userAId: string;
  userBId: string;
  lastMessageAt: Date;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  userA: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  userB: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  _count?: {
    messages: number;
  };
  lastMessage?: {
    id: string;
    body: string;
    createdAt: Date;
    senderId: string;
  } | null;
}

export interface MessageWithSender {
  id: string;
  body: string;
  status: MessageStatus;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface CreateConversationInput {
  peerUserId: string;
}

export interface SendMessageInput {
  conversationId: string;
  body: string;
}

export interface MarkAsReadInput {
  conversationId: string;
  messageId: string;
}

// SSE Event Types
export type SSEEventType = "message" | "read" | "system" | "heartbeat";

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

export interface SSEMessageEvent extends SSEEvent {
  type: "message";
  data: MessageWithSender;
}

export interface SSEReadEvent extends SSEEvent {
  type: "read";
  data: {
    conversationId: string;
    messageId: string;
    readBy: string;
  };
}

export interface SSESystemEvent extends SSEEvent {
  type: "system";
  data: {
    message: string;
  };
}

export interface SSEHeartbeatEvent extends SSEEvent {
  type: "heartbeat";
  data: null;
}

// Paginación
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

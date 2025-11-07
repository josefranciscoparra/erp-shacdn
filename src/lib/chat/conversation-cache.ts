"use client";

import type { MessageWithSender } from "./types";

export type LocalMessageStatus = "sending" | "sent" | "failed";
export type MessageWithLocalState = MessageWithSender & {
  localStatus?: LocalMessageStatus;
  localId?: string;
};

const cache = new Map<string, MessageWithLocalState[]>();
const inflightPrefetches = new Map<string, Promise<MessageWithLocalState[]>>();

export function withLocalState(
  messages: MessageWithSender[],
  status: LocalMessageStatus = "sent",
): MessageWithLocalState[] {
  return messages.map((message) => ({
    ...message,
    localStatus: status,
  }));
}

export function getCachedConversationMessages(id: string) {
  return cache.get(id);
}

export function hasCachedConversationMessages(id: string) {
  return cache.has(id);
}

export function setCachedConversationMessages(id: string, messages: MessageWithLocalState[]) {
  cache.set(id, messages);
}

export function clearConversationCache(id?: string) {
  if (typeof id === "string") {
    cache.delete(id);
    return;
  }
  cache.clear();
}

export async function prefetchConversationMessages(id: string) {
  if (cache.has(id)) {
    return cache.get(id);
  }

  if (inflightPrefetches.has(id)) {
    return inflightPrefetches.get(id);
  }

  const request = fetch(`/api/chat/conversations/${id}/messages?limit=50`)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Error al precargar conversación");
      }

      const payload = await response.json();
      const normalized = payload?.data ? withLocalState([...payload.data].reverse()) : [];
      cache.set(id, normalized);
      return normalized;
    })
    .catch((error) => {
      console.error(`[Chat] Error al precargar conversación ${id}:`, error);
      throw error;
    })
    .finally(() => {
      inflightPrefetches.delete(id);
    });

  inflightPrefetches.set(id, request);
  return request;
}

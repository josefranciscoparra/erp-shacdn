/**
 * Store global de Zustand para contador de mensajes no leídos de chat
 *
 * Este store se actualiza desde:
 * - SSE global (layout del dashboard) cuando llegan mensajes
 * - ChatStreamProvider al inicializar (fetch inicial)
 * - chat-container cuando se leen conversaciones (optimistic updates)
 *
 * Se consume desde:
 * - Sidebar (para mostrar el indicador rojo)
 * - chat-container (para actualizar conversaciones en tiempo real)
 * - Cualquier otro componente que necesite saber si hay mensajes sin leer
 *
 * Protección contra race conditions:
 * - setInitialUnreadCount solo funciona si !initialized
 * - increment/decrement funcionan siempre (deltas sobre el valor actual)
 * - applyServerTotalUnread pisa el valor (para resync forzado)
 */

import { create } from "zustand";

import type { MessageWithSender } from "@/lib/chat/types";

interface ChatUnreadState {
  // Estado
  initialized: boolean; // Evita race conditions en inicialización
  totalUnreadCount: number;

  // Eventos SSE (para que otros componentes se suscriban)
  lastMessage: MessageWithSender | null;
  lastConversationRead: string | null; // conversationId

  // Inicialización y resync
  setInitialUnreadCount: (count: number) => void; // Solo funciona si !initialized
  applyServerTotalUnread: (count: number) => void; // Pisa el valor (resync forzado)

  // Deltas (funcionan siempre)
  incrementUnreadCount: (by?: number) => void;
  decrementUnreadCount: (by?: number) => void;
  resetUnreadCount: () => void;

  // Eventos SSE (helpers)
  notifyNewMessage: (message: MessageWithSender) => void;
  notifyConversationRead: (conversationId: string) => void;
}

export const useChatUnreadStore = create<ChatUnreadState>((set) => ({
  // Estado inicial
  initialized: false,
  totalUnreadCount: 0,
  lastMessage: null,
  lastConversationRead: null,

  // Inicialización (solo primera vez)
  setInitialUnreadCount: (count: number) => {
    set((state) =>
      state.initialized
        ? state // Ya inicializado, ignorar
        : {
            ...state,
            initialized: true,
            totalUnreadCount: Math.max(0, count),
          },
    );
  },

  // Resync forzado (pisa el valor, marca como inicializado)
  applyServerTotalUnread: (count: number) => {
    set({
      initialized: true,
      totalUnreadCount: Math.max(0, count),
    });
  },

  // Incrementar (delta)
  incrementUnreadCount: (by: number = 1) => {
    set((state) => ({
      totalUnreadCount: Math.max(0, state.totalUnreadCount + by),
    }));
  },

  // Decrementar (delta)
  decrementUnreadCount: (by: number = 1) => {
    set((state) => ({
      totalUnreadCount: Math.max(0, state.totalUnreadCount - by),
    }));
  },

  // Resetear a 0
  resetUnreadCount: () => {
    set({
      initialized: true,
      totalUnreadCount: 0,
    });
  },

  // Notificar mensaje nuevo (para que chat-container actualice conversaciones)
  notifyNewMessage: (message: MessageWithSender) => {
    set({ lastMessage: message });
  },

  // Notificar conversación leída (para sincronizar entre dispositivos)
  notifyConversationRead: (conversationId: string) => {
    set({ lastConversationRead: conversationId });
  },
}));

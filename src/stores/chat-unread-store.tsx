/**
 * Store global de Zustand para contador de mensajes no leídos de chat
 *
 * Este store se actualiza desde:
 * - SSE global (layout del dashboard) cuando llegan mensajes
 * - chat-container cuando se cargan conversaciones
 *
 * Se consume desde:
 * - Sidebar (para mostrar el indicador rojo)
 * - chat-container (para actualizar conversaciones en tiempo real)
 * - Cualquier otro componente que necesite saber si hay mensajes sin leer
 */

import { create } from "zustand";

import type { MessageWithSender } from "@/lib/chat/types";

interface ChatUnreadState {
  // Estado
  totalUnreadCount: number;

  // Eventos SSE (para que otros componentes se suscriban)
  lastMessage: MessageWithSender | null;
  lastConversationRead: string | null; // conversationId

  // Actions
  setTotalUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: (by?: number) => void;
  resetUnreadCount: () => void;

  // Eventos SSE
  notifyNewMessage: (message: MessageWithSender) => void;
  notifyConversationRead: (conversationId: string) => void;
}

export const useChatUnreadStore = create<ChatUnreadState>((set) => ({
  // Estado inicial
  totalUnreadCount: 0,
  lastMessage: null,
  lastConversationRead: null,

  // Establecer contador total (usado al cargar conversaciones)
  setTotalUnreadCount: (count: number) => {
    set({ totalUnreadCount: Math.max(0, count) });
  },

  // Incrementar en 1 (cuando llega mensaje nuevo via SSE)
  incrementUnreadCount: () => {
    set((state) => ({ totalUnreadCount: state.totalUnreadCount + 1 }));
  },

  // Decrementar por N (cuando se lee conversación)
  decrementUnreadCount: (by: number = 1) => {
    set((state) => ({
      totalUnreadCount: Math.max(0, state.totalUnreadCount - by),
    }));
  },

  // Resetear a 0
  resetUnreadCount: () => {
    set({ totalUnreadCount: 0 });
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

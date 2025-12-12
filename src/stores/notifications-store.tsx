"use client";

import { create } from "zustand";

import {
  getMyNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
} from "@/server/actions/notifications";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  orgId: string;
  organization?: {
    id: string;
    name: string;
  };
  ptoRequestId?: string | null;
  ptoRequest?: {
    id: string;
    startDate: Date;
    endDate: Date;
    workingDays: number;
    status: string;
    employee: {
      firstName: string;
      lastName: string;
    };
    absenceType: {
      name: string;
      color: string;
    };
  } | null;
}

interface NotificationsState {
  // Estado
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Acciones
  loadNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsUnread: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  ...initialState,

  // Cargar notificaciones
  loadNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getMyNotifications(10);
      set({
        notifications: data as Notification[],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar notificaciones",
        isLoading: false,
      });
    }
  },

  // Cargar contador de no leídas
  loadUnreadCount: async () => {
    try {
      const count = await getUnreadNotificationsCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error("Error al cargar contador de notificaciones:", error);
    }
  },

  // Marcar como leída
  markAsRead: async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);

      // Actualizar estado local
      const notifications = get().notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      set({ notifications, unreadCount });
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
    }
  },

  // Marcar como no leída
  markAsUnread: async (notificationId: string) => {
    try {
      await markNotificationAsUnread(notificationId);

      // Actualizar estado local
      const notifications = get().notifications.map((n) => (n.id === notificationId ? { ...n, isRead: false } : n));

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      set({ notifications, unreadCount });
    } catch (error) {
      console.error("Error al marcar notificación como no leída:", error);
    }
  },

  // Marcar todas como leídas
  markAllAsRead: async () => {
    try {
      await markAllNotificationsAsRead();

      // Actualizar estado local
      const notifications = get().notifications.map((n) => ({
        ...n,
        isRead: true,
      }));

      set({ notifications, unreadCount: 0 });
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
    }
  },

  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
